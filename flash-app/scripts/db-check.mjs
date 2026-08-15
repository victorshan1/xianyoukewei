import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  DatabaseContractError,
  summarizeDatabaseBundle,
  validateDatabaseProject,
} from './database-contract.mjs'

function parseArguments(args) {
  let projectRoot = process.cwd()
  let output
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--project-root') {
      const value = args[index + 1]
      if (!value) throw new Error('--project-root requires a value')
      projectRoot = resolve(value)
      index += 1
    } else if (argument?.startsWith('--project-root=')) {
      projectRoot = resolve(argument.slice('--project-root='.length))
    } else if (argument === '--output') {
      const value = args[index + 1]
      if (!value) throw new Error('--output requires a value')
      output = resolve(value)
      index += 1
    } else if (argument?.startsWith('--output=')) {
      output = resolve(argument.slice('--output='.length))
    } else {
      throw new Error(`unsupported db:check argument: ${String(argument)}`)
    }
  }
  return { projectRoot, output }
}

let output
try {
  const options = parseArguments(process.argv.slice(2))
  output = options.output
  const bundle = validateDatabaseProject({ projectRoot: options.projectRoot })
  const result = { ok: true, bundle }
  if (output) writeFileSync(output, JSON.stringify(result))
  console.info(`[db:check] ${JSON.stringify(summarizeDatabaseBundle(bundle))}`)
} catch (error) {
  const result = {
    ok: false,
    error: {
      code: error instanceof DatabaseContractError ? error.code : 'DATABASE_SCHEMA_EXECUTION_FAILED',
      message: error instanceof Error ? error.message : String(error),
      details: error instanceof DatabaseContractError ? error.details : {},
    },
  }
  if (output) writeFileSync(output, JSON.stringify(result))
  console.error(`[db:check] ${JSON.stringify(result.error)}`)
  process.exit(1)
}
