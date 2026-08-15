/**
 * 学生画像接口 - 对应前端 profiles store
 *
 * 权限：
 * - 查询：教师看自己班级学生画像；学生/家长看自己可访问学生的画像
 * - 新增/更新/删除：仅教师
 */
import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getAccessibleStudentIds, parseJson, stringifyJson } from '../access.js';

export const profilesRouter = Router();

// 需登录后访问
profilesRouter.use(requireAuth);

// 查询画像（可传 studentId 只看某学生，教师可传班级过滤）
profilesRouter.get('/', (req, res) => {
  const accessibleIds = getAccessibleStudentIds(req.user);

  if (req.query.studentId) {
    const studentId = Number(req.query.studentId);
    if (!accessibleIds.includes(studentId)) {
      return res.status(403).json({ error: '无权限访问该学生的数据' });
    }
    const row = db.prepare('SELECT * FROM profiles WHERE student_id = ?').get(studentId);
    return res.json({ data: row ? formatProfile(row) : null });
  }

  if (accessibleIds.length === 0) return res.json({ data: [] });
  const placeholders = accessibleIds.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT * FROM profiles WHERE student_id IN (${placeholders})`
  ).all(...accessibleIds);

  res.json({ data: rows.map(formatProfile) });
});

// 新增/更新画像（仅教师，按 studentId 覆盖式保存）
profilesRouter.post('/', requireRole('teacher'), (req, res) => {
  const { studentId, dimensions, attribution, suggestions } = req.body || {};

  if (!studentId) return res.status(400).json({ error: '缺少 studentId' });

  const existing = db.prepare('SELECT * FROM profiles WHERE student_id = ?').get(studentId);

  if (existing) {
    db.prepare(
      'UPDATE profiles SET dimensions = ?, attribution = ?, suggestions = ?, updated_at = datetime(\'now\') WHERE student_id = ?'
    ).run(
      stringifyJson(dimensions || []),
      stringifyJson(attribution || {}),
      stringifyJson(suggestions || []),
      studentId
    );
  } else {
    db.prepare(
      'INSERT INTO profiles (student_id, dimensions, attribution, suggestions) VALUES (?, ?, ?, ?)'
    ).run(
      studentId,
      stringifyJson(dimensions || []),
      stringifyJson(attribution || {}),
      stringifyJson(suggestions || [])
    );
  }

  const row = db.prepare('SELECT * FROM profiles WHERE student_id = ?').get(studentId);
  res.json({ message: '画像保存成功', data: formatProfile(row) });
});

// 删除画像（仅教师）
profilesRouter.delete('/:studentId', requireRole('teacher'), (req, res) => {
  const studentId = Number(req.params.studentId);
  const result = db.prepare('DELETE FROM profiles WHERE student_id = ?').run(studentId);
  if (result.changes === 0) return res.status(404).json({ error: '画像不存在' });
  res.json({ message: '画像删除成功' });
});

function formatProfile(row) {
  return {
    studentId: row.student_id,
    dimensions: parseJson(row.dimensions) || [],
    attribution: parseJson(row.attribution) || {},
    suggestions: parseJson(row.suggestions) || [],
    updatedAt: row.updated_at
  };
}