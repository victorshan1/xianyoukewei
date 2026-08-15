import { createHash } from 'node:crypto';
import path from 'node:path';
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';

type NodeAny = any;

type ModuleRecord = {
  id: string;
  kind: 'source' | 'virtual';
  extension: string;
  query: string;
  codeHash: string;
  staticImports: string[];
  dynamicImports: string[];
  parsed: boolean;
  astNodeCount: number;
};

type ParsedModuleRecord = {
  id: string;
  astNodeCount: number;
};

type ChunkRecord = {
  fileName: string;
  name: string;
  isEntry: boolean;
  isDynamicEntry: boolean;
  facadeModuleId: string | null;
  imports: string[];
  dynamicImports: string[];
  moduleIds: string[];
  codeHash: string;
  viteMetadata: {
    importedCss: string[];
    importedAssets: string[];
  };
};

type AssetRecord = {
  fileName: string;
  name: string | null;
  size: number;
  sourceHash: string;
};

type BundleContract = {
  schemaVersion: 1;
  producer: 'asap-vite-contract';
  vite: {
    mode: string;
    base: string;
    rootHash: string;
    outDir: string;
    assetsDir: string;
    sourcemap: boolean | string;
    manifest: boolean | string;
  };
  html: {
    beforeHash: string;
    afterHash: string;
    marker: string;
  };
  modules: ModuleRecord[];
  moduleGraph: Array<{
    id: string;
    importedIds: string[];
    dynamicallyImportedIds: string[];
    importers: string[];
    dynamicImporters: string[];
    isEntry: boolean;
  }>;
  chunks: ChunkRecord[];
  assets: AssetRecord[];
  invariants: string[];
  signature: string;
};

const PLUGIN_NAME = 'asap-vite-build-contract';
const CONTRACT_FILE_NAME = 'asap-vite-contract.json';
const CONTRACT_SIGNATURE_FILE_NAME = 'asap-vite-contract.sig';
const VIRTUAL_CONTRACT_ID = '\0asap:vite-build-contract';

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeModuleId(id: string): { id: string; query: string; kind: 'source' | 'virtual'; extension: string } {
  const queryIndex = id.indexOf('?');
  const withoutQuery = queryIndex >= 0 ? id.slice(0, queryIndex) : id;
  const query = queryIndex >= 0 ? id.slice(queryIndex) : '';
  const kind = withoutQuery.startsWith('\0') ? 'virtual' : 'source';
  const extension = path.extname(withoutQuery.replace(/\\/g, '/')).toLowerCase();

  return {
    id: withoutQuery,
    query,
    kind,
    extension,
  };
}

function toStableRelativeId(id: string, root: string): string {
  if (!id) return id;

  const virtualPrefix = id.startsWith('\0') ? '\0' : '';
  const normalized = id.slice(virtualPrefix.length).replace(/\\/g, '/');
  const normalizedRoot = root.replace(/\\/g, '/');
  if (normalized.startsWith(`${normalizedRoot}/`)) {
    return `${virtualPrefix}${normalized.slice(normalizedRoot.length + 1)}`;
  }

  return `${virtualPrefix}${normalized}`;
}

function sortUnique(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function getStaticStringValue(node: NodeAny): string | null {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions?.length === 0) {
    return node.quasis?.[0]?.value?.cooked ?? null;
  }
  return null;
}

function walk(node: NodeAny, visit: (node: NodeAny) => void) {
  if (!node || typeof node !== 'object') return;
  visit(node);

  for (const key of Object.keys(node)) {
    const value = node[key];
    if (!value) continue;

    if (Array.isArray(value)) {
      for (const child of value) {
        walk(child, visit);
      }
      continue;
    }

    if (value && typeof value.type === 'string') {
      walk(value, visit);
    }
  }
}

function analyzeAst(ast: NodeAny): {
  staticImports: string[];
  dynamicImports: string[];
  astNodeCount: number;
} {
  const staticImports: string[] = [];
  const dynamicImports: string[] = [];
  let astNodeCount = 0;

  walk(ast, (node) => {
    astNodeCount++;

    if (node.type === 'ImportDeclaration') {
      const source = getStaticStringValue(node.source);
      if (source) staticImports.push(source);
      return;
    }

    if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') {
      const source = getStaticStringValue(node.source);
      if (source) staticImports.push(source);
      return;
    }

    if (node.type === 'ImportExpression') {
      const source = getStaticStringValue(node.source);
      if (source) dynamicImports.push(source);
    }
  });

  return {
    staticImports: sortUnique(staticImports),
    dynamicImports: sortUnique(dynamicImports),
    astNodeCount,
  };
}

function createHtmlMarker(root: string, mode: string): string {
  return sha256(`asap-vite-contract:${root}:${mode}`).slice(0, 24);
}

function stringifyStable(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stringifyStable(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort((a, b) => a.localeCompare(b));
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stringifyStable(record[key])}`).join(',')}}`;
}

function normalizeSourcemap(value: ResolvedConfig['build']['sourcemap']): boolean | string {
  if (typeof value === 'boolean') return value;
  return value || false;
}

function normalizeManifest(value: ResolvedConfig['build']['manifest']): boolean | string {
  if (typeof value === 'boolean') return value;
  return value || false;
}

export function asapBuildContractPlugin(): Plugin {
  let config: ResolvedConfig | null = null;
  let server: ViteDevServer | null = null;
  let htmlBeforeHash = '';
  let htmlAfterHash = '';
  let htmlMarker = '';
  const modules = new Map<string, ModuleRecord>();
  const parsedModules = new Map<string, ParsedModuleRecord>();
  const moduleInfoIds = new Set<string>();

  const relativeId = (id: string) => toStableRelativeId(id, config?.root ?? process.cwd());

  function recordModule(code: string, id: string, ast: NodeAny | null) {
    const normalized = normalizeModuleId(id);
    const stableId = relativeId(normalized.id);
    const analysis = ast
      ? analyzeAst(ast)
      : {
          staticImports: [],
          dynamicImports: [],
          astNodeCount: 0,
        };

    modules.set(`${stableId}${normalized.query}`, {
      id: stableId,
      kind: normalized.kind,
      extension: normalized.extension,
      query: normalized.query,
      codeHash: sha256(code),
      staticImports: analysis.staticImports,
      dynamicImports: analysis.dynamicImports,
      parsed: Boolean(ast),
      astNodeCount: analysis.astNodeCount,
    });
  }

  function getModuleGraphRecord(id: string) {
    const info = this.getModuleInfo?.(id);
    if (!info) return null;

    return {
      id: relativeId(id),
      importedIds: sortUnique((info.importedIds ?? []).map((item) => relativeId(item))),
      dynamicallyImportedIds: sortUnique((info.dynamicallyImportedIds ?? []).map((item) => relativeId(item))),
      importers: sortUnique((info.importers ?? []).map((item) => relativeId(item))),
      dynamicImporters: sortUnique((info.dynamicImporters ?? []).map((item) => relativeId(item))),
      isEntry: Boolean(info.isEntry),
    };
  }

  return {
    name: PLUGIN_NAME,
    enforce: 'post',

    configResolved(resolvedConfig) {
      config = resolvedConfig;
      htmlMarker = createHtmlMarker(resolvedConfig.root, resolvedConfig.mode);
    },

    configureServer(viteServer) {
      server = viteServer;
      viteServer.middlewares.use('/__asap/vite-contract', (_req, res) => {
        const moduleIds = Array.from(viteServer.moduleGraph.idToModuleMap.keys())
          .map((id) => relativeId(id))
          .sort((a, b) => a.localeCompare(b));
        const payload = {
          producer: PLUGIN_NAME,
          mode: viteServer.config.mode,
          moduleGraphSize: moduleIds.length,
          moduleGraphHash: sha256(moduleIds.join('\n')),
          htmlMarker,
        };

        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(`${JSON.stringify(payload, null, 2)}\n`);
      });
    },

    handleHotUpdate(ctx) {
      const stableId = relativeId(ctx.file);
      const affectedModules = ctx.modules.map((mod) => relativeId(mod.id ?? mod.url)).sort((a, b) => a.localeCompare(b));
      server?.ws.send({
        type: 'custom',
        event: 'asap:vite-contract:update',
        data: {
          file: stableId,
          affectedModules,
          updateHash: sha256(`${stableId}\n${affectedModules.join('\n')}`),
        },
      });

      return ctx.modules;
    },

    resolveId(id) {
      if (id === 'virtual:asap-vite-contract') {
        return VIRTUAL_CONTRACT_ID;
      }

      return null;
    },

    load(id) {
      if (id !== VIRTUAL_CONTRACT_ID) {
        return null;
      }

      return [
        `export const producer = ${JSON.stringify(PLUGIN_NAME)};`,
        `export const marker = ${JSON.stringify(htmlMarker)};`,
        'export default { producer, marker };',
      ].join('\n');
    },

    transformIndexHtml(html) {
      htmlBeforeHash = sha256(html);
      const marker = [
        `<!-- asap-vite-contract:${htmlMarker} -->`,
        `<meta name="asap-vite-contract" content="${htmlMarker}">`,
      ].join('\n    ');

      const nextHtml = html.includes('</head>')
        ? html.replace('</head>', `    ${marker}\n  </head>`)
        : `${marker}\n${html}`;

      htmlAfterHash = sha256(nextHtml);
      return nextHtml;
    },

    transform(code, id) {
      if (id.includes('/node_modules/')) return null;

      let ast: NodeAny | null = null;
      try {
        ast = this.parse(code);
      } catch {
        ast = null;
      }

      recordModule(code, id, ast);
      return null;
    },

    moduleParsed(moduleInfo) {
      const stableId = relativeId(moduleInfo.id);
      let astNodeCount = 0;
      moduleInfoIds.add(moduleInfo.id);

      if (moduleInfo.ast) {
        walk(moduleInfo.ast as NodeAny, () => {
          astNodeCount++;
        });
      }

      parsedModules.set(stableId, {
        id: stableId,
        astNodeCount,
      });
    },

    generateBundle(_options, bundle) {
      if (!config) return;

      const chunks: ChunkRecord[] = [];
      const assets: AssetRecord[] = [];
      const outputModuleIds = new Set<string>();

      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk') {
          const metadata = (item as any).viteMetadata;
          const rawModuleIds = Object.keys(item.modules ?? {});
          const moduleIds = rawModuleIds.map((id) => relativeId(id));

          for (const moduleId of rawModuleIds) {
            outputModuleIds.add(moduleId);
          }

          chunks.push({
            fileName: item.fileName,
            name: item.name,
            isEntry: item.isEntry,
            isDynamicEntry: item.isDynamicEntry,
            facadeModuleId: item.facadeModuleId ? relativeId(item.facadeModuleId) : null,
            imports: sortUnique(item.imports ?? []),
            dynamicImports: sortUnique(item.dynamicImports ?? []),
            moduleIds: sortUnique(moduleIds),
            codeHash: sha256(item.code),
            viteMetadata: {
              importedCss: sortUnique(metadata?.importedCss ?? []),
              importedAssets: sortUnique(metadata?.importedAssets ?? []),
            },
          });
          continue;
        }

        const source = typeof item.source === 'string' ? item.source : item.source ?? new Uint8Array();
        assets.push({
          fileName: item.fileName,
          name: item.name ?? null,
          size: typeof source === 'string' ? Buffer.byteLength(source) : source.byteLength,
          sourceHash: sha256(source),
        });
      }

      const moduleGraph = Array.from(new Set([
        ...outputModuleIds,
        ...moduleInfoIds,
      ]))
        .sort((a, b) => relativeId(a).localeCompare(relativeId(b)))
        .map((id) => getModuleGraphRecord.call(this, id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      const moduleRecords = Array.from(modules.values())
        .map((item) => {
          const parsed = parsedModules.get(item.id);
          return parsed
            ? {
                ...item,
                astNodeCount: Math.max(item.astNodeCount, parsed.astNodeCount),
              }
            : item;
        })
        .sort((a, b) => `${a.id}${a.query}`.localeCompare(`${b.id}${b.query}`));

      const contractWithoutSignature: Omit<BundleContract, 'signature'> = {
        schemaVersion: 1,
        producer: 'asap-vite-contract',
        vite: {
          mode: config.mode,
          base: config.base,
          rootHash: sha256(config.root),
          outDir: config.build.outDir,
          assetsDir: config.build.assetsDir,
          sourcemap: normalizeSourcemap(config.build.sourcemap),
          manifest: normalizeManifest(config.build.manifest),
        },
        html: {
          beforeHash: htmlBeforeHash,
          afterHash: htmlAfterHash,
          marker: htmlMarker,
        },
        modules: moduleRecords,
        moduleGraph,
        chunks: chunks.sort((a, b) => a.fileName.localeCompare(b.fileName)),
        assets: assets.sort((a, b) => a.fileName.localeCompare(b.fileName)),
        invariants: [
          'html.afterHash includes the transformIndexHtml marker',
          'moduleGraph is derived from Rollup moduleInfo after Vite transforms',
          'chunk.viteMetadata is captured from Vite Rollup output metadata',
          'signature is sha256 over the canonical contract payload without signature',
        ],
      };

      const signature = sha256(stringifyStable(contractWithoutSignature));
      const contract: BundleContract = {
        ...contractWithoutSignature,
        signature,
      };
      const contractContent = `${JSON.stringify(contract, null, 2)}\n`;

      this.emitFile({
        type: 'asset',
        fileName: CONTRACT_FILE_NAME,
        source: contractContent,
      });
      this.emitFile({
        type: 'asset',
        fileName: CONTRACT_SIGNATURE_FILE_NAME,
        source: `${signature}\n`,
      });
    },
  };
}
