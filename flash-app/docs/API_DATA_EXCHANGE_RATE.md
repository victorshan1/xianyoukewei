---
skill_name: DATA_EXCHANGE_RATE
display_name: 稳定汇率数据
description: 查询明确货币对的实时汇率和金额换算。
api_file: API_DATA_EXCHANGE_RATE.md
enable: true
---

# Exchange Rate Data API

使用 `window.lingguang.data.getExchangeRate(options)` 获取稳定汇率数据。

```typescript
interface LingguangExchangeRateOptions {
  from: string;
  to: string;
  amount?: number;
  timeout?: number;
}

interface LingguangExchangeRateResult {
  from: string;
  to: string;
  title: string;
  rate: number | null;
  inverseRate: number | null;
  amount?: number;
  convertedAmount?: number | null;
  updateTime?: string;
  changeRatePercent?: number | null;
  changeValue?: number | null;
  traceId?: string;
}

window.lingguang.data.getExchangeRate(
  options: LingguangExchangeRateOptions
): Promise<LingguangExchangeRateResult | null>
```

## 字段语义

- `from` 和 `to` 使用 ISO 4217 三位大写货币代码，例如 `USD`、`CNY`。
- `rate` 的语义固定为 `1 from = rate to`，`inverseRate` 表示反向汇率。
- 传入 `amount` 且汇率可用时，`convertedAmount` 表示 `amount * rate`。
- 本 API 用于法币汇率；股票、基金、数字货币和贵金属价格使用相应数据 API。
- 多货币对可以并发请求，但同屏活跃请求建议不超过 3 个。
- 失败或无数据时返回 `null`；调用异常会 reject。应用应提供错误态，不展示写死汇率。
- 自动刷新建议间隔 2 至 5 分钟，并清理 timer、检查页面可见性和防止并发。

## 示例

```typescript
const result = await window.lingguang.data.getExchangeRate({
  from: 'USD',
  to: 'CNY',
  amount: 100,
  timeout: 8000,
});

if (!result || typeof result.rate !== 'number') {
  showError('汇率数据暂时不可用，请稍后重试');
  return;
}

setExchangeRate({
  rateText: `1 ${result.from} = ${result.rate.toFixed(4)} ${result.to}`,
  convertedAmount: result.convertedAmount,
  updateTime: result.updateTime,
});
```
