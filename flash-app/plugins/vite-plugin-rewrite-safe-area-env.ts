import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import postcss from 'postcss';
import ts from 'typescript';
import type { Plugin } from 'vite';

const SAFE_AREA_ENV_RE = /env\s*\(\s*safe-area-inset-(?:top|right|bottom|left)\b/i;
const SCRIPT_SOURCE_GLOB = '**/*.{js,jsx,ts,tsx}';
const CSS_SOURCE_GLOB = '**/*.css';
const SAFE_AREA_ENV_TO_RUNTIME_VAR = new Map([
  ['safe-area-inset-top', '--flash-app-safe-area-inset-top'],
  ['safe-area-inset-right', '--flash-app-safe-area-inset-right'],
  ['safe-area-inset-bottom', '--flash-app-safe-area-inset-bottom'],
  ['safe-area-inset-left', '--flash-app-safe-area-inset-left'],
]);

type InlineSafeAreaViolation = {
  filePath: string;
  start: number;
  snippet: string;
};

type SourceCssSafeAreaUsage = {
  filePath: string;
  line?: number;
  column?: number;
  declaration: string;
};

function computeLineCol(code: string, index: number) {
  let line = 1;
  let col = 1;
  for (let i = 0; i < index && i < code.length; i++) {
    if (code.charCodeAt(i) === 10) {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, column: col };
}

function getCodeSnippet(code: string, start: number, end: number): string {
  const snippet = code.slice(start, end).trim().replace(/\s+/g, ' ');
  if (snippet.length > 120) {
    return `${snippet.slice(0, 117)}...`;
  }
  return snippet;
}

function findMatchingParen(value: string, openParenIndex: number): number {
  let depth = 0;
  let quote: string | null = null;

  for (let i = openParenIndex; i < value.length; i++) {
    const char = value[i];
    const previous = value[i - 1];

    if (quote) {
      if (char === quote && previous !== '\\') {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '(') {
      depth++;
      continue;
    }

    if (char === ')') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

function splitEnvArgs(content: string): [string, string | null] {
  let depth = 0;
  let quote: string | null = null;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const previous = content[i - 1];

    if (quote) {
      if (char === quote && previous !== '\\') {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '(') {
      depth++;
      continue;
    }

    if (char === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (char === ',' && depth === 0) {
      return [content.slice(0, i).trim(), content.slice(i + 1).trim()];
    }
  }

  return [content.trim(), null];
}

function rewriteSafeAreaEnvValue(value: string): string {
  const envCallRe = /env\s*\(/gi;
  let cursor = 0;
  let rewritten = '';
  let match: RegExpExecArray | null;

  while ((match = envCallRe.exec(value))) {
    const callStart = match.index;
    const openParenIndex = callStart + match[0].lastIndexOf('(');
    const closeParenIndex = findMatchingParen(value, openParenIndex);

    if (closeParenIndex < 0) {
      break;
    }

    const content = value.slice(openParenIndex + 1, closeParenIndex);
    const [envName, fallback] = splitEnvArgs(content);
    const runtimeVar = SAFE_AREA_ENV_TO_RUNTIME_VAR.get(envName.trim().toLowerCase());

    if (!runtimeVar) {
      envCallRe.lastIndex = closeParenIndex + 1;
      continue;
    }

    rewritten += value.slice(cursor, callStart);
    rewritten += `var(${runtimeVar}, ${fallback && fallback.length > 0 ? fallback : '0px'})`;
    cursor = closeParenIndex + 1;
    envCallRe.lastIndex = closeParenIndex + 1;
  }

  if (cursor === 0) {
    return value;
  }

  return rewritten + value.slice(cursor);
}

function findInlineSafeAreaEnvViolations(code: string, filePath: string): InlineSafeAreaViolation[] {
  const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violations: InlineSafeAreaViolation[] = [];

  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateExpression(node)
    ) {
      const start = node.getStart(sourceFile);
      const end = node.getEnd();
      const rawText = code.slice(start, end);
      if (SAFE_AREA_ENV_RE.test(rawText)) {
        violations.push({
          filePath,
          start,
          snippet: getCodeSnippet(code, start, end),
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return violations;
}

function findSourceCssSafeAreaEnvUsages(code: string, filePath: string): SourceCssSafeAreaUsage[] {
  const root = postcss.parse(code, { from: filePath });
  const usages: SourceCssSafeAreaUsage[] = [];

  root.walkDecls((declaration) => {
    if (!SAFE_AREA_ENV_RE.test(declaration.value)) {
      return;
    }

    usages.push({
      filePath,
      line: declaration.source?.start?.line,
      column: declaration.source?.start?.column,
      declaration: `${declaration.prop}: ${declaration.value}`,
    });
  });

  return usages;
}

export function rewriteSafeAreaEnvPlugin(): Plugin {
  let srcRoot = '';

  return {
    name: 'rewrite-safe-area-env',
    apply: 'build',

    configResolved(config) {
      srcRoot = path.resolve(config.root, 'src');
    },

    async buildStart() {
      if (!srcRoot) return;

      const sourceFiles = await fg([SCRIPT_SOURCE_GLOB], {
        cwd: srcRoot,
        absolute: true,
        onlyFiles: true,
        ignore: ['**/*.d.ts'],
      });
      const sourceCssFiles = await fg([CSS_SOURCE_GLOB], {
        cwd: srcRoot,
        absolute: true,
        onlyFiles: true,
        ignore: ['**/*.sandpack.css'],
      });

      const errors: InlineSafeAreaViolation[] = [];
      for (const filePath of sourceFiles) {
        const code = await fs.readFile(filePath, 'utf8');
        errors.push(...findInlineSafeAreaEnvViolations(code, filePath));
      }

      if (errors.length) {
        const first = errors[0];
        const firstCode = await fs.readFile(first.filePath, 'utf8');
        const firstLoc = computeLineCol(firstCode, first.start);
        const details = await Promise.all(errors.map(async (error, index) => {
          const code = await fs.readFile(error.filePath, 'utf8');
          const loc = computeLineCol(code, error.start);
          return `  ${index + 1}. 文件: ${error.filePath}\n     位置: ${loc.line}:${loc.column}\n     代码: ${error.snippet}`;
        }));

        this.error({
          message:
            `[rewrite-safe-area-env] 构建失败: 发现 ${errors.length} 处脚本内 safe-area env() 用法\n` +
            `错误:\n${details.join('\n')}\n\n` +
            '提示: 请把 env(safe-area-inset-*) 写在 CSS 文件中。',
          loc: {
            file: first.filePath,
            line: firstLoc.line,
            column: firstLoc.column,
          },
        });
      }

      const sourceCssSafeAreaUsages: SourceCssSafeAreaUsage[] = [];
      for (const filePath of sourceCssFiles) {
        const code = await fs.readFile(filePath, 'utf8');
        sourceCssSafeAreaUsages.push(...findSourceCssSafeAreaEnvUsages(code, filePath));
      }

      if (!sourceCssSafeAreaUsages.length) {
        this.error({
          message:
            '[rewrite-safe-area-env] 构建失败: 应用 CSS 源码中没有发现 env(safe-area-inset-*)。\n' +
            '你忘记处理安全区了。请在 src/App.css 或业务 CSS 中合理处理安全区，例如:\n\n' +
            '#container {\n' +
            '  padding-top: env(safe-area-inset-top, 0px);\n' +
            '}\n\n' +
            '顶部悬浮按钮、底部操作区等靠近屏幕边缘的可交互 UI 也应该按需叠加对应方向的 safe-area env()。',
        });
      }
    },

    generateBundle(_options, bundle) {
      for (const [fileName, asset] of Object.entries(bundle)) {
        if (asset.type !== 'asset' || !fileName.endsWith('.css')) {
          continue;
        }

        const originalSource = typeof asset.source === 'string' ? asset.source : Buffer.from(asset.source).toString('utf8');
        const root = postcss.parse(originalSource, { from: fileName });

        root.walkDecls((declaration) => {
          if (SAFE_AREA_ENV_RE.test(declaration.value)) {
            declaration.value = rewriteSafeAreaEnvValue(declaration.value);
          }
        });

        const nextSource = root.toString();
        if (SAFE_AREA_ENV_RE.test(nextSource)) {
          this.error({
            id: fileName,
            message:
              `[rewrite-safe-area-env] 构建失败: ${fileName} 中仍残留 env(safe-area-inset-*)。\n` +
              '提示: 请确认 safe-area env() 只出现在可解析的 CSS declaration value 中。',
          });
        }

        asset.source = nextSource;
      }
    },
  };
}
