/**
 * 错题本接口 - 对应前端 wrong_answers store
 *
 * 权限：
 * - 添加：学生添加自己的错题（自动绑定自己账号）；教师可代学生录入
 * - 查询：教师看班级学生错题；学生看自己的；家长看孩子的
 * - 更新掌握状态：学生本人或教师
 * - 删除：教师 或 归属学生本人
 */
import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getAccessibleStudentIds, canAccessStudent } from '../access.js';

export const wrongAnswersRouter = Router();

// 需登录后访问
wrongAnswersRouter.use(requireAuth);

// 查询错题列表
wrongAnswersRouter.get('/', (req, res) => {
  const accessibleIds = getAccessibleStudentIds(req.user);

  if (req.query.studentId) {
    const studentId = Number(req.query.studentId);
    if (!accessibleIds.includes(studentId)) {
      return res.status(403).json({ error: '无权限访问该学生的数据' });
    }
    const rows = db.prepare('SELECT * FROM wrong_answers WHERE student_id = ? ORDER BY id DESC').all(studentId);
    return res.json({ data: rows.map(formatWrong) });
  }

  if (accessibleIds.length === 0) return res.json({ data: [] });
  const placeholders = accessibleIds.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT * FROM wrong_answers WHERE student_id IN (${placeholders}) ORDER BY id DESC`
  ).all(...accessibleIds);

  res.json({ data: rows.map(formatWrong) });
});

// 添加错题
wrongAnswersRouter.post('/', (req, res) => {
  const { studentId, subject, question, studentAnswer, correctAnswer, analysis, knowledgePoint } = req.body || {};

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
    return res.status(403).json({ error: '无权限为该学生添加错题' });
  }

  if (!question) return res.status(400).json({ error: '题目内容不能为空' });

  const result = db.prepare(
    `INSERT INTO wrong_answers (student_id, subject, question, student_answer, correct_answer, analysis, knowledge_point)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    targetStudentId,
    subject || null,
    question,
    studentAnswer || null,
    correctAnswer || null,
    analysis || null,
    knowledgePoint || null
  );

  const row = db.prepare('SELECT * FROM wrong_answers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: '错题已收录', data: formatWrong(row) });
});

// 更新错题掌握状态（学生本人或教师）
wrongAnswersRouter.put('/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM wrong_answers WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: '错题记录不存在' });

  const canUpdate = req.user.role === 'teacher' || canAccessStudent(req.user, row.student_id);
  if (!canUpdate) {
    return res.status(403).json({ error: '无权限操作该错题' });
  }

  const { status } = req.body || {};
  if (!['unmastered', 'mastered'].includes(status)) {
    return res.status(400).json({ error: '状态不合法（unmastered / mastered）' });
  }

  db.prepare('UPDATE wrong_answers SET status = ? WHERE id = ?').run(status, id);
  const updated = db.prepare('SELECT * FROM wrong_answers WHERE id = ?').get(id);
  res.json({ message: '错题状态已更新', data: formatWrong(updated) });
});

// 删除错题（教师 或 归属学生本人）
wrongAnswersRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM wrong_answers WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: '错题记录不存在' });

  const canDelete = req.user.role === 'teacher' || canAccessStudent(req.user, row.student_id);
  if (!canDelete) {
    return res.status(403).json({ error: '无权限删除该错题' });
  }

  db.prepare('DELETE FROM wrong_answers WHERE id = ?').run(id);
  res.json({ message: '错题删除成功' });
});

function formatWrong(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    subject: row.subject,
    question: row.question,
    studentAnswer: row.student_answer,
    correctAnswer: row.correct_answer,
    analysis: row.analysis,
    knowledgePoint: row.knowledge_point,
    status: row.status,
    createdAt: row.created_at
  };
}