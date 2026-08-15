import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  DatabaseContractError,
  MIGRATION_CONTRACT_VERSION,
  SCHEMA_CONTRACT_VERSION,
  TOOLCHAIN,
  parseContractSql,
  validateSchemaSources,
} from './database-contract.mjs'

const contract = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../database-contract/contract-v1.json', import.meta.url)),
    'utf8',
  ),
)

function withSchema(files, run) {
  const projectRoot = mkdtempSync(join(tmpdir(), 'lingguang-schema-contract-'))
  const schemaRoot = join(projectRoot, 'database', 'schema')
  mkdirSync(schemaRoot, { recursive: true })
  try {
    for (const [name, contents] of Object.entries(files)) {
      writeFileSync(join(schemaRoot, name), contents)
    }
    return run(schemaRoot)
  } finally {
    rmSync(projectRoot, { recursive: true, force: true })
  }
}

const validNotesSchema = `
import { mysqlTable, primaryKey, varchar } from 'drizzle-orm/mysql-core'

export const notes = mysqlTable(
  'notes',
  {
    id: varchar('id', { length: 64 }).notNull(),
    title: varchar('title', { length: 255 }).notNull().default('untitled'),
  },
  (table) => [primaryKey({ columns: [table.id] })],
)
`

const validIndexSchema = `
import { defineLingguangSchema } from '@lingguang/database-schema'
import { notes } from './notes'

export { notes }

export const lingguangSchema = defineLingguangSchema({
  notes: { table: notes, tableKind: 'user' },
})
`

describe('lingguang Drizzle database contract v1', () => {
  it('keeps machine-readable versions aligned with the validator', () => {
    expect(contract.schemaContractVersion).toBe(SCHEMA_CONTRACT_VERSION)
    expect(contract.migrationContractVersion).toBe(MIGRATION_CONTRACT_VERSION)
    expect(contract.toolchain).toEqual(TOOLCHAIN)
  })

  for (const fixture of contract.fixtures) {
    it(`${fixture.accepted ? 'accepts' : 'rejects'} ${fixture.id}`, () => {
      if (fixture.accepted) {
        const statements = parseContractSql(fixture.sql)
        expect(statements).toHaveLength(1)
        expect(statements[0].operation).toBe(fixture.operation)
        expect(statements[0]).toMatchObject(fixture.expected)
        const database = new DatabaseSync(':memory:')
        try {
          for (const setupSql of fixture.sqliteSetup) database.exec(setupSql)
          database.exec(statements[0].rawSql)
        } finally {
          database.close()
        }
        return
      }
      try {
        parseContractSql(fixture.sql)
        throw new Error('fixture unexpectedly passed')
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseContractError)
        expect(error.code).toBe(fixture.errorCode)
      }
    })
  }

  it('accepts only static Drizzle table declarations and a complete tableKind registry', () => {
    const registry = withSchema(
      { 'notes.ts': validNotesSchema, 'index.ts': validIndexSchema },
      validateSchemaSources,
    )
    expect(registry).toEqual([{ tableName: 'notes', tableKind: 'user' }])
  })

  it('rejects executable expressions nested inside mysqlTable arguments', () => {
    const maliciousSchema = validNotesSchema.replace(
      "varchar('title', { length: 255 }).notNull().default('untitled')",
      "varchar('title', (() => { console.log('side effect'); return { length: 255 } })())",
    )
    expect(() =>
      withSchema(
        { 'notes.ts': maliciousSchema, 'index.ts': validIndexSchema },
        validateSchemaSources,
      ),
    ).toThrowError(expect.objectContaining({ code: 'DATABASE_SCHEMA_IMPORT_INVALID' }))
  })

  it('rejects module re-exports that could escape the isolated schema graph', () => {
    expect(() =>
      withSchema(
        {
          'notes.ts': validNotesSchema,
          'index.ts': `${validIndexSchema}\nexport * from '../../outside'\n`,
        },
        validateSchemaSources,
      ),
    ).toThrowError(expect.objectContaining({ code: 'DATABASE_SCHEMA_IMPORT_INVALID' }))
  })
})
