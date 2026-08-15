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

function normalizeValue(value: string | null): string | null {
  return value?.trim().toLowerCase() ?? null;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;

  while (true) {
    if (ts.isParenthesizedExpression(current)) {
      current = current.expression;
      continue;
    }

    if (ts.isAsExpression(current)) {
      current = current.expression;
      continue;
    }

    if (ts.isTypeAssertionExpression(current)) {
      current = current.expression;
      continue;
    }

    if (ts.isNonNullExpression(current)) {
      current = current.expression;
      continue;
    }

    if (ts.isSatisfiesExpression(current)) {
      current = current.expression;
      continue;
    }

    return current;
  }
}

function getStaticStringValue(
  expression: ts.Expression | undefined,
  stringBindings: Map<string, string>,
): string | null {
  if (!expression) {
    return null;
  }

  const current = unwrapExpression(expression);

  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    return current.text;
  }

  if (ts.isIdentifier(current)) {
    return stringBindings.get(current.text) ?? null;
  }

  return null;
}

function getJsxStaticStringValue(
  initializer: ts.JsxAttributeValue | undefined,
  stringBindings: Map<string, string>,
): string | null {
  if (!initializer) {
    return null;
  }

  if (ts.isStringLiteral(initializer)) {
    return initializer.text;
  }

  if (!ts.isJsxExpression(initializer) || !initializer.expression) {
    return null;
  }

  return getStaticStringValue(initializer.expression, stringBindings);
}

function getJsxTagName(node: ts.JsxOpeningLikeElement): string | null {
  if (ts.isIdentifier(node.tagName)) {
    return node.tagName.text;
  }

  return null;
}

function getJsxAttribute(
  attributes: ts.JsxAttributes,
  name: string,
): ts.JsxAttribute | undefined {
  return attributes.properties.find((property): property is ts.JsxAttribute => {
    return ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === name;
  });
}

function getMemberName(
  expression: ts.Expression,
  stringBindings: Map<string, string>,
): { target: ts.Expression; name: string | null } | null {
  const current = unwrapExpression(expression);

  if (ts.isPropertyAccessExpression(current) || ts.isPropertyAccessChain(current)) {
    return { target: current.expression, name: current.name.text };
  }

  if (ts.isElementAccessExpression(current) || ts.isElementAccessChain(current)) {
    return {
      target: current.expression,
      name: getStaticStringValue(current.argumentExpression, stringBindings),
    };
  }

  return null;
}

function isDocumentReference(
  expression: ts.Expression,
  stringBindings: Map<string, string>,
): boolean {
  const current = unwrapExpression(expression);

  if (ts.isIdentifier(current)) {
    return current.text === 'document';
  }

  const member = getMemberName(current, stringBindings);
  if (!member || member.name !== 'document') {
    return false;
  }

  const root = unwrapExpression(member.target);
  return ts.isIdentifier(root) && (
    root.text === 'window' ||
    root.text === 'globalThis' ||
    root.text === 'self'
  );
}

function isInputCreateElementCall(
  expression: ts.Expression,
  stringBindings: Map<string, string>,
): boolean {
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return false;
  }

  const member = getMemberName(current.expression, stringBindings);
  if (!member || member.name !== 'createElement') {
    return false;
  }

  if (!isDocumentReference(member.target, stringBindings)) {
    return false;
  }

  return normalizeValue(getStaticStringValue(current.arguments[0], stringBindings)) === 'input';
}

function isHtmlInputConstructorReference(
  expression: ts.Expression,
  stringBindings: Map<string, string>,
): boolean {
  const current = unwrapExpression(expression);

  if (ts.isIdentifier(current)) {
    return current.text === 'HTMLInputElement';
  }

  const member = getMemberName(current, stringBindings);
  if (!member || member.name !== 'HTMLInputElement') {
    return false;
  }

  const root = unwrapExpression(member.target);
  return ts.isIdentifier(root) && (
    root.text === 'window' ||
    root.text === 'globalThis' ||
    root.text === 'self'
  );
}

function isInputConstructorCall(
  expression: ts.Expression,
  stringBindings: Map<string, string>,
): boolean {
  const current = unwrapExpression(expression);
  return ts.isNewExpression(current) && isHtmlInputConstructorReference(current.expression, stringBindings);
}

function getObjectAssignArgs(
  expression: ts.Expression,
  stringBindings: Map<string, string>,
): ts.NodeArray<ts.Expression> | null {
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return null;
  }

  const member = getMemberName(current.expression, stringBindings);
  if (!member || member.name !== 'assign') {
    return null;
  }

  const target = unwrapExpression(member.target);
  if (!ts.isIdentifier(target) || target.text !== 'Object') {
    return null;
  }

  return current.arguments;
}

function hasObjectLiteralFileType(
  expression: ts.Expression,
  stringBindings: Map<string, string>,
): boolean {
  const current = unwrapExpression(expression);
  if (!ts.isObjectLiteralExpression(current)) {
    return false;
  }

  return current.properties.some((property) => {
    if (!ts.isPropertyAssignment(property)) {
      return false;
    }

    const name = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
      ? property.name.text
      : null;

    if (name !== 'type') {
      return false;
    }

    return normalizeValue(getStaticStringValue(property.initializer, stringBindings)) === 'file';
  });
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

function collectInputBindings(
  sourceFile: ts.SourceFile,
  stringBindings: Map<string, string>,
): Set<string> {
  const bindings = new Set<string>();
  let changed = true;

  const isInputReference = (expression: ts.Expression): boolean => {
    const current = unwrapExpression(expression);

    if (isInputCreateElementCall(current, stringBindings)) {
      return true;
    }

    if (isInputConstructorCall(current, stringBindings)) {
      return true;
    }

    if (ts.isIdentifier(current)) {
      return bindings.has(current.text);
    }

    return false;
  };

  while (changed) {
    changed = false;

    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        if (isInputReference(node.initializer) && !bindings.has(node.name.text)) {
          bindings.add(node.name.text);
          changed = true;
        }
      }

      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isIdentifier(node.left) &&
        isInputReference(node.right) &&
        !bindings.has(node.left.text)
      ) {
        bindings.add(node.left.text);
        changed = true;
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return bindings;
}

type FileInputViolation = {
  start: number;
  end: number;
  message: string;
  codeSnippet?: string;
};

type FileViolation = FileInputViolation & {
  filePath: string;
};

function findFileInputViolations(code: string): FileInputViolation[] {
  const sourceFile = ts.createSourceFile('module.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const stringBindings = collectStaticStringBindings(sourceFile);
  const inputBindings = collectInputBindings(sourceFile, stringBindings);
  const violations: FileInputViolation[] = [];

  const isInputReference = (expression: ts.Expression): boolean => {
    const current = unwrapExpression(expression);

    if (isInputCreateElementCall(current, stringBindings)) {
      return true;
    }

    if (isInputConstructorCall(current, stringBindings)) {
      return true;
    }

    if (ts.isIdentifier(current)) {
      return inputBindings.has(current.text);
    }

    return false;
  };

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
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      if (getJsxTagName(node) === 'input') {
        const typeAttribute = getJsxAttribute(node.attributes, 'type');
        const typeValue = normalizeValue(getJsxStaticStringValue(typeAttribute?.initializer, stringBindings));
        if (typeValue === 'file') {
          report(
            node,
            '禁止使用 <input type="file">，请改用环境提供的 API（docs/API_MEDIA.md 或 docs/API_FS.md）。',
          );
        }
      }
    }

    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      const member = getMemberName(node.left, stringBindings);
      const rightValue = normalizeValue(getStaticStringValue(node.right, stringBindings));
      if (member && member.name === 'type' && rightValue === 'file' && isInputReference(member.target)) {
        report(
          node,
          '禁止将动态创建的 input 元素类型设置为 "file"，请改用环境提供的 API（docs/API_MEDIA.md 或 docs/API_FS.md）。',
        );
      }
    }

    if (ts.isCallExpression(node)) {
      const member = getMemberName(node.expression, stringBindings);

      if (member && isInputReference(member.target)) {
        const methodName = member.name;
        if (
          methodName === 'setAttribute' &&
          normalizeValue(getStaticStringValue(node.arguments[0], stringBindings)) === 'type' &&
          normalizeValue(getStaticStringValue(node.arguments[1], stringBindings)) === 'file'
        ) {
          report(
            node,
            '禁止通过 setAttribute("type", "file") 配置文件选择控件，请改用环境提供的 API（docs/API_MEDIA.md 或 docs/API_FS.md）。',
          );
        }

        if (
          methodName === 'setAttributeNS' &&
          normalizeValue(getStaticStringValue(node.arguments[1], stringBindings)) === 'type' &&
          normalizeValue(getStaticStringValue(node.arguments[2], stringBindings)) === 'file'
        ) {
          report(
            node,
            '禁止通过 setAttributeNS(..., "type", "file") 配置文件选择控件，请改用环境提供的 API（docs/API_MEDIA.md 或 docs/API_FS.md）。',
          );
        }
      }

      const objectAssignArgs = getObjectAssignArgs(node, stringBindings);
      if (
        objectAssignArgs &&
        objectAssignArgs.length >= 2 &&
        isInputReference(objectAssignArgs[0]) &&
        objectAssignArgs.slice(1).some((arg) => hasObjectLiteralFileType(arg, stringBindings))
      ) {
        report(
          node,
          '禁止通过 Object.assign(..., { type: "file" }) 配置文件选择控件，请改用环境提供的 API（docs/API_MEDIA.md 或 docs/API_FS.md）。',
        );
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return violations;
}

export function blockFileInputPlugin(): Plugin {
  let srcRoot = '';

  return {
    name: 'block-file-input',
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
        const fileErrors = findFileInputViolations(code).map((error) => ({
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
          `[block-file-input] 构建失败: 发现 ${errors.length} 处禁止的文件选择控件使用\n` +
          `错误:\n${details.join('\n')}\n\n` +
          '提示: 文件选择请走环境 API，参考 docs/API_MEDIA.md 与 docs/API_FS.md。',
        loc: {
          file: first.filePath,
          line: loc.line,
          column: loc.column,
        },
      });
    },
  };
}
