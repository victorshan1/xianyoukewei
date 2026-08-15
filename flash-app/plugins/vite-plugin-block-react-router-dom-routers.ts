import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import ts from 'typescript';
import type { Plugin } from 'vite';

const ROUTER_MODULES = new Set(['react-router-dom', 'react-router', 'react-router/dom']);

const BLOCKED_ROUTER_EXPORTS = new Set([
  'BrowserRouter',
  'HashRouter',
  'HydratedRouter',
  'Router',
  'RouterProvider',
  'StaticRouter',
  'StaticRouterProvider',
  'createBrowserRouter',
  'createHashRouter',
  'createMemoryRouter',
  'createStaticHandler',
  'createStaticRouter',
  'unstable_HistoryRouter',
  'UNSAFE_createBrowserHistory',
  'UNSAFE_createHashHistory',
  'UNSAFE_createMemoryHistory',
  'UNSAFE_createRouter',
]);

type RouterViolation = {
  start: number;
  end: number;
  message: string;
  codeSnippet?: string;
};

type FileViolation = RouterViolation & {
  filePath: string;
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
  const snippet = code.slice(start, end).trim();
  if (snippet.length > 100) {
    return `${snippet.slice(0, 97)}...`;
  }
  return snippet;
}

function getStaticPropertyName(node: ts.Expression | undefined): string | null {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function isRouterModuleSpecifier(node: ts.Expression): boolean {
  return ts.isStringLiteral(node) && ROUTER_MODULES.has(node.text);
}

function formatRouterUsage(exportName: string, localName?: string): string {
  if (!localName || localName === exportName) {
    return exportName;
  }
  return `${exportName} as ${localName}`;
}

function createRouterMessage(exportName: string, localName?: string): string {
  return (
    `禁止使用 React Router 的 ${formatRouterUsage(exportName, localName)}。` +
    '应用运行在移动端 WebView/iframe 中，不能依赖真实 URL、history、hash 或服务端路由；' +
    "请改用 import { MemoryRouter as Router } from 'react-router-dom'，并用 <Router> 包裹 <Routes>/<Route>。"
  );
}

function findReactRouterDomRouterViolations(code: string): RouterViolation[] {
  const sourceFile = ts.createSourceFile('module.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violations: RouterViolation[] = [];
  const routerNamespaces = new Set<string>();

  const addViolation = (node: ts.Node, exportName: string, localName?: string) => {
    const start = node.getStart(sourceFile);
    const end = node.getEnd();
    violations.push({
      start,
      end,
      message: createRouterMessage(exportName, localName),
      codeSnippet: getCodeSnippet(code, start, end),
    });
  };

  const inspectImportDeclaration = (node: ts.ImportDeclaration) => {
    if (!isRouterModuleSpecifier(node.moduleSpecifier)) {
      return;
    }

    const importClause = node.importClause;
    if (!importClause) {
      return;
    }

    const namedBindings = importClause.namedBindings;
    if (!namedBindings) {
      return;
    }

    if (ts.isNamespaceImport(namedBindings)) {
      routerNamespaces.add(namedBindings.name.text);
      return;
    }

    for (const element of namedBindings.elements) {
      if (importClause.isTypeOnly || element.isTypeOnly) {
        continue;
      }

      const exportedName = (element.propertyName ?? element.name).text;
      if (!BLOCKED_ROUTER_EXPORTS.has(exportedName)) {
        continue;
      }

      addViolation(element, exportedName, element.name.text);
    }
  };

  const inspectExportDeclaration = (node: ts.ExportDeclaration) => {
    if (!node.moduleSpecifier || !isRouterModuleSpecifier(node.moduleSpecifier)) {
      return;
    }

    const exportClause = node.exportClause;
    if (!exportClause) {
      addViolation(node, 'export *');
      return;
    }

    if (!ts.isNamedExports(exportClause)) {
      return;
    }

    for (const element of exportClause.elements) {
      if (element.isTypeOnly) {
        continue;
      }

      const exportedName = (element.propertyName ?? element.name).text;
      if (!BLOCKED_ROUTER_EXPORTS.has(exportedName)) {
        continue;
      }

      addViolation(element, exportedName, element.name.text);
    }
  };

  const inspectNamespacePropertyAccess = (node: ts.PropertyAccessExpression) => {
    if (!ts.isIdentifier(node.expression) || !routerNamespaces.has(node.expression.text)) {
      return;
    }

    const exportName = node.name.text;
    if (!BLOCKED_ROUTER_EXPORTS.has(exportName)) {
      return;
    }

    addViolation(node, exportName);
  };

  const inspectNamespaceElementAccess = (node: ts.ElementAccessExpression) => {
    if (!ts.isIdentifier(node.expression) || !routerNamespaces.has(node.expression.text)) {
      return;
    }

    const exportName = getStaticPropertyName(node.argumentExpression);
    if (!exportName || !BLOCKED_ROUTER_EXPORTS.has(exportName)) {
      return;
    }

    addViolation(node, exportName);
  };

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) {
      inspectImportDeclaration(node);
    } else if (ts.isExportDeclaration(node)) {
      inspectExportDeclaration(node);
    } else if (ts.isPropertyAccessExpression(node)) {
      inspectNamespacePropertyAccess(node);
    } else if (ts.isElementAccessExpression(node)) {
      inspectNamespaceElementAccess(node);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return violations.sort((a, b) => a.start - b.start);
}

export function blockReactRouterDomRoutersPlugin(): Plugin {
  let srcRoot = '';

  return {
    name: 'block-react-router-dom-routers',
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
        const fileErrors = findReactRouterDomRouterViolations(code).map((error) => ({
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
        return `  ${index + 1}. ${error.message}\n     文件: ${error.filePath}\n     位置: ${itemLoc.line}:${itemLoc.column}${error.codeSnippet ? `\n     代码: ${error.codeSnippet}` : ''}`;
      }));

      this.error({
        message:
          `[block-react-router-dom-routers] 构建失败: 发现 ${errors.length} 处禁止的 React Router 路由模式使用\n` +
          `错误:\n${details.join('\n')}\n\n` +
          "提示: 当前应用运行在移动端 WebView/iframe 中，请统一使用 `import { MemoryRouter as Router } from 'react-router-dom'`。",
        loc: {
          file: first.filePath,
          line: loc.line,
          column: loc.column,
        },
      });
    },
  };
}
