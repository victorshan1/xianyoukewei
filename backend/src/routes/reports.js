/**
 * 学情报告接口 - 对应前端 reports store
 *
 * 权限：
 * - 生成/更新/删除：仅教师（为班级学生生成周报/月报）
 * - 查询：教师看班级学生报告；学生/家长看自己可访问学生的报告
 */
import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getAccessibleStudentIds, parseJson, stringifyJson } from '../access.js';

export const reportsRouter = Router();

// 需登录后访问
reportsRouter.use(requireAuth);

// 查询报告列表（可传 studentId 只看某学生）
reportsRouter.get('/', (req, res) => {
  const accessibleIds = getAccessibleStudentIds(req.user);

  if (req.query.studentId) {
    const studentId = Number(req.query.studentId);
    if (!accessibleIds.includes(studentId)) {
      return res.status(403).json({ error: '无权限访问该学生的数据' });
    }
    const rows = db.prepare('SELECT * FROM reports WHERE student_id = ? ORDER BY id DESC').all(studentId);
    return res.json({ data: rows.map(formatReport) });
  }

  if (accessibleIds.length === 0) return res.json({ data: [] });
  const placeholders = accessibleIds.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT * FROM reports WHERE student_id IN (${placeholders}) ORDER BY id DESC`
  ).all(...accessibleIds);

  res.json({ data: rows.map(formatReport) });
});

// 生成报告（仅教师）
reportsRouter.post('/', requireRole('teacher'), (req, res) => {
  const { studentId, type, startDate, endDate, data } = req.body || {};

  if (!studentId || !type) {
    return res.status(400).json({ error: '缺少必填字段：studentId、type' });
  }

  const result = db.prepare(
    `INSERT INTO reports (student_id, type, start_date, end_date, data, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    studentId,
    type,
    startDate || null,
    endDate || null,
    stringifyJson(data || {}),
    req.user.id
  );

  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: '报告生成成功', data: formatReport(row) });
});

// 更新报告（仅教师）
reportsRouter.put('/:id', requireRole('teacher'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: '报告不存在' });

  const { studentId, type, startDate, endDate, data } = req.body || {};
  db.prepare(
    `UPDATE reports SET student_id = ?, type = ?, start_date = ?, end_date = ?, data = ? WHERE id = ?`
  ).run(
    studentId ?? existing.student_id,
    type ?? existing.type,
    startDate ?? existing.start_date,
    endDate ?? existing.end_date,
    stringifyJson(data ?? {}),
    id
  );

  const updated = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
  res.json({ message: '报告已更新', data: formatReport(updated) });
});

// 删除报告（仅教师）
reportsRouter.delete('/:id', requireRole('teacher'), (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM reports WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: '报告不存在' });
  res.json({ message: '报告删除成功' });
});

function formatReport(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    type: row.type,
    startDate: row.start_date,
    endDate: row.end_date,
    data: parseJson(row.data) || {},
    generatedBy: row.created_by,
    createdAt: row.created_at
  };
}