import { useState, useEffect } from 'react';
import type { Student, ScoreRecord } from '@/types';
import { storageService } from '@/services/storage';
import { aiService } from '@/services/ai';
import { useToast } from '@/components/Toast';
import { LoadingOverlay } from '@/components/LoadingOverlay';

export function Report() {
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [report, setReport] = useState('');
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadStudents = async () => {
    const data = await storageService.getStudents();
    setStudents(data);
    if (data.length > 0) {
      const first = data[0];
      if (first !== undefined) {
        setSelectedStudentId(first.id);
      }
    }
  };

  const loadReport = async () => {
    if (selectedStudentId === null) return;

    setLoading(true);
    try {
      const allScores = await storageService.getScores();
      const studentScores = allScores.filter(s => s.studentId === selectedStudentId);

      const now = new Date();
      const startDate = new Date();
      if (period === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else {
        startDate.setMonth(now.getMonth() - 1);
      }

      const filteredScores = studentScores.filter(s => {
        const scoreDate = new Date(s.date);
        return scoreDate >= startDate;
      });

      setScores(filteredScores);

      if (filteredScores.length === 0) {
        setReport('暂无成绩记录');
        return;
      }

      const student = students.find(s => s.id === selectedStudentId);
      if (!student) return;

      const scoresForAI = filteredScores.map(s => ({
        subject: s.subject,
        score: s.score,
        fullScore: s.fullScore,
      }));

      const reportText = await aiService.generateReport(student.name, scoresForAI);
      setReport(reportText);
    } catch {
      showToast('生成报告失败', 'error');
      setReport('生成报告失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStudents();
  }, []);

  useEffect(() => {
    if (selectedStudentId !== null) {
      void loadReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, period]);

  const getSubjectPerformance = () => {
    const subjectMap = new Map<string, { total: number; count: number; fullScore: number }>();

    scores.forEach(s => {
      const existing = subjectMap.get(s.subject) ?? { total: 0, count: 0, fullScore: s.fullScore };
      existing.total += s.score;
      existing.count += 1;
      existing.fullScore = s.fullScore;
      subjectMap.set(s.subject, existing);
    });

    return Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      avgScore: Math.round(data.total / data.count),
      fullScore: data.fullScore,
      percentage: Math.round((data.total / data.count / data.fullScore) * 100),
    }));
  };

  const getScoreTrend = () => {
    const sortedScores = [...scores].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sortedScores.slice(-10);
  };

  const subjectPerformance = getSubjectPerformance();
  const scoreTrend = getScoreTrend();
  const maxScore = Math.max(...scoreTrend.map(s => s.fullScore), 100);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <LoadingOverlay loading={loading} message="AI 正在生成报告..." />

      <div className="px-4 pt-4 space-y-4">
        {/* Student Select */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="text-sm font-medium text-gray-700 mb-2 block">选择学生</label>
          <select
            data-testid="report-student-select"
            value={selectedStudentId ?? ''}
            onChange={e => { setSelectedStudentId(Number(e.target.value)); }}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name} - {s.grade}{s.className}</option>
            ))}
          </select>
        </div>

        {/* Period Tabs */}
        <div className="flex gap-2">
          <button
            data-testid="report-period-week"
            onClick={() => { setPeriod('week'); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'week' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            本周
          </button>
          <button
            data-testid="report-period-month"
            onClick={() => { setPeriod('month'); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'month' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            本月
          </button>
        </div>

        {/* AI Report */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-icons text-blue-500">auto_awesome</span>
            <h3 className="text-sm font-semibold text-gray-700">AI 学情报告</h3>
          </div>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {report !== '' ? report : '暂无报告'}
          </div>
        </div>

        {/* Score Trend */}
        {scoreTrend.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">成绩趋势</h3>
            <div className="flex items-end gap-2 h-32">
              {scoreTrend.map((s, i) => {
                const height = (s.score / maxScore) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center justify-end h-24">
                      <div
                        className="w-full bg-gradient-to-t from-blue-400 to-blue-300 rounded-t"
                        style={{ height: `${String(height)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 font-medium">{s.score}</div>
                    <div className="text-xs text-gray-400">{s.subject.slice(0, 2)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Subject Performance */}
        {subjectPerformance.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">学科表现</h3>
            <div className="space-y-3">
              {subjectPerformance.map((sp, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 font-medium">{sp.subject}</span>
                    <span className="text-sm text-gray-600">
                      {sp.avgScore} / {sp.fullScore}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
                      style={{ width: `${String(sp.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {report !== '' && report !== '暂无成绩记录' && (
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-icons text-amber-500">lightbulb</span>
              <h3 className="text-sm font-semibold text-gray-700">教师建议</h3>
            </div>
            <div className="text-sm text-gray-700 leading-relaxed">
              建议家长关注孩子的学习情况，多与孩子沟通，了解学习中的困难。鼓励孩子多练习薄弱知识点，保持良好的学习习惯。
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
