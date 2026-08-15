import type { Plugin } from 'vite'

const LOCAL_PREVIEW_BASE_PATH = '/__lingguang__/base.js'
const RUNTIME_MODE_SCRIPT =
  '<script>window.__LINGGUANG_RUNTIME_MODE__ = "app-shell";</script>'

function enableExplicitAppShellMode(source: string): string {
  const declaration = 'const isDev = '
  const start = source.indexOf(`${declaration}(() => {`)
  const end = source.indexOf('\nconst DEV_MOCK_IMAGE_URL', start)
  if (start < 0 || end < 0) {
    throw new Error('Unable to locate the online base.js dev-mode detector')
  }
  const detectionExpression = source.slice(start + declaration.length, end)
  return `${source.slice(0, start)}${declaration}window.__LINGGUANG_RUNTIME_MODE__ !== "app-shell" && ${detectionExpression}${source.slice(end)}`
}

export function localPreviewBasePlugin(onlineBaseUrl: string): Plugin {
  let runtimeSource = ''

  return {
    name: 'local-preview-base',
    apply: 'serve',
    async configureServer(server) {
      const response = await fetch(onlineBaseUrl)
      if (!response.ok) {
        throw new Error(`Failed to load online base.js: HTTP ${String(response.status)}`)
      }
      runtimeSource = enableExplicitAppShellMode(await response.text())

      server.middlewares.use((request, response, next) => {
        const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1')
        if (requestUrl.pathname !== LOCAL_PREVIEW_BASE_PATH) {
          next()
          return
        }
        response.statusCode = 200
        response.setHeader('Content-Type', 'text/javascript; charset=utf-8')
        response.setHeader('Cache-Control', 'no-store')
        response.end(runtimeSource)
      })
    },
    transformIndexHtml(html) {
      return html.replace(
        /<script\b[^>]*\bsrc=["'][^"']*base(?:-[^"']*)?\.js["'][^>]*>\s*<\/script>/i,
        `${RUNTIME_MODE_SCRIPT}<script type="module" src="${LOCAL_PREVIEW_BASE_PATH}"></script>`,
      )
    },
  }
}
