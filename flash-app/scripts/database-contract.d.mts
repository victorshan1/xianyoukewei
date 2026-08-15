export type DatabaseColumn = {
  position: number
  name: string
  type: Record<string, string | number>
  nullable: boolean
  default: null | { kind: string; value?: string }
}

export type DatabaseMigrationStatement = {
  index: number
  operation: 'CREATE_TABLE' | 'ADD_COLUMN'
  tableName: string
  columnName: string | null
  sqlSha256: string
  rawSql: string
}

export type DatabaseMigration = {
  id: string
  sqlSha256: string
  historyHashAfter: string
  statements: DatabaseMigrationStatement[]
}

export type DatabaseBundle = {
  formatVersion: string
  present: boolean
  dialect: 'mysql'
  schemaContractVersion: string
  migrationContractVersion: string
  toolchain: Record<string, string>
  schemaHash?: string
  migrationHistoryHash?: string
  tableCount?: number
  migrationCount?: number
  latestMigrationId?: string | null
  migrations?: DatabaseMigration[]
}

export class DatabaseContractError extends Error {
  code: string
  details: Record<string, unknown>
}

export function validateSchemaSources(
  schemaRoot: string,
): Array<{ tableName: string; tableKind: 'user' | 'managed_user' | 'share' | 'share_owned' }>
export function validateDatabaseProject(options?: { projectRoot?: string }): DatabaseBundle
export function summarizeDatabaseBundle(bundle: DatabaseBundle): Record<string, unknown>
