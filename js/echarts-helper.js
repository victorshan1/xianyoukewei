/**
 * ECharts 通用配置工具
 * 统一主题色、字体、响应式处理
 */
(function () {
  'use strict';

  window.App = window.App || {};

  const EChartsHelper = {
    /**
     * 获取 CSS 变量值
     */
    getCSSVar(name) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    },

    /**
     * 获取端口主题色
     */
    getPortalColor() {
      const page = document.querySelector('.page-container');
      if (!page) return { primary: '#FF6B35', gradient: ['#FF6B35', '#FF8C42'] };

      if (page.classList.contains('port-teacher')) {
        return { primary: '#FF6B35', gradient: ['#FF6B35', '#FF8C42'], name: 'teacher' };
      }
      if (page.classList.contains('port-student')) {
        return { primary: '#4ECDC4', gradient: ['#4ECDC4', '#6EE7DF'], name: 'student' };
      }
      if (page.classList.contains('port-parent')) {
        return { primary: '#A78BFA', gradient: ['#A78BFA', '#C4B5FD'], name: 'parent' };
      }
      return { primary: '#FF6B35', gradient: ['#FF6B35', '#FF8C42'], name: 'teacher' };
    },

    /**
     * 创建 ECharts 实例（带默认配置）
     */
    create(container, options) {
      if (!window.echarts) {
        console.warn('ECharts 未加载');
        return null;
      }

      // 如果容器已有 echarts 实例，先销毁
      const existing = echarts.getInstanceByDom(container);
      if (existing) existing.dispose();

      const chart = echarts.init(container);
      const color = this.getPortalColor();

      const defaultOption = {
        color: [color.primary, '#4ECDC4', '#A78BFA', '#FF8C42', '#52C41A', '#FA8C16'],
        textStyle: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
        grid: { left: 50, right: 20, top: 30, bottom: 40, containLabel: true },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderColor: '#eee',
          borderWidth: 1,
          textStyle: { color: '#333', fontSize: 13 },
          extraCssText: 'border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);'
        }
      };

      // 合并配置
      const merged = this.deepMerge(defaultOption, options || {});
      chart.setOption(merged);

      // 响应式
      window.addEventListener('resize', () => chart.resize());

      return chart;
    },

    /**
     * 深合并
     */
    deepMerge(target, source) {
      const result = Object.assign({}, target);
      for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
      return result;
    },

    /**
     * 创建渐变面积图配置
     */
    areaChartOption(xData, seriesData, options) {
      const color = this.getPortalColor();
      const series = Array.isArray(seriesData) ? seriesData : [seriesData];

      return {
        xAxis: {
          type: 'category',
          data: xData,
          axisLine: { lineStyle: { color: '#E8E8E8' } },
          axisLabel: { color: '#8C8C8C', fontSize: 11 },
          axisTick: { show: false }
        },
        yAxis: {
          type: 'value',
          min: options && options.yMin !== undefined ? options.yMin : 0,
          max: options && options.yMax !== undefined ? options.yMax : 100,
          splitLine: { lineStyle: { color: '#F0F0F0', type: 'dashed' } },
          axisLabel: { color: '#8C8C8C', fontSize: 11 }
        },
        series: series.map((s, i) => ({
          name: s.name || '数据',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2.5, color: s.color || color.gradient[0] },
          itemStyle: { color: s.color || color.gradient[0] },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: (s.color || color.gradient[0]) + '40' },
              { offset: 1, color: (s.color || color.gradient[0]) + '05' }
            ])
          },
          emphasis: { focus: 'series' },
          data: s.data || s
        }))
      };
    },

    /**
     * 创建柱状图配置
     */
    barChartOption(xData, seriesData, options) {
      const color = this.getPortalColor();

      return {
        xAxis: {
          type: 'category',
          data: xData,
          axisLine: { lineStyle: { color: '#E8E8E8' } },
          axisLabel: { color: '#8C8C8C', fontSize: 11 },
          axisTick: { show: false }
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: '#F0F0F0', type: 'dashed' } },
          axisLabel: { color: '#8C8C8C', fontSize: 11 }
        },
        series: [{
          type: 'bar',
          barWidth: options && options.barWidth || '50%',
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: color.gradient[0] },
              { offset: 1, color: color.gradient[1] + '80' }
            ])
          },
          emphasis: {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: color.gradient[0] },
                { offset: 1, color: color.gradient[1] }
              ])
            }
          },
          data: seriesData
        }]
      };
    },

    /**
     * 创建雷达图配置
     */
    radarChartOption(indicators, data, options) {
      const color = this.getPortalColor();

      return {
        radar: {
          indicator: indicators.map(ind => ({ name: ind.name, max: ind.max || 100 })),
          center: ['50%', '55%'],
          radius: '65%',
          nameGap: 12,
          name: { textStyle: { color: '#666', fontSize: 12 } },
          splitArea: {
            areaStyle: {
              color: ['rgba(255,107,53,0.02)', 'rgba(255,107,53,0.04)', 'rgba(255,107,53,0.06)', 'rgba(255,107,53,0.08)', 'rgba(255,107,53,0.04)']
            }
          },
          splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } },
          axisLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } }
        },
        series: [{
          type: 'radar',
          data: [{
            value: data,
            name: options && options.name || '能力值',
            lineStyle: { color: color.primary, width: 2 },
            itemStyle: { color: color.primary },
            areaStyle: {
              color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                { offset: 0, color: color.primary + '60' },
                { offset: 1, color: color.primary + '15' }
              ])
            },
            emphasis: {
              lineStyle: { width: 3 },
              areaStyle: {
                color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                  { offset: 0, color: color.primary + '80' },
                  { offset: 1, color: color.primary + '30' }
                ])
              }
            }
          }]
        }],
        animationDuration: 1500,
        animationEasing: 'cubicOut'
      };
    },

    /**
     * 创建热力图配置
     */
    heatmapOption(xLabels, yLabels, data, options) {
      return {
        tooltip: {
          position: 'top',
          formatter: function (params) {
            return '<strong>' + yLabels[params.value[1]] + '</strong><br/>' +
              xLabels[params.value[0]] + '：' + params.value[2] + '%';
          }
        },
        grid: { left: 80, right: 30, top: 10, bottom: 60 },
        xAxis: {
          type: 'category',
          data: xLabels,
          axisLabel: { rotate: 30, color: '#666', fontSize: 11 },
          axisTick: { show: false },
          axisLine: { show: false },
          splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0)', 'rgba(255,255,255,0)'] } }
        },
        yAxis: {
          type: 'category',
          data: yLabels,
          axisLabel: { color: '#666', fontSize: 12 },
          axisTick: { show: false },
          axisLine: { show: false }
        },
        visualMap: {
          min: 0,
          max: 100,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: 0,
          inRange: {
            color: ['#FEE2E2', '#FED7AA', '#FEF08A', '#BBF7D0', '#86EFAC']
          },
          textStyle: { color: '#888', fontSize: 11 }
        },
        series: [{
          type: 'heatmap',
          data: data,
          label: {
            show: true,
            color: '#555',
            fontSize: 11,
            formatter: function (params) { return params.value[2] + '%'; }
          },
          emphasis: {
            itemStyle: { borderColor: '#333', borderWidth: 2 }
          }
        }]
      };
    },

    /**
     * 创建饼图配置
     */
    pieChartOption(data, options) {
      return {
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        series: [{
          type: 'pie',
          radius: options && options.radius || ['40%', '70%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: '{b}\n{d}%',
            fontSize: 12,
            color: '#666'
          },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 'bold' },
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.15)' }
          },
          data: data
        }]
      };
    }
  };

  window.App.EChartsHelper = EChartsHelper;

})();
