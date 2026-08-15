import type { Plugin } from "vite";

type NodeAny = any;

function isHttpUrl(s: unknown): s is string {
  return typeof s === "string" && /^https?:\/\//i.test(s);
}

function getPropName(node: NodeAny): string | null {
  if (!node) return null;
  if (node.type === "Identifier") return node.name ?? null;
  if (node.type === "Literal") return typeof node.value === "string" ? node.value : null;
  return null;
}

function getIdentifierName(node: NodeAny): string | null {
  if (!node) return null;
  if (node.type === "Identifier") return node.name ?? null;
  return null;
}

function computeLineCol(code: string, index: number) {
  // 1-based line/col
  let line = 1;
  let col = 1;
  for (let i = 0; i < index && i < code.length; i++) {
    if (code.charCodeAt(i) === 10) { // '\n'
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, column: col };
}

function walk(node: NodeAny, visit: (n: NodeAny) => void) {
  if (!node || typeof node !== "object") return;
  visit(node);

  for (const key of Object.keys(node)) {
    const v = node[key];
    if (!v) continue;
    if (Array.isArray(v)) {
      for (const child of v) walk(child, visit);
    } else if (v && typeof v.type === "string") {
      walk(v, visit);
    }
  }
}

// 检查是否是 document.createElement('script') 调用
function isCreateElementScript(node: NodeAny): boolean {
  if (!node || node.type !== "CallExpression") return false;
  
  const callee = node.callee;
  if (callee?.type !== "MemberExpression") return false;
  
  const calleeProp = getPropName(callee.property);
  if (calleeProp !== "createElement") return false;
  
  const args = node.arguments ?? [];
  const arg0 = args[0];
  if (!(arg0?.type === "Literal" && String(arg0.value).toLowerCase() === "script")) {
    return false;
  }
  
  return true;
}

export function blockRemoteImportsPlugin(): Plugin {
  return {
    name: "block-remote-imports",
    enforce: "post", // 避免 TS/TSX 语法导致解析失败
    apply: "build",  // 只在 build 阶段生效（你也可以去掉让 dev 也生效）

    transform(code, id) {
      if (id.includes("/node_modules/")) return null;
      if (id.startsWith("\0")) return null; // virtual module

      let ast: NodeAny;
      try {
        ast = this.parse(code);
      } catch (e: any) {
        // 如果解析失败，宁可不误判（你也可以改成直接 fail）
        return null;
      }

      const errors: Array<{
        message: string;
        start: number;
        codeSnippet?: string;
      }> = [];

      // 第一阶段：收集所有创建 script 元素的变量名
      // 使用 Set 存储变量名，支持同一作用域内的检测
      const scriptElementVars = new Set<string>();

      // 先遍历一次，收集所有 const/let/var x = document.createElement('script') 的变量名
      walk(ast, (n) => {
        // 检测变量声明：const/let/var script = document.createElement('script')
        if (n.type === "VariableDeclarator") {
          const id = n.id;
          const init = n.init;
          
          if (id?.type === "Identifier" && isCreateElementScript(init)) {
            const varName = id.name;
            scriptElementVars.add(varName);
          }
        }
      });

      // 第二阶段：检测所有违规的代码模式
      walk(ast, (n) => {
        // 规则 1：import('http(s)://...')
        if (n.type === "ImportExpression") {
          const src = n.source;
          if (src?.type === "Literal" && isHttpUrl(src.value)) {
            errors.push({
              start: n.start ?? 0,
              message: `禁止远程动态导入: import("${src.value}")`,
              codeSnippet: `import("${src.value}")`,
            });
          }
        }

        // 规则 2：document.createElement('script').src = 'http(s)://...' (直接赋值和分步赋值)
        if (n.type === "AssignmentExpression" && n.operator === "=") {
          const left = n.left;
          const right = n.right;

          // 只检查右值是 http(s) URL 的情况
          if (!(right?.type === "Literal" && isHttpUrl(right.value))) {
            return;
          }

          // left 必须是 MemberExpression，且属性是 src
          if (left?.type !== "MemberExpression") return;
          
          const leftProp = getPropName(left.property);
          if (leftProp !== "src") return;

          const obj = left.object;
          
          // 情况 1: 直接赋值 document.createElement('script').src = 'http(s)://...'
          if (obj?.type === "CallExpression" && isCreateElementScript(obj)) {
            errors.push({
              start: n.start ?? 0,
              message: `禁止远程脚本注入: createElement("script").src = "${right.value}"`,
              codeSnippet: `createElement("script").src = "${right.value}"`,
            });
            return;
          }

          // 情况 2: 分步赋值 script.src = 'http(s)://...' (script 是之前创建的变量)
          const varName = getIdentifierName(obj);
          if (varName && scriptElementVars.has(varName)) {
            errors.push({
              start: n.start ?? 0,
              message: `禁止远程脚本注入: ${varName}.src = "${right.value}"`,
              codeSnippet: `${varName}.src = "${right.value}"`,
            });
          }
        }
      });

      if (errors.length) {
        // 收集所有错误信息
        const errorMessages = errors.map((err, idx) => {
          const loc = computeLineCol(code, err.start);
          return `  ${idx + 1}. ${err.message}\n     位置: ${loc.line}:${loc.column}${err.codeSnippet ? `\n     代码: ${err.codeSnippet}` : ''}`;
        }).join('\n');

        const first = errors[0];
        const loc = computeLineCol(code, first.start);
        
        this.error({
          id,
          message:
            `[block-remote-imports] 构建失败: 发现 ${errors.length} 个禁止的远程资源\n` +
            `文件: ${id}\n\n` +
            `错误:\n${errorMessages}\n\n` +
            `提示: 请使用本地 npm 依赖或打包的资源，而不是远程 http(s) URL。`,
          loc,
        });
      }

      return null;
    },
  };
}
