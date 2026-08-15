import fs from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'

export function validatePrdPlugin(): Plugin {
  let prdPath = ''

  return {
    name: 'validate-prd',
    enforce: 'pre',
    apply: 'build',

    configResolved(config) {
      prdPath = path.resolve(config.root, 'docs/prd.md')
    },

    async buildStart() {
      if (!prdPath) return

      try {
        const stat = await fs.stat(prdPath)
        if (stat.isFile()) return
      } catch {
        // The error below provides the same actionable message for missing and unreadable files.
      }

      this.error({
        message:
          `[validate-prd] 构建失败: 缺少产品需求文档 docs/prd.md\n` +
          `文件: ${prdPath}\n\n` +
          `请先在项目根目录的 docs/prd.md 中补充本次开发的产品需求文档，` +
          `至少说明实现目标、核心功能、交互流程和验收标准，然后重新执行 npm run build。`,
        loc: {
          file: prdPath,
          line: 1,
          column: 1,
        },
      })
    },
  }
}
