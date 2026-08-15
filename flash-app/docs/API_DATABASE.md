# Drizzle 数据库声明与本地预览

数据库结构使用 MySQL dialect 的 Drizzle schema 声明，应用运行时仍通过 `lingguang.db.query` 和 `lingguang.db.execute` 读写数据。

数据选型、四类 `tableKind` 的权限语义、运行时 SQL 限制和接口示例见 [API_DB.md](./API_DB.md)。源码中的 Drizzle schema 和 migration 是唯一的表结构声明方式。

不使用数据库的项目不要创建 `database/` 目录。

## 目录约定

```text
database/
  schema/
    notes.ts
    index.ts
  migrations/
    0000_initial.sql
    meta/
      0000_snapshot.json
      _journal.json
```

`database/schema/index.ts` 必须导出唯一的 `lingguangSchema` registry，并为每张表显式声明 `user`、`managed_user`、`share` 或 `share_owned`。

例如 `database/schema/notes.ts`：

```ts
import { mysqlTable, primaryKey, varchar } from 'drizzle-orm/mysql-core'

export const notes = mysqlTable(
  'notes',
  {
    id: varchar('id', { length: 64 }).notNull(),
    title: varchar('title', { length: 255 }).notNull().default('untitled'),
  },
  (table) => [primaryKey({ columns: [table.id] })],
)
```

对应的 `database/schema/index.ts`：

```ts
import { defineLingguangSchema } from '@lingguang/database-schema'
import { notes } from './notes'

export { notes }

export const lingguangSchema = defineLingguangSchema({
  notes: {
    table: notes,
    tableKind: 'user',
  },
})
```

## 开发命令

修改 schema 后执行：

```bash
npm run db:generate -- --name=add_note
npm run db:check
npm run dev
```

`db:generate` 只接受可选的 `--name`，不会连接生产数据库。

`db:check` 会校验固定版本工具链、migration 布局、SQL 操作白名单、完整 replay、Drizzle export 目标结构以及 SQLite 直接执行结果。

已应用 migration 不得修改、删除、重排或 squash。

本地 Preview 检测到历史变化时会保留 `.local-preview/app.sqlite` 并停止启动。

确认可以丢弃本地预览数据后，显式执行：

```bash
npm run db:reset-local
```
