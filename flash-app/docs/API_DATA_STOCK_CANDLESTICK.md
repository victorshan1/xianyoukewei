---
skill_name: DATA_STOCK_CANDLESTICK
display_name: 稳定股票K线
description: 查询 A 股、港股和美股上市股票在指定周期和范围内的 K 线数据。
api_file: API_DATA_STOCK_CANDLESTICK.md
enable: true
---

# Stock Candlestick Data API

使用 `window.lingguang.data.getStockCandlestickData(options)` 获取稳定股票 K 线数据。

```typescript
type LingguangStockMarket = 'CN' | 'HK' | 'US';
type LingguangStockPeriod = '1d' | '1w' | '1mo';

interface LingguangStockCandlestickOptions {
  symbol?: string;
  name?: string;
  market?: LingguangStockMarket;
  period?: LingguangStockPeriod;
  startDate?: string;
  endDate?: string;
  range?: string;
  lookback?: string;
  count?: number;
  timeout?: number;
}

interface LingguangStockCandlestickResult {
  instrument: LingguangStockInstrument;
  latest: LingguangStockQuoteData | null;
  candles: LingguangStockQuoteData[];
  traceId?: string;
}

window.lingguang.data.getStockCandlestickData(
  options: LingguangStockCandlestickOptions
): Promise<LingguangStockCandlestickResult | null>
```

`LingguangStockInstrument` 和 `LingguangStockQuoteData` 的字段定义见 `API_DATA_STOCK_PRICE.md`。

## 参数规则

- `symbol` 和 `name` 至少传一个，优先使用明确股票代码；使用名称时建议同时传 `market`。
- `period` 支持日线、周线和月线，不支持分钟级 K 线。
- `startDate` 和 `endDate` 使用严格的 `YYYY-MM-DD` 格式。完整且合法的日期区间优先于 `range`、`lookback` 和 `count`。
- `range`、`lookback` 可表达 `1mo`、`1y`、`最近1年` 等相对区间。
- `count` 表示返回的 K 线根数，建议不超过 250。
- 指数、ETF、基金、期货、数字货币、贵金属和原油 K 线使用 `window.lingguang.data.fetch(query, schema)`。
- `candles` 按日期升序返回。均线、MACD 等指标应由应用基于 `candles` 计算。
- 本 API 只提供公开行情，不构成投资建议。失败或无数据时返回 `null`，调用异常会 reject。
- 日、周、月线自动刷新建议间隔 5 分钟，并清理 timer、检查页面可见性和防止并发。

## 示例

```typescript
const result = await window.lingguang.data.getStockCandlestickData({
  symbol: '600519.SH',
  market: 'CN',
  period: '1d',
  range: '1y',
  timeout: 15000,
});

if (!result?.candles.length) {
  showError('K 线数据暂时不可用，请稍后重试');
  return;
}

setCandlestickChart({
  name: result.instrument.name,
  candles: result.candles,
});
```
