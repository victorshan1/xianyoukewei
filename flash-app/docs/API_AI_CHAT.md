# window.lingguang.ai.chat

非流式 AI Chat API，替代 legacy `window.callLLM`。支持 `messages` 多轮上下文和 `responseFormat` 结构化输出。

可选 `model` 字段用于指定模型名称；不传时由服务端选择默认模型。只有用户或配置明确给出模型名称时才传，不要臆造模型名。

```typescript
const result = await window.lingguang.ai.chat({
  messages: [
    { role: 'system', content: '你是一个简洁、准确的助手。' },
    { role: 'user', content: '请用三句话介绍量子计算。' },
  ],
  responseFormat: { type: 'text' },
  timeout: 60000,
});

setText(result.content);
```
需要稳定 JSON 时使用 `json_schema`，并从 `result.data` 读取：

```typescript
const result = await window.lingguang.ai.chat({
  messages: [
    { role: 'system', content: '只返回符合 schema 的 JSON。' },
    { role: 'user', content: '提取：杭州，亲子展览。' },
  ],
  responseFormat: {
    type: 'json_schema',
    jsonSchema: {
      name: 'event_query',
      schema: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          topic: { type: 'string' },
        },
        required: ['city', 'topic'],
        additionalProperties: false,
      },
    },
  },
});
```
