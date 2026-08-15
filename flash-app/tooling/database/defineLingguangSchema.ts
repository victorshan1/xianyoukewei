import type { AnyMySqlTable } from 'drizzle-orm/mysql-core'

export const LINGGUANG_TABLE_KINDS = [
  'user',
  'managed_user',
  'share',
  'share_owned',
] as const

export type LingguangTableKind = (typeof LINGGUANG_TABLE_KINDS)[number]

export type LingguangTableDefinition = {
  table: AnyMySqlTable
  tableKind: LingguangTableKind
}

export function defineLingguangSchema<
  const TSchema extends Record<string, LingguangTableDefinition>,
>(schema: TSchema): TSchema {
  return schema
}
