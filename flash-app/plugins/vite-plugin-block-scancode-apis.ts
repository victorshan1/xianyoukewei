import type { Plugin } from 'vite'

type NodeAny = any

const BLOCKED_CONSTRUCTORS = new Set(['BarcodeDetector'])
const GLOBAL_OBJECTS = new Set(['window', 'globalThis', 'self'])

function getPropName(node: NodeAny): string | null {
  if (!node) return null
  if (node.type === 'Identifier') return node.name ?? null
  if (node.type === 'Literal') return typeof node.value === 'string' ? node.value : null
  return null
}

function getMemberPropName(node: NodeAny): string | null {
  if (!node || node.type !== 'MemberExpression') return null
  if (node.computed) {
    const prop = node.property
    if (prop?.type === 'Literal' && typeof prop.value === 'string') return prop.value
    return null
  }
  return getPropName(node.property)
}

function computeLineCol(code: string, index: number) {
  let line = 1
  let col = 1
  for (let i = 0; i < index && i < code.length; i++) {
    if (code.charCodeAt(i) === 10) {
      line++
      col = 1
    } else {
      col++
    }
  }
  return { line, column: col }
}

function walk(node: NodeAny, visit: (n: NodeAny) => void) {
  if (!node || typeof node !== 'object') return
  visit(node)

  for (const key of Object.keys(node)) {
    const value = node[key]
    if (!value) continue
    if (Array.isArray(value)) {
      for (const child of value) walk(child, visit)
    } else if (value && typeof value.type === 'string') {
      walk(value, visit)
    }
  }
}

function getCodeSnippet(code: string, start: number, end: number): string {
  const snippet = code.slice(start, end).trim()
  if (snippet.length > 80) {
    return `${snippet.slice(0, 77)}...`
  }
  return snippet
}

function extractMemberChain(node: NodeAny): string[] | null {
  if (!node || node.type !== 'MemberExpression') return null

  const parts: string[] = []
  let current: NodeAny = node

  while (current?.type === 'MemberExpression') {
    const prop = getMemberPropName(current)
    if (!prop) return null
    parts.unshift(prop)
    current = current.object
  }

  if (current?.type !== 'Identifier') return null
  parts.unshift(current.name)
  return parts
}

export function blockScancodeApisPlugin(): Plugin {
  return {
    name: 'block-scancode-apis',
    enforce: 'post',
    apply: 'build',

    transform(code, id) {
      if (id.includes('/node_modules/')) return null
      if (id.startsWith('\0')) return null

      let ast: NodeAny
      try {
        ast = this.parse(code)
      } catch {
        return null
      }

      const errorsByStart = new Map<number, {
        start: number
        end: number
        message: string
        codeSnippet?: string
      }>()

      const apiIdentifiersInMemberExpression = new Set<number>()

      const addError = (item: {
        start: number
        end: number
        message: string
        codeSnippet?: string
      }) => {
        const existing = errorsByStart.get(item.start)
        if (!existing || item.end > existing.end) {
          errorsByStart.set(item.start, item)
        }
      }

      walk(ast, (n) => {
        if (n.type === 'MemberExpression') {
          const chain = extractMemberChain(n)
          if (chain && chain.length >= 2) {
            const root = chain[0]
            const apiName = chain[1]
            if (GLOBAL_OBJECTS.has(root) && BLOCKED_CONSTRUCTORS.has(apiName)) {
              const start = n.start ?? 0
              const end = n.end ?? start + 20
              addError({
                start,
                end,
                message: `禁止使用浏览器原生 ${apiName}: ${chain.join('.')}`,
                codeSnippet: getCodeSnippet(code, start, end),
              })
            }
          }

          if (n.property?.type === 'Identifier' && BLOCKED_CONSTRUCTORS.has(n.property.name)) {
            apiIdentifiersInMemberExpression.add(n.property.start ?? 0)
          }

          let obj = n.object
          while (obj?.type === 'MemberExpression') {
            if (obj.property?.type === 'Identifier' && BLOCKED_CONSTRUCTORS.has(obj.property.name)) {
              apiIdentifiersInMemberExpression.add(obj.property.start ?? 0)
            }
            obj = obj.object
          }
          if (obj?.type === 'Identifier' && BLOCKED_CONSTRUCTORS.has(obj.name)) {
            apiIdentifiersInMemberExpression.add(obj.start ?? 0)
          }
        }
      })

      walk(ast, (n) => {
        if (n.type === 'Identifier' && BLOCKED_CONSTRUCTORS.has(n.name)) {
          const start = n.start ?? 0
          if (apiIdentifiersInMemberExpression.has(start)) return

          const end = n.end ?? start + n.name.length
          addError({
            start,
            end,
            message: `禁止使用浏览器原生 ${n.name}: 直接访问 ${n.name}`,
            codeSnippet: getCodeSnippet(code, start, end),
          })
        }
      })

      const errors = Array.from(errorsByStart.values()).sort((a, b) => a.start - b.start)
      if (!errors.length) return null

      const errorMessages = errors.map((err, idx) => {
        const loc = computeLineCol(code, err.start)
        return `  ${idx + 1}. ${err.message}\n     位置: ${loc.line}:${loc.column}${err.codeSnippet ? `\n     代码: ${err.codeSnippet}` : ''}`
      }).join('\n')

      const first = errors[0]
      const loc = computeLineCol(code, first.start)

      this.error({
        id,
        message:
          `[block-scancode-apis] 构建失败: 发现 ${errors.length} 处禁止的浏览器原生扫码 API 使用\n` +
          `文件: ${id}\n\n` +
          `错误:\n${errorMessages}\n\n` +
          '提示: 请改用 window.lingguang.scanCode(...)，参考 docs/API_SCANCODE.md。',
        loc,
      })

      return null
    },
  }
}
