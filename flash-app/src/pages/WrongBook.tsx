import { useState, useEffect } from 'react';
import type { WrongAnswer } from '@/types';
import { SUBJECTS } from '@/types';
import { storageService } from '@/services/storage';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';

type StatusFilter = 'all' | 'pending' | 'mastered';

export function WrongBook() {
  const { showToast } = useToast();
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWrong, setNewWrong] = useState({
    subject: SUBJECTS[0] as string,
    question: '',
    answer: '',
    analysis: '',
  });

  const loadWrongAnswers = async () => {
    const data = await storageService.getWrongAnswers();
    setWrongAnswers(data);
  };

  useEffect(() => {
    void (async () => {
      const data = await storageService.getWrongAnswers();
      setWrongAnswers(data);
    })();
  }, []);

  const handleMarkMastered = async (id: number, mastered: boolean) => {
    await storageService.markWrongMastered(id, mastered);
    await loadWrongAnswers();
    showToast(mastered ? '已标记为掌握' : '已取消掌握', 'success');
  };

  const handleDelete = async (id: number) => {
    await storageService.deleteWrongAnswer(id);
    await loadWrongAnswers();
    showToast('已删除', 'success');
  };

  const handleAdd = async () => {
    if (newWrong.question.trim() === '') {
      showToast('请输入题目', 'warning');
      return;
    }
    const wrong: WrongAnswer = {
      id: Date.now(),
      studentId: 0,
      subject: newWrong.subject,
      question: newWrong.question.trim(),
      answer: newWrong.answer.trim(),
      analysis: newWrong.analysis.trim(),
      mastered: false,
      createdAt: Date.now(),
    };
    await storageService.addWrongAnswer(wrong);
    await loadWrongAnswers();
    setShowAddModal(false);
    setNewWrong({ subject: SUBJECTS[0], question: '', answer: '', analysis: '' });
    showToast('添加成功', 'success');
  };

  const filteredAnswers = wrongAnswers.filter(w => {
    if (subjectFilter !== 'all' && w.subject !== subjectFilter) return false;
    if (statusFilter === 'pending' && w.mastered) return false;
    if (statusFilter === 'mastered' && !w.mastered) return false;
    return true;
  });

  const pendingCount = wrongAnswers.filter(w => !w.mastered).length;
  const masteredCount = wrongAnswers.filter(w => w.mastered).length;
  const masteryRate = wrongAnswers.length > 0 ? Math.round((masteredCount / wrongAnswers.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Stats Cards */}
      <div className="px-4 pt-4 grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="text-2xl font-bold text-orange-500">{pendingCount}</div>
          <div className="text-xs text-gray-600 mt-1">待攻克</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="text-2xl font-bold text-green-500">{masteredCount}</div>
          <div className="text-xs text-gray-600 mt-1">已掌握</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="text-2xl font-bold text-blue-500">{masteryRate}%</div>
          <div className="text-xs text-gray-600 mt-1">掌握率</div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 mt-4 space-y-3">
        <select
          data-testid="wrongbook-subject-filter"
          value={subjectFilter}
          onChange={e => { setSubjectFilter(e.target.value); }}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="all">全部学科</option>
          {SUBJECTS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <div className="flex gap-2">
          {(['all', 'pending', 'mastered'] as StatusFilter[]).map(status => {
            const labels = { all: '全部', pending: '待攻克', mastered: '已掌握' };
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                data-testid={`wrongbook-status-${status}`}
                onClick={() => { setStatusFilter(status); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {labels[status]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Wrong Answer List */}
      <div className="px-4 mt-4 space-y-3">
        {filteredAnswers.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            暂无错题记录
          </div>
        ) : (
          filteredAnswers.map(w => (
            <div key={w.id} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600">{w.subject}</span>
                    {w.mastered && (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-600">已掌握</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-800 font-medium mb-2">{w.question}</div>
                  <div className="text-sm text-gray-600 mb-1">
                    <span className="text-xs text-gray-500">答案：</span>
                    {w.answer}
                  </div>
                  {w.analysis !== '' && (
                    <div className="text-sm text-gray-600">
                      <span className="text-xs text-gray-500">解析：</span>
                      {w.analysis}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  data-testid={`wrongbook-mark-btn-${String(w.id)}`}
                  onClick={() => { void handleMarkMastered(w.id, !w.mastered); }}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                    w.mastered
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  <span className="material-icons text-base">{w.mastered ? 'check_circle' : 'radio_button_unchecked'}</span>
                  {w.mastered ? '取消掌握' : '标记掌握'}
                </button>
                <button
                  data-testid={`wrongbook-delete-btn-${String(w.id)}`}
                  onClick={() => { void handleDelete(w.id); }}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                >
                  <span className="material-icons text-base">delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Button */}
      <button
        data-testid="wrongbook-add-btn"
        onClick={() => { setShowAddModal(true); }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
      >
        <span className="material-icons text-2xl">add</span>
      </button>

      {/* Add Modal */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); }}
        title="添加错题"
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">学科</label>
            <select
              data-testid="wrongbook-add-subject"
              value={newWrong.subject}
              onChange={e => { setNewWrong(prev => ({ ...prev, subject: e.target.value })); }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {SUBJECTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">题目</label>
            <textarea
              data-testid="wrongbook-add-question"
              value={newWrong.question}
              onChange={e => { setNewWrong(prev => ({ ...prev, question: e.target.value })); }}
              placeholder="请输入题目内容"
              className="w-full h-24 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">答案</label>
            <input
              data-testid="wrongbook-add-answer"
              type="text"
              value={newWrong.answer}
              onChange={e => { setNewWrong(prev => ({ ...prev, answer: e.target.value })); }}
              placeholder="请输入答案"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">解析</label>
            <textarea
              data-testid="wrongbook-add-analysis"
              value={newWrong.analysis}
              onChange={e => { setNewWrong(prev => ({ ...prev, analysis: e.target.value })); }}
              placeholder="请输入解析（可选）"
              className="w-full h-20 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>

          <button
            data-testid="wrongbook-add-submit"
            onClick={() => { void handleAdd(); }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-500 text-white text-sm font-medium hover:from-blue-500 hover:to-indigo-600 transition-all"
          >
            添加
          </button>
        </div>
      </Modal>
    </div>
  );
}
