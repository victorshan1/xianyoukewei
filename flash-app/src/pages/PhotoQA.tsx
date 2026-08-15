import { useState } from 'react';
import type { WrongAnswer } from '@/types';
import { storageService } from '@/services/storage';
import { aiService } from '@/services/ai';
import { useToast } from '@/components/Toast';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { KNOWLEDGE_ICONS } from '@/types';

interface SolveResult {
  steps: string[];
  knowledgePoints: string[];
  summary: string;
}

export function PhotoQA() {
  const { showToast } = useToast();
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<SolveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');

  const handleSolve = async () => {
    if (question.trim() === '') { showToast('请输入题目', 'warning'); return; }
    setLoading(true);
    setCurrentQuestion(question);
    try {
      const res = await aiService.solveQuestion(question);
      setResult(res);
      // Auto add to wrong answers
      const wrongAnswer: WrongAnswer = {
        id: Date.now(),
        studentId: 0,
        subject: '数学',
        question: question.trim(),
        answer: res.summary !== '' ? res.summary : res.steps[res.steps.length - 1] ?? '',
        analysis: res.steps.join('\n'),
        mastered: false,
        createdAt: Date.now(),
      };
      await storageService.addWrongAnswer(wrongAnswer);
    } catch {
      showToast('解答失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setQuestion('');
    setResult(null);
    setCurrentQuestion('');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <LoadingOverlay loading={loading} message="AI 正在解题..." />

      {!result ? (
        <div className="px-4 pt-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="text-sm font-medium text-gray-700 mb-2 block">题目描述</label>
            <textarea
              data-testid="qa-question-input"
              value={question}
              onChange={e => { setQuestion(e.target.value); }}
              placeholder="请输入题目内容，例如：计算 2/3 × 3/4 = ?"
              className="w-full h-32 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
            />
            <button
              data-testid="qa-solve-btn"
              onClick={() => { void handleSolve(); }}
              disabled={loading}
              className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 text-white text-sm font-medium hover:from-green-500 hover:to-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-icons text-base">auto_awesome</span>
              AI 解答
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-4">
          {/* Question */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">题目</div>
            <div className="text-sm text-gray-800 font-medium">{currentQuestion}</div>
          </div>

          {/* Steps Timeline */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">解题步骤</h3>
            <div className="relative pl-6">
              <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-green-400 to-emerald-200 rounded-full" />
              {result.steps.map((step, i) => (
                <div key={i} className="relative mb-4 last:mb-0 animate-[fadeIn_0.5s_ease-out]" style={{ animationDelay: `${String(i * 0.15)}s` }}>
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {i + 1}
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm text-sm text-gray-700 leading-relaxed">
                    {step}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Knowledge Points */}
          {result.knowledgePoints.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">相关知识点</h3>
              <div className="space-y-2">
                {result.knowledgePoints.map((kp, i) => (
                  <div
                    key={i}
                    className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-3 border border-amber-100 animate-[fadeIn_0.5s_ease-out]"
                    style={{ animationDelay: `${String((result.steps.length + i) * 0.15)}s` }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{KNOWLEDGE_ICONS[kp] ?? '📚'}</span>
                      <span className="text-sm font-medium text-amber-800">{kp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {result.summary !== '' && (
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <div className="text-xs text-green-600 font-medium mb-1">总结</div>
              <div className="text-sm text-gray-700 leading-relaxed">{result.summary}</div>
            </div>
          )}

          <button
            data-testid="qa-reset-btn"
            onClick={reset}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            继续提问
          </button>
        </div>
      )}
    </div>
  );
}
