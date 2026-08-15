import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

const databasePath = resolve('.local-preview/app.sqlite')
for (const path of [databasePath, `${databasePath}-shm`, `${databasePath}-wal`]) {
  rmSync(path, { force: true })
}
console.info(`[db:reset-local] removed local preview database: ${databasePath}`)
