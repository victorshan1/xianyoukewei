import { useState, useEffect } from 'react';
import type { LessonPlan as LessonPlanType } from '@/types';
import { SUBJECTS, GRADES, TEMPLATE_TYPES } from '@/types';
import { storageService } from '@/services/storage';
import { aiService } from '@/services/ai';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { LoadingOverlay } from '@/components/LoadingOverlay';

export function LessonPlan() {
  const { showToast } = useToast();
  const [templateType, setTemplateType] = useState<LessonPlanType['templateType']>('new-lesson');
  const [subject, setSubject] = useState('数学');
  const [grade, setGrade] = useState('四年级');
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [homework, setHomework] = useState('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState<LessonPlanType[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    void storageService.getLessons().then(setHistory);
  }, []);

  const handleGenerate = async () => {
    if (topic.trim() === '') { showToast('请输入课题名称', 'warning'); return; }
    setLoading(true);
    try {
      const result = await aiService.generateLessonPlan(subject, grade, topic, templateType);
      setContent(result);
      showToast('教案生成成功', 'success');
    } catch {
      showToast('生成失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (content.trim() === '') { showToast('请先生成教案', 'warning'); return; }
    const lesson: LessonPlanType = {
      id: Date.now(), subject, grade, topic, templateType,
      content, homeworkContent: homework, createdAt: Date.now(),
    };
    await storageService.addLesson(lesson);
    setHistory(prev => [lesson, ...prev]);
    showToast('已保存到历史记录', 'success');
  };

  const handleDelete = async (id: number) => {
    await storageService.deleteLesson(id);
    setHistory(prev => prev.filter(l => l.id !== id));
    showToast('已删除', 'success');
  };

  const execCmd = (cmd: string) => {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand(cmd, false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <LoadingOverlay loading={loading} message="AI 正在生成教案..." />

      <div className="px-4 pt-4">
        <h2 className="text-base font-semibold text-gray-800 mb-3">选择教案模板</h2>
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATE_TYPES.map(t => (
            <button
              key={t.value}
              data-testid={`template-${t.value}`}
              onClick={() => { setTemplateType(t.value); }}
              className={`p-3 rounded-xl border-2 transition-all text-left ${
                templateType === t.value
                  ? 'border-orange-400 bg-orange-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-lg mb-1">{t.icon}</div>
              <div className="text-sm font-medium text-gray-800">{t.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">学科</label>
            <select data-testid="lesson-subject" value={subject} onChange={e => { setSubject(e.target.value); }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">年级</label>
            <select data-testid="lesson-grade" value={grade} onChange={e => { setGrade(e.target.value); }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">课题名称</label>
            <input data-testid="lesson-topic" value={topic} onChange={e => { setTopic(e.target.value); }}
              placeholder="例如：分数乘法"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <button data-testid="lesson-generate-btn" onClick={() => { void handleGenerate(); }} disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 text-white text-sm font-medium hover:from-orange-500 hover:to-amber-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            <span className="material-icons text-base">auto_awesome</span>
            AI 生成教案
          </button>
        </div>
      </div>

      {content !== '' && (
        <div className="px-4 pt-4">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
              <div className="flex gap-1">
                {editing && (
                  <>
                    <button data-testid="edit-bold" onClick={() => { execCmd('bold'); }} className="p-1.5 rounded hover:bg-gray-100"><span className="material-icons text-sm">format_bold</span></button>
                    <button data-testid="edit-italic" onClick={() => { execCmd('italic'); }} className="p-1.5 rounded hover:bg-gray-100"><span className="material-icons text-sm">format_italic</span></button>
                    <button data-testid="edit-underline" onClick={() => { execCmd('underline'); }} className="p-1.5 rounded hover:bg-gray-100"><span className="material-icons text-sm">format_underlined</span></button>
                    <button data-testid="edit-list" onClick={() => { execCmd('insertUnorderedList'); }} className="p-1.5 rounded hover:bg-gray-100"><span className="material-icons text-sm">format_list_bulleted</span></button>
                  </>
                )}
              </div>
              <button data-testid="edit-toggle-btn"
                onClick={() => { setEditing(!editing); }}
                className="text-xs text-orange-500 font-medium">
                {editing ? '预览' : '编辑'}
              </button>
            </div>

            {editing ? (
              <div data-testid="lesson-editor" contentEditable suppressContentEditableWarning
                className="px-4 py-3 text-sm text-gray-700 leading-relaxed min-h-[200px] focus:outline-none prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
                onInput={e => { setContent(e.currentTarget.innerHTML); }} />
            ) : (
              <div className="px-4 py-3 text-sm text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: content }} />
            )}

            <div className="border-t border-gray-100 px-4 py-3">
              <div className="text-xs text-gray-500 mb-1">分层作业</div>
              {editing ? (
                <textarea data-testid="lesson-homework-edit" value={homework}
                  onChange={e => { setHomework(e.target.value); }}
                  className="w-full text-sm text-gray-700 focus:outline-none resize-none" rows={2} />
              ) : (
                <div className="text-sm text-gray-700">{homework !== '' ? homework : '暂无'}</div>
              )}
            </div>

            <div className="flex gap-2 px-4 py-3 border-t border-gray-100">
              <button data-testid="lesson-save-btn" onClick={() => { void handleSave(); }}
                className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors">
                保存
              </button>
              <button data-testid="lesson-history-btn" onClick={() => { setShowHistory(true); }}
                className="py-2 px-4 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
                历史
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal open={showHistory} onClose={() => { setShowHistory(false); }} title="历史教案">
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">暂无历史记录</p>
          ) : (
            history.map(lesson => (
              <div key={lesson.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{lesson.topic}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {lesson.subject} · {lesson.grade} · {new Date(lesson.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
                <button data-testid={`history-load-${String(lesson.id)}`}
                  onClick={() => {
                    setContent(lesson.content); setHomework(lesson.homeworkContent);
                    setSubject(lesson.subject); setGrade(lesson.grade);
                    setTopic(lesson.topic); setTemplateType(lesson.templateType);
                    setShowHistory(false); showToast('已加载历史教案', 'success');
                  }}
                  className="text-xs text-orange-500 font-medium whitespace-nowrap">
                  加载
                </button>
                <button data-testid={`history-delete-${String(lesson.id)}`} onClick={() => { void handleDelete(lesson.id); }}
                  className="text-gray-400 hover:text-red-500 transition-colors">
                  <span className="material-icons text-base">delete</span>
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
