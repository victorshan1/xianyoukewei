import { spawnSync } from 'node:child_process'

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (process.env['LINGGUANG_DATABASE_SCHEMA_VALIDATED'] !== '1') {
  run(process.execPath, ['scripts/db-check.mjs'])
}

run('tsc', ['-b'])
run('vite', ['build'])
