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
  if (snippet.length > 80) {
    return `${snippet.slice(0, 77)}...`;
  }
  return snippet;
}

type FetchViolation = {
  start: number;
  end: number;
  message: string;
  codeSnippet?: string;
};

type FileViolation = FetchViolation & {
  filePath: string;
};

const GLOBAL_OBJECTS = new Set(['window', 'globalThis', 'self']);
const IGNORED_SOURCE_GLOBS = ['**/*.d.ts', 'generated/openapi/client/**'];

function getPropertyName(node: ts.Node | undefined): string | null {
  if (!node) return null;
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function addViolation(violations: Map<string, FetchViolation>, item: FetchViolation) {
  const key = `${item.start}:${item.end}:${item.message}`;
  const existing = violations.get(key);
  if (!existing || item.end > existing.end) {
    violations.set(key, item);
  }
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

function getGlobalFetchMemberName(expression: ts.Expression): string | null {
  const target = unwrapExpression(expression);

  if (ts.isPropertyAccessExpression(target) || ts.isPropertyAccessChain(target)) {
    const objectName = getPropertyName(unwrapExpression(target.expression));
    const propertyName = target.name.text;
    if (propertyName === 'fetch' && objectName && GLOBAL_OBJECTS.has(objectName)) {
      return `${objectName}.fetch`;
    }
  }

  if (ts.isElementAccessExpression(target) || ts.isElementAccessChain(target)) {
    const objectName = getPropertyName(unwrapExpression(target.expression));
    const propertyName = getPropertyName(target.argumentExpression);
    if (propertyName === 'fetch' && objectName && GLOBAL_OBJECTS.has(objectName)) {
      return `${objectName}["fetch"]`;
    }
  }

  return null;
}

function isFetchIdentifier(expression: ts.Expression): boolean {
  const target = unwrapExpression(expression);
  return ts.isIdentifier(target) && target.text === 'fetch';
}

function isNativeFetchExpression(expression: ts.Expression | undefined): boolean {
  if (!expression) return false;
  return isFetchIdentifier(expression) || Boolean(getGlobalFetchMemberName(expression));
}

function getMemberChainName(expression: ts.Expression): string | null {
  const target = unwrapExpression(expression);
  const parts: string[] = [];
  let current: ts.Expression = target;

  while (
    ts.isPropertyAccessExpression(current) ||
    ts.isPropertyAccessChain(current) ||
    ts.isElementAccessExpression(current) ||
    ts.isElementAccessChain(current)
  ) {
    const propertyName =
      ts.isPropertyAccessExpression(current) || ts.isPropertyAccessChain(current)
        ? current.name.text
        : getPropertyName(current.argumentExpression);
    if (!propertyName) return null;

    parts.unshift(propertyName);
    current = unwrapExpression(current.expression);
  }

  if (!ts.isIdentifier(current)) return null;
  parts.unshift(current.text);
  return parts.join('.');
}

function isAssignmentOperator(kind: ts.SyntaxKind): boolean {
  return kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;
}

function isAssignmentTarget(node: ts.Node): boolean {
  const parent = node.parent;
  if (!parent) return false;

  if (ts.isBinaryExpression(parent) && isAssignmentOperator(parent.operatorToken.kind)) {
    return unwrapExpression(parent.left as ts.Expression) === node;
  }

  if (ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent)) {
    return parent.operand === node;
  }

  return false;
}

function isCallTarget(node: ts.Node): boolean {
  const parent = node.parent;
  return Boolean(parent && ts.isCallExpression(parent) && unwrapExpression(parent.expression) === node);
}

function getAssignedAliasTarget(left: ts.Node): string | null {
  if (ts.isIdentifier(left)) return left.text;
  if (
    ts.isPropertyAccessExpression(left) ||
    ts.isPropertyAccessChain(left) ||
    ts.isElementAccessExpression(left) ||
    ts.isElementAccessChain(left)
  ) {
    return getMemberChainName(left);
  }
  return null;
}

function collectBindingAliases(
  name: ts.BindingName,
  nativeFetchAliases: Set<string>,
  violations: Map<string, FetchViolation>,
  code: string,
  sourceFile: ts.SourceFile,
) {
  if (ts.isIdentifier(name)) {
    nativeFetchAliases.add(name.text);
    return;
  }

  if (!ts.isObjectBindingPattern(name)) return;

  for (const element of name.elements) {
    const propertyName = getPropertyName(element.propertyName ?? element.name);
    if (propertyName !== 'fetch') continue;

    const start = element.getStart(sourceFile);
    const end = element.getEnd();
    addViolation(violations, {
      start,
      end,
      message: '禁止从全局对象解构读取浏览器原生 fetch。',
      codeSnippet: getCodeSnippet(code, start, end),
    });

    if (ts.isIdentifier(element.name)) {
      nativeFetchAliases.add(element.name.text);
    } else {
      collectBindingAliases(element.name, nativeFetchAliases, violations, code, sourceFile);
    }
  }
}

function findFetchViolations(code: string): FetchViolation[] {
  const sourceFile = ts.createSourceFile('module.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violations = new Map<string, FetchViolation>();
  const nativeFetchAliases = new Set<string>();
  const nativeFetchMemberAliases = new Set<string>();

  const collectAliases = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node)) {
      if (isNativeFetchExpression(node.initializer)) {
        collectBindingAliases(node.name, nativeFetchAliases, violations, code, sourceFile);
      }

      if (node.initializer && ts.isObjectBindingPattern(node.name)) {
        const initializer = unwrapExpression(node.initializer);
        if (ts.isIdentifier(initializer) && GLOBAL_OBJECTS.has(initializer.text)) {
          collectBindingAliases(node.name, nativeFetchAliases, violations, code, sourceFile);
        }
      }
    }

    if (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind)) {
      const right = node.right;
      if (isNativeFetchExpression(right)) {
        const aliasTarget = getAssignedAliasTarget(unwrapExpression(node.left as ts.Expression));
        if (aliasTarget) {
          if (aliasTarget.includes('.')) {
            nativeFetchMemberAliases.add(aliasTarget);
          } else {
            nativeFetchAliases.add(aliasTarget);
          }
        }
      }
    }

    ts.forEachChild(node, collectAliases);
  };

  collectAliases(sourceFile);

  const visit = (node: ts.Node) => {
    if (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind)) {
      const left = unwrapExpression(node.left as ts.Expression);
      const memberName = getGlobalFetchMemberName(left);
      if (memberName) {
        const start = node.getStart(sourceFile);
        const end = node.getEnd();
        addViolation(violations, {
          start,
          end,
          message: `禁止改写浏览器原生 ${memberName}。`,
          codeSnippet: getCodeSnippet(code, start, end),
        });
      }
    }

    if (ts.isDeleteExpression(node)) {
      const memberName = getGlobalFetchMemberName(node.expression);
      if (memberName) {
        const start = node.getStart(sourceFile);
        const end = node.getEnd();
        addViolation(violations, {
          start,
          end,
          message: `禁止删除浏览器原生 ${memberName}。`,
          codeSnippet: getCodeSnippet(code, start, end),
        });
      }
    }

    if (ts.isCallExpression(node)) {
      const expression = node.expression;

      if (isFetchIdentifier(expression)) {
        const start = node.getStart(sourceFile);
        const end = node.getEnd();
        addViolation(violations, {
          start,
          end,
          message: '禁止使用浏览器原生 fetch()。',
          codeSnippet: getCodeSnippet(code, start, end),
        });
      } else if (
        ts.isIdentifier(unwrapExpression(expression)) &&
        nativeFetchAliases.has(unwrapExpression(expression).getText(sourceFile))
      ) {
        const aliasName = unwrapExpression(expression).getText(sourceFile);
        const start = node.getStart(sourceFile);
        const end = node.getEnd();
        addViolation(violations, {
          start,
          end,
          message: `禁止通过浏览器原生 fetch 别名 ${aliasName}() 发起请求。`,
          codeSnippet: getCodeSnippet(code, start, end),
        });
      } else {
        const memberName = getGlobalFetchMemberName(expression);
        if (memberName) {
          const start = node.getStart(sourceFile);
          const end = node.getEnd();
          addViolation(violations, {
            start,
            end,
            message: `禁止使用浏览器原生 ${memberName}()。`,
            codeSnippet: getCodeSnippet(code, start, end),
          });
        } else {
          const memberAlias = getMemberChainName(expression);
          if (memberAlias && nativeFetchMemberAliases.has(memberAlias)) {
            const start = node.getStart(sourceFile);
            const end = node.getEnd();
            addViolation(violations, {
              start,
              end,
              message: `禁止通过浏览器原生 fetch 成员别名 ${memberAlias}() 发起请求。`,
              codeSnippet: getCodeSnippet(code, start, end),
            });
          }
        }
      }
    }

    if (
      (ts.isPropertyAccessExpression(node) ||
        ts.isPropertyAccessChain(node) ||
        ts.isElementAccessExpression(node) ||
        ts.isElementAccessChain(node)) &&
      !isAssignmentTarget(node) &&
      !isCallTarget(node)
    ) {
      const memberName = getGlobalFetchMemberName(node);
      if (memberName) {
        const start = node.getStart(sourceFile);
        const end = node.getEnd();
        addViolation(violations, {
          start,
          end,
          message: `禁止读取浏览器原生 ${memberName}。`,
          codeSnippet: getCodeSnippet(code, start, end),
        });
      }
    }

    if (ts.isIdentifier(node) && node.text === 'fetch' && !isCallTarget(node)) {
      const parent = node.parent;
      const isPropertyName =
        parent &&
        ((ts.isPropertyAccessExpression(parent) || ts.isPropertyAccessChain(parent)) && parent.name === node);
      const isBindingName =
        parent &&
        ((ts.isVariableDeclaration(parent) && parent.name === node) ||
          (ts.isFunctionDeclaration(parent) && parent.name === node) ||
          (ts.isParameter(parent) && parent.name === node) ||
          (ts.isBindingElement(parent) && parent.name === node));
      const isObjectLiteralPropertyName =
        parent &&
        ts.isPropertyAssignment(parent) &&
        parent.name === node &&
        parent.initializer !== node;
      const isObjectBindingPropertyName =
        parent && ts.isBindingElement(parent) && parent.propertyName === node;

      if (!isPropertyName && !isBindingName && !isObjectLiteralPropertyName && !isObjectBindingPropertyName) {
        const start = node.getStart(sourceFile);
        const end = node.getEnd();
        addViolation(violations, {
          start,
          end,
          message: '禁止读取浏览器原生 fetch。',
          codeSnippet: getCodeSnippet(code, start, end),
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return Array.from(violations.values()).sort((a, b) => a.start - b.start);
}

export function blockFetchPlugin(): Plugin {
  let srcRoot = '';

  return {
    name: 'block-fetch',
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
        ignore: IGNORED_SOURCE_GLOBS,
      });

      const errors: FileViolation[] = [];

      for (const filePath of sourceFiles) {
        const code = await fs.readFile(filePath, 'utf8');
        const fileErrors = findFetchViolations(code).map((error) => ({
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
          `[block-fetch] 构建失败: 发现 ${errors.length} 处禁止的浏览器原生 fetch 使用\n` +
          `错误:\n${details.join('\n')}\n\n` +
          '提示: 当前沙盒环境禁止使用浏览器原生 fetch，请改用环境允许的能力实现对应需求。',
        loc: {
          file: first.filePath,
          line: loc.line,
          column: loc.column,
        },
      });
    },
  };
}
