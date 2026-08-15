export type Port = 'teacher' | 'student' | 'parent';

export interface Student {
  id: number;
  name: string;
  grade: string;
  className: string;
  gender: 'male' | 'female';
  avatar?: string;
  createdAt: number;
}

export interface ScoreRecord {
  id: number;
  studentId: number;
  subject: string;
  score: number;
  fullScore: number;
  examType: string;
  date: string;
  knowledgePoints: string[];
}

export interface LessonPlan {
  id: number;
  subject: string;
  grade: string;
  topic: string;
  templateType: 'new-lesson' | 'review' | 'experiment' | 'commentary';
  content: string;
  homeworkContent: string;
  createdAt: number;
}

export interface WrongAnswer {
  id: number;
  studentId: number;
  subject: string;
  question: string;
  answer: string;
  analysis: string;
  mastered: boolean;
  createdAt: number;
}

export interface PracticeRecord {
  id: number;
  studentId: number;
  subject: string;
  knowledgePoint: string;
  score: number;
  totalQuestions: number;
  date: string;
}

export interface RadarData {
  dimension: string;
  value: number;
}

export const SUBJECTS = ['数学', '语文', '英语', '科学', '道德与法治'] as const;
export const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'] as const;
export const EXAM_TYPES = ['单元测试', '月考', '期中考试', '期末考试'] as const;

export const TEMPLATE_TYPES = [
  { value: 'new-lesson' as const, label: '新授课', icon: '', desc: '知识讲解 + 课堂练习' },
  { value: 'review' as const, label: '复习课', icon: '🔄', desc: '知识梳理 + 巩固练习' },
  { value: 'experiment' as const, label: '实验课', icon: '', desc: '实验操作 + 观察记录' },
  { value: 'commentary' as const, label: '讲评课', icon: '', desc: '试卷讲评 + 错题分析' },
];

export const KNOWLEDGE_ICONS: Record<string, string> = {
  '分数': '🔢', '乘除法': '✖️', '几何': '📐', '应用题': '📋',
  '统计': '📊', '方程': '🔤', '图形': '🔷', '计算': '🧮',
};
