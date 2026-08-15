import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'mysql',
  schema: './database/schema/index.ts',
  out: './database/migrations',
  breakpoints: true,
  migrations: {
    prefix: 'index',
  },
})
