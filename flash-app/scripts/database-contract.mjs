import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import parserPackage from 'node-sql-parser'
import ts from 'typescript'

const { Parser } = parserPackage

export const SCHEMA_CONTRACT_VERSION = 'lingguang-drizzle-schema-v1'
export const MIGRATION_CONTRACT_VERSION = 'lingguang-drizzle-migration-v1'
export const DATABASE_BUNDLE_FORMAT_VERSION = 'lingguang-drizzle-v1'
export const DATABASE_DIALECT = 'mysql'

export const TOOLCHAIN = Object.freeze({
  drizzleOrm: '0.45.2',
  drizzleKit: '0.31.10',
  nodeSqlParser: '5.4.0',
})

export const LIMITS = Object.freeze({
  schemaFileCount: 64,
  schemaFileBytes: 256 * 1024,
  schemaTotalBytes: 1024 * 1024,
  migrationCount: 256,
  migrationFileBytes: 256 * 1024,
  migrationTotalBytes: 4 * 1024 * 1024,
  migrationStatementCount: 64,
  historyStatementCount: 1024,
  snapshotFileBytes: 4 * 1024 * 1024,
  snapshotTotalBytes: 64 * 1024 * 1024,
  journalBytes: 256 * 1024,
  tableCount: 32,
  columnsPerTable: 100,
})

const TABLE_KINDS = new Set(['user', 'managed_user', 'share', 'share_owned'])
const COLUMN_BUILDERS = new Set([
  'tinyint',
  'smallint',
  'int',
  'bigint',
  'varchar',
  'decimal',
  'float',
  'double',
  'date',
  'time',
  'timestamp',
])
const COLUMN_BUILDER_METHODS = new Set(['notNull', 'default'])
const ALLOWED_TYPES = new Set([
  'TINYINT',
  'SMALLINT',
  'INT',
  'BIGINT',
  'VARCHAR',
  'DECIMAL',
  'FLOAT',
  'DOUBLE',
  'DATE',
  'TIME',
  'TIMESTAMP',
])
const PRIMARY_KEY_TYPES = new Set(['INT', 'BIGINT', 'VARCHAR'])
const RESERVED_COLUMNS = new Set([
  'artifact_id',
  'artifact_version',
  'user_id',
  'owner_user_id',
  'asap_sys_artifact_id',
  'asap_sys_artifact_version',
  'asap_sys_user_id',
])
const ROLE_PERMISSION_TABLES = new Set([
  'admin',
  'admins',
  'admin_users',
  'admin_roles',
  'manager',
  'managers',
  'manager_users',
  'manager_roles',
  'user_roles',
  'roles',
  'role_permissions',
  'permissions',
  'user_permissions',
  'staff_roles',
  'staff_permissions',
])
const SAFE_IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]*$/
const SAFE_MIGRATION_TAG = /^[0-9]{4}_[A-Za-z0-9][A-Za-z0-9_-]*$/
const textDecoder = new TextDecoder('utf-8', { fatal: true })
const parser = new Parser()

function ensureOnlyKeys(value, allowedKeys, code, message) {
  ensure(value !== null && typeof value === 'object', code, message)
  const unsupportedKeys = Object.keys(value).filter((key) => !allowedKeys.has(key))
  ensure(unsupportedKeys.length === 0, code, message, { unsupportedKeys })
}

export class DatabaseContractError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'DatabaseContractError'
    this.code = code
    this.details = details
  }
}

function fail(code, message, details = {}) {
  throw new DatabaseContractError(code, message, details)
}

function ensure(condition, code, message, details = {}) {
  if (!condition) fail(code, message, details)
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

function compareCanonicalText(left, right) {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function toCanonicalValue(value) {
  if (Array.isArray(value)) return value.map(toCanonicalValue)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort(compareCanonicalText)
        .map((key) => [key, toCanonicalValue(value[key])]),
    )
  }
  return value
}

export function canonicalJson(value) {
  return JSON.stringify(toCanonicalValue(value))
}

function readUtf8(path, code, label) {
  const bytes = readFileSync(path)
  try {
    return { bytes, text: textDecoder.decode(bytes) }
  } catch {
    fail(code, `${label} must be valid UTF-8`, { path: basename(path) })
  }
}

function walk(root) {
  const files = []
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      const stat = lstatSync(path)
      ensure(!stat.isSymbolicLink(), 'DATABASE_SCHEMA_LAYOUT_INVALID', 'database files must not be symlinks', {
        path: relative(root, path),
      })
      if (stat.isDirectory()) visit(path)
      else if (stat.isFile()) files.push(path)
      else fail('DATABASE_SCHEMA_LAYOUT_INVALID', 'database directory contains an unsupported file type', {
        path: relative(root, path),
      })
    }
  }
  visit(root)
  return files
}

function validateIdentifier(value, label) {
  ensure(
    typeof value === 'string' && SAFE_IDENTIFIER.test(value),
    'DATABASE_SCHEMA_CONTRACT_REJECTED',
    `${label} must match [A-Za-z][A-Za-z0-9_]*`,
    { identifier: typeof value === 'string' ? value : null },
  )
  return value
}

function astList(value) {
  if (Array.isArray(value)) return value
  return value === null || value === undefined ? [] : [value]
}

function tableNameFromAst(ast) {
  const tables = astList(ast?.table)
  ensure(tables.length === 1, 'DATABASE_MIGRATION_SQL_INVALID', 'DDL must target exactly one table')
  const table = tables[0]
  ensureOnlyKeys(
    table,
    new Set(['db', 'table']),
    'DATABASE_MIGRATION_OPERATION_NOT_SUPPORTED',
    'qualified or decorated table references are not supported',
  )
  ensure(
    table !== null && typeof table === 'object' && (table.db === null || table.db === undefined),
    'DATABASE_MIGRATION_OPERATION_NOT_SUPPORTED',
    'database/schema-qualified table names are not supported',
  )
  const name = validateIdentifier(table.table, 'table name')
  ensure(
    !ROLE_PERMISSION_TABLES.has(name.toLowerCase()),
    'DATABASE_SCHEMA_CONTRACT_REJECTED',
    'role and permission tables are managed by the platform',
    { tableName: name },
  )
  return name
}

function normalizeDefault(defaultNode, columnType, nullable) {
  if (defaultNode === undefined || defaultNode === null) return null
  ensureOnlyKeys(
    defaultNode,
    new Set(['type', 'value']),
    'DATABASE_SCHEMA_CONTRACT_REJECTED',
    'column DEFAULT contains unsupported options',
  )
  ensure(defaultNode.type === 'default', 'DATABASE_SCHEMA_CONTRACT_REJECTED', 'column DEFAULT is invalid')
  const value = defaultNode.value
  ensure(value !== null && typeof value === 'object', 'DATABASE_SCHEMA_CONTRACT_REJECTED', 'column DEFAULT must be a literal')

  let normalized
  if (value.type === 'single_quote_string' || value.type === 'string') {
    normalized = { kind: 'STRING', value: String(value.value) }
  } else if (value.type === 'number') {
    normalized = { kind: 'NUMBER', value: String(value.value) }
  } else if (value.type === 'null') {
    normalized = { kind: 'NULL' }
  } else if (
    value.type === 'unary_expr' &&
    value.operator === '-' &&
    value.expr?.type === 'number'
  ) {
    normalized = { kind: 'NUMBER', value: `-${String(value.expr.value)}` }
  } else {
    fail('DATABASE_SCHEMA_CONTRACT_REJECTED', 'function and expression DEFAULT values are not supported')
  }

  if (normalized.kind === 'NULL') {
    ensure(nullable, 'DATABASE_SCHEMA_CONTRACT_REJECTED', 'NOT NULL DEFAULT NULL is not supported')
  } else if (normalized.kind === 'STRING') {
    ensure(
      new Set(['VARCHAR', 'DATE', 'TIME', 'TIMESTAMP']).has(columnType.name),
      'DATABASE_SCHEMA_CONTRACT_REJECTED',
      'string DEFAULT is incompatible with the column type',
    )
  } else {
    ensure(
      new Set(['TINYINT', 'SMALLINT', 'INT', 'BIGINT', 'DECIMAL', 'FLOAT', 'DOUBLE']).has(columnType.name),
      'DATABASE_SCHEMA_CONTRACT_REJECTED',
      'numeric DEFAULT is incompatible with the column type',
    )
  }
  return normalized
}

function normalizeType(definition) {
  ensure(
    definition !== null && typeof definition === 'object',
    'DATABASE_SCHEMA_CONTRACT_REJECTED',
    'column type definition is missing',
  )
  ensureOnlyKeys(
    definition,
    new Set(['dataType', 'length', 'parentheses', 'scale', 'suffix']),
    'DATABASE_SCHEMA_CONTRACT_REJECTED',
    'column type contains unsupported options',
  )
  const name = String(definition.dataType ?? '').toUpperCase()
  ensure(ALLOWED_TYPES.has(name), 'DATABASE_SCHEMA_CONTRACT_REJECTED', `column type ${name || '<missing>'} is not supported`)
  ensure(
    definition.suffix === null ||
      definition.suffix === undefined ||
      (Array.isArray(definition.suffix) && definition.suffix.length === 0),
    'DATABASE_SCHEMA_CONTRACT_REJECTED',
    'column type suffixes are not supported',
  )

  if (name === 'VARCHAR') {
    const length = Number(definition.length)
    ensure(Number.isInteger(length) && length > 0 && length <= 65535, 'DATABASE_SCHEMA_CONTRACT_REJECTED', 'VARCHAR length is invalid')
    return { name, length }
  }
  if (name === 'DECIMAL') {
    const precision = Number(definition.length)
    const scale = Number(definition.scale)
    ensure(
      Number.isInteger(precision) && precision > 0 && precision <= 65 && Number.isInteger(scale) && scale >= 0 && scale <= 30 && scale <= precision,
      'DATABASE_SCHEMA_CONTRACT_REJECTED',
      'DECIMAL precision/scale is invalid',
    )
    return { name, precision, scale }
  }
  ensure(
    definition.length === undefined || definition.length === null,
    'DATABASE_SCHEMA_CONTRACT_REJECTED',
    `${name} parameters are not supported`,
  )
  return { name }
}

function normalizeColumn(definition, position, { requireDefault }) {
  ensureOnlyKeys(
    definition,
    requireDefault
      ? new Set(['action', 'column', 'default_val', 'definition', 'nullable', 'resource', 'suffix', 'type'])
      : new Set(['column', 'default_val', 'definition', 'nullable', 'resource']),
    'DATABASE_SCHEMA_CONTRACT_REJECTED',
    'column declaration contains unsupported options',
  )
  ensure(definition?.resource === 'column', 'DATABASE_SCHEMA_CONTRACT_REJECTED', 'only column definitions are supported')
  ensureOnlyKeys(
    definition.column,
    new Set(['collate', 'column', 'table', 'type']),
    'DATABASE_SCHEMA_CONTRACT_REJECTED',
    'column reference contains unsupported options',
  )
  ensure(
    definition.column.type === 'column_ref' &&
      (definition.column.table === null || definition.column.table === undefined) &&
      (definition.column.collate === null || definition.column.collate === undefined),
    'DATABASE_SCHEMA_CONTRACT_REJECTED',
    'qualified or collated column references are not supported',
  )
  const name = validateIdentifier(definition.column?.column, 'column name')
  ensure(
    !RESERVED_COLUMNS.has(name.toLowerCase()),
    'DATABASE_SCHEMA_CONTRACT_REJECTED',
    'platform system columns must not be declared by developer schema',
    { columnName: name },
  )
  for (const key of ['auto_increment', 'unique', 'primary_key', 'references', 'check']) {
    ensure(
      definition[key] === undefined || definition[key] === null || definition[key] === false,
      'DATABASE_SCHEMA_CONTRACT_REJECTED',
      `${key} column capability is not supported`,
      { columnName: name },
    )
  }
  if (definition.nullable !== undefined && definition.nullable !== null) {
    ensureOnlyKeys(
      definition.nullable,
      new Set(['type', 'value']),
      'DATABASE_SCHEMA_CONTRACT_REJECTED',
      'column NULL declaration contains unsupported options',
    )
    ensure(
      definition.nullable.type === 'not null' || definition.nullable.type === 'null',
      'DATABASE_SCHEMA_CONTRACT_REJECTED',
      'column NULL declaration is invalid',
    )
  }
  const nullable = definition.nullable?.type !== 'not null'
  const type = normalizeType(definition.definition)
  const defaultValue = normalizeDefault(definition.default_val, type, nullable)
  ensure(
    !requireDefault || defaultValue !== null,
    'DATABASE_SCHEMA_CONTRACT_REJECTED',
    'ADD COLUMN must declare an explicit literal DEFAULT',
    { columnName: name },
  )
  return {
    position,
    name,
    type,
    nullable,
    default: defaultValue,
  }
}

function normalizeCreateTable(ast, rawSql) {
  ensure(
    ast.type === 'create' && String(ast.keyword).toLowerCase() === 'table',
    'DATABASE_MIGRATION_OPERATION_NOT_SUPPORTED',
    'only CREATE TABLE and ALTER TABLE ADD COLUMN are supported',
  )
  ensureOnlyKeys(
    ast,
    new Set([
      'as',
      'create_definitions',
      'if_not_exists',
      'ignore_replace',
      'keyword',
      'query_expr',
      'table',
      'table_options',
      'temporary',
      'type',
    ]),
    'DATABASE_SCHEMA_CONTRACT_REJECTED',
    'CREATE TABLE contains unsupported options',
  )
  ensure(
    !ast.temporary && !ast.if_not_exists && !ast.ignore_replace && !ast.query_expr && !ast.as,
    'DATABASE_SCHEMA_CONTRACT_REJECTED',
    'CREATE TABLE options are not supported',
  )
  ensure(
    ast.table_options === null || ast.table_options === undefined || astList(ast.table_options).length === 0,
    'DATABASE_SCHEMA_CONTRACT_REJECTED',
    'ENGINE, CHARSET, COLLATE and other table options are not supported',
  )
  const tableName = tableNameFromAst(ast)
  const definitions = astList(ast.create_definitions)
  const columns = []
  let primaryKey = null
  for (const definition of definitions) {
    if (definition?.resource === 'column') {
      columns.push(normalizeColumn(definition, columns.length, { requireDefault: false }))
      continue
    }
    if (definition?.resource === 'constraint' && String(definition.constraint_type).toLowerCase() === 'primary key') {
      ensureOnlyKeys(
        definition,
        new Set(['constraint', 'constraint_type', 'definition', 'index_options', 'index_type', 'keyword', 'resource']),
        'DATABASE_SCHEMA_CONTRACT_REJECTED',
        'primary key contains unsupported options',
      )
      ensure(primaryKey === null, 'DATABASE_SCHEMA_CONTRACT_REJECTED', 'a table may declare only one primary key')
      ensure(
        !definition.index_type && !definition.index_options,
        'DATABASE_SCHEMA_CONTRACT_REJECTED',
        'typed or configured primary keys are not supported',
      )
      if (definition.constraint !== null && definition.constraint !== undefined) {
        validateIdentifier(definition.constraint, 'primary key constraint name')
      }
      primaryKey = astList(definition.definition).map((column) => {
        ensureOnlyKeys(
          column,
          new Set(['column', 'order_by', 'type']),
          'DATABASE_SCHEMA_CONTRACT_REJECTED',
          'primary key column contains unsupported options',
        )
        ensure(
          column.type === 'column_ref' && (column.order_by === null || column.order_by === undefined),
          'DATABASE_SCHEMA_CONTRACT_REJECTED',
          'ordered primary key columns are not supported',
        )
        return validateIdentifier(column.column, 'primary key column')
      })
      continue
    }
    fail('DATABASE_SCHEMA_CONTRACT_REJECTED', 'only columns and a table-level primary key are supported')
  }
  ensure(columns.length > 0, 'DATABASE_SCHEMA_CONTRACT_REJECTED', 'CREATE TABLE must declare business columns')
  ensure(columns.length <= LIMITS.columnsPerTable, 'DATABASE_SCHEMA_LAYOUT_INVALID', 'table exceeds the business column limit', {
    tableName,
    limit: LIMITS.columnsPerTable,
  })
  ensure(Array.isArray(primaryKey) && primaryKey.length > 0 && primaryKey.length <= 3, 'DATABASE_SCHEMA_CONTRACT_REJECTED', 'each table must have a primary key with at most three columns')
  ensure(new Set(columns.map((column) => column.name)).size === columns.length, 'DATABASE_SCHEMA_CONTRACT_REJECTED', 'column names must be unique', { tableName })
  ensure(new Set(primaryKey).size === primaryKey.length, 'DATABASE_SCHEMA_CONTRACT_REJECTED', 'primary key columns must be unique', { tableName })
  const columnByName = new Map(columns.map((column) => [column.name, column]))
  for (const key of primaryKey) {
    const column = columnByName.get(key)
    ensure(column !== undefined, 'DATABASE_SCHEMA_CONTRACT_REJECTED', 'primary key references an unknown column', { tableName, columnName: key })
    ensure(!column.nullable, 'DATABASE_SCHEMA_CONTRACT_REJECTED', 'primary key columns must be NOT NULL', { tableName, columnName: key })
    ensure(PRIMARY_KEY_TYPES.has(column.type.name), 'DATABASE_SCHEMA_CONTRACT_REJECTED', 'primary key column type is not supported', { tableName, columnName: key })
    ensure(
      column.type.name !== 'VARCHAR' || column.type.length <= 255,
      'DATABASE_SCHEMA_CONTRACT_REJECTED',
      'primary key VARCHAR length must not exceed 255',
      { tableName, columnName: key },
    )
  }
  return {
    operation: 'CREATE_TABLE',
    tableName,
    columnName: null,
    rawSql,
    sqlSha256: sha256(Buffer.from(rawSql, 'utf8')),
    table: { name: tableName, columns, primaryKey },
  }
}

function normalizeAddColumn(ast, rawSql) {
  ensureOnlyKeys(
    ast,
    new Set(['expr', 'table', 'type']),
    'DATABASE_MIGRATION_OPERATION_NOT_SUPPORTED',
    'ALTER TABLE contains unsupported options',
  )
  ensure(ast.type === 'alter', 'DATABASE_MIGRATION_OPERATION_NOT_SUPPORTED', 'only CREATE TABLE and ALTER TABLE ADD COLUMN are supported')
  const tableName = tableNameFromAst(ast)
  const expressions = astList(ast.expr)
  ensure(expressions.length === 1, 'DATABASE_MIGRATION_OPERATION_NOT_SUPPORTED', 'ALTER TABLE must contain exactly one ADD COLUMN operation')
  const expression = expressions[0]
  ensure(
    expression?.type === 'alter' && expression.action === 'add' && expression.resource === 'column',
    'DATABASE_MIGRATION_OPERATION_NOT_SUPPORTED',
    'only ALTER TABLE ADD COLUMN is supported',
  )
  const column = normalizeColumn(expression, 0, { requireDefault: true })
  return {
    operation: 'ADD_COLUMN',
    tableName,
    columnName: column.name,
    rawSql,
    sqlSha256: sha256(Buffer.from(rawSql, 'utf8')),
    column,
  }
}

function normalizeAst(ast, rawSql, { allowAddColumn }) {
  if (ast?.type === 'create') return normalizeCreateTable(ast, rawSql)
  if (ast?.type === 'alter' && allowAddColumn) return normalizeAddColumn(ast, rawSql)
  fail('DATABASE_MIGRATION_OPERATION_NOT_SUPPORTED', 'only CREATE TABLE and ALTER TABLE ADD COLUMN are supported')
}

function hasEffectiveSql(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\n\r]*/g, '')
    .trim().length > 0
}

export function splitSqlStatements(sql) {
  const statements = []
  let start = 0
  let mode = 'normal'
  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index]
    const next = sql[index + 1]
    if (mode === 'line-comment') {
      if (char === '\n') mode = 'normal'
      continue
    }
    if (mode === 'block-comment') {
      if (char === '*' && next === '/') {
        mode = 'normal'
        index += 1
      }
      continue
    }
    if (mode === 'single' || mode === 'double' || mode === 'backtick') {
      const quote = mode === 'single' ? "'" : mode === 'double' ? '"' : '`'
      if (char === '\\') {
        index += 1
      } else if (char === quote && next === quote) {
        index += 1
      } else if (char === quote) {
        mode = 'normal'
      }
      continue
    }
    if (char === '-' && next === '-') {
      mode = 'line-comment'
      index += 1
    } else if (char === '/' && next === '*') {
      mode = 'block-comment'
      index += 1
    } else if (char === "'") {
      mode = 'single'
    } else if (char === '"') {
      mode = 'double'
    } else if (char === '`') {
      mode = 'backtick'
    } else if (char === ';') {
      const statement = sql.slice(start, index + 1).trim()
      if (hasEffectiveSql(statement)) statements.push(statement)
      start = index + 1
    }
  }
  ensure(mode === 'normal' || mode === 'line-comment', 'DATABASE_MIGRATION_SQL_INVALID', 'migration contains an unterminated string or comment')
  const remaining = sql.slice(start).trim()
  if (hasEffectiveSql(remaining)) statements.push(remaining)
  return statements
}

function parseAst(sql) {
  try {
    return astList(parser.astify(sql, { database: 'MySQL' }))
  } catch (error) {
    fail('DATABASE_MIGRATION_SQL_INVALID', 'database SQL could not be parsed', {
      errorType: error instanceof Error ? error.name : typeof error,
    })
  }
}

export function parseContractSql(sql, { allowAddColumn = true } = {}) {
  const rawStatements = splitSqlStatements(sql)
  ensure(rawStatements.length > 0, 'DATABASE_MIGRATION_SQL_INVALID', 'migration must contain at least one statement')
  const fullAst = parseAst(sql)
  ensure(fullAst.length === rawStatements.length, 'DATABASE_MIGRATION_SQL_INVALID', 'migration statement boundaries are ambiguous')
  return rawStatements.map((rawSql) => {
    const statements = parseAst(rawSql)
    ensure(statements.length === 1, 'DATABASE_MIGRATION_SQL_INVALID', 'each migration statement must parse to exactly one operation')
    return normalizeAst(statements[0], rawSql, { allowAddColumn })
  })
}

function modulePath(sourcePath, moduleSpecifier, schemaRoot) {
  const candidate = resolve(dirname(sourcePath), moduleSpecifier)
  const candidates = extname(candidate) ? [candidate] : [`${candidate}.ts`, join(candidate, 'index.ts')]
  const resolvedPath = candidates.find((path) => existsSync(path))
  ensure(resolvedPath !== undefined, 'DATABASE_SCHEMA_IMPORT_INVALID', 'schema relative import does not resolve', {
    importPath: moduleSpecifier,
  })
  const relativePath = relative(schemaRoot, resolvedPath)
  ensure(
    relativePath !== '..' && !relativePath.startsWith(`..${sep}`),
    'DATABASE_SCHEMA_IMPORT_INVALID',
    'schema import escapes database/schema',
    { importPath: moduleSpecifier },
  )
  return resolvedPath
}

function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text
  fail('DATABASE_TABLE_KIND_INVALID', 'schema registry keys must be identifiers or string literals')
}

function isExported(statement) {
  return statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true
}

function validateStaticValue(node, label) {
  if (
    ts.isStringLiteral(node) ||
    ts.isNumericLiteral(node) ||
    node.kind === ts.SyntaxKind.TrueKeyword ||
    node.kind === ts.SyntaxKind.FalseKeyword ||
    node.kind === ts.SyntaxKind.NullKeyword
  ) {
    return
  }
  if (
    ts.isPrefixUnaryExpression(node) &&
    (node.operator === ts.SyntaxKind.MinusToken || node.operator === ts.SyntaxKind.PlusToken) &&
    ts.isNumericLiteral(node.operand)
  ) {
    return
  }
  if (ts.isObjectLiteralExpression(node)) {
    for (const property of node.properties) {
      ensure(
        ts.isPropertyAssignment(property),
        'DATABASE_SCHEMA_IMPORT_INVALID',
        `${label} only accepts static object properties`,
      )
      propertyName(property.name)
      validateStaticValue(property.initializer, label)
    }
    return
  }
  if (ts.isArrayLiteralExpression(node)) {
    for (const element of node.elements) validateStaticValue(element, label)
    return
  }
  fail('DATABASE_SCHEMA_IMPORT_INVALID', `${label} must use static literal values`)
}

function validateColumnBuilder(expression, imports) {
  ensure(
    ts.isCallExpression(expression),
    'DATABASE_SCHEMA_IMPORT_INVALID',
    'column declarations must be direct Drizzle builder calls',
  )
  if (ts.isIdentifier(expression.expression)) {
    const imported = imports.get(expression.expression.text)
    ensure(
      imported?.specifier === 'drizzle-orm/mysql-core' &&
        COLUMN_BUILDERS.has(imported.importedName),
      'DATABASE_SCHEMA_IMPORT_INVALID',
      'column builders must come from the supported drizzle-orm/mysql-core allowlist',
    )
    ensure(
      expression.arguments.length >= 1 && ts.isStringLiteral(expression.arguments[0]),
      'DATABASE_SCHEMA_IMPORT_INVALID',
      'column builders require a literal column name',
    )
    validateIdentifier(expression.arguments[0].text, 'column name')
    for (const argument of expression.arguments.slice(1)) {
      validateStaticValue(argument, 'column builder arguments')
    }
    return
  }
  ensure(
    ts.isPropertyAccessExpression(expression.expression),
    'DATABASE_SCHEMA_IMPORT_INVALID',
    'column declarations contain an unsupported call target',
  )
  const method = expression.expression.name.text
  ensure(
    COLUMN_BUILDER_METHODS.has(method),
    'DATABASE_SCHEMA_IMPORT_INVALID',
    'column declarations contain an unsupported builder method',
    { method },
  )
  validateColumnBuilder(expression.expression.expression, imports)
  if (method === 'notNull') {
    ensure(
      expression.arguments.length === 0,
      'DATABASE_SCHEMA_IMPORT_INVALID',
      'notNull does not accept arguments',
    )
    return
  }
  ensure(
    expression.arguments.length === 1,
    'DATABASE_SCHEMA_IMPORT_INVALID',
    'default requires exactly one static literal',
  )
  validateStaticValue(expression.arguments[0], 'column default')
}

function validatePrimaryKeyCallback(callback, imports) {
  ensure(
    ts.isArrowFunction(callback) &&
      callback.parameters.length === 1 &&
      ts.isIdentifier(callback.parameters[0].name) &&
      ts.isArrayLiteralExpression(callback.body),
    'DATABASE_SCHEMA_IMPORT_INVALID',
    'mysqlTable primary keys must use the supported arrow-function form',
  )
  const tableParameter = callback.parameters[0].name.text
  for (const element of callback.body.elements) {
    ensure(
      ts.isCallExpression(element) && ts.isIdentifier(element.expression),
      'DATABASE_SCHEMA_IMPORT_INVALID',
      'mysqlTable callback only accepts primaryKey declarations',
    )
    const imported = imports.get(element.expression.text)
    ensure(
      imported?.specifier === 'drizzle-orm/mysql-core' && imported.importedName === 'primaryKey',
      'DATABASE_SCHEMA_IMPORT_INVALID',
      'mysqlTable callback only accepts the trusted primaryKey helper',
    )
    ensure(
      element.arguments.length === 1 && ts.isObjectLiteralExpression(element.arguments[0]),
      'DATABASE_SCHEMA_IMPORT_INVALID',
      'primaryKey requires a static columns object',
    )
    const fields = element.arguments[0].properties
    ensure(fields.length === 1, 'DATABASE_SCHEMA_IMPORT_INVALID', 'primaryKey only accepts columns')
    const field = fields[0]
    ensure(
      ts.isPropertyAssignment(field) &&
        propertyName(field.name) === 'columns' &&
        ts.isArrayLiteralExpression(field.initializer),
      'DATABASE_SCHEMA_IMPORT_INVALID',
      'primaryKey columns must be a static array',
    )
    for (const column of field.initializer.elements) {
      ensure(
        ts.isPropertyAccessExpression(column) &&
          ts.isIdentifier(column.expression) &&
          column.expression.text === tableParameter,
        'DATABASE_SCHEMA_IMPORT_INVALID',
        'primaryKey columns must reference the mysqlTable callback parameter',
      )
      validateIdentifier(column.name.text, 'primary key column')
    }
  }
}

function validateMysqlTableCall(call, imports) {
  ensure(
    call.arguments.length >= 2 && call.arguments.length <= 3 &&
      ts.isStringLiteral(call.arguments[0]) &&
      ts.isObjectLiteralExpression(call.arguments[1]),
    'DATABASE_SCHEMA_IMPORT_INVALID',
    'mysqlTable requires a literal name, a static columns object, and an optional primary-key callback',
  )
  validateIdentifier(call.arguments[0].text, 'table name')
  for (const property of call.arguments[1].properties) {
    ensure(
      ts.isPropertyAssignment(property),
      'DATABASE_SCHEMA_IMPORT_INVALID',
      'mysqlTable columns must be static property assignments',
    )
    propertyName(property.name)
    validateColumnBuilder(property.initializer, imports)
  }
  if (call.arguments[2] !== undefined) validatePrimaryKeyCallback(call.arguments[2], imports)
}

export function validateSchemaSources(schemaRoot) {
  ensure(existsSync(join(schemaRoot, 'index.ts')), 'DATABASE_SCHEMA_LAYOUT_INVALID', 'database/schema/index.ts is required')
  const files = walk(schemaRoot)
  ensure(files.length > 0 && files.length <= LIMITS.schemaFileCount, 'DATABASE_SCHEMA_LAYOUT_INVALID', 'schema file count is outside the supported limit', {
    count: files.length,
    limit: LIMITS.schemaFileCount,
  })
  let totalBytes = 0
  const sourceByPath = new Map()
  for (const path of files) {
    ensure(extname(path) === '.ts', 'DATABASE_SCHEMA_LAYOUT_INVALID', 'database/schema only accepts TypeScript files', {
      path: relative(schemaRoot, path),
    })
    const { bytes, text } = readUtf8(path, 'DATABASE_SCHEMA_LAYOUT_INVALID', 'schema file')
    ensure(bytes.length <= LIMITS.schemaFileBytes, 'DATABASE_SCHEMA_LAYOUT_INVALID', 'schema file exceeds size limit', {
      path: relative(schemaRoot, path),
      limit: LIMITS.schemaFileBytes,
    })
    totalBytes += bytes.length
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
    ensure(
      source.parseDiagnostics.length === 0,
      'DATABASE_SCHEMA_IMPORT_INVALID',
      'schema TypeScript contains syntax errors',
      { path: relative(schemaRoot, path) },
    )
    sourceByPath.set(path, source)
  }
  ensure(totalBytes <= LIMITS.schemaTotalBytes, 'DATABASE_SCHEMA_LAYOUT_INVALID', 'schema files exceed total size limit', {
    limit: LIMITS.schemaTotalBytes,
  })

  const importsByPath = new Map()
  const tablesByReference = new Map()
  let registryNode = null
  let registryCount = 0

  for (const [path, source] of sourceByPath) {
    const imports = new Map()
    importsByPath.set(path, imports)
    for (const statement of source.statements) {
      if (ts.isImportDeclaration(statement)) {
        const specifier = statement.moduleSpecifier.text
        const allowed =
          specifier === 'drizzle-orm/mysql-core' ||
          specifier === '@lingguang/database-schema' ||
          specifier.startsWith('./') ||
          specifier.startsWith('../')
        ensure(allowed, 'DATABASE_SCHEMA_IMPORT_INVALID', 'schema imports an unsupported module', {
          importPath: specifier,
        })
        if (specifier.startsWith('.')) modulePath(path, specifier, schemaRoot)
        const clause = statement.importClause
        ensure(clause?.name === undefined, 'DATABASE_SCHEMA_IMPORT_INVALID', 'default schema imports are not supported')
        const bindings = clause?.namedBindings
        ensure(
          bindings === undefined || ts.isNamedImports(bindings),
          'DATABASE_SCHEMA_IMPORT_INVALID',
          'namespace schema imports are not supported',
        )
        if (bindings && ts.isNamedImports(bindings)) {
          for (const element of bindings.elements) {
            imports.set(element.name.text, {
              importedName: element.propertyName?.text ?? element.name.text,
              specifier,
            })
          }
        }
        continue
      }
      if (ts.isExportDeclaration(statement)) {
        ensure(
          statement.moduleSpecifier === undefined,
          'DATABASE_SCHEMA_IMPORT_INVALID',
          'schema re-exports from another module are not supported',
        )
        continue
      }
      if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
        continue
      }
      ensure(ts.isVariableStatement(statement), 'DATABASE_SCHEMA_IMPORT_INVALID', 'schema modules may only declare tables and the schema registry')
      ensure(
        (statement.declarationList.flags & ts.NodeFlags.Const) !== 0,
        'DATABASE_SCHEMA_IMPORT_INVALID',
        'schema declarations must use const',
      )
      for (const declaration of statement.declarationList.declarations) {
        ensure(ts.isIdentifier(declaration.name) && declaration.initializer, 'DATABASE_SCHEMA_IMPORT_INVALID', 'schema declarations must use initialized identifiers')
        ensure(ts.isCallExpression(declaration.initializer), 'DATABASE_SCHEMA_IMPORT_INVALID', 'schema declarations must be direct helper calls')
        const call = declaration.initializer
        ensure(ts.isIdentifier(call.expression), 'DATABASE_SCHEMA_IMPORT_INVALID', 'schema helper calls must use imported identifiers')
        const calledName = call.expression.text
        const imported = imports.get(calledName)
        if (calledName === 'mysqlTable') {
          ensure(imported?.specifier === 'drizzle-orm/mysql-core', 'DATABASE_SCHEMA_IMPORT_INVALID', 'mysqlTable must come from drizzle-orm/mysql-core')
          ensure(call.arguments.length >= 2 && ts.isStringLiteral(call.arguments[0]), 'DATABASE_SCHEMA_CONTRACT_REJECTED', 'mysqlTable requires a literal table name')
          const tableName = validateIdentifier(call.arguments[0].text, 'table name')
          validateMysqlTableCall(call, imports)
          tablesByReference.set(`${path}\0${declaration.name.text}`, tableName)
          continue
        }
        if (declaration.name.text === 'lingguangSchema' && calledName === 'defineLingguangSchema') {
          ensure(path === join(schemaRoot, 'index.ts'), 'DATABASE_TABLE_KIND_INVALID', 'lingguangSchema must be declared in database/schema/index.ts')
          ensure(imported?.specifier === '@lingguang/database-schema', 'DATABASE_SCHEMA_IMPORT_INVALID', 'defineLingguangSchema must come from the trusted helper')
          ensure(isExported(statement), 'DATABASE_TABLE_KIND_INVALID', 'lingguangSchema must be exported')
          ensure(call.arguments.length === 1 && ts.isObjectLiteralExpression(call.arguments[0]), 'DATABASE_TABLE_KIND_INVALID', 'lingguangSchema must receive an object literal')
          registryNode = call.arguments[0]
          registryCount += 1
          continue
        }
        fail('DATABASE_SCHEMA_IMPORT_INVALID', 'schema contains an unsupported top-level helper call', {
          declaration: declaration.name.text,
        })
      }
    }

    const dangerousNames = new Set(['process', 'globalThis', 'fetch', 'eval', 'Function', 'require'])
    const inspect = (node) => {
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        fail('DATABASE_SCHEMA_IMPORT_INVALID', 'dynamic import is not supported in database schema')
      }
      if (ts.isIdentifier(node) && dangerousNames.has(node.text)) {
        const parent = node.parent
        const isPropertyName =
          (ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent) || ts.isPropertySignature(parent)) &&
          parent.name === node
        if (!isPropertyName) {
          fail('DATABASE_SCHEMA_IMPORT_INVALID', 'database schema references a blocked runtime global', {
            identifier: node.text,
          })
        }
      }
      ts.forEachChild(node, inspect)
    }
    inspect(source)
  }

  ensure(registryCount === 1 && registryNode !== null, 'DATABASE_TABLE_KIND_INVALID', 'database/schema/index.ts must export exactly one lingguangSchema registry')
  const indexPath = join(schemaRoot, 'index.ts')
  const indexImports = importsByPath.get(indexPath)
  const registry = []
  const referencedTables = new Set()
  for (const property of registryNode.properties) {
    ensure(ts.isPropertyAssignment(property), 'DATABASE_TABLE_KIND_INVALID', 'schema registry entries must be property assignments')
    const registryKey = propertyName(property.name)
    ensure(ts.isObjectLiteralExpression(property.initializer), 'DATABASE_TABLE_KIND_INVALID', 'schema registry entry must be an object literal', {
      registryKey,
    })
    let tableIdentifier = null
    let tableKind = null
    for (const field of property.initializer.properties) {
      ensure(ts.isPropertyAssignment(field), 'DATABASE_TABLE_KIND_INVALID', 'schema registry fields must be property assignments', {
        registryKey,
      })
      const name = propertyName(field.name)
      if (name === 'table') {
        ensure(ts.isIdentifier(field.initializer), 'DATABASE_TABLE_KIND_INVALID', 'registry table must reference a declared Drizzle table', {
          registryKey,
        })
        tableIdentifier = field.initializer.text
      } else if (name === 'tableKind') {
        ensure(ts.isStringLiteral(field.initializer), 'DATABASE_TABLE_KIND_INVALID', 'tableKind must be a string literal', {
          registryKey,
        })
        tableKind = field.initializer.text
      } else {
        fail('DATABASE_TABLE_KIND_INVALID', 'schema registry contains an unsupported field', { registryKey, field: name })
      }
    }
    ensure(tableIdentifier !== null && tableKind !== null, 'DATABASE_TABLE_KIND_INVALID', 'schema registry entry requires table and tableKind', {
      registryKey,
    })
    ensure(TABLE_KINDS.has(tableKind), 'DATABASE_TABLE_KIND_INVALID', 'tableKind is not supported', { registryKey, tableKind })

    let reference = `${indexPath}\0${tableIdentifier}`
    if (!tablesByReference.has(reference)) {
      const imported = indexImports.get(tableIdentifier)
      ensure(imported?.specifier?.startsWith('.'), 'DATABASE_TABLE_KIND_INVALID', 'registry references an unknown table', {
        registryKey,
      })
      const importedPath = modulePath(indexPath, imported.specifier, schemaRoot)
      reference = `${importedPath}\0${imported.importedName}`
    }
    const tableName = tablesByReference.get(reference)
    ensure(tableName !== undefined, 'DATABASE_TABLE_KIND_INVALID', 'registry references an unknown table declaration', {
      registryKey,
    })
    ensure(!referencedTables.has(reference), 'DATABASE_TABLE_KIND_INVALID', 'a Drizzle table appears more than once in lingguangSchema', {
      tableName,
    })
    referencedTables.add(reference)
    registry.push({ tableName, tableKind })
  }
  ensure(
    referencedTables.size === tablesByReference.size,
    'DATABASE_TABLE_KIND_INVALID',
    'every Drizzle table must appear exactly once in lingguangSchema',
    { declaredTableCount: tablesByReference.size, registryTableCount: referencedTables.size },
  )
  ensure(new Set(registry.map((entry) => entry.tableName)).size === registry.length, 'DATABASE_TABLE_KIND_INVALID', 'database table names must be unique')
  return registry.sort((left, right) => compareCanonicalText(left.tableName, right.tableName))
}

function validateMigrationLayout(databaseRoot) {
  const migrationsRoot = join(databaseRoot, 'migrations')
  const metaRoot = join(migrationsRoot, 'meta')
  ensure(existsSync(migrationsRoot) && lstatSync(migrationsRoot).isDirectory(), 'DATABASE_MIGRATION_LAYOUT_INVALID', 'database/migrations is required')
  ensure(existsSync(metaRoot) && lstatSync(metaRoot).isDirectory(), 'DATABASE_MIGRATION_LAYOUT_INVALID', 'database/migrations/meta is required')
  const journalPath = join(metaRoot, '_journal.json')
  ensure(existsSync(journalPath), 'DATABASE_MIGRATION_LAYOUT_INVALID', 'database/migrations/meta/_journal.json is required')
  const journalFile = readUtf8(journalPath, 'DATABASE_MIGRATION_LAYOUT_INVALID', '_journal.json')
  ensure(journalFile.bytes.length <= LIMITS.journalBytes, 'DATABASE_MIGRATION_LAYOUT_INVALID', '_journal.json exceeds size limit')
  let journal
  try {
    journal = JSON.parse(journalFile.text)
  } catch {
    fail('DATABASE_MIGRATION_LAYOUT_INVALID', '_journal.json must contain valid JSON')
  }
  ensure(journal !== null && typeof journal === 'object' && Array.isArray(journal.entries), 'DATABASE_MIGRATION_LAYOUT_INVALID', '_journal.json entries must be an array')
  ensure(journal.dialect === 'mysql', 'DATABASE_MIGRATION_LAYOUT_INVALID', '_journal.json dialect must be mysql')
  ensure(journal.entries.length > 0 && journal.entries.length <= LIMITS.migrationCount, 'DATABASE_MIGRATION_LAYOUT_INVALID', 'migration count is outside the supported limit', {
    count: journal.entries.length,
    limit: LIMITS.migrationCount,
  })

  const rootEntries = readdirSync(migrationsRoot, { withFileTypes: true })
  for (const entry of rootEntries) {
    ensure(
      (entry.isDirectory() && entry.name === 'meta') || (entry.isFile() && extname(entry.name) === '.sql'),
      'DATABASE_MIGRATION_LAYOUT_INVALID',
      'database/migrations only accepts flat SQL files and meta/',
      { path: entry.name },
    )
  }
  const metaEntries = readdirSync(metaRoot, { withFileTypes: true })
  for (const entry of metaEntries) {
    ensure(
      entry.isFile() && (entry.name === '_journal.json' || /^[0-9]{4}_snapshot\.json$/.test(entry.name)),
      'DATABASE_MIGRATION_LAYOUT_INVALID',
      'database/migrations/meta contains an unsupported entry',
      { path: entry.name },
    )
  }

  const migrations = []
  const expectedSql = new Set()
  const expectedSnapshots = new Set(['_journal.json'])
  const tags = new Set()
  let sqlTotalBytes = 0
  let snapshotTotalBytes = 0
  let historyStatementCount = 0
  for (const [position, entry] of journal.entries.entries()) {
    ensure(entry !== null && typeof entry === 'object', 'DATABASE_MIGRATION_LAYOUT_INVALID', 'journal entry must be an object', { position })
    ensure(entry.idx === position, 'DATABASE_MIGRATION_LAYOUT_INVALID', 'journal idx values must be continuous and ordered', {
      position,
      idx: entry.idx,
    })
    ensure(typeof entry.tag === 'string' && SAFE_MIGRATION_TAG.test(entry.tag), 'DATABASE_MIGRATION_LAYOUT_INVALID', 'journal migration tag is unsafe', {
      position,
    })
    ensure(!tags.has(entry.tag), 'DATABASE_MIGRATION_LAYOUT_INVALID', 'journal migration tags must be unique', { migrationId: entry.tag })
    tags.add(entry.tag)
    const sqlName = `${entry.tag}.sql`
    const snapshotName = `${String(position).padStart(4, '0')}_snapshot.json`
    expectedSql.add(sqlName)
    expectedSnapshots.add(snapshotName)
    const sqlPath = join(migrationsRoot, sqlName)
    const snapshotPath = join(metaRoot, snapshotName)
    ensure(existsSync(sqlPath), 'DATABASE_MIGRATION_LAYOUT_INVALID', 'journal SQL file is missing', { migrationId: entry.tag })
    ensure(existsSync(snapshotPath), 'DATABASE_MIGRATION_LAYOUT_INVALID', 'journal snapshot file is missing', { migrationId: entry.tag })
    const sqlFile = readUtf8(sqlPath, 'DATABASE_MIGRATION_SQL_INVALID', 'migration SQL')
    ensure(sqlFile.bytes.length <= LIMITS.migrationFileBytes, 'DATABASE_MIGRATION_LAYOUT_INVALID', 'migration SQL exceeds size limit', {
      migrationId: entry.tag,
      limit: LIMITS.migrationFileBytes,
    })
    sqlTotalBytes += sqlFile.bytes.length
    const statements = parseContractSql(sqlFile.text, { allowAddColumn: true })
    ensure(statements.length <= LIMITS.migrationStatementCount, 'DATABASE_MIGRATION_LAYOUT_INVALID', 'migration exceeds statement limit', {
      migrationId: entry.tag,
      limit: LIMITS.migrationStatementCount,
    })
    historyStatementCount += statements.length
    const snapshotBytes = readFileSync(snapshotPath)
    ensure(snapshotBytes.length <= LIMITS.snapshotFileBytes, 'DATABASE_MIGRATION_LAYOUT_INVALID', 'migration snapshot exceeds size limit', {
      migrationId: entry.tag,
      limit: LIMITS.snapshotFileBytes,
    })
    snapshotTotalBytes += snapshotBytes.length
    try {
      JSON.parse(textDecoder.decode(snapshotBytes))
    } catch {
      fail('DATABASE_MIGRATION_LAYOUT_INVALID', 'migration snapshot must contain valid UTF-8 JSON', {
        migrationId: entry.tag,
      })
    }
    migrations.push({
      id: entry.tag,
      sqlSha256: sha256(sqlFile.bytes),
      statements: statements.map((statement, statementIndex) => ({
        index: statementIndex,
        operation: statement.operation,
        tableName: statement.tableName,
        columnName: statement.columnName,
        sqlSha256: statement.sqlSha256,
        rawSql: statement.rawSql,
        ...(statement.table ? { table: statement.table } : {}),
        ...(statement.column ? { column: statement.column } : {}),
      })),
      snapshotSha256: sha256(snapshotBytes),
    })
  }
  ensure(sqlTotalBytes <= LIMITS.migrationTotalBytes, 'DATABASE_MIGRATION_LAYOUT_INVALID', 'migration SQL files exceed total size limit')
  ensure(snapshotTotalBytes <= LIMITS.snapshotTotalBytes, 'DATABASE_MIGRATION_LAYOUT_INVALID', 'migration snapshots exceed total size limit')
  ensure(historyStatementCount <= LIMITS.historyStatementCount, 'DATABASE_MIGRATION_LAYOUT_INVALID', 'migration history exceeds statement limit')

  const actualSql = new Set(rootEntries.filter((entry) => entry.isFile()).map((entry) => entry.name))
  const actualSnapshots = new Set(metaEntries.filter((entry) => entry.isFile()).map((entry) => entry.name))
  ensure(
    actualSql.size === expectedSql.size && [...actualSql].every((name) => expectedSql.has(name)),
    'DATABASE_MIGRATION_LAYOUT_INVALID',
    'migration SQL files do not map one-to-one with journal entries',
  )
  ensure(
    actualSnapshots.size === expectedSnapshots.size && [...actualSnapshots].every((name) => expectedSnapshots.has(name)),
    'DATABASE_MIGRATION_LAYOUT_INVALID',
    'migration snapshots do not map one-to-one with journal entries',
  )
  return {
    migrations,
    journalSha256: sha256(journalFile.bytes),
  }
}

function findExecutable(name, projectRoot) {
  const extension = process.platform === 'win32' ? '.cmd' : ''
  const candidates = [
    join(projectRoot, 'node_modules', '.bin', `${name}${extension}`),
    join('/root/node_modules/.bin', `${name}${extension}`),
  ]
  for (const directory of String(process.env['PATH'] ?? '').split(process.platform === 'win32' ? ';' : ':')) {
    if (directory) candidates.push(join(directory, `${name}${extension}`))
  }
  return candidates.find((candidate) => existsSync(candidate))
}

function resolveNodeModules(projectRoot, drizzleKitExecutable) {
  const candidates = [
    join(projectRoot, 'node_modules'),
    process.env['LINGGUANG_TRUSTED_NODE_MODULES'],
    '/root/node_modules',
    drizzleKitExecutable ? dirname(dirname(drizzleKitExecutable)) : undefined,
  ]
  const found = candidates.find((candidate) => typeof candidate === 'string' && existsSync(join(candidate, 'drizzle-kit/package.json')))
  ensure(found !== undefined, 'DATABASE_SCHEMA_EXECUTION_FAILED', 'trusted Drizzle node_modules is unavailable')
  return resolve(found)
}

function packageVersion(nodeModules, packageName) {
  const path = join(nodeModules, ...packageName.split('/'), 'package.json')
  ensure(existsSync(path), 'DATABASE_SCHEMA_EXECUTION_FAILED', `trusted package ${packageName} is unavailable`)
  const value = JSON.parse(readFileSync(path, 'utf8')).version
  ensure(typeof value === 'string', 'DATABASE_SCHEMA_EXECUTION_FAILED', `trusted package ${packageName} has no version`)
  return value
}

function validateToolchain(nodeModules) {
  const actual = {
    drizzleOrm: packageVersion(nodeModules, 'drizzle-orm'),
    drizzleKit: packageVersion(nodeModules, 'drizzle-kit'),
    nodeSqlParser: packageVersion(nodeModules, 'node-sql-parser'),
  }
  ensure(canonicalJson(actual) === canonicalJson(TOOLCHAIN), 'DATABASE_SCHEMA_EXECUTION_FAILED', 'trusted database toolchain version mismatch', {
    expected: TOOLCHAIN,
    actual,
  })
  return actual
}

function migrationManifest(root) {
  const manifest = {}
  if (!existsSync(root)) return manifest
  for (const path of walk(root)) {
    const key = relative(root, path).split(sep).join('/')
    const bytes = readFileSync(path)
    manifest[key] = { size: bytes.length, sha256: sha256(bytes) }
  }
  return manifest
}

function runTool(executable, args, cwd, nodeModules, timeoutMs) {
  const result = spawnSync(executable, args, {
    cwd,
    env: {
      ...process.env,
      PATH: `${join(nodeModules, '.bin')}${process.platform === 'win32' ? ';' : ':'}${String(process.env['PATH'] ?? '')}`,
    },
    encoding: 'utf8',
    input: '',
    timeout: timeoutMs,
    windowsHide: true,
  })
  if (result.error) {
    fail('DATABASE_SCHEMA_EXECUTION_FAILED', 'trusted database tool timed out or failed to start', {
      errorType: result.error.name,
    })
  }
  return result
}

function prepareValidatorWorkspace(projectRoot, databaseRoot, nodeModules) {
  const workspace = mkdtempSync(join(tmpdir(), 'lingguang-database-validator-'))
  cpSync(databaseRoot, join(workspace, 'database'), { recursive: true, verbatimSymlinks: true })
  cpSync(join(projectRoot, 'drizzle.config.ts'), join(workspace, 'drizzle.config.ts'))
  cpSync(join(projectRoot, 'tooling/database'), join(workspace, 'tooling/database'), { recursive: true })
  writeFileSync(
    join(workspace, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2023',
          module: 'ESNext',
          moduleResolution: 'bundler',
          baseUrl: '.',
          paths: {
            '@lingguang/database-schema': ['./tooling/database/defineLingguangSchema.ts'],
          },
        },
      },
      null,
      2,
    ),
  )
  symlinkSync(nodeModules, join(workspace, 'node_modules'), 'dir')
  return workspace
}

function extractExportSql(stdout) {
  const normalized = String(stdout ?? '').replace(/\u001b\[[0-9;]*m/g, '').trim()
  const start = normalized.search(/CREATE\s+TABLE/i)
  ensure(start >= 0, 'DATABASE_SCHEMA_EXECUTION_FAILED', 'drizzle-kit export returned no CREATE TABLE statements')
  return normalized.slice(start)
}

function runTrustedDrizzleChecks(projectRoot, databaseRoot) {
  ensure(existsSync(join(projectRoot, 'drizzle.config.ts')), 'DATABASE_SCHEMA_EXECUTION_FAILED', 'trusted drizzle.config.ts is missing')
  ensure(existsSync(join(projectRoot, 'tooling/database/defineLingguangSchema.ts')), 'DATABASE_SCHEMA_EXECUTION_FAILED', 'trusted schema helper is missing')
  const executable = findExecutable('drizzle-kit', projectRoot)
  ensure(executable !== undefined, 'DATABASE_SCHEMA_EXECUTION_FAILED', 'drizzle-kit executable is unavailable')
  const nodeModules = resolveNodeModules(projectRoot, executable)
  const toolchain = validateToolchain(nodeModules)
  const workspace = prepareValidatorWorkspace(projectRoot, databaseRoot, nodeModules)
  try {
    const exported = runTool(executable, ['export', '--config', 'drizzle.config.ts'], workspace, nodeModules, 30_000)
    ensure(exported.status === 0, 'DATABASE_SCHEMA_EXECUTION_FAILED', 'drizzle-kit export failed', {
      returnCode: exported.status,
    })
    const exportSql = extractExportSql(exported.stdout)

    const migrationsRoot = join(workspace, 'database/migrations')
    const before = migrationManifest(migrationsRoot)
    const generated = runTool(executable, ['generate', '--config', 'drizzle.config.ts'], workspace, nodeModules, 30_000)
    if (generated.status !== 0) {
      const output = `${String(generated.stdout ?? '')}\n${String(generated.stderr ?? '')}`
      const looksInteractive = /rename|created or renamed|column.*created/i.test(output)
      fail(
        looksInteractive ? 'DATABASE_MIGRATION_OUT_OF_DATE' : 'DATABASE_SCHEMA_EXECUTION_FAILED',
        looksInteractive
          ? 'database migration generation requires a local developer decision'
          : 'drizzle-kit generate consistency probe failed',
        { returnCode: generated.status },
      )
    }
    const after = migrationManifest(migrationsRoot)
    if (canonicalJson(before) !== canonicalJson(after)) {
      const changedPaths = [...new Set([...Object.keys(before), ...Object.keys(after)])]
        .filter((path) => canonicalJson(before[path]) !== canonicalJson(after[path]))
        .sort(compareCanonicalText)
      fail('DATABASE_MIGRATION_OUT_OF_DATE', 'database schema has uncommitted generated migration changes', {
        changedPaths,
      })
    }
    return { exportSql, toolchain }
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
}

function attachTableKinds(tables, registry) {
  const kindByTable = new Map(registry.map((entry) => [entry.tableName, entry.tableKind]))
  ensure(tables.length === registry.length, 'DATABASE_TABLE_KIND_INVALID', 'exported tables and lingguangSchema registry do not match')
  return tables
    .map((table) => {
      const tableKind = kindByTable.get(table.name)
      ensure(tableKind !== undefined, 'DATABASE_TABLE_KIND_INVALID', 'exported table is missing from lingguangSchema', {
        tableName: table.name,
      })
      return { ...table, tableKind }
    })
    .sort((left, right) => compareCanonicalText(left.name, right.name))
}

function replayMigrations(migrations, registry) {
  const kindByTable = new Map(registry.map((entry) => [entry.tableName, entry.tableKind]))
  const tables = new Map()
  for (const migration of migrations) {
    for (const statement of migration.statements) {
      if (statement.operation === 'CREATE_TABLE') {
        ensure(!tables.has(statement.tableName), 'DATABASE_SCHEMA_TARGET_MISMATCH', 'migration history creates a table more than once', {
          tableName: statement.tableName,
        })
        const tableKind = kindByTable.get(statement.tableName)
        ensure(tableKind !== undefined, 'DATABASE_TABLE_KIND_INVALID', 'migration creates a table missing from lingguangSchema', {
          tableName: statement.tableName,
        })
        tables.set(statement.tableName, { ...statement.table, tableKind })
      } else {
        const table = tables.get(statement.tableName)
        ensure(table !== undefined, 'DATABASE_SCHEMA_TARGET_MISMATCH', 'ADD COLUMN targets a table not yet created', {
          tableName: statement.tableName,
        })
        ensure(
          !table.columns.some((column) => column.name === statement.columnName),
          'DATABASE_SCHEMA_TARGET_MISMATCH',
          'ADD COLUMN targets an existing column',
          { tableName: statement.tableName, columnName: statement.columnName },
        )
        table.columns.push({ ...statement.column, position: table.columns.length })
      }
    }
  }
  return [...tables.values()].sort((left, right) => compareCanonicalText(left.name, right.name))
}

function verifyDisposableSqlite(migrations) {
  const database = new DatabaseSync(':memory:')
  try {
    database.exec('BEGIN')
    for (const migration of migrations) {
      for (const statement of migration.statements) database.exec(statement.rawSql)
    }
    database.exec('COMMIT')
  } catch (error) {
    try {
      database.exec('ROLLBACK')
    } catch {
      // The original SQLite execution failure is authoritative.
    }
    fail('DATABASE_SCHEMA_CONTRACT_REJECTED', 'accepted migration SQL is not directly executable by SQLite preview', {
      errorType: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
    })
  } finally {
    database.close()
  }
}

function applyMigrationHistoryHashes(migrations) {
  let historyHash = sha256(Buffer.from(canonicalJson([MIGRATION_CONTRACT_VERSION]), 'utf8'))
  return migrations.map((migration) => {
    historyHash = sha256(Buffer.from(canonicalJson([historyHash, migration.id, migration.sqlSha256]), 'utf8'))
    return { ...migration, historyHashAfter: historyHash }
  })
}

function validateDatabaseRootShape(databaseRoot) {
  const allowed = new Set(['schema', 'migrations'])
  for (const entry of readdirSync(databaseRoot, { withFileTypes: true })) {
    ensure(entry.isDirectory() && allowed.has(entry.name), 'DATABASE_SCHEMA_LAYOUT_INVALID', 'database/ only accepts schema/ and migrations/', {
      path: entry.name,
    })
  }
  ensure(existsSync(join(databaseRoot, 'schema')), 'DATABASE_SCHEMA_LAYOUT_INVALID', 'database/schema is required')
  ensure(existsSync(join(databaseRoot, 'migrations')), 'DATABASE_MIGRATION_LAYOUT_INVALID', 'database/migrations is required')
}

export function validateDatabaseProject({ projectRoot = process.cwd() } = {}) {
  const resolvedProjectRoot = resolve(projectRoot)
  const databaseRoot = join(resolvedProjectRoot, 'database')
  if (!existsSync(databaseRoot)) {
    return {
      formatVersion: DATABASE_BUNDLE_FORMAT_VERSION,
      present: false,
      dialect: DATABASE_DIALECT,
      schemaContractVersion: SCHEMA_CONTRACT_VERSION,
      migrationContractVersion: MIGRATION_CONTRACT_VERSION,
      toolchain: TOOLCHAIN,
    }
  }
  const databaseStat = lstatSync(databaseRoot)
  ensure(databaseStat.isDirectory() && !databaseStat.isSymbolicLink(), 'DATABASE_SCHEMA_LAYOUT_INVALID', 'database must be a real directory')
  validateDatabaseRootShape(databaseRoot)
  const registry = validateSchemaSources(join(databaseRoot, 'schema'))
  const layout = validateMigrationLayout(databaseRoot)
  const trusted = runTrustedDrizzleChecks(resolvedProjectRoot, databaseRoot)

  const exportedStatements = parseContractSql(trusted.exportSql, { allowAddColumn: false })
  ensure(exportedStatements.every((statement) => statement.operation === 'CREATE_TABLE'), 'DATABASE_SCHEMA_CONTRACT_REJECTED', 'drizzle-kit export must contain only CREATE TABLE statements')
  ensure(exportedStatements.length <= LIMITS.tableCount, 'DATABASE_SCHEMA_LAYOUT_INVALID', 'schema exceeds business table limit', {
    count: exportedStatements.length,
    limit: LIMITS.tableCount,
  })
  const targetTables = attachTableKinds(
    exportedStatements.map((statement) => statement.table),
    registry,
  )
  const replayedTables = replayMigrations(layout.migrations, registry)
  ensure(
    canonicalJson(targetTables) === canonicalJson(replayedTables),
    'DATABASE_SCHEMA_TARGET_MISMATCH',
    'migration replay does not match the exported Drizzle schema',
  )
  verifyDisposableSqlite(layout.migrations)

  const schema = {
    contractVersion: SCHEMA_CONTRACT_VERSION,
    dialect: DATABASE_DIALECT,
    tables: targetTables,
  }
  const migrations = applyMigrationHistoryHashes(layout.migrations)
  const schemaHash = sha256(Buffer.from(canonicalJson(schema), 'utf8'))
  const migrationHistoryHash = migrations.at(-1)?.historyHashAfter ?? sha256(Buffer.from(canonicalJson([MIGRATION_CONTRACT_VERSION]), 'utf8'))
  return {
    formatVersion: DATABASE_BUNDLE_FORMAT_VERSION,
    present: true,
    dialect: DATABASE_DIALECT,
    schemaContractVersion: SCHEMA_CONTRACT_VERSION,
    migrationContractVersion: MIGRATION_CONTRACT_VERSION,
    toolchain: trusted.toolchain,
    schemaHash,
    migrationHistoryHash,
    tableCount: targetTables.length,
    migrationCount: migrations.length,
    latestMigrationId: migrations.at(-1)?.id ?? null,
    schema,
    migrations,
    metadataChecksums: {
      journalSha256: layout.journalSha256,
      snapshots: Object.fromEntries(migrations.map((migration) => [migration.id, migration.snapshotSha256])),
    },
  }
}

export function summarizeDatabaseBundle(bundle) {
  if (!bundle.present) return { present: false }
  return {
    present: true,
    dialect: bundle.dialect,
    schemaContractVersion: bundle.schemaContractVersion,
    migrationContractVersion: bundle.migrationContractVersion,
    toolchain: bundle.toolchain,
    schemaHash: bundle.schemaHash,
    migrationHistoryHash: bundle.migrationHistoryHash,
    tableCount: bundle.tableCount,
    migrationCount: bundle.migrationCount,
    latestMigrationId: bundle.latestMigrationId,
  }
}
