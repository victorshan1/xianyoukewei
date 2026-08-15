import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import ts from 'typescript';
import type { Plugin } from 'vite';

type IframeViolation = {
  start: number;
  end: number;
  message: string;
  codeSnippet?: string;
};

type FileViolation = IframeViolation & {
  filePath: string;
};

const GLOBAL_OBJECTS = new Set(['window', 'globalThis', 'self']);

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

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function getStaticPropertyName(node: ts.Expression | undefined): string | null {
  if (!node) return null;
  const current = unwrapExpression(node);
  if (ts.isIdentifier(current)) return current.text;
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) return current.text;
  return null;
}

function getMember(expression: ts.Expression): { target: ts.Expression; name: string | null } | null {
  const current = unwrapExpression(expression);

  if (ts.isPropertyAccessExpression(current) || ts.isPropertyAccessChain(current)) {
    return { target: current.expression, name: current.name.text };
  }

  if (ts.isElementAccessExpression(current) || ts.isElementAccessChain(current)) {
    return {
      target: current.expression,
      name: getStaticPropertyName(current.argumentExpression),
    };
  }

  return null;
}

function getStaticStringValue(expression: ts.Expression | undefined, stringBindings: Map<string, string>): string | null {
  if (!expression) return null;

  const current = unwrapExpression(expression);
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    return current.text;
  }
  if (ts.isIdentifier(current)) {
    return stringBindings.get(current.text) ?? null;
  }
  return null;
}

function collectStaticStringBindings(sourceFile: ts.SourceFile): Map<string, string> {
  const bindings = new Map<string, string>();
  let changed = true;

  while (changed) {
    changed = false;

    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        const value = getStaticStringValue(node.initializer, bindings);
        if (value !== null && !bindings.has(node.name.text)) {
          bindings.set(node.name.text, value);
          changed = true;
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return bindings;
}

function isIframeTag(expression: ts.Expression | undefined, stringBindings: Map<string, string>): boolean {
  return getStaticStringValue(expression, stringBindings)?.trim().toLowerCase() === 'iframe';
}

function isDocumentReference(expression: ts.Expression): boolean {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text === 'document';
  }

  const member = getMember(current);
  if (!member || member.name !== 'document') return false;

  const root = unwrapExpression(member.target);
  return ts.isIdentifier(root) && GLOBAL_OBJECTS.has(root.text);
}

function collectReactCreateElementBindings(sourceFile: ts.SourceFile) {
  const namespaces = new Set(['React']);
  const createElementFunctions = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    if (statement.moduleSpecifier.text !== 'react') continue;

    const importClause = statement.importClause;
    if (!importClause) continue;

    if (importClause.name) {
      namespaces.add(importClause.name.text);
    }

    const namedBindings = importClause.namedBindings;
    if (!namedBindings) continue;

    if (ts.isNamespaceImport(namedBindings)) {
      namespaces.add(namedBindings.name.text);
      continue;
    }

    for (const element of namedBindings.elements) {
      if ((element.propertyName ?? element.name).text === 'createElement') {
        createElementFunctions.add(element.name.text);
      }
    }
  }

  return { namespaces, createElementFunctions };
}

function isDocumentCreateElementCall(node: ts.CallExpression): boolean {
  const member = getMember(node.expression);
  return Boolean(member && member.name === 'createElement' && isDocumentReference(member.target));
}

function isReactCreateElementCall(node: ts.CallExpression, namespaces: Set<string>, createElementFunctions: Set<string>): boolean {
  const callee = unwrapExpression(node.expression);
  if (ts.isIdentifier(callee)) {
    return createElementFunctions.has(callee.text);
  }

  const member = getMember(callee);
  if (!member || member.name !== 'createElement') return false;

  const target = unwrapExpression(member.target);
  return ts.isIdentifier(target) && namespaces.has(target.text);
}

function findIframeViolations(code: string): IframeViolation[] {
  const sourceFile = ts.createSourceFile('module.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const stringBindings = collectStaticStringBindings(sourceFile);
  const { namespaces, createElementFunctions } = collectReactCreateElementBindings(sourceFile);
  const violations: IframeViolation[] = [];

  const report = (node: ts.Node, message: string) => {
    const start = node.getStart(sourceFile);
    const end = node.getEnd();
    violations.push({
      start,
      end,
      message,
      codeSnippet: getCodeSnippet(code, start, end),
    });
  };

  const visit = (node: ts.Node) => {
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && ts.isIdentifier(node.tagName) && node.tagName.text === 'iframe') {
      report(node, '禁止在 JSX/TSX 中直接使用原生 <iframe>。');
    }

    if (ts.isCallExpression(node) && isIframeTag(node.arguments[0], stringBindings)) {
      if (isDocumentCreateElementCall(node)) {
        report(node, '禁止通过 document.createElement 动态创建 iframe。');
      } else if (isReactCreateElementCall(node, namespaces, createElementFunctions)) {
        report(node, '禁止通过 React.createElement 动态创建 iframe。');
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations.sort((a, b) => a.start - b.start);
}

export function blockIframePlugin(): Plugin {
  let srcRoot = '';

  return {
    name: 'block-iframe',
    enforce: 'pre',
    apply: 'build',

    configResolved(config) {
      srcRoot = path.resolve(config.root, 'src');
    },

    async buildStart() {
      if (!srcRoot) return;

      const sourceFiles = await fg(['**/*.{js,jsx,ts,tsx}'], {
        cwd: srcRoot,
        absolute: true,
        onlyFiles: true,
        ignore: ['**/*.d.ts'],
      });

      const errors: FileViolation[] = [];
      for (const filePath of sourceFiles) {
        const code = await fs.readFile(filePath, 'utf8');
        errors.push(
          ...findIframeViolations(code).map((error) => ({
            ...error,
            filePath,
          })),
        );
      }

      if (!errors.length) return;

      const first = errors[0];
      const firstCode = await fs.readFile(first.filePath, 'utf8');
      const loc = computeLineCol(firstCode, first.start);
      const details = await Promise.all(
        errors.map(async (error, index) => {
          const code = await fs.readFile(error.filePath, 'utf8');
          const itemLoc = computeLineCol(code, error.start);
          return `  ${index + 1}. ${error.message}\n     文件: ${error.filePath}\n     位置: ${itemLoc.line}:${itemLoc.column}${error.codeSnippet ? `\n     代码: ${error.codeSnippet}` : ''}`;
        }),
      );

      this.error({
        message:
          `[block-iframe] 构建失败: 发现 ${errors.length} 处禁止的 iframe 使用\n` +
          `错误:\n${details.join('\n')}\n\n` +
          '提示: 闪应用业务代码不得创建子 iframe，请改用 React 组件或应用内视图切换。',
        loc: {
          file: first.filePath,
          line: loc.line,
          column: loc.column,
        },
      });
    },
  };
}
