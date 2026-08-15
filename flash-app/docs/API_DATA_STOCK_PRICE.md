---
skill_name: DATA_STOCK_PRICE
display_name: 稳定股票行情
description: 查询 A 股、港股和美股上市股票的最新行情及最近走势。
api_file: API_DATA_STOCK_PRICE.md
enable: true
---

# Stock Price Data API

使用 `window.lingguang.data.getStockPrice(options)` 获取股票最新行情和最近走势。

```typescript
type LingguangStockMarket = 'CN' | 'HK' | 'US';

interface LingguangStockPriceOptions {
  symbol?: string;
  name?: string;
  market?: LingguangStockMarket;
  recentDays?: number;
  timeout?: number;
}

interface LingguangStockInstrument {
  name: string;
  symbol: string;
  market: string;
  currency?: string;
  period?: string;
  periodLabel?: string;
  tradeStatus?: string;
  startDate?: string;
  endDate?: string;
}

interface LingguangStockQuoteData {
  date: string;
  openPrice: number | null;
  highPrice: number | null;
  lowPrice: number | null;
  closePrice: number | null;
  previousClosePrice?: number | null;
  priceChange?: number | null;
  priceChangePercent?: number | null;
  volume?: number | null;
  amount?: number | null;
}

interface LingguangStockPriceResult {
  instrument: LingguangStockInstrument;
  latest: LingguangStockQuoteData | null;
  recentCandles: LingguangStockQuoteData[];
  traceId?: string;
}

window.lingguang.data.getStockPrice(
  options: LingguangStockPriceOptions
): Promise<LingguangStockPriceResult | null>
```

## 使用规则

- `symbol` 和 `name` 至少传一个，优先使用 `600519.SH`、`9988.HK`、`AAPL.US` 等明确代码。
- 使用名称查询时建议同时传 `market`，其中 `CN`、`HK`、`US` 分别表示 A 股、港股和美股。
- `recentDays` 适合价格卡片的迷你走势，建议不超过 30。
- 指数、ETF、基金、期货、数字货币和大宗商品不属于本 API；使用 `window.lingguang.data.fetch(query, schema)` 获取这些公开数据。
- 完整 K 线、指定日期区间或指定周期使用 `getStockCandlestickData`。
- `priceChangePercent` 是百分比数值，例如 `-1.59` 表示下跌 1.59%。
- 本 API 只提供公开行情，不构成投资建议。应用不得给出保证收益或确定性买卖结论。
- 失败或无数据时返回 `null`；调用异常会 reject。数值字段可能为空，渲染前必须检查。
- 最新行情自动刷新建议间隔 30 至 60 秒，非交易时段可放宽到 3 至 5 分钟。

## 示例

```typescript
const result = await window.lingguang.data.getStockPrice({
  symbol: '600519.SH',
  market: 'CN',
  recentDays: 7,
  timeout: 8000,
});

if (!result?.latest || typeof result.latest.closePrice !== 'number') {
  showError('股票行情暂时不可用，请稍后重试');
  return;
}

setStockCard({
  name: result.instrument.name,
  price: result.latest.closePrice,
  changePercent: result.latest.priceChangePercent,
  candles: result.recentCandles,
});
```
