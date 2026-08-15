---
skill_name: DATA_WEATHER
display_name: 稳定天气数据
description: 查询指定城市或位置的实时天气、空气质量、逐小时预报、多日预报和生活指数。
api_file: API_DATA_WEATHER.md
enable: true
---

# Weather Data API

使用 `window.lingguang.data.getWeather(options)` 获取稳定天气数据。

```typescript
type LingguangWeatherInclude = 'realtime' | 'daily' | 'hourly' | 'lifeIndex';

interface LingguangWeatherLocation {
  province?: string;
  city: string;
  district?: string;
  longitude?: number;
  latitude?: number;
}

interface LingguangWeatherOptions {
  location: string | LingguangWeatherLocation;
  include?: LingguangWeatherInclude[];
  forecastDays?: 1 | 3 | 7 | 15;
  hourlyHours?: 0 | 24 | 48;
  timeout?: number;
}

interface LingguangWeatherResult {
  location: {
    country?: string;
    province?: string;
    city: string;
    district?: string;
  };
  updatedAt?: string;
  realtime?: LingguangWeatherRealtime;
  dailyForecast: LingguangWeatherDailyForecast[];
  hourlyForecast: LingguangWeatherHourlyForecast[];
  lifeIndex: LingguangWeatherLifeIndex[];
  traceId?: string;
}

interface LingguangWeatherRealtime {
  date?: string;
  condition: string;
  temperatureC: number | null;
  tempHighC?: number | null;
  tempLowC?: number | null;
  feelsLikeC?: number | null;
  humidityPercent?: number | null;
  windDirection?: string;
  windLevel?: string;
  windSpeedMps?: number | null;
  visibilityMeters?: number | null;
  pressureHpa?: number | null;
  uvIndex?: number | null;
  uvLevel?: string;
  dewPointC?: number | null;
  sunrise?: string;
  sunset?: string;
  observationTime?: string;
  travelReminder?: string;
  pm25Level?: string;
  pm25Aqi?: number | null;
  precipitationProbabilityPercent?: number | null;
}

interface LingguangWeatherDailyForecast {
  date: string;
  weekday?: string;
  conditionDay: string;
  conditionNight?: string;
  tempHighC: number | null;
  tempLowC: number | null;
  windDirectionDay?: string;
  windDirectionNight?: string;
  windLevelDay?: string;
  windLevelNight?: string;
  humidityPercent?: number | null;
  humidityNightPercent?: number | null;
  precipitationProbabilityPercent?: number | null;
  pm25Level?: string;
  pm25Aqi?: number | null;
  iconDay?: string;
  iconNight?: string;
}

interface LingguangWeatherHourlyForecast {
  time: string;
  hour: number | null;
  condition: string;
  temperatureC: number | null;
  humidityPercent?: number | null;
  windDirection?: string;
  windLevel?: string;
  rainProbabilityPercent?: number | null;
  precipitationMm?: number | null;
  qpfMm?: number | null;
  visibilityMeters?: number | null;
  uvIndex?: number | null;
  pm25Level?: string;
  pm25Aqi?: number | null;
  isNow?: boolean;
}

interface LingguangWeatherLifeIndex {
  date?: string;
  type: string;
  typeId?: string | number;
  value?: string;
  level?: string;
  levelDesc?: string;
  description?: string;
  detail?: string;
}

window.lingguang.data.getWeather(
  options: LingguangWeatherOptions
): Promise<LingguangWeatherResult | null>
```

## 使用规则

- `location` 必填。明确城市时可传字符串；已有结构化位置时可传城市、行政区或经纬度。
- 天气卡片通常传 `include: ['realtime', 'daily']`；需要小时趋势或降雨概率时加入 `'hourly'`，并将 `hourlyHours` 设为 24 或 48。
- `forecastDays` 最大为 15。
- 当前是否下雨优先根据 `realtime.condition` 判断；未来一小时降雨概率读取 `isNow === true` 记录的下一条 `rainProbabilityPercent`。
- `0` 是有效数值，`null` 或字段缺失才表示数据不可用。渲染可空数值前必须先判断，不要直接调用 `.toFixed()`。
- 失败或无数据时返回 `null`；调用异常会 reject。应用应提供明确错误态和重试入口，不展示写死天气。
- 自动刷新应清理 timer、检查页面可见性并防止并发。天气实况建议至少间隔 10 分钟，多日预报建议间隔 30 至 60 分钟。

## 示例

```typescript
const weather = await window.lingguang.data.getWeather({
  location: { province: '浙江省', city: '杭州市' },
  include: ['realtime', 'daily', 'hourly'],
  forecastDays: 7,
  hourlyHours: 24,
  timeout: 8000,
});

if (!weather?.realtime) {
  showError('天气数据暂时不可用，请稍后重试');
  return;
}

setWeatherCard({
  city: weather.location.city,
  condition: weather.realtime.condition,
  temperature: weather.realtime.temperatureC,
  forecast: weather.dailyForecast.slice(0, 7),
});
```
