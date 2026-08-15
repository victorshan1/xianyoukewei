/**
 * 成绩接口 - 对应前端 scores store
 *
 * 权限：
 * - 查询：教师看自己班级所有学生；学生/家长只能看自己可访问学生的成绩
 * - 新增/更新/删除：仅教师
 */
import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getAccessibleStudentIds, assertStudentAccess, parseJson, stringifyJson } from '../access.js';

export const scoresRouter = Router();

// 需登录后访问
scoresRouter.use(requireAuth);

// 查询成绩列表（可传 studentId 只看某学生）
scoresRouter.get('/', (req, res) => {
  const accessibleIds = getAccessibleStudentIds(req.user);

  if (req.query.studentId) {
    const studentId = Number(req.query.studentId);
    if (!accessibleIds.includes(studentId)) {
      return res.status(403).json({ error: '无权限访问该学生的数据' });
    }
    const rows = db.prepare('SELECT * FROM scores WHERE student_id = ? ORDER BY date DESC').all(studentId);
    return res.json({ data: rows.map(formatScore) });
  }

  // 按可访问学生批量查询
  if (accessibleIds.length === 0) return res.json({ data: [] });
  const placeholders = accessibleIds.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT * FROM scores WHERE student_id IN (${placeholders}) ORDER BY date DESC`
  ).all(...accessibleIds);

  res.json({ data: rows.map(formatScore) });
});

// 录入成绩（仅教师）
scoresRouter.post('/', requireRole('teacher'), (req, res) => {
  const { studentId, subject, type, score, maxScore, knowledgePoints, date } = req.body || {};

  if (!studentId || !subject || score === undefined) {
    return res.status(400).json({ error: '缺少必填字段：studentId、subject、score' });
  }

  const result = db.prepare(
    `INSERT INTO scores (student_id, subject, type, score, max_score, knowledge_points, date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    studentId,
    subject,
    type || '测验',
    score,
    maxScore || 100,
    stringifyJson(knowledgePoints || []),
    date || new Date().toISOString().slice(0, 10),
    req.user.id
  );

  const row = db.prepare('SELECT * FROM scores WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: '成绩录入成功', data: formatScore(row) });
});

// 更新成绩（仅教师）
scoresRouter.put('/:id', requireRole('teacher'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM scores WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: '成绩记录不存在' });

  const { subject, type, score, maxScore, knowledgePoints, date } = req.body || {};
  db.prepare(
    `UPDATE scores SET subject = ?, type = ?, score = ?, max_score = ?, knowledge_points = ?, date = ? WHERE id = ?`
  ).run(
    subject ?? existing.subject,
    type ?? existing.type,
    score ?? existing.score,
    maxScore ?? existing.max_score,
    knowledgePoints !== undefined ? stringifyJson(knowledgePoints) : existing.knowledge_points,
    date ?? existing.date,
    id
  );

  const row = db.prepare('SELECT * FROM scores WHERE id = ?').get(id);
  res.json({ message: '成绩更新成功', data: formatScore(row) });
});

// 删除成绩（仅教师）
scoresRouter.delete('/:id', requireRole('teacher'), (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM scores WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: '成绩记录不存在' });
  res.json({ message: '成绩删除成功' });
});

// 数据库行 -> 前端字段
function formatScore(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    subject: row.subject,
    type: row.type,
    score: row.score,
    maxScore: row.max_score,
    knowledgePoints: parseJson(row.knowledge_points) || [],
    date: row.date,
    createdAt: row.created_at
  };
}