import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalPreviewDatabase } from './localPreviewDatabase';
import type {
  DatabaseBundle,
  DatabaseMigration,
} from '../../scripts/database-contract.mjs';

const temporaryDirectories: string[] = [];

function createDatabase(): {
  database: LocalPreviewDatabase;
  databasePath: string;
  databaseBundle: DatabaseBundle;
} {
  const directory = mkdtempSync(join(tmpdir(), 'lingguang-local-preview-'));
  temporaryDirectories.push(directory);
  const databasePath = join(directory, '.local-preview', 'app.sqlite');
  const databaseBundle = bundle([
    migration('0000_initial', 'sha256:initial', [
      `
      CREATE TABLE registrations (
        id VARCHAR(128) PRIMARY KEY,
        phone VARCHAR(32) NOT NULL,
        status VARCHAR(32) NOT NULL,
        updated_at BIGINT NOT NULL
      )
    `,
    ]),
  ]);
  return {
    database: new LocalPreviewDatabase({ databasePath, databaseBundle }),
    databasePath,
    databaseBundle,
  };
}

function migration(
  id: string,
  sqlSha256: string,
  statements: string[],
): DatabaseMigration {
  return {
    id,
    sqlSha256,
    historyHashAfter: `sha256:history-${id}`,
    statements: statements.map((rawSql, index) => ({
      index,
      operation: index === 0 && rawSql.includes('CREATE TABLE')
        ? 'CREATE_TABLE'
        : 'ADD_COLUMN',
      tableName: 'registrations',
      columnName: rawSql.includes('ADD COLUMN') ? 'note' : null,
      sqlSha256: `sha256:statement-${id}-${String(index)}`,
      rawSql,
    })),
  };
}

function bundle(migrations: DatabaseMigration[]): DatabaseBundle {
  return {
    formatVersion: 'lingguang-drizzle-v1',
    present: true,
    dialect: 'mysql',
    schemaContractVersion: 'lingguang-drizzle-schema-v1',
    migrationContractVersion: 'lingguang-drizzle-migration-v1',
    toolchain: {},
    schemaHash: 'sha256:schema',
    migrationHistoryHash: migrations.at(-1)?.historyHashAfter ?? 'sha256:empty',
    tableCount: 1,
    migrationCount: migrations.length,
    latestMigrationId: migrations.at(-1)?.id ?? null,
    migrations,
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('LocalPreviewDatabase', () => {
  it('initializes schema and supports parameterized CRUD', () => {
    const { database } = createDatabase();

    const insertResult = database.execute({
      sql: 'INSERT INTO registrations (id, phone, status, updated_at) VALUES (?, ?, ?, ?)',
      binds: ['registration-1', '13800138000', 'draft', 100],
    });
    expect(insertResult.success).toBe(true);
    expect(insertResult.data.rowsAffected).toBe(1);

    const queryResult = database.query({
      sql: 'SELECT id, phone, status, updated_at AS updatedAt FROM registrations WHERE id = ?',
      binds: ['registration-1'],
    });
    expect(queryResult).toEqual({
      success: true,
      data: [
        {
          id: 'registration-1',
          phone: '13800138000',
          status: 'draft',
          updatedAt: 100,
        },
      ],
    });

    const updateResult = database.execute({
      sql: 'UPDATE registrations SET status = ?, updated_at = ? WHERE id = ?',
      binds: ['submitted', 200, 'registration-1'],
    });
    expect(updateResult.data.rowsAffected).toBe(1);

    const deleteResult = database.execute({
      sql: 'DELETE FROM registrations WHERE id = ?',
      binds: ['registration-1'],
    });
    expect(deleteResult.data.rowsAffected).toBe(1);
    database.close();
  });

  it('keeps data after closing and reopening the preview database', () => {
    const { database, databasePath, databaseBundle } = createDatabase();
    database.execute({
      sql: 'INSERT INTO registrations (id, phone, status, updated_at) VALUES (?, ?, ?, ?)',
      binds: ['registration-2', '13900139000', 'draft', 300],
    });
    database.close();

    const reopened = new LocalPreviewDatabase({ databasePath, databaseBundle });
    expect(
      reopened.query({
        sql: 'SELECT id, phone FROM registrations WHERE id = ?',
        binds: ['registration-2'],
      }),
    ).toEqual({
      success: true,
      data: [{ id: 'registration-2', phone: '13900139000' }],
    });
    reopened.close();
  });

  it('returns API-shaped business failures for unsupported or invalid SQL', () => {
    const { database } = createDatabase();

    expect(database.query({ sql: 'DELETE FROM registrations' })).toEqual({
      success: false,
      data: [],
      message: 'db.query only supports SELECT or WITH statements',
    });
    expect(database.execute({ sql: 'CREATE TABLE blocked (id INT)' })).toEqual({
      success: false,
      data: { rowsAffected: 0 },
      message: 'db.execute only supports INSERT, UPDATE, or DELETE statements',
    });
    expect(database.query({ sql: 'SELECT * FROM missing_table' })).toEqual({
      success: false,
      data: [],
      message: 'no such table: missing_table',
    });
    database.close();
  });

  it('applies only the appended migration and preserves existing data', () => {
    const { database, databasePath, databaseBundle } = createDatabase();
    database.execute({
      sql: 'INSERT INTO registrations (id, phone, status, updated_at) VALUES (?, ?, ?, ?)',
      binds: ['registration-3', '13700137000', 'draft', 400],
    });
    database.close();

    const appended = migration('0001_add_note', 'sha256:add-note', [
      "ALTER TABLE registrations ADD COLUMN note VARCHAR(255) NOT NULL DEFAULT ''",
    ]);
    const reopened = new LocalPreviewDatabase({
      databasePath,
      databaseBundle: bundle([...(databaseBundle.migrations ?? []), appended]),
    });
    expect(
      reopened.query({
        sql: 'SELECT id, note FROM registrations WHERE id = ?',
        binds: ['registration-3'],
      }),
    ).toEqual({
      success: true,
      data: [{ id: 'registration-3', note: '' }],
    });
    reopened.close();
  });

  it('stops when an applied migration checksum changes', () => {
    const { database, databasePath, databaseBundle } = createDatabase();
    database.close();
    const changed = (databaseBundle.migrations ?? []).map((item) => ({
      ...item,
      sqlSha256: 'sha256:modified',
    }));

    expect(
      () => new LocalPreviewDatabase({ databasePath, databaseBundle: bundle(changed) }),
    ).toThrow('An applied migration was modified');
  });

  it('rejects existing tables without migration ledger state', () => {
    const directory = mkdtempSync(join(tmpdir(), 'lingguang-local-preview-unmanaged-'));
    temporaryDirectories.push(directory);
    const databasePath = join(directory, '.local-preview', 'app.sqlite');
    mkdirSync(dirname(databasePath), { recursive: true });
    const unmanaged = new DatabaseSync(databasePath);
    unmanaged.exec('CREATE TABLE legacy_notes (id VARCHAR(64) PRIMARY KEY)');
    unmanaged.close();

    expect(
      () => new LocalPreviewDatabase({ databasePath, databaseBundle: bundle([]) }),
    ).toThrow('tables without migration ledger state');
  });
});
