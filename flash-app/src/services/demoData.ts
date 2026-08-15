import type { Student, ScoreRecord, LessonPlan, WrongAnswer, PracticeRecord } from '@/types';
import { storageService } from './storage';

const DEMO_STUDENTS: Student[] = [
  { id: 1, name: '张小明', grade: '四年级', className: '1班', gender: 'male', createdAt: Date.now() - 86400000 * 180 },
  { id: 2, name: '王小刚', grade: '四年级', className: '1班', gender: 'male', createdAt: Date.now() - 86400000 * 170 },
  { id: 3, name: '赵小丽', grade: '四年级', className: '1班', gender: 'female', createdAt: Date.now() - 86400000 * 160 },
  { id: 4, name: '陈小芳', grade: '四年级', className: '1班', gender: 'female', createdAt: Date.now() - 86400000 * 150 },
  { id: 5, name: '刘小强', grade: '四年级', className: '1班', gender: 'male', createdAt: Date.now() - 86400000 * 140 },
];

const DEMO_SCORES: ScoreRecord[] = [
  { id: 1, studentId: 1, subject: '数学', score: 92, fullScore: 100, examType: '单元测试', date: '2025-03-15', knowledgePoints: ['分数乘法', '分数除法'] },
  { id: 2, studentId: 1, subject: '数学', score: 88, fullScore: 100, examType: '月考', date: '2025-04-10', knowledgePoints: ['分数乘法', '应用题'] },
  { id: 3, studentId: 1, subject: '数学', score: 95, fullScore: 100, examType: '期中考试', date: '2025-05-08', knowledgePoints: ['分数运算', '几何'] },
  { id: 4, studentId: 2, subject: '数学', score: 45, fullScore: 100, examType: '单元测试', date: '2025-03-15', knowledgePoints: ['分数乘法'] },
  { id: 5, studentId: 2, subject: '数学', score: 58, fullScore: 100, examType: '月考', date: '2025-04-10', knowledgePoints: ['分数乘法', '分数除法'] },
  { id: 6, studentId: 2, subject: '数学', score: 68, fullScore: 100, examType: '期中考试', date: '2025-05-08', knowledgePoints: ['分数运算', '应用题'] },
  { id: 7, studentId: 3, subject: '数学', score: 96, fullScore: 100, examType: '单元测试', date: '2025-03-15', knowledgePoints: ['分数乘法', '几何'] },
  { id: 8, studentId: 3, subject: '数学', score: 68, fullScore: 100, examType: '月考', date: '2025-04-10', knowledgePoints: ['应用题', '统计'] },
  { id: 9, studentId: 3, subject: '数学', score: 79, fullScore: 100, examType: '期中考试', date: '2025-05-08', knowledgePoints: ['应用题', '逻辑推理'] },
  { id: 10, studentId: 4, subject: '数学', score: 85, fullScore: 100, examType: '单元测试', date: '2025-03-15', knowledgePoints: ['分数乘法'] },
  { id: 11, studentId: 4, subject: '数学', score: 82, fullScore: 100, examType: '月考', date: '2025-04-10', knowledgePoints: ['分数除法', '几何'] },
  { id: 12, studentId: 4, subject: '数学', score: 90, fullScore: 100, examType: '期中考试', date: '2025-05-08', knowledgePoints: ['分数运算', '几何'] },
  { id: 13, studentId: 5, subject: '数学', score: 72, fullScore: 100, examType: '单元测试', date: '2025-03-15', knowledgePoints: ['分数乘法'] },
  { id: 14, studentId: 5, subject: '数学', score: 75, fullScore: 100, examType: '月考', date: '2025-04-10', knowledgePoints: ['分数除法'] },
  { id: 15, studentId: 5, subject: '数学', score: 78, fullScore: 100, examType: '期中考试', date: '2025-05-08', knowledgePoints: ['分数运算'] },
];

const DEMO_LESSONS: LessonPlan[] = [
  { id: 1, subject: '数学', grade: '四年级', topic: '分数乘法', templateType: 'new-lesson', content: '## 教学目标\n1. 理解分数乘法的意义\n2. 掌握分数乘法的计算方法\n3. 能运用分数乘法解决实际问题\n\n## 教学重难点\n- 重点：分数乘法的计算法则\n- 难点：理解分数乘法的意义\n\n## 教学过程\n### 一、导入（5分钟）\n通过分蛋糕的情境引入分数乘法。\n\n### 二、新授（20分钟）\n1. 讲解分数乘整数的意义\n2. 讲解分数乘分数的意义\n3. 总结计算法则：分子相乘作分子，分母相乘作分母\n\n### 三、练习（10分钟）\n完成课本练习题。\n\n### 四、小结（3分钟）\n回顾本节课重点。\n\n### 五、作业（2分钟）\n布置课后练习。', homeworkContent: '课本第35页练习题1-5题', createdAt: Date.now() - 86400000 * 3 },
  { id: 2, subject: '数学', grade: '四年级', topic: '分数的意义和性质', templateType: 'review', content: '## 复习目标\n1. 回顾分数的基本概念\n2. 巩固分数的基本性质\n3. 查漏补缺\n\n## 复习过程\n### 一、知识梳理（10分钟）\n分数的意义、分数单位、真分数、假分数、带分数。\n\n### 二、重点回顾（15分钟）\n分数的基本性质：分子分母同时乘或除以相同的数（0除外），分数大小不变。\n\n### 三、巩固练习（10分钟）\n完成复习题。\n\n### 四、总结（5分钟）\n易错点提醒。', homeworkContent: '完成复习卷', createdAt: Date.now() - 86400000 * 1 },
  { id: 3, subject: '科学', grade: '四年级', topic: '植物的生长变化', templateType: 'experiment', content: '## 实验目标\n观察植物生长过程，记录变化。\n\n## 实验准备\n种子、花盆、土壤、水壶、记录本。\n\n## 实验步骤\n1. 种植种子\n2. 每天浇水并记录\n3. 观察发芽、长叶、开花过程\n\n## 观察记录\n学生填写观察记录表。\n\n## 实验总结\n总结植物生长需要的条件。', homeworkContent: '继续观察并记录植物生长', createdAt: Date.now() - 86400000 * 5 },
];

const DEMO_WRONG_ANSWERS: WrongAnswer[] = [
  { id: 1, studentId: 2, subject: '数学', question: '计算：2/3 × 3/4 = ?', answer: '1/2', analysis: '分数乘法：分子相乘作分子（2×3=6），分母相乘作分母（3×4=12），6/12 = 1/2', mastered: false, createdAt: Date.now() - 86400000 * 10 },
  { id: 2, studentId: 2, subject: '数学', question: '一个长方形长3/4米，宽2/5米，面积是多少？', answer: '3/10平方米', analysis: '长方形面积 = 长 × 宽 = 3/4 × 2/5 = 6/20 = 3/10（平方米）', mastered: false, createdAt: Date.now() - 86400000 * 8 },
  { id: 3, studentId: 2, subject: '数学', question: '5/6 ÷ 2/3 = ?', answer: '5/4', analysis: '分数除法：除以一个分数等于乘以它的倒数。5/6  2/3 = 5/6 × 3/2 = 15/12 = 5/4', mastered: true, createdAt: Date.now() - 86400000 * 15 },
  { id: 4, studentId: 1, subject: '数学', question: '计算：1/2 + 1/3 = ?', answer: '5/6', analysis: '异分母分数相加，先通分。1/2 = 3/6，1/3 = 2/6，3/6 + 2/6 = 5/6', mastered: true, createdAt: Date.now() - 86400000 * 12 },
  { id: 5, studentId: 1, subject: '数学', question: '小明有12个苹果，吃了1/4，还剩几个？', answer: '9个', analysis: '吃了 12 × 1/4 = 3个，还剩 12 - 3 = 9个', mastered: false, createdAt: Date.now() - 86400000 * 5 },
  { id: 6, studentId: 3, subject: '数学', question: '一个三角形底是6cm，高是4cm，面积是多少？', answer: '12平方厘米', analysis: '三角形面积 = 底 × 高 ÷ 2 = 6 × 4 ÷ 2 = 12（平方厘米）', mastered: false, createdAt: Date.now() - 86400000 * 7 },
  { id: 7, studentId: 3, subject: '数学', question: '解方程：2x + 3 = 11', answer: 'x = 4', analysis: '2x = 11 - 3 = 8，x = 8 ÷ 2 = 4', mastered: true, createdAt: Date.now() - 86400000 * 20 },
  { id: 8, studentId: 4, subject: '数学', question: '3/5 × 10 = ?', answer: '6', analysis: '分数乘整数：3/5 × 10 = 30/5 = 6', mastered: false, createdAt: Date.now() - 86400000 * 3 },
];

const DEMO_PRACTICE: PracticeRecord[] = [
  { id: 1, studentId: 1, subject: '数学', knowledgePoint: '分数乘法', score: 9, totalQuestions: 10, date: '2025-05-01' },
  { id: 2, studentId: 2, subject: '数学', knowledgePoint: '分数乘法', score: 5, totalQuestions: 10, date: '2025-05-01' },
  { id: 3, studentId: 3, subject: '数学', knowledgePoint: '应用题', score: 7, totalQuestions: 10, date: '2025-05-01' },
];

export async function loadDemoData(): Promise<{ students: number; lessons: number }> {
  await storageService.saveStudents(DEMO_STUDENTS);
  await storageService.saveScores(DEMO_SCORES);
  await storageService.saveLessons(DEMO_LESSONS);
  await storageService.saveWrongAnswers(DEMO_WRONG_ANSWERS);
  await storageService.savePracticeRecords(DEMO_PRACTICE);
  await storageService.setDemoLoaded();
  return { students: DEMO_STUDENTS.length, lessons: DEMO_LESSONS.length };
}
