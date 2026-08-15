/**
 * 练习记录接口 - 对应前端 practice_records store
 *
 * 权限：
 * - 提交：学生提交自己的练习记录（自动绑定自己账号）；教师可代学生录入
 * - 查询：教师看班级学生练习；学生看自己的；家长看孩子的
 * - 删除：教师 或 该记录归属的学生本人
 */
import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getAccessibleStudentIds, canAccessStudent } from '../access.js';

export const practiceRouter = Router();

// 需登录后访问
practiceRouter.use(requireAuth);

// 查询练习记录
practiceRouter.get('/', (req, res) => {
  const accessibleIds = getAccessibleStudentIds(req.user);

  if (req.query.studentId) {
    const studentId = Number(req.query.studentId);
    if (!accessibleIds.includes(studentId)) {
      return res.status(403).json({ error: '无权限访问该学生的数据' });
    }
    const rows = db.prepare('SELECT * FROM practice_records WHERE student_id = ? ORDER BY id DESC').all(studentId);
    return res.json({ data: rows.map(formatPractice) });
  }

  if (accessibleIds.length === 0) return res.json({ data: [] });
  const placeholders = accessibleIds.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT * FROM practice_records WHERE student_id IN (${placeholders}) ORDER BY id DESC`
  ).all(...accessibleIds);

  res.json({ data: rows.map(formatPractice) });
});

// 提交练习记录
practiceRouter.post('/', (req, res) => {
  const { studentId, knowledgePoint, difficulty, totalQuestions, correctCount, timeSpent } = req.body || {};

  let targetStudentId = studentId;
  if (req.user.role === 'student') {
    const myIds = getAccessibleStudentIds(req.user);
    if (myIds.length === 0) {
      return res.status(403).json({ error: '你的账号还未关联学生身份' });
    }
    targetStudentId = myIds[0];
  } else if (!targetStudentId) {
    return res.status(400).json({ error: '缺少 studentId' });
  }

  if (!canAccessStudent(req.user, targetStudentId)) {
    return res.status(403).json({ error: '无权限为该学生提交练习记录' });
  }

  if (!knowledgePoint || !totalQuestions) {
    return res.status(400).json({ error: '缺少必填字段：knowledgePoint、totalQuestions' });
  }

  const result = db.prepare(
    `INSERT INTO practice_records (student_id, knowledge_point, difficulty, total_questions, correct_count, time_spent)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    targetStudentId,
    knowledgePoint,
    difficulty || 1,
    totalQuestions,
    correctCount || 0,
    timeSpent || 0
  );

  const row = db.prepare('SELECT * FROM practice_records WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: '练习记录已保存', data: formatPractice(row) });
});

// 更新练习记录（教师 或 归属学生本人）
practiceRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM practice_records WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: '练习记录不存在' });

  const canUpdate = req.user.role === 'teacher' || canAccessStudent(req.user, row.student_id);
  if (!canUpdate) {
    return res.status(403).json({ error: '无权限修改该记录' });
  }

  const { knowledgePoint, difficulty, totalQuestions, correctCount, timeSpent } = req.body || {};
  db.prepare(
    `UPDATE practice_records SET knowledge_point = ?, difficulty = ?, total_questions = ?, correct_count = ?, time_spent = ? WHERE id = ?`
  ).run(
    knowledgePoint ?? row.knowledge_point,
    difficulty ?? row.difficulty,
    totalQuestions ?? row.total_questions,
    correctCount ?? row.correct_count,
    timeSpent ?? row.time_spent,
    id
  );

  const updated = db.prepare('SELECT * FROM practice_records WHERE id = ?').get(id);
  res.json({ message: '练习记录已更新', data: formatPractice(updated) });
});

// 删除练习记录（教师 或 归属学生本人）
practiceRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM practice_records WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: '练习记录不存在' });

  const canDelete = req.user.role === 'teacher' || canAccessStudent(req.user, row.student_id);
  if (!canDelete) {
    return res.status(403).json({ error: '无权限删除该记录' });
  }

  db.prepare('DELETE FROM practice_records WHERE id = ?').run(id);
  res.json({ message: '练习记录删除成功' });
});

function formatPractice(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    knowledgePoint: row.knowledge_point,
    difficulty: row.difficulty,
    totalQuestions: row.total_questions,
    correctCount: row.correct_count,
    timeSpent: row.time_spent,
    createdAt: row.created_at
  };
}