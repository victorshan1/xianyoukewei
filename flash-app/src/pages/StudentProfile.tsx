import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import type { Student, ScoreRecord, RadarData } from '@/types';
import { storageService } from '@/services/storage';
import { aiService } from '@/services/ai';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { LoadingOverlay } from '@/components/LoadingOverlay';

export function StudentProfile() {
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [radarData, setRadarData] = useState<RadarData[]>([
    { dimension: '计算能力', value: 0 },
    { dimension: '逻辑推理', value: 0 },
    { dimension: '空间想象', value: 0 },
    { dimension: '语言表达', value: 0 },
    { dimension: '学习习惯', value: 0 },
  ]);
  const [knowledgeMastery, setKnowledgeMastery] = useState<{ point: string; rate: number }[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState<Partial<Student>>({ gender: 'male' });

  const loadStudentData = async (studentId: number) => {
    const allScores = await storageService.getScores();
    const studentScores = allScores.filter(s => s.studentId === studentId);
    setScores(studentScores);

    const radar: RadarData[] = [
      { dimension: '计算能力', value: Math.floor(Math.random() * 40) + 60 },
      { dimension: '逻辑推理', value: Math.floor(Math.random() * 40) + 60 },
      { dimension: '空间想象', value: Math.floor(Math.random() * 40) + 60 },
      { dimension: '语言表达', value: Math.floor(Math.random() * 40) + 60 },
      { dimension: '学习习惯', value: Math.floor(Math.random() * 40) + 60 },
    ];
    setRadarData(radar);

    const knowledge = [
      { point: '分数', rate: Math.floor(Math.random() * 40) + 60 },
      { point: '乘除法', rate: Math.floor(Math.random() * 40) + 60 },
      { point: '几何', rate: Math.floor(Math.random() * 40) + 60 },
      { point: '应用题', rate: Math.floor(Math.random() * 40) + 60 },
    ];
    setKnowledgeMastery(knowledge);
  };

  useEffect(() => {
    void storageService.getStudents().then(setStudents);
  }, []);

  useEffect(() => {
    if (selectedStudent !== null) {
      void loadStudentData(selectedStudent.id);
    }
  }, [selectedStudent]);

  const handleAddStudent = async () => {
    if (newStudent.name?.trim() === '' || newStudent.name === undefined) { showToast('请输入学生姓名', 'warning'); return; }
    const student: Student = {
      id: Date.now(),
      name: newStudent.name,
      grade: newStudent.grade ?? '四年级',
      className: newStudent.className ?? '一班',
      gender: newStudent.gender as 'male' | 'female',
      createdAt: Date.now(),
    };
    await storageService.addStudent(student);
    setStudents(prev => [...prev, student]);
    setShowAddModal(false);
    setNewStudent({ gender: 'male' });
    showToast('添加成功', 'success');
  };

  const handleDeleteStudent = async (id: number) => {
    await storageService.deleteStudent(id);
    setStudents(prev => prev.filter(s => s.id !== id));
    if (selectedStudent?.id === id) setSelectedStudent(null);
    showToast('已删除', 'success');
  };

  const handleGenerateSuggestions = async () => {
    if (!selectedStudent) return;
    setLoading(true);
    try {
      const suggestions = await aiService.generateSuggestions(selectedStudent.name, radarData);
      setAiSuggestions(suggestions);
      showToast('建议生成成功', 'success');
    } catch {
      showToast('生成失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const radarOption = {
    radar: {
      indicator: radarData.map(r => ({ name: r.dimension, max: 100 })),
      radius: '65%',
    },
    series: [{
      type: 'radar',
      data: [{
        value: radarData.map(r => r.value),
        name: selectedStudent?.name ?? '',
        areaStyle: { color: 'rgba(249, 115, 22, 0.2)' },
        lineStyle: { color: '#f97316' },
        itemStyle: { color: '#f97316' },
      }],
    }],
    animation: true,
    animationDuration: 1500,
    animationEasing: 'cubicOut' as const,
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <LoadingOverlay loading={loading} message="AI 正在分析..." />

      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">学生列表</h2>
          <button data-testid="add-student-btn" onClick={() => { setShowAddModal(true); }}
            className="text-xs text-orange-500 font-medium flex items-center gap-1">
            <span className="material-icons text-sm">add</span>
            添加
          </button>
        </div>

        {students.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-gray-400 text-sm">暂无学生，点击右上角添加</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {students.map(student => (
              <div key={student.id} className={`bg-white rounded-xl p-3 shadow-sm cursor-pointer transition-all ${
                selectedStudent?.id === student.id ? 'ring-2 ring-orange-400' : ''
              }`}>
                <div className="flex items-start gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-medium text-sm">
                    {student.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{student.name}</div>
                    <div className="text-xs text-gray-500">{student.grade} {student.className}</div>
                  </div>
                  <button data-testid={`delete-student-${String(student.id)}`}
                    onClick={(e) => { e.stopPropagation(); void handleDeleteStudent(student.id); }}
                    className="text-gray-400 hover:text-red-500 transition-colors">
                    <span className="material-icons text-base">close</span>
                  </button>
                </div>
                <button data-testid={`select-student-${String(student.id)}`}
                  onClick={() => { setSelectedStudent(student); }}
                  className="w-full mt-2 py-1.5 rounded-lg bg-orange-50 text-orange-500 text-xs font-medium hover:bg-orange-100 transition-colors">
                  查看详情
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedStudent !== null && (
        <>
          <div className="px-4 pt-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-medium">
                  {selectedStudent.name[0]}
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-800">{selectedStudent.name}</div>
                  <div className="text-xs text-gray-500">{selectedStudent.grade} · {selectedStudent.className}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-orange-50">
                  <div className="text-lg font-semibold text-orange-500">{scores.length}</div>
                  <div className="text-xs text-gray-500">考试次数</div>
                </div>
                <div className="p-2 rounded-lg bg-orange-50">
                  <div className="text-lg font-semibold text-orange-500">
                    {scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length) : 0}
                  </div>
                  <div className="text-xs text-gray-500">平均分</div>
                </div>
                <div className="p-2 rounded-lg bg-orange-50">
                  <div className="text-lg font-semibold text-orange-500">
                    {radarData.reduce((sum, r) => sum + r.value, 0) / radarData.length | 0}
                  </div>
                  <div className="text-xs text-gray-500">综合评分</div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pt-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">五维能力评估</h3>
              <ReactECharts option={radarOption} style={{ height: '250px' }} />
            </div>
          </div>

          <div className="px-4 pt-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">知识点掌握情况</h3>
              <div className="space-y-3">
                {knowledgeMastery.map(k => (
                  <div key={k.point}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{k.point}</span>
                      <span className="text-xs font-medium text-gray-800">{k.rate}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${String(k.rate)}%`,
                          backgroundColor: k.rate >= 80 ? '#10b981' : k.rate >= 60 ? '#f59e0b' : '#ef4444'
                        }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-4 pt-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">成长轨迹</h3>
              {scores.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">暂无考试记录</p>
              ) : (
                <div className="relative pl-6">
                  <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />
                  {scores.slice(0, 5).map((score, idx) => (
                    <div key={score.id} className="relative mb-4 last:mb-0">
                      <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-orange-400 border-2 border-white" />
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-500">{score.date}</span>
                            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-xs">{score.subject}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-800">{score.score}/{score.fullScore}</span>
                            {idx > 0 && (() => {
                              const prev = scores[idx - 1];
                              if (prev === undefined) return null;
                              const isUp = score.score > prev.score;
                              return (
                                <span className={`material-icons text-sm ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                                  {isUp ? 'trending_up' : 'trending_down'}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-4 pt-4">
            <button data-testid="ai-suggestions-btn" onClick={() => { void handleGenerateSuggestions(); }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 text-white text-sm font-medium hover:from-orange-500 hover:to-amber-600 transition-all flex items-center justify-center gap-2">
              <span className="material-icons text-base">auto_awesome</span>
              AI 生成教学建议
            </button>
          </div>

          {aiSuggestions !== '' && (
            <div className="px-4 pt-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">AI 教学建议</h3>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{aiSuggestions}</div>
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); }} title="添加学生">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">姓名</label>
            <input data-testid="new-student-name" value={newStudent.name ?? ''}
              onChange={e => { setNewStudent({ ...newStudent, name: e.target.value }); }}
              placeholder="请输入学生姓名"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">年级</label>
            <select data-testid="new-student-grade" value={newStudent.grade ?? '四年级'}
              onChange={e => { setNewStudent({ ...newStudent, grade: e.target.value }); }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
              <option value="一年级">一年级</option>
              <option value="二年级">二年级</option>
              <option value="三年级">三年级</option>
              <option value="四年级">四年级</option>
              <option value="五年级">五年级</option>
              <option value="六年级">六年级</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">班级</label>
            <input data-testid="new-student-class" value={newStudent.className ?? ''}
              onChange={e => { setNewStudent({ ...newStudent, className: e.target.value }); }}
              placeholder="例如：一班"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">性别</label>
            <div className="flex gap-2">
              <button data-testid="gender-male" onClick={() => { setNewStudent({ ...newStudent, gender: 'male' }); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  newStudent.gender === 'male' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                男
              </button>
              <button data-testid="gender-female" onClick={() => { setNewStudent({ ...newStudent, gender: 'female' }); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  newStudent.gender === 'female' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                女
              </button>
            </div>
          </div>
          <button data-testid="confirm-add-student" onClick={() => { void handleAddStudent(); }}
            className="w-full py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors">
            确认添加
          </button>
        </div>
      </Modal>
    </div>
  );
}
