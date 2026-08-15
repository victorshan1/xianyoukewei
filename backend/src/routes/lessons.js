/**
 * 教案接口 - 对应前端 lessons store
 *
 * 教案属于教学资源：
 * - 查询：所有登录用户可看教案列表（可按 subject/grade 过滤）
 * - 新增/更新/删除：仅教师（教师只能管理自己创建的教案）
 */
import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getUserClassId, parseJson, stringifyJson } from '../access.js';

export const lessonsRouter = Router();

// 需登录后访问
lessonsRouter.use(requireAuth);

// 查询教案列表
lessonsRouter.get('/', (req, res) => {
  const { subject, grade } = req.query;

  let sql = 'SELECT * FROM lessons';
  const conditions = [];
  const params = [];

  if (subject) {
    conditions.push('subject = ?');
    params.push(subject);
  }
  if (grade) {
    conditions.push('grade = ?');
    params.push(grade);
  }

  // 教师看自己创建的；学生/家长看自己班级的教案
  if (req.user.role === 'teacher') {
    conditions.push('teacher_id = ?');
    params.push(req.user.id);
  } else {
    const classId = getUserClassId(req.user.id);
    if (!classId) {
      // 无班级则看不到教案
      return res.json({ data: [] });
    }
    conditions.push('(class_id = ? OR class_id IS NULL)');
    params.push(classId);
  }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY id DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows.map(formatLesson) });
});

// 查询教案详情
lessonsRouter.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM lessons WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: '教案不存在' });
  res.json({ data: formatLesson(row) });
});

// 新增教案（仅教师）
lessonsRouter.post('/', requireRole('teacher'), (req, res) => {
  const { subject, grade, topic, content, homeworkLevels } = req.body || {};

  if (!subject || !topic || !content) {
    return res.status(400).json({ error: '缺少必填字段：subject、topic、content' });
  }

  const classId = getUserClassId(req.user.id);

  const result = db.prepare(
    `INSERT INTO lessons (teacher_id, subject, grade, topic, content, homework_levels, class_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    req.user.id,
    subject,
    grade || null,
    topic,
    content,
    stringifyJson(homeworkLevels || {}),
    classId
  );

  const row = db.prepare('SELECT * FROM lessons WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: '教案保存成功', data: formatLesson(row) });
});

// 更新教案（仅教师，且只能改自己创建的）
lessonsRouter.put('/:id', requireRole('teacher'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: '教案不存在' });
  if (existing.teacher_id !== req.user.id) {
    return res.status(403).json({ error: '只能修改自己创建的教案' });
  }

  const { subject, grade, topic, content, homeworkLevels } = req.body || {};
  db.prepare(
    'UPDATE lessons SET subject = ?, grade = ?, topic = ?, content = ?, homework_levels = ? WHERE id = ?'
  ).run(
    subject ?? existing.subject,
    grade ?? existing.grade,
    topic ?? existing.topic,
    content ?? existing.content,
    homeworkLevels !== undefined ? stringifyJson(homeworkLevels) : existing.homework_levels,
    id
  );

  const row = db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
  res.json({ message: '教案更新成功', data: formatLesson(row) });
});

// 删除教案（仅教师，且只能删自己创建的）
lessonsRouter.delete('/:id', requireRole('teacher'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: '教案不存在' });
  if (existing.teacher_id !== req.user.id) {
    return res.status(403).json({ error: '只能删除自己创建的教案' });
  }

  db.prepare('DELETE FROM lessons WHERE id = ?').run(id);
  res.json({ message: '教案删除成功' });
});

function formatLesson(row) {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    subject: row.subject,
    grade: row.grade,
    topic: row.topic,
    content: row.content,
    homeworkLevels: parseJson(row.homework_levels) || {},
    classId: row.class_id,
    createdAt: row.created_at
  };
}