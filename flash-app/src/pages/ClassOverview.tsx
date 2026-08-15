import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { ScoreRecord } from '@/types';
import { KNOWLEDGE_ICONS } from '@/types';
import { storageService } from '@/services/storage';

export function ClassOverview() {
  const [scores, setScores] = useState<ScoreRecord[]>([]);

  useEffect(() => {
    void storageService.getScores().then(setScores);
  }, []);

  const scoreDistribution = useMemo(() => {
    const ranges = [
      { label: '0-59', min: 0, max: 59, color: '#ef4444' },
      { label: '60-69', min: 60, max: 69, color: '#f59e0b' },
      { label: '70-79', min: 70, max: 79, color: '#eab308' },
      { label: '80-89', min: 80, max: 89, color: '#22c55e' },
      { label: '90-100', min: 90, max: 100, color: '#10b981' },
    ];
    return ranges.map(r => ({
      ...r,
      count: scores.filter(s => s.score >= r.min && s.score <= r.max).length,
    }));
  }, [scores]);

  const barOption = useMemo(() => ({
    tooltip: { trigger: 'axis' as const },
    xAxis: {
      type: 'category' as const,
      data: scoreDistribution.map(r => r.label),
      axisLabel: { fontSize: 11, color: '#6b7280' },
    },
    yAxis: {
      type: 'value' as const,
      minInterval: 1,
      axisLabel: { fontSize: 11, color: '#6b7280' },
    },
    series: [{
      type: 'bar',
      data: scoreDistribution.map(r => ({ value: r.count, itemStyle: { color: r.color } })),
      barWidth: '50%',
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    }],
    grid: { top: 10, right: 10, bottom: 24, left: 30 },
    animation: true,
    animationDuration: 1200,
  }), [scoreDistribution]);

  const trendData = useMemo(() => {
    const dateMap = new Map<string, number[]>();
    scores.forEach(s => {
      const arr = dateMap.get(s.date) ?? [];
      arr.push(s.score);
      dateMap.set(s.date, arr);
    });
    const sorted = [...dateMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return {
      dates: sorted.map(([d]) => d.slice(5)),
      avgs: sorted.map(([, arr]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)),
    };
  }, [scores]);

  const lineOption = useMemo(() => ({
    tooltip: { trigger: 'axis' as const },
    xAxis: {
      type: 'category' as const,
      data: trendData.dates,
      axisLabel: { fontSize: 10, color: '#6b7280' },
    },
    yAxis: {
      type: 'value' as const,
      min: 0,
      max: 100,
      axisLabel: { fontSize: 11, color: '#6b7280' },
    },
    series: [{
      type: 'line',
      data: trendData.avgs,
      smooth: true,
      lineStyle: { color: '#f97316', width: 2 },
      itemStyle: { color: '#f97316' },
      areaStyle: {
        color: {
          type: 'linear' as const,
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(249,115,22,0.25)' },
            { offset: 1, color: 'rgba(249,115,22,0.02)' },
          ],
        },
      },
    }],
    grid: { top: 10, right: 10, bottom: 24, left: 30 },
    animation: true,
    animationDuration: 1500,
  }), [trendData]);

  const knowledgeHeatmap = useMemo(() => {
    const kpMap = new Map<string, { total: number; count: number }>();
    scores.forEach(s => {
      s.knowledgePoints.forEach(kp => {
        const entry = kpMap.get(kp) ?? { total: 0, count: 0 };
        entry.total += s.score;
        entry.count += 1;
        kpMap.set(kp, entry);
      });
    });
    return [...kpMap.entries()].map(([point, { total, count }]) => ({
      point,
      rate: Math.round((total / count) ),
      icon: KNOWLEDGE_ICONS[point] ?? '📚',
    }));
  }, [scores]);

  const weakPoints = useMemo(
    () => knowledgeHeatmap.filter(k => k.rate < 80).sort((a, b) => a.rate - b.rate),
    [knowledgeHeatmap],
  );

  const getHeatColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-400';
    if (rate >= 60) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  const getHeatBg = (rate: number) => {
    if (rate >= 80) return 'bg-green-50';
    if (rate >= 60) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 pt-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">成绩分布</h3>
          {scores.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">暂无成绩数据</p>
          ) : (
            <ReactECharts option={barOption} style={{ height: '200px' }} />
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">学习趋势</h3>
          {trendData.dates.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">暂无趋势数据</p>
          ) : (
            <ReactECharts option={lineOption} style={{ height: '200px' }} />
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">知识点掌握热力图</h3>
          {knowledgeHeatmap.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">暂无知识点数据</p>
          ) : (
            <div className="space-y-2">
              {knowledgeHeatmap.map(k => (
                <div key={k.point} className={`flex items-center gap-3 p-2.5 rounded-lg ${getHeatBg(k.rate)}`}>
                  <span className="text-base">{k.icon}</span>
                  <span className="text-xs text-gray-700 font-medium w-16 truncate">{k.point}</span>
                  <div className="flex-1 h-3 bg-white/60 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${getHeatColor(k.rate)} transition-all duration-700`}
                      style={{ width: `${String(k.rate)}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-600 w-10 text-right">{k.rate}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">薄弱知识点</h3>
          {weakPoints.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">暂无薄弱知识点</p>
          ) : (
            <div className="space-y-2">
              {weakPoints.map(k => (
                <div key={k.point} className="flex items-center gap-3 p-2.5 rounded-lg bg-red-50">
                  <span className="material-icons text-red-400 text-base">warning</span>
                  <span className="text-sm text-gray-700 flex-1">{k.icon} {k.point}</span>
                  <span className="text-xs font-semibold text-red-500">{k.rate}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
