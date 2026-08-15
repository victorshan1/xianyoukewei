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

type SubmitViolation = {
  start: number;
  message: string;
};

type FileViolation = SubmitViolation & {
  filePath: string;
};

type ButtonImportInfo = {
  identifiers: Set<string>;
  namespaces: Set<string>;
};

function getJsxTagName(node: ts.JsxOpeningLikeElement, sourceFile: ts.SourceFile): string | null {
  if (ts.isIdentifier(node.tagName)) {
    return node.tagName.text;
  }

  if (ts.isPropertyAccessExpression(node.tagName)) {
    return node.tagName.getText(sourceFile);
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

function getStaticStringValue(initializer: ts.JsxAttributeValue | undefined): string | null {
  if (!initializer) {
    return null;
  }

  if (ts.isStringLiteral(initializer)) {
    return initializer.text;
  }

  if (!ts.isJsxExpression(initializer) || !initializer.expression) {
    return null;
  }

  if (ts.isStringLiteral(initializer.expression) || ts.isNoSubstitutionTemplateLiteral(initializer.expression)) {
    return initializer.expression.text;
  }

  return null;
}

function normalizeAttrValue(value: string | null): string | null {
  return value?.trim().toLowerCase() ?? null;
}

function isButtonModule(specifier: string): boolean {
  const normalized = specifier.replace(/\\/g, '/').toLowerCase();
  const baseName = normalized.split('/').pop() ?? normalized;
  return baseName === 'button' || baseName.endsWith('-button');
}

function collectButtonImports(sourceFile: ts.SourceFile): ButtonImportInfo {
  const identifiers = new Set<string>();
  const namespaces = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) {
      continue;
    }

    if (!ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }

    if (!isButtonModule(statement.moduleSpecifier.text)) {
      continue;
    }

    const importClause = statement.importClause;
    if (!importClause) {
      continue;
    }

    if (importClause.name) {
      identifiers.add(importClause.name.text);
    }

    const namedBindings = importClause.namedBindings;
    if (!namedBindings) {
      continue;
    }

    if (ts.isNamespaceImport(namedBindings)) {
      namespaces.add(namedBindings.name.text);
      continue;
    }

    for (const element of namedBindings.elements) {
      identifiers.add(element.name.text);
    }
  }

  return { identifiers, namespaces };
}

function isButtonLikeTag(tagName: string, buttonImports: ButtonImportInfo): boolean {
  if (tagName === 'button') {
    return true;
  }

  if (buttonImports.identifiers.has(tagName)) {
    return true;
  }

  const dotIndex = tagName.indexOf('.');
  if (dotIndex <= 0) {
    return false;
  }

  const namespaceName = tagName.slice(0, dotIndex);
  const memberName = tagName.slice(dotIndex + 1);
  return buttonImports.namespaces.has(namespaceName) && /button$/i.test(memberName);
}

function getNodeStart(node: ts.Node, sourceFile: ts.SourceFile): number {
  return node.getStart(sourceFile);
}

function findFormSubmitViolations(code: string): SubmitViolation[] {
  const sourceFile = ts.createSourceFile('module.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const buttonImports = collectButtonImports(sourceFile);
  const violations: SubmitViolation[] = [];

  const inspectOpeningElement = (node: ts.JsxOpeningLikeElement, insideForm: boolean) => {
    const tagName = getJsxTagName(node, sourceFile);
    if (!tagName) {
      return;
    }

    const typeAttribute = getJsxAttribute(node.attributes, 'type');
    const typeValue = normalizeAttrValue(getStaticStringValue(typeAttribute?.initializer));

    if (tagName === 'input' && (typeValue === 'submit' || typeValue === 'image')) {
      violations.push({
        start: getNodeStart(node, sourceFile),
        message: `禁止使用 <input type="${typeValue}">。iframe sandbox 未开启 allow-forms，请改用普通按钮配合 onClick 手动处理提交逻辑。`,
      });
      return;
    }

    if (!isButtonLikeTag(tagName, buttonImports)) {
      return;
    }

    if (typeValue === 'submit') {
      violations.push({
        start: getNodeStart(node, sourceFile),
        message: `禁止使用 <${tagName} type="submit">。iframe sandbox 未开启 allow-forms，请改成 type="button" 并手动处理提交逻辑。`,
      });
      return;
    }

    if (!insideForm || typeAttribute) {
      return;
    }

    violations.push({
      start: getNodeStart(node, sourceFile),
      message: `<${tagName}> 位于 <form> 内但未显式声明 type，默认会按 submit 处理。请显式改为 type="button" 或 type="reset"。`,
    });
  };

  const visit = (node: ts.Node, insideForm: boolean) => {
    if (ts.isJsxSelfClosingElement(node)) {
      inspectOpeningElement(node, insideForm);
      return;
    }

    if (ts.isJsxElement(node)) {
      const tagName = getJsxTagName(node.openingElement, sourceFile);
      inspectOpeningElement(node.openingElement, insideForm);

      const nextInsideForm = insideForm || tagName === 'form';
      for (const child of node.children) {
        visit(child, nextInsideForm);
      }
      return;
    }

    if (ts.isJsxFragment(node)) {
      for (const child of node.children) {
        visit(child, insideForm);
      }
      return;
    }

    ts.forEachChild(node, (child) => visit(child, insideForm));
  };

  visit(sourceFile, false);

  return violations;
}

export function blockFormSubmitPlugin(): Plugin {
  let srcRoot = '';

  return {
    name: 'block-form-submit',
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
        const fileErrors = findFormSubmitViolations(code).map((error) => ({
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
        const code = await fs.readFile(error.filePath, 'utf8');
        const itemLoc = computeLineCol(code, error.start);
        return `  ${index + 1}. ${error.message}\n     文件: ${error.filePath}\n     位置: ${itemLoc.line}:${itemLoc.column}`;
      }));

      this.error({
        message:
          `[block-form-submit] 构建失败: 发现 ${errors.length} 处原生表单提交违规用法\n` +
          `错误:\n${details.join('\n')}\n\n` +
          '提示: 当前应用运行在未开启 allow-forms 的 iframe sandbox 中，不能依赖浏览器原生表单提交。',
        loc: {
          file: first.filePath,
          line: loc.line,
          column: loc.column,
        },
      });
    },
  };
}
