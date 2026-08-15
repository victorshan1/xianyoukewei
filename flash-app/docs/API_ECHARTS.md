---
skill_name: ECHARTS
display_name: ECharts
description: 功能强大的数据可视化图表库，用于创建各种类型的图表和可视化效果
api_file: API_ECHARTS.md
enable: true
---

# ECharts

开发环境中已经集成了 ECharts，如需使用 ECharts 组件，需要在对应的代码文件中引入，示例如下

```typescript
import ReactECharts from 'echarts-for-react';
```

环境中可用的 ECharts 包包括：
echarts, echarts-for-react

## Candlestick 数据规范（必须遵守）

- candlestick 的 series 数据必须为 `[open, close, low, high]` 的纯数值数组
- 日期只能放在 `xAxis.data` 或 dataset 的维度中，禁止混入 series 数据
