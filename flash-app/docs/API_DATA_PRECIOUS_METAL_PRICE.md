---
skill_name: DATA_PRECIOUS_METAL_PRICE
display_name: 稳定贵金属行情
description: 查询黄金、白银、铂金等贵金属的最新价格和 K 线走势。
api_file: API_DATA_PRECIOUS_METAL_PRICE.md
enable: true
---

# Precious Metal Price Data API

使用 `window.lingguang.data.getPreciousMetalPrice(options)` 获取稳定贵金属行情数据。

```typescript
type LingguangPreciousMetal = 'gold' | 'silver' | 'platinum';
type LingguangPreciousMetalMarket = 'SGE' | 'LBMA';
type LingguangPreciousMetalPeriod = '1d' | '1w' | '1mo';

interface LingguangPreciousMetalPriceOptions {
  metal?: LingguangPreciousMetal;
  symbol?: string;
  market?: LingguangPreciousMetalMarket;
  period?: LingguangPreciousMetalPeriod;
  startDate?: string;
  endDate?: string;
  count?: number;
  timeout?: number;
}

interface LingguangPreciousMetalInstrument {
  name: string;
  symbol: string;
  market: string;
  metal?: LingguangPreciousMetal;
  currency?: string;
  unit?: string;
  period?: string;
  periodLabel?: string;
  startDate?: string;
  endDate?: string;
}

interface LingguangPreciousMetalQuoteData {
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

interface LingguangPreciousMetalPriceResult {
  instrument: LingguangPreciousMetalInstrument;
  latest: LingguangPreciousMetalQuoteData | null;
  candles: LingguangPreciousMetalQuoteData[];
  traceId?: string;
}

window.lingguang.data.getPreciousMetalPrice(
  options: LingguangPreciousMetalPriceOptions
): Promise<LingguangPreciousMetalPriceResult | null>
```

## 使用规则

- `metal` 和 `symbol` 至少传一个。明确品种时优先传 `AU9999.SGE`、`AG9999.SGE`、`PT9995.SGE`、`XAUUSD`、`XAGUSD` 等代码。
- `market` 中 `SGE` 表示上海黄金交易所，`LBMA` 表示国际贵金属市场。
- `period` 支持日线、周线和月线；`startDate`、`endDate` 使用 `YYYY-MM-DD`。
- 同页展示多个品种时必须以请求使用的完整 `symbol` 作为 state key，避免不同市场或品种的数据互相覆盖。
- `latest` 是最新可用行情，`candles` 是按日期升序返回的已完成周期行情；调用方不得假设两者最后一项相同。
- 金店零售价、首饰回收价、品牌金价和手工费使用 `window.lingguang.data.fetch(query, schema)`。
- 本 API 只提供公开行情，不构成投资建议。失败或无数据时返回 `null`，调用异常会 reject。
- 价格卡片自动刷新建议间隔 30 至 60 秒，K 线建议间隔 1 至 5 分钟。

## 示例

```typescript
const result = await window.lingguang.data.getPreciousMetalPrice({
  symbol: 'AU9999.SGE',
  market: 'SGE',
  period: '1d',
  count: 30,
  timeout: 8000,
});

if (!result?.latest || typeof result.latest.closePrice !== 'number') {
  showError('贵金属行情暂时不可用，请稍后重试');
  return;
}

setMetalPrice({
  name: result.instrument.name,
  price: result.latest.closePrice,
  unit: result.instrument.unit,
  changePercent: result.latest.priceChangePercent,
  candles: result.candles,
});
```
