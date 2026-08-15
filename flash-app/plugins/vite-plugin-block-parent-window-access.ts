import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import ts from 'typescript';
import type { Plugin } from 'vite';

type ParentWindowViolation = {
  start: number;
  end: number;
  message: string;
  codeSnippet?: string;
};

type FileViolation = ParentWindowViolation & {
  filePath: string;
};

const SOURCE_FILE_GLOB = '**/*.{js,jsx,ts,tsx}';
const IGNORED_SOURCE_GLOBS = ['**/*.d.ts'];
const GLOBAL_WINDOW_ROOTS = new Set(['window', 'globalThis', 'self']);
const BARE_PARENT_WINDOW_ROOTS = new Set(['parent', 'top']);

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

function getStaticPropertyName(node: ts.Node | undefined): string | null {
  if (!node) return null;
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function getPropertyNameFromMember(expression: ts.Expression): string | null {
  const target = unwrapExpression(expression);
  if (ts.isPropertyAccessExpression(target) || ts.isPropertyAccessChain(target)) {
    return target.name.text;
  }
  if (ts.isElementAccessExpression(target) || ts.isElementAccessChain(target)) {
    return getStaticPropertyName(target.argumentExpression);
  }
  return null;
}

function getObjectLiteralPropertyName(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) {
    return name.text;
  }
  if (ts.isComputedPropertyName(name)) {
    return getStaticPropertyName(unwrapExpression(name.expression));
  }
  return null;
}

function getMemberChain(expression: ts.Expression): string[] | null {
  const parts: string[] = [];
  let current = unwrapExpression(expression);

  while (
    ts.isPropertyAccessExpression(current) ||
    ts.isPropertyAccessChain(current) ||
    ts.isElementAccessExpression(current) ||
    ts.isElementAccessChain(current)
  ) {
    const propertyName =
      ts.isPropertyAccessExpression(current) || ts.isPropertyAccessChain(current)
        ? current.name.text
        : getStaticPropertyName(current.argumentExpression);
    if (!propertyName) return null;

    parts.unshift(propertyName);
    current = unwrapExpression(current.expression);
  }

  if (!ts.isIdentifier(current)) return null;
  parts.unshift(current.text);
  return parts;
}

function isBindingIdentifier(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) return false;

  if (ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isFunctionDeclaration(parent)) {
    return parent.name === node;
  }
  if (ts.isClassDeclaration(parent) || ts.isInterfaceDeclaration(parent) || ts.isTypeAliasDeclaration(parent)) {
    return parent.name === node;
  }
  if (ts.isBindingElement(parent)) {
    return parent.name === node;
  }
  if (ts.isImportClause(parent) || ts.isNamespaceImport(parent) || ts.isImportSpecifier(parent)) {
    return parent.name === node;
  }
  return false;
}

function isNonExpressionIdentifierUse(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) return false;

  if (isBindingIdentifier(node)) return true;
  if ((ts.isPropertyAccessExpression(parent) || ts.isPropertyAccessChain(parent)) && parent.name === node) {
    return true;
  }
  if (ts.isPropertyAssignment(parent) && parent.name === node) {
    return true;
  }
  if (ts.isShorthandPropertyAssignment(parent) && parent.name === node) {
    return true;
  }
  if (ts.isMethodDeclaration(parent) && parent.name === node) {
    return true;
  }
  if (ts.isPropertyDeclaration(parent) && parent.name === node) {
    return true;
  }
  if (ts.isJsxAttribute(parent) && parent.name === node) {
    return true;
  }
  return false;
}

function isParentWindowAccessExpression(expression: ts.Expression, includeBareParentRoots = false): boolean {
  const target = unwrapExpression(expression);

  if (ts.isIdentifier(target)) {
    return includeBareParentRoots && BARE_PARENT_WINDOW_ROOTS.has(target.text) && !isNonExpressionIdentifierUse(target);
  }

  const chain = getMemberChain(target);
  if (!chain || chain.length < 2) return false;

  const root = chain[0];
  const firstProperty = chain[1];
  if (GLOBAL_WINDOW_ROOTS.has(root)) {
    return firstProperty === 'parent' || firstProperty === 'top';
  }
  return includeBareParentRoots && BARE_PARENT_WINDOW_ROOTS.has(root);
}

function isNestedInsideParentWindowChain(node: ts.Node): boolean {
  const parent = node.parent;
  if (!parent) return false;

  if (
    (ts.isPropertyAccessExpression(parent) ||
      ts.isPropertyAccessChain(parent) ||
      ts.isElementAccessExpression(parent) ||
      ts.isElementAccessChain(parent)) &&
    parent.expression === node &&
    isParentWindowAccessExpression(parent)
  ) {
    return true;
  }

  return false;
}

function isWindowSelfExpression(expression: ts.Expression): boolean {
  const target = unwrapExpression(expression);
  return ts.isIdentifier(target) && GLOBAL_WINDOW_ROOTS.has(target.text);
}

function isParentWindowSelfGuard(expression: ts.Expression): boolean {
  const parent = expression.parent;
  if (!parent || !ts.isBinaryExpression(parent)) return false;
  if (
    parent.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken &&
    parent.operatorToken.kind !== ts.SyntaxKind.ExclamationEqualsEqualsToken &&
    parent.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsToken &&
    parent.operatorToken.kind !== ts.SyntaxKind.ExclamationEqualsToken
  ) {
    return false;
  }

  if (parent.left === expression) {
    return isWindowSelfExpression(parent.right);
  }
  if (parent.right === expression) {
    return isWindowSelfExpression(parent.left);
  }
  return false;
}

function getPostMessageReceiver(node: ts.CallExpression): ts.Expression | null {
  const callee = unwrapExpression(node.expression);

  if (
    ts.isPropertyAccessExpression(callee) ||
    ts.isPropertyAccessChain(callee) ||
    ts.isElementAccessExpression(callee) ||
    ts.isElementAccessChain(callee)
  ) {
    const propertyName = getPropertyNameFromMember(callee);
    if (propertyName === 'postMessage') {
      return callee.expression;
    }
  }

  return null;
}

function isAllowedPostMessagePayload(argument: ts.Expression | undefined): boolean {
  if (!argument) return false;

  const payload = unwrapExpression(argument);
  if (!ts.isObjectLiteralExpression(payload)) return false;
  if (payload.properties.some((property) => ts.isSpreadAssignment(property))) return false;

  for (const property of payload.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    if (getObjectLiteralPropertyName(property.name) !== 'type') continue;

    const typeValue = unwrapExpression(property.initializer);
    if (ts.isStringLiteral(typeValue) || ts.isNoSubstitutionTemplateLiteral(typeValue)) {
      return typeValue.text === 'flash-app-error';
    }
    if (ts.isIdentifier(typeValue)) {
      return typeValue.text === 'FLASH_APP_AUDIO_EVENT';
    }
    return false;
  }

  return false;
}

function findParentWindowViolations(code: string): ParentWindowViolation[] {
  const sourceFile = ts.createSourceFile('module.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violations = new Map<string, ParentWindowViolation>();

  const addViolation = (item: ParentWindowViolation) => {
    const key = `${item.start}:${item.end}:${item.message}`;
    if (!violations.has(key)) {
      violations.set(key, item);
    }
  };

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const receiver = getPostMessageReceiver(node);
      if (receiver && isParentWindowAccessExpression(receiver, true)) {
        if (!isAllowedPostMessagePayload(node.arguments[0])) {
          const start = node.getStart(sourceFile);
          const end = node.getEnd();
          addViolation({
            start,
            end,
            message:
              '禁止向上级窗口发送非白名单 postMessage。仅允许 type 为 flash-app-error 或 FLASH_APP_AUDIO_EVENT 的受控消息。',
            codeSnippet: getCodeSnippet(code, start, end),
          });
        }

        for (const argument of node.arguments) {
          ts.forEachChild(argument, visit);
        }
        return;
      }
    }

    if (ts.isExpressionStatement(node)) {
      ts.forEachChild(node, visit);
      return;
    }

    if (
      ts.isExpression(node) &&
      isParentWindowAccessExpression(node) &&
      !isNestedInsideParentWindowChain(node) &&
      !isParentWindowSelfGuard(node)
    ) {
      const start = node.getStart(sourceFile);
      const end = node.getEnd();
      addViolation({
        start,
        end,
        message: '禁止直接访问上级窗口对象。请不要使用 window.parent、window.top、parent 或 top。',
        codeSnippet: getCodeSnippet(code, start, end),
      });
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return Array.from(violations.values()).sort((a, b) => a.start - b.start);
}

export function blockParentWindowAccessPlugin(): Plugin {
  let srcRoot = '';

  return {
    name: 'block-parent-window-access',
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
        ignore: IGNORED_SOURCE_GLOBS,
      });

      const errors: FileViolation[] = [];

      for (const filePath of sourceFiles) {
        const code = await fs.readFile(filePath, 'utf8');
        const fileErrors = findParentWindowViolations(code).map((error) => ({
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
          `[block-parent-window-access] 构建失败: 发现 ${errors.length} 处上级窗口访问违规用法\n` +
          `错误:\n${details.join('\n')}\n\n` +
          '提示: 生成应用禁止直接访问上级窗口；仅允许 scaffold 受控错误/音频消息上报。',
        loc: {
          file: first.filePath,
          line: loc.line,
          column: loc.column,
        },
      });
    },
  };
}
