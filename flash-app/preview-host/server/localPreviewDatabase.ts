import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type {
  DatabaseBundle,
  DatabaseMigration,
} from '../../scripts/database-contract.mjs';

type UnknownRecord = Record<string, unknown>;

export type LocalDbRequest = {
  sql: string;
  binds?: unknown[];
  timeoutMs?: number;
};

export type LocalDbQueryResult = {
  success: boolean;
  data: UnknownRecord[];
  message?: string;
};

export type LocalDbExecuteResult = {
  success: boolean;
  data: {
    rowsAffected: number;
    lastInsertId?: number | string;
  };
  message?: string;
};

export type LocalPreviewDatabaseOptions = {
  databasePath: string;
  databaseBundle: DatabaseBundle;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeBind(value: unknown): SQLInputValue {
  if (value === null || typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (typeof value === 'bigint') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  throw new TypeError(`Unsupported SQLite bind value: ${typeof value}`);
}

function normalizeOutput(value: unknown): unknown {
  if (typeof value === 'bigint') {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
  }
  if (value instanceof Uint8Array) {
    return Array.from(value);
  }
  return value;
}

function normalizeRow(row: UnknownRecord): UnknownRecord {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, normalizeOutput(value)]),
  );
}

function normalizeLastInsertId(value: number | bigint): number | string {
  if (typeof value === 'number') {
    return value;
  }
  const asNumber = Number(value);
  return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
}

function isQuerySql(sql: string): boolean {
  return /^\s*(?:SELECT|WITH)\b/i.test(sql);
}

function isExecuteSql(sql: string): boolean {
  return /^\s*(?:INSERT|UPDATE|DELETE)\b/i.test(sql);
}

export class LocalPreviewDatabase {
  readonly databasePath: string;
  readonly migrationIds: string[];

  private readonly database: DatabaseSync;

  constructor({ databasePath, databaseBundle }: LocalPreviewDatabaseOptions) {
    this.databasePath = databasePath;
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.database.exec('PRAGMA busy_timeout = 5000');
    this.database.exec('PRAGMA foreign_keys = ON');
    const migrations = databaseBundle.present
      ? (databaseBundle.migrations ?? [])
      : [];
    this.migrationIds = migrations.map((migration) => migration.id);
    try {
      this.initializeMigrations(migrations);
    } catch (error) {
      this.database.close();
      throw error;
    }
  }

  query(request: LocalDbRequest): LocalDbQueryResult {
    if (!isQuerySql(request.sql)) {
      return {
        success: false,
        data: [],
        message: 'db.query only supports SELECT or WITH statements',
      };
    }

    try {
      const binds = (request.binds ?? []).map(normalizeBind);
      const rows = this.database.prepare(request.sql).all(...binds);
      return {
        success: true,
        data: rows.map((row) => normalizeRow(row)),
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        message: getErrorMessage(error),
      };
    }
  }

  execute(request: LocalDbRequest): LocalDbExecuteResult {
    if (!isExecuteSql(request.sql)) {
      return {
        success: false,
        data: { rowsAffected: 0 },
        message: 'db.execute only supports INSERT, UPDATE, or DELETE statements',
      };
    }

    try {
      const binds = (request.binds ?? []).map(normalizeBind);
      const result = this.database.prepare(request.sql).run(...binds);
      return {
        success: true,
        data: {
          rowsAffected: Number(result.changes),
          lastInsertId: normalizeLastInsertId(result.lastInsertRowid),
        },
      };
    } catch (error) {
      return {
        success: false,
        data: { rowsAffected: 0 },
        message: getErrorMessage(error),
      };
    }
  }

  close(): void {
    this.database.close();
  }

  private initializeMigrations(migrations: DatabaseMigration[]): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS __lingguang_local_migrations (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_id TEXT NOT NULL UNIQUE,
        migration_sql_sha256 TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const applied = this.database
      .prepare(
        'SELECT migration_id, migration_sql_sha256 FROM __lingguang_local_migrations ORDER BY sequence ASC',
      )
      .all() as Array<{
      migration_id: string;
      migration_sql_sha256: string;
    }>;

    const unmanagedTables = this.database
      .prepare(
        "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '__lingguang_local_migrations'",
      )
      .all();
    if (applied.length === 0 && unmanagedTables.length > 0) {
      throw new Error(
        'Local preview contains tables without migration ledger state; run npm run db:reset-local before applying the declared history.',
      );
    }

    if (applied.length > migrations.length) {
      throw new Error(
        'Local preview has migrations that are missing from source; restore migration history or run npm run db:reset-local.',
      );
    }
    for (const [index, row] of applied.entries()) {
      const migration = migrations[index];
      if (
        migration === undefined ||
        row.migration_id !== migration.id ||
        row.migration_sql_sha256 !== migration.sqlSha256
      ) {
        throw new Error(
          'An applied migration was modified; restore migration history or explicitly run npm run db:reset-local to discard local preview data.',
        );
      }
    }

    for (const migration of migrations.slice(applied.length)) {
      this.applyMigration(migration);
    }
  }

  private applyMigration(migration: DatabaseMigration): void {
    this.database.exec('BEGIN');
    try {
      for (const statement of migration.statements) {
        this.database.exec(statement.rawSql);
      }
      this.database
        .prepare(
          'INSERT INTO __lingguang_local_migrations (migration_id, migration_sql_sha256) VALUES (?, ?)',
        )
        .run(migration.id, migration.sqlSha256);
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw new Error(
        `Failed to apply local preview migration ${migration.id}: ${getErrorMessage(error)}`,
        { cause: error },
      );
    }
  }
}
