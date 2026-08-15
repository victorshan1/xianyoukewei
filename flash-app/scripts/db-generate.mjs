import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

function parseName(args) {
  if (args.length === 0) return undefined
  let value
  if (args.length === 1 && args[0]?.startsWith('--name=')) {
    value = args[0].slice('--name='.length)
  } else if (args.length === 2 && args[0] === '--name') {
    value = args[1]
  } else {
    throw new Error('db:generate only accepts an optional --name argument')
  }
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value)) {
    throw new Error('migration name must match [A-Za-z0-9][A-Za-z0-9_-]{0,63}')
  }
  return value
}

try {
  if (!existsSync(resolve('database/schema/index.ts'))) {
    throw new Error('database/schema/index.ts is required before generating migrations')
  }
  const name = parseName(process.argv.slice(2))
  const args = ['generate', '--config', 'drizzle.config.ts']
  if (name !== undefined) args.push('--name', name)
  const generated = spawnSync('drizzle-kit', args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  })
  if (generated.error) throw generated.error
  if (generated.status !== 0) process.exit(generated.status ?? 1)

  const checked = spawnSync(process.execPath, ['scripts/db-check.mjs'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  })
  if (checked.error) throw checked.error
  process.exit(checked.status ?? 1)
} catch (error) {
  console.error(`[db:generate] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
