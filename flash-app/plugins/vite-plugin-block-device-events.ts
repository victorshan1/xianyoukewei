import type { Plugin } from "vite";

type NodeAny = any;

const BLOCKED_CONSTRUCTORS = new Set(["DeviceOrientationEvent", "DeviceMotionEvent"]);
const BLOCKED_EVENT_NAMES = new Set(["deviceorientation", "devicemotion"]);
const BLOCKED_EVENT_HANDLER_PROPS = new Set(["ondeviceorientation", "ondevicemotion"]);
const GLOBAL_OBJECTS = new Set(["window", "globalThis", "self"]);

function getPropName(node: NodeAny): string | null {
  if (!node) return null;
  if (node.type === "Identifier") return node.name ?? null;
  if (node.type === "Literal") return typeof node.value === "string" ? node.value : null;
  return null;
}

function getMemberPropName(node: NodeAny): string | null {
  if (!node || node.type !== "MemberExpression") return null;
  if (node.computed) {
    const prop = node.property;
    if (prop?.type === "Literal" && typeof prop.value === "string") return prop.value;
    return null;
  }
  return getPropName(node.property);
}

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

function getCodeSnippet(code: string, start: number, end: number): string {
  const snippet = code.slice(start, end);
  if (snippet.length > 60) return snippet.slice(0, 57) + "...";
  return snippet;
}

function extractMemberChain(node: NodeAny): string[] | null {
  if (!node || node.type !== "MemberExpression") return null;

  const parts: string[] = [];
  let current: NodeAny = node;

  while (current?.type === "MemberExpression") {
    const prop = getMemberPropName(current);
    if (!prop) return null;
    parts.unshift(prop);
    current = current.object;
  }

  if (current?.type !== "Identifier") return null;
  parts.unshift(current.name);
  return parts;
}

export function blockDeviceEventsPlugin(): Plugin {
  return {
    name: "block-device-events",
    enforce: "post",
    apply: "build",

    transform(code, id) {
      if (id.includes("/node_modules/")) return null;
      if (id.startsWith("\0")) return null;

      let ast: NodeAny;
      try {
        ast = this.parse(code);
      } catch {
        return null;
      }

      const errorsByStart = new Map<number, {
        start: number;
        end: number;
        message: string;
        codeSnippet?: string;
      }>();

      const apiIdentifiersInMemberExpression = new Set<number>();

      const addError = (item: {
        start: number;
        end: number;
        message: string;
        codeSnippet?: string;
      }) => {
        const existing = errorsByStart.get(item.start);
        if (!existing || item.end > existing.end) {
          errorsByStart.set(item.start, item);
        }
      };

      walk(ast, (n) => {
        if (n.type === "MemberExpression") {
          const chain = extractMemberChain(n);
          if (chain && chain.length >= 2) {
            const root = chain[0];
            const apiName = chain[1];
            if (GLOBAL_OBJECTS.has(root) && BLOCKED_CONSTRUCTORS.has(apiName)) {
              const start = n.start ?? 0;
              const end = n.end ?? start + 20;
              addError({
                start,
                end,
                message: `禁止使用浏览器原生 ${apiName}: ${chain.join(".")}`,
                codeSnippet: getCodeSnippet(code, start, end),
              });
            }
          }

          const propName = getMemberPropName(n);
          if (propName && BLOCKED_EVENT_HANDLER_PROPS.has(propName)) {
            const start = n.start ?? 0;
            const end = n.end ?? start + 20;
            addError({
              start,
              end,
              message: `禁止使用浏览器原生传感器事件处理器: ${propName}`,
              codeSnippet: getCodeSnippet(code, start, end),
            });
          }

          if (n.property?.type === "Identifier" && BLOCKED_CONSTRUCTORS.has(n.property.name)) {
            apiIdentifiersInMemberExpression.add(n.property.start ?? 0);
          }

          let obj = n.object;
          while (obj?.type === "MemberExpression") {
            if (obj.property?.type === "Identifier" && BLOCKED_CONSTRUCTORS.has(obj.property.name)) {
              apiIdentifiersInMemberExpression.add(obj.property.start ?? 0);
            }
            obj = obj.object;
          }
          if (obj?.type === "Identifier" && BLOCKED_CONSTRUCTORS.has(obj.name)) {
            apiIdentifiersInMemberExpression.add(obj.start ?? 0);
          }
        }

        if (n.type === "CallExpression" && n.callee?.type === "MemberExpression") {
          const calleeProp = getMemberPropName(n.callee);
          if (calleeProp === "addEventListener" || calleeProp === "removeEventListener") {
            const firstArg = n.arguments?.[0];
            let eventName: string | null = null;

            if (firstArg?.type === "Literal" && typeof firstArg.value === "string") {
              eventName = firstArg.value.toLowerCase();
            } else if (firstArg?.type === "TemplateLiteral" && (firstArg.expressions?.length ?? 0) === 0) {
              eventName = (firstArg.quasis?.[0]?.value?.cooked ?? "").toLowerCase();
            }

            if (eventName && BLOCKED_EVENT_NAMES.has(eventName)) {
              const start = n.start ?? 0;
              const end = n.end ?? start + 30;
              addError({
                start,
                end,
                message: `禁止监听浏览器原生传感器事件: ${calleeProp}("${eventName}")`,
                codeSnippet: getCodeSnippet(code, start, end),
              });
            }
          }
        }
      });

      walk(ast, (n) => {
        if (n.type === "Identifier" && BLOCKED_CONSTRUCTORS.has(n.name)) {
          const start = n.start ?? 0;
          if (apiIdentifiersInMemberExpression.has(start)) return;

          const end = n.end ?? start + n.name.length;
          addError({
            start,
            end,
            message: `禁止使用浏览器原生 ${n.name}: 直接访问 ${n.name}`,
            codeSnippet: getCodeSnippet(code, start, end),
          });
        }
      });

      const errors = Array.from(errorsByStart.values()).sort((a, b) => a.start - b.start);
      if (!errors.length) return null;

      const errorMessages = errors.map((err, idx) => {
        const loc = computeLineCol(code, err.start);
        return `  ${idx + 1}. ${err.message}\n     位置: ${loc.line}:${loc.column}${err.codeSnippet ? `\n     代码: ${err.codeSnippet}` : ""}`;
      }).join("\n");

      const first = errors[0];
      const loc = computeLineCol(code, first.start);

      this.error({
        id,
        message:
          `[block-device-events] 构建失败: 发现 ${errors.length} 处禁止的设备传感器原生 API 使用\n` +
          `文件: ${id}\n\n` +
          `错误:\n${errorMessages}\n\n` +
          `提示: 请改用 window.lingguang 传感器 API（参考 API_DEVICEMOTION.md / API_ACCELEROMETER.md / API_COMPASS.md）。`,
        loc,
      });

      return null;
    },
  };
}
