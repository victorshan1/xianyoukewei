import fs from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';

const AGENT_PROMPTS_EXAMPLE = [
  '{',
  '  "schemaVersion": 1,',
  '  "prompts": []',
  '}',
].join('\n');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateAgentPrompts(value: unknown): string[] {
  if (!isRecord(value)) {
    return ['agent-prompts.json 顶层必须是 JSON 对象。'];
  }

  const errors: string[] = [];

  if (value.schemaVersion !== 1) {
    errors.push('agent-prompts.json 中的 schemaVersion 必须为 1。');
  }

  if (!Array.isArray(value.prompts)) {
    errors.push('agent-prompts.json 中的 prompts 必须是数组。');
    return errors;
  }

  for (const [index, prompt] of value.prompts.entries()) {
    if (typeof prompt !== 'string') {
      errors.push(`agent-prompts.json 中的 prompts[${index}] 必须是字符串。`);
    } else if (prompt.trim().length === 0) {
      errors.push(`agent-prompts.json 中的 prompts[${index}] 不能为空字符串或纯空白。`);
    }
  }

  return errors;
}

export function validateAgentPromptsPlugin(): Plugin {
  let agentPromptsPath = '';

  return {
    name: 'validate-agent-prompts',
    enforce: 'pre',
    apply: 'build',

    configResolved(config) {
      agentPromptsPath = path.resolve(config.root, 'agent-prompts.json');
    },

    async buildStart() {
      if (!agentPromptsPath) return;

      let content = '';
      try {
        content = await fs.readFile(agentPromptsPath, 'utf8');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.error({
          message:
            `[validate-agent-prompts] 构建失败: 缺少根目录 agent-prompts.json\n` +
            `文件: ${agentPromptsPath}\n\n` +
            `错误:\n  1. 项目根目录必须存在 agent-prompts.json。\n` +
            `  2. 读取文件失败: ${message}\n\n` +
            `示例:\n${AGENT_PROMPTS_EXAMPLE}`,
          loc: {
            file: agentPromptsPath,
            line: 1,
            column: 1,
          },
        });
      }

      let value: unknown;
      try {
        value = JSON.parse(content);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.error({
          message:
            `[validate-agent-prompts] 构建失败: agent-prompts.json 不是合法 JSON\n` +
            `文件: ${agentPromptsPath}\n\n` +
            `错误:\n  1. ${message}\n\n` +
            `示例:\n${AGENT_PROMPTS_EXAMPLE}`,
          loc: {
            file: agentPromptsPath,
            line: 1,
            column: 1,
          },
        });
      }

      const errors = validateAgentPrompts(value);
      if (!errors.length) return;

      const details = errors.map((error, index) => {
        return `  ${index + 1}. ${error}`;
      }).join('\n');

      this.error({
        message:
          `[validate-agent-prompts] 构建失败: agent-prompts.json 校验未通过\n` +
          `文件: ${agentPromptsPath}\n\n` +
          `错误:\n${details}\n\n` +
          `要求: schemaVersion 必须为 1，prompts 必须是字符串数组，数组元素不得为空。\n\n` +
          `示例:\n${AGENT_PROMPTS_EXAMPLE}`,
        loc: {
          file: agentPromptsPath,
          line: 1,
          column: 1,
        },
      });
    },
  };
}
