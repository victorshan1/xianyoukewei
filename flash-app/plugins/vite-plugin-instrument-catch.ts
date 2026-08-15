import type { Plugin } from 'vite';

type NodeAny = any;

type CatchInsertion = {
  index: number;
  text: string;
};

const DEFAULT_MARKER = 'INSTRUMENTED_CATCH';
const MONITOR_NAME = '__instrumentedCatchMonitor';

function normalizePath(id: string): string {
  return id.replace(/\\/g, '/');
}

function isJavaScriptLikeModule(id: string): boolean {
  const cleanId = normalizePath(id).split('?')[0];
  return /\.(mjs|js|jsx|ts|tsx)$/.test(cleanId) && !cleanId.endsWith('.d.ts');
}

function walk(node: NodeAny, visit: (node: NodeAny) => void) {
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

function getLineIndent(code: string, index: number): string {
  const lineStart = code.lastIndexOf('\n', index - 1) + 1;
  const linePrefix = code.slice(lineStart, index);
  const match = /^[\t ]*/.exec(linePrefix);
  return match?.[0] ?? '';
}

function getCatchBodyIndent(code: string, bodyStart: number): string {
  const bodyLineIndent = getLineIndent(code, bodyStart);
  return `${bodyLineIndent}  `;
}

function hasInstrumentedCatchLog(code: string, bodyStart: number, marker: string): boolean {
  const bodyPrefix = code.slice(bodyStart + 1, bodyStart + 160);
  return bodyPrefix.includes(MONITOR_NAME) || bodyPrefix.includes(`[FLASH APP][${marker}]`);
}

function collectCatchInsertions(code: string, ast: NodeAny, marker: string): CatchInsertion[] {
  const insertions: CatchInsertion[] = [];

  walk(ast, (node) => {
    if (node.type !== 'CatchClause') return;
    if (node.param?.type !== 'Identifier') return;
    if (node.body?.type !== 'BlockStatement') return;
    if (typeof node.body.start !== 'number') return;
    if (hasInstrumentedCatchLog(code, node.body.start, marker)) return;

    const errorName = node.param.name;
    const indent = getCatchBodyIndent(code, node.body.start);
    insertions.push({
      index: node.body.start + 1,
      text: `\n${indent}typeof globalThis.${MONITOR_NAME} === 'function' && globalThis.${MONITOR_NAME}(${errorName});`,
    });
  });

  return insertions;
}

function applyInsertions(code: string, insertions: CatchInsertion[]): string {
  let nextCode = code;
  const orderedInsertions = [...insertions].sort((a, b) => b.index - a.index);

  for (const insertion of orderedInsertions) {
    nextCode = `${nextCode.slice(0, insertion.index)}${insertion.text}${nextCode.slice(insertion.index)}`;
  }

  return nextCode;
}

export function instrumentCatchPlugin(marker = DEFAULT_MARKER): Plugin {
  return {
    name: 'instrument-catch',
    enforce: 'post',
    apply: 'build',

    transform(code, id) {
      const normalizedId = normalizePath(id);
      if (normalizedId.includes('/node_modules/')) return null;
      if (id.startsWith('\0')) return null;
      if (!isJavaScriptLikeModule(id)) return null;

      let ast: NodeAny;
      try {
        ast = this.parse(code);
      } catch {
        return null;
      }

      const insertions = collectCatchInsertions(code, ast, marker);
      if (!insertions.length) return null;

      return {
        code: applyInsertions(code, insertions),
        map: null,
      };
    },
  };
}
