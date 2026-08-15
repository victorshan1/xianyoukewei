import path from 'node:path';
import type { IndexHtmlTransformResult, Plugin } from 'vite';
import {
  getInlineManifestJson,
  getManifestTitle,
  parseAndValidateManifest,
  readManifestFile,
  type AppManifest,
} from './manifest-utils';

type NodeAny = any;

const LOCAL_STORAGE_TOKEN = 'localStorage';

function walk(node: NodeAny, visit: (n: NodeAny) => void) {
  if (!node || typeof node !== 'object') return;
  visit(node);

  for (const key of Object.keys(node)) {
    const value = node[key];
    if (!value) continue;

    if (Array.isArray(value)) {
      for (const child of value) walk(child, visit);
    } else if (value && typeof value.type === 'string') {
      walk(value, visit);
    }
  }
}

function getStaticStringValue(node: NodeAny): string | null {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions?.length === 0) {
    return node.quasis?.[0]?.value?.cooked ?? null;
  }
  return null;
}

function containsLocalStorageToken(ast: NodeAny): boolean {
  let matched = false;

  walk(ast, (node) => {
    if (matched) return;

    // Intentionally broad: we prefer false positives over false negatives, so any
    // localStorage identifier or static string token counts as "uses localStorage".
    if (node.type === 'Identifier' && node.name === LOCAL_STORAGE_TOKEN) {
      matched = true;
      return;
    }

    if (getStaticStringValue(node) === LOCAL_STORAGE_TOKEN) {
      matched = true;
    }
  });

  return matched;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildManifestScript(manifest: AppManifest): string {
  const inlineManifest = getInlineManifestJson(manifest);
  return `\n    <script id="app-manifest" type="application/json">\n${inlineManifest}\n    </script>`;
}

function injectManifestIntoHead(html: string, manifest: AppManifest): string {
  const titleText = escapeHtml(getManifestTitle(manifest));
  const manifestScript = buildManifestScript(manifest);

  const titlePattern = /<title\b[^>]*>[\s\S]*?<\/title>/i;
  const titleMatch = html.match(titlePattern);

  if (titleMatch) {
    const replacement = `<title>${titleText}</title>${manifestScript}`;
    return html.replace(titlePattern, replacement);
  }

  const headOpenPattern = /<head\b[^>]*>/i;
  const headOpenMatch = html.match(headOpenPattern);
  if (!headOpenMatch) {
    return html;
  }

  const fallback = `${headOpenMatch[0]}\n    <title>${titleText}</title>${manifestScript}`;
  return html.replace(headOpenPattern, fallback);
}

function replaceManifestScript(html: string, manifest: AppManifest): string {
  const manifestScriptPattern =
    /<script id="app-manifest" type="application\/json">\s*[\s\S]*?<\/script>/i;

  if (manifestScriptPattern.test(html)) {
    return html.replace(manifestScriptPattern, buildManifestScript(manifest).trimStart());
  }

  return injectManifestIntoHead(html, manifest);
}

export function injectManifestPlugin(): Plugin {
  let manifestPath = '';
  let cachedManifest: AppManifest | null = null;
  let hasLocalStorageUsage = false;

  return {
    name: 'inject-manifest',
    // Run after TS/JSX transforms so AST scanning sees parseable module code.
    enforce: 'post',
    apply: 'build',

    configResolved(config) {
      manifestPath = path.resolve(config.root, 'manifest.json');
    },

    async buildStart() {
      if (!manifestPath) return;
      hasLocalStorageUsage = false;

      const manifestContent = await readManifestFile(manifestPath);
      const { manifest, errors, parseError } = parseAndValidateManifest(manifestContent);
      if (parseError || errors.length || !manifest) {
        cachedManifest = null;
        return;
      }

      cachedManifest = manifest;
    },

    transform(code, id) {
      if (hasLocalStorageUsage) return null;
      if (id.includes('/node_modules/')) return null;
      if (id.startsWith('\0')) return null;

      let ast: NodeAny;
      try {
        ast = this.parse(code);
      } catch {
        return null;
      }

      if (containsLocalStorageToken(ast)) {
        hasLocalStorageUsage = true;
      }

      return null;
    },

    async transformIndexHtml(html): Promise<IndexHtmlTransformResult> {
      let manifest = cachedManifest;

      if (!manifestPath) {
        return html;
      }

      if (!manifest) {
        const manifestContent = await readManifestFile(manifestPath);
        const result = parseAndValidateManifest(manifestContent);
        if (!result.manifest) {
          return html;
        }
        manifest = result.manifest;
        cachedManifest = manifest;
      }

      return injectManifestIntoHead(html, {
        ...manifest,
        localStorage: hasLocalStorageUsage,
      });
    },

    generateBundle(_options, bundle) {
      const indexHtml = bundle['index.html'];
      if (!indexHtml || indexHtml.type !== 'asset') {
        return;
      }

      let manifest = cachedManifest;
      if (!manifest) {
        return;
      }

      const html = typeof indexHtml.source === 'string'
        ? indexHtml.source
        : Buffer.from(indexHtml.source).toString('utf8');

      indexHtml.source = replaceManifestScript(html, {
        ...manifest,
        localStorage: hasLocalStorageUsage,
      });
    },
  };
}
