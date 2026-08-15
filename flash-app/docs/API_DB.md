---
skill_name: DB
display_name: 数据库
description: 关系型数据库的权限模型、源码声明与前端运行时读写规范
api_file: API_DB.md
enable: true
implemented: true
---

# 关系型数据库开发规范

本文适用于使用 `developer-react-scaffold` 开发并以源码包提交的应用。

数据库应用分为两个彼此独立的阶段：

1. 在源码中使用 Drizzle 声明表结构并生成 migration；CHECKING/PUBLISHING 会校验并应用这些 DDL。
2. 应用运行时通过 `window.lingguang.db.query()` 和 `window.lingguang.db.execute()` 读写业务数据。

数据库表结构必须通过源码中的 Drizzle schema 和 migration 管理；应用运行时不得执行 DDL。Drizzle 的目录、示例和本地命令见 [API_DATABASE.md](./API_DATABASE.md)。

## 何时使用数据库

以下场景应使用 DB：

- 多条、会持续增长的结构化记录，例如待办、笔记、订单、报名、评论、库存和签到记录。
- 需要按记录增删改查、条件筛选、排序、分页或聚合的数据。
- 多用户共享数据，或者需要管理员与普通用户不同的数据权限。

以下场景优先使用 `lingguang.storage`：

- 每个用户独有、数量少且 key 固定的简单配置，例如主题、偏好和单份游戏进度。

不要把大量记录序列化后塞入一个 storage key。天气、新闻、股价、搜索结果等实时外部数据也不应当作为内置数据库内容；这类数据应使用对应的联网能力。

## 数据对象与表权限

设计 schema 前，先在 `docs/prd.md` 的“数据与权限边界”中逐项写清楚：谁创建、谁可读、谁可写、普通用户之间是否可见、管理员是否需要汇总或维护。每张表必须选择一个 `tableKind`：

| `tableKind` | 语义 | 常见用途 |
| --- | --- | --- |
| `user` | 当前用户私有，用户之间隔离 | 私人笔记、个人进度、收藏 |
| `managed_user` | 用户之间隔离，管理员可以汇总和维护 | 员工填报、学生提交、审批材料 |
| `share` | 所有用户共享读写 | 协作清单、共享留言 |
| `share_owned` | 所有人可读，记录创建者写自己的记录 | 公共作品、报名、评论、评分 |

不要自行创建 `users`、`admins`、`roles`、`permissions` 等平台身份或权限表。老板、老师、运营、审核员等平台维护身份使用脚手架提供的 `window.currentRole`：

```ts
await window.currentRoleReady
const isManager = window.currentRole === 'MANAGER'
```

角色判断只用于 UI 入口显隐；真正的数据权限由平台后端根据 `tableKind` 执行。业务代码不要重新声明 `window.lingguang`、`lingguang.db`、`window.currentRole` 或相关类型。

## 源码 schema 与 migration

- 不使用数据库的应用不要创建 `database/` 目录。
- 使用数据库时，以 `database/schema/*.ts` 作为表结构源码；只从 `drizzle-orm/mysql-core` 导入受支持的 builder。
- `database/schema/index.ts` 必须导出全部业务表，并通过 `@lingguang/database-schema` 导出唯一的 `lingguangSchema`；每张表都必须登记 `tableKind`。
- schema 必须是静态声明，不能在 `mysqlTable()` 参数或 registry 中执行动态表达式。
- 使用 MySQL dialect。当前受支持的列类型为 `tinyint`、`smallint`、`int`、`bigint`、`varchar`、`decimal`、`float`、`double`、`date`、`time` 和 `timestamp`。
- 每张表必须显式声明主键；不支持自增主键。不要声明外键、普通索引、唯一索引、列注释、collation 或函数默认值。
- 表名、列名使用英文字母开头的字母数字下划线标识符，不要声明平台保留字段。

修改 schema 后运行：

```bash
npm run db:generate -- --name=add_note
npm run db:check
```

`db:generate` 会生成 `database/migrations/*.sql`、`meta/_journal.json` 和 snapshot。必须把这些文件与 schema 一起保留；不要手写 migration，不要修改、删除、重排或 squash 已经应用的 migration。

migration 只允许：

- `CREATE TABLE`
- `ALTER TABLE ... ADD COLUMN`

不允许在 migration 中执行 `INSERT`、`UPDATE`、`DELETE`、建索引、删除、重命名或修改已有表/列。为已有表增加 `NOT NULL` 列时必须提供兼容旧数据的字面量默认值。若 `db:generate` 生成了其他操作，应回到 schema 和产品设计调整，而不是手改 SQL 绕过校验。

migration 只承载表结构变化，不承载初始化数据。固定默认内容应放在代码常量或静态资源中，不能写进 migration 或页面启动逻辑。

## 本地预览

执行以下命令启动带数据库的本地预览：

```bash
npm run db:check
npm run dev
```

Preview Host 会把数据库持久化到 `.local-preview/app.sqlite`。如果检测到已执行的 migration 被改写，它会保留现有数据库并停止启动。

只有在确认本地预览数据可以全部丢弃时，才执行：

```bash
npm run db:reset-local
```

随后重新运行 `npm run dev`。`db:reset-local` 只删除本地预览数据库，不会修改 schema 或 migration。

## 运行时接口

脚手架已经内置接口类型，业务代码直接调用即可：

```ts
type DbRequest = {
  sql: string
  binds?: Array<null | string | number | boolean | Date>
  timeoutMs?: number
  signal?: AbortSignal
}

type DbQueryResult<T> = {
  success: boolean
  data: T[]
  message?: string
}

type DbExecuteResult = {
  success: boolean
  data: { rowsAffected: number }
  message?: string
}
```

- `window.lingguang.db.query<T>(request)` 只用于 `SELECT`。
- `window.lingguang.db.execute(request)` 只用于 `INSERT`、`UPDATE` 和 `DELETE`。
- 前端运行时绝对禁止 `CREATE TABLE`、`ALTER TABLE`、`DROP TABLE` 等 DDL。

查询示例：

```ts
type NoteRow = {
  noteId: string
  title: string
  createdAt: string
}

const result = await window.lingguang.db.query<NoteRow>({
  sql: `
    SELECT
      id AS noteId,
      title AS title,
      created_at AS createdAt
    FROM notes
    ORDER BY created_at DESC
    LIMIT ?
  `,
  binds: [50],
  timeoutMs: 3000,
})

if (!result.success) {
  throw new Error(result.message ?? '查询失败')
}
```

写入示例：

```ts
const noteId = crypto.randomUUID()
const createdAt = Date.now()

const result = await window.lingguang.db.execute({
  sql: `
    INSERT INTO notes (id, title, created_at)
    VALUES (?, ?, ?)
  `,
  binds: [noteId, title, createdAt],
})

if (!result.success || result.data.rowsAffected !== 1) {
  throw new Error(result.message ?? '保存失败')
}
```

## 运行时 SQL 约束

- 所有动态值都必须通过 `?` 与一维 `binds` 数组绑定，数量和顺序必须完全对应；禁止拼接用户输入。
- `SELECT` 必须带 `LIMIT`，且不超过 5000。优先显式列出字段并使用稳定别名；JOIN 字段必须消除重名。
- 只使用两表 `INNER JOIN` / `LEFT JOIN`，且 `ON` 只写简单等值条件。
- 不使用子查询、`EXISTS`、CTE、`UNION`、窗口函数、事务语句、`RIGHT JOIN`、`FULL JOIN` 或三表 JOIN。
- 聚合只使用 `COUNT`、`SUM`、`AVG`、`MAX` 和 `MIN`。随机选择、复杂格式化和复杂计算应在读取有限数据后由 TypeScript 完成。
- 不要把数组作为单个 bind 传给 `IN (?)`；需要少量多值匹配时，使用与 bind 数量一致的占位符，或改写成明确的 `OR` 条件。
- `DATE`、`TIME`、`TIMESTAMP` 查询结果按字符串处理。用户可见时间、当地日期和时区敏感值由业务代码生成后绑定，不依赖 SQL 当前时间函数。
- 主键由业务代码使用 `crypto.randomUUID()` 等方式生成并显式写入；禁止使用 `Date.now()`、日期字符串或随机短整数作为 ID，也不支持 `lastInsertId`。
- 对搜索等频繁请求使用 `AbortSignal`，对可能较慢的请求设置 `timeoutMs`。
- `success: false` 必须作为失败处理，在 UI 中保留原数据并展示可重试错误；不能伪装成空列表或“暂无数据”。

## 列表刷新与写后回读

数据库列表至少区分首次加载、后台刷新、写操作和错误状态。进入页面、筛选/排序/分页变化以及写操作成功后，应重新读取当前查询或可靠地局部更新当前项。静默刷新必须有合理间隔、页面可见性判断、timer 清理和同一列表单请求保护；同时保留已有列表、筛选条件和正在编辑的输入。

## 交付前检查

- `docs/prd.md` 已明确每个数据对象的权限边界和 `tableKind`。
- schema、`lingguangSchema` registry、migration SQL、journal 和 snapshot 一致。
- `npm run db:check` 通过，本地预览完成真实新增、查询、修改和删除验证。
- 运行时代码只有 DML/DQL，所有动态值均使用 binds，查询均有上限。
- 错误、加载、刷新和空状态在 UI 中可区分。
- `npm run check` 通过。
