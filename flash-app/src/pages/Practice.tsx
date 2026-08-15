import { useState } from 'react';
import type { PracticeRecord } from '@/types';
import { SUBJECTS } from '@/types';
import { storageService } from '@/services/storage';
import { aiService } from '@/services/ai';
import { useToast } from '@/components/Toast';
import { LoadingOverlay } from '@/components/LoadingOverlay';

interface Question {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export function Practice() {
  const { showToast } = useToast();
  const [subject, setSubject] = useState<string>(SUBJECTS[0]);
  const [knowledgePoint, setKnowledgePoint] = useState('');
  const [count, setCount] = useState<number>(5);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [checkedAnswers, setCheckedAnswers] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const handleGenerate = async () => {
    if (knowledgePoint.trim() === '') {
      showToast('请输入知识点', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await aiService.generatePractice(subject, knowledgePoint, count);
      setQuestions(res.questions);
      setSelectedAnswers({});
      setCheckedAnswers({});
      setShowSummary(false);
    } catch {
      showToast('生成题目失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (questionIndex: number, option: string | undefined) => {
    if (option === undefined) return;
    if (checkedAnswers[questionIndex] === true) return;
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: option }));
  };

  const handleCheckAnswer = (questionIndex: number) => {
    if (selectedAnswers[questionIndex] === undefined) {
      showToast('请选择答案', 'warning');
      return;
    }
    setCheckedAnswers(prev => ({ ...prev, [questionIndex]: true }));
  };

  const handleCheckAll = () => {
    const allChecked: Record<number, boolean> = {};
    questions.forEach((_, i) => {
      if (selectedAnswers[i] !== undefined) {
        allChecked[i] = true;
      }
    });
    setCheckedAnswers(allChecked);
    setShowSummary(true);
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (checkedAnswers[i] === true && selectedAnswers[i] === q.answer) {
        correct++;
      }
    });
    return correct;
  };

  const handleSaveRecord = async () => {
    const score = calculateScore();
    const record: PracticeRecord = {
      id: Date.now(),
      studentId: 0,
      subject,
      knowledgePoint,
      score,
      totalQuestions: questions.length,
      date: new Date().toISOString().split('T')[0] ?? new Date().toISOString().slice(0, 10),
    };
    const records = await storageService.getPracticeRecords();
    records.push(record);
    await storageService.savePracticeRecords(records);
    showToast('练习记录已保存', 'success');
  };

  const handleReset = () => {
    setQuestions([]);
    setSelectedAnswers({});
    setCheckedAnswers({});
    setShowSummary(false);
    setKnowledgePoint('');
  };

  const getOptionLetter = (option: string) => {
    const match = option.match(/^([A-D])/);
    return match ? match[1] : '';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <LoadingOverlay loading={loading} message="AI 正在出题..." />

      {questions.length === 0 ? (
        <div className="px-4 pt-4 space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">学科</label>
              <select
                data-testid="practice-subject-select"
                value={subject}
                onChange={e => { setSubject(e.target.value); }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {SUBJECTS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">知识点</label>
              <input
                data-testid="practice-knowledge-input"
                type="text"
                value={knowledgePoint}
                onChange={e => { setKnowledgePoint(e.target.value); }}
                placeholder="例如：分数乘除法"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">题目数量</label>
              <select
                data-testid="practice-count-select"
                value={count}
                onChange={e => { setCount(Number(e.target.value)); }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value={5}>5 题</option>
                <option value={10}>10 题</option>
                <option value={15}>15 题</option>
              </select>
            </div>

            <button
              data-testid="practice-generate-btn"
              onClick={() => { void handleGenerate(); }}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-500 text-white text-sm font-medium hover:from-blue-500 hover:to-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-icons text-base">auto_awesome</span>
              生成练习题
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-4">
          {questions.map((q, i) => {
            const isChecked = checkedAnswers[i] === true;
            const selected = selectedAnswers[i];
            const isCorrect = selected === q.answer;

            return (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-2 mb-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="text-sm text-gray-800 font-medium flex-1">{q.question}</div>
                </div>

                <div className="space-y-2 mb-3">
                  {q.options.map((option, optIdx) => {
                    const letter = getOptionLetter(option);
                    const isSelected = selected === letter;
                    const showResult = isChecked;
                    const isAnswer = letter === q.answer;

                    let bgClass = 'bg-gray-50 hover:bg-gray-100';
                    if (showResult) {
                      if (isAnswer) bgClass = 'bg-green-50 border-green-300';
                      else if (isSelected && !isCorrect) bgClass = 'bg-red-50 border-red-300';
                      else bgClass = 'bg-gray-50';
                    } else if (isSelected) {
                      bgClass = 'bg-blue-50 border-blue-300';
                    }

                    return (
                      <button
                        key={optIdx}
                        data-testid={`practice-option-${String(i)}-${String(optIdx)}`}
                        onClick={() => { handleSelectAnswer(i, letter); }}
                        disabled={isChecked}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${bgClass} disabled:cursor-not-allowed`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {!isChecked ? (
                  <button
                    data-testid={`practice-check-btn-${String(i)}`}
                    onClick={() => { handleCheckAnswer(i); }}
                    className="w-full py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                  >
                    检查答案
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className={`text-sm font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                      {isCorrect ? '✓ 回答正确' : `✗ 回答错误，正确答案是 ${q.answer}`}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                      <div className="text-xs text-gray-500 mb-1">解析</div>
                      {q.explanation}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!showSummary && (
            <button
              data-testid="practice-check-all-btn"
              onClick={handleCheckAll}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-400 to-pink-500 text-white text-sm font-medium hover:from-purple-500 hover:to-pink-600 transition-all"
            >
              提交全部答案
            </button>
          )}

          {showSummary && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 space-y-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {calculateScore()} / {questions.length}
                </div>
                <div className="text-sm text-gray-600">答对题数 / 总题数</div>
              </div>
              <div className="flex gap-2">
                <button
                  data-testid="practice-save-btn"
                  onClick={() => { void handleSaveRecord(); }}
                  className="flex-1 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
                >
                  <span className="material-icons text-base">save</span>
                  保存记录
                </button>
                <button
                  data-testid="practice-reset-btn"
                  onClick={handleReset}
                  className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  重新练习
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
