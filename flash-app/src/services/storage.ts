import type { Student, ScoreRecord, LessonPlan, WrongAnswer, PracticeRecord } from '@/types';

const KEYS = {
  STUDENTS: 'rural_students',
  SCORES: 'rural_scores',
  LESSONS: 'rural_lessons',
  WRONG_ANSWERS: 'rural_wrong_answers',
  PRACTICE: 'rural_practice',
  DEMO_LOADED: 'rural_demo_loaded',
} as const;

function get(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function set(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const storageService = {
  // Students
  async getStudents(): Promise<Student[]> {
    return (get(KEYS.STUDENTS) as Student[] | null) ?? [];
  },
  async saveStudents(students: Student[]): Promise<void> {
    set(KEYS.STUDENTS, students);
  },
  async addStudent(student: Student): Promise<void> {
    const students = await storageService.getStudents();
    students.push(student);
    await storageService.saveStudents(students);
  },
  async updateStudent(student: Student): Promise<void> {
    const students = (await storageService.getStudents()).map(s =>
      s.id === student.id ? student : s
    );
    await storageService.saveStudents(students);
  },
  async deleteStudent(id: number): Promise<void> {
    const students = (await storageService.getStudents()).filter(s => s.id !== id);
    await storageService.saveStudents(students);
  },

  // Scores
  async getScores(): Promise<ScoreRecord[]> {
    return (get(KEYS.SCORES) as ScoreRecord[] | null) ?? [];
  },
  async saveScores(scores: ScoreRecord[]): Promise<void> {
    set(KEYS.SCORES, scores);
  },
  async addScore(score: ScoreRecord): Promise<void> {
    const scores = await storageService.getScores();
    scores.push(score);
    await storageService.saveScores(scores);
  },

  // Lesson Plans
  async getLessons(): Promise<LessonPlan[]> {
    return (get(KEYS.LESSONS) as LessonPlan[] | null) ?? [];
  },
  async saveLessons(lessons: LessonPlan[]): Promise<void> {
    set(KEYS.LESSONS, lessons);
  },
  async addLesson(lesson: LessonPlan): Promise<void> {
    const lessons = await storageService.getLessons();
    lessons.unshift(lesson);
    await storageService.saveLessons(lessons);
  },
  async updateLesson(lesson: LessonPlan): Promise<void> {
    const lessons = (await storageService.getLessons()).map(l =>
      l.id === lesson.id ? lesson : l
    );
    await storageService.saveLessons(lessons);
  },
  async deleteLesson(id: number): Promise<void> {
    const lessons = (await storageService.getLessons()).filter(l => l.id !== id);
    await storageService.saveLessons(lessons);
  },

  // Wrong Answers
  async getWrongAnswers(): Promise<WrongAnswer[]> {
    return (get(KEYS.WRONG_ANSWERS) as WrongAnswer[] | null) ?? [];
  },
  async saveWrongAnswers(items: WrongAnswer[]): Promise<void> {
    set(KEYS.WRONG_ANSWERS, items);
  },
  async addWrongAnswer(item: WrongAnswer): Promise<void> {
    const items = await storageService.getWrongAnswers();
    items.unshift(item);
    await storageService.saveWrongAnswers(items);
  },
  async markWrongMastered(id: number, mastered: boolean): Promise<void> {
    const items = (await storageService.getWrongAnswers()).map(w =>
      w.id === id ? { ...w, mastered } : w
    );
    await storageService.saveWrongAnswers(items);
  },
  async deleteWrongAnswer(id: number): Promise<void> {
    const items = (await storageService.getWrongAnswers()).filter(w => w.id !== id);
    await storageService.saveWrongAnswers(items);
  },

  // Practice
  async getPracticeRecords(): Promise<PracticeRecord[]> {
    return (get(KEYS.PRACTICE) as PracticeRecord[] | null) ?? [];
  },
  async savePracticeRecords(records: PracticeRecord[]): Promise<void> {
    set(KEYS.PRACTICE, records);
  },

  // Demo flag
  async isDemoLoaded(): Promise<boolean> {
    return (get(KEYS.DEMO_LOADED) as boolean | null) ?? false;
  },
  async setDemoLoaded(): Promise<void> {
    set(KEYS.DEMO_LOADED, true);
  },
};
