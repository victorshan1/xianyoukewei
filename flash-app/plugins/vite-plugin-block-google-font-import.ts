import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import ts from 'typescript';
import type { Plugin } from 'vite';

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
  const snippet = code.slice(start, end).trim();
  if (snippet.length > 100) {
    return `${snippet.slice(0, 97)}...`;
  }
  return snippet;
}

type GoogleFontImportViolation = {
  start: number;
  end: number;
  message: string;
  codeSnippet?: string;
};

type FileViolation = GoogleFontImportViolation & {
  filePath: string;
};

const SOURCE_FILE_GLOB = '**/*.{css,scss,sass,less,styl,stylus,pcss,postcss,js,jsx,ts,tsx}';
const STYLE_FILE_RE = /\.(css|scss|sass|less|styl|stylus|pcss|postcss)$/i;
const SCRIPT_FILE_RE = /\.[cm]?[jt]sx?$/i;
const BLOCKED_GOOGLE_FONT_IMPORT_RE = /@import\s+(?:url\(\s*)?(?:["'])?(https?:\/\/fonts\.googleapis\.com\/[^"'\s)]+)(?:["'])?\s*\)?[^;]*;/gi;

function createGoogleFontImportRegExp() {
  return new RegExp(BLOCKED_GOOGLE_FONT_IMPORT_RE.source, BLOCKED_GOOGLE_FONT_IMPORT_RE.flags);
}

function collectViolationsFromText(
  sourceCode: string,
  text: string,
  baseOffset: number,
  violations: GoogleFontImportViolation[],
) {
  const regExp = createGoogleFontImportRegExp();

  for (const match of text.matchAll(regExp)) {
    const matchedText = match[0];
    if (!matchedText) continue;

    const url = match[1] ?? 'https://fonts.googleapis.com';
    const start = baseOffset + (match.index ?? 0);
    const end = start + matchedText.length;
    violations.push({
      start,
      end,
      message: `禁止在 CSS 中通过 @import 引入 Google Fonts: ${url}`,
      codeSnippet: getCodeSnippet(sourceCode, start, end),
    });
  }
}

function findViolationsInScript(code: string, filePath: string): GoogleFontImportViolation[] {
  const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violations: GoogleFontImportViolation[] = [];

  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateExpression(node) ||
      ts.isJsxText(node)
    ) {
      const start = node.getStart(sourceFile);
      const end = node.getEnd();
      const rawText = code.slice(start, end);
      if (rawText.includes('@import') && rawText.includes('fonts.googleapis.com')) {
        collectViolationsFromText(code, rawText, start, violations);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return violations;
}

function findGoogleFontImportViolations(code: string, filePath: string): GoogleFontImportViolation[] {
  if (STYLE_FILE_RE.test(filePath)) {
    const violations: GoogleFontImportViolation[] = [];
    collectViolationsFromText(code, code, 0, violations);
    return violations;
  }

  if (SCRIPT_FILE_RE.test(filePath)) {
    return findViolationsInScript(code, filePath);
  }

  return [];
}

export function blockGoogleFontImportPlugin(): Plugin {
  let srcRoot = '';

  return {
    name: 'block-google-font-import',
    enforce: 'pre',
    apply: 'build',

    configResolved(config) {
      srcRoot = path.resolve(config.root, 'src');
    },

    async buildStart() {
      if (!srcRoot) return;

      const sourceFiles = await fg([SOURCE_FILE_GLOB], {
        cwd: srcRoot,
        absolute: true,
        onlyFiles: true,
        ignore: ['**/*.d.ts'],
      });

      const errors: FileViolation[] = [];

      for (const filePath of sourceFiles) {
        const code = await fs.readFile(filePath, 'utf8');
        const fileErrors = findGoogleFontImportViolations(code, filePath).map((error) => ({
          ...error,
          filePath,
        }));
        errors.push(...fileErrors);
      }

      if (!errors.length) return;

      const first = errors[0];
      const firstCode = await fs.readFile(first.filePath, 'utf8');
      const loc = computeLineCol(firstCode, first.start);
      const details = await Promise.all(errors.map(async (error, index) => {
        const fileCode = await fs.readFile(error.filePath, 'utf8');
        const itemLoc = computeLineCol(fileCode, error.start);
        return `  ${index + 1}. ${error.message}\n     文件: ${error.filePath}\n     位置: ${itemLoc.line}:${itemLoc.column}${error.codeSnippet ? `\n     代码: ${error.codeSnippet}` : ''}`;
      }));

      this.error({
        message:
          `[block-google-font-import] 构建失败: 发现 ${errors.length} 处禁止的 Google Fonts CSS 导入\n` +
          `错误:\n${details.join('\n')}\n\n` +
          '提示: 请改用浏览器默认支持的字体栈、项目内本地字体资源，或直接移除该 @import。',
        loc: {
          file: first.filePath,
          line: loc.line,
          column: loc.column,
        },
      });
    },
  };
}
