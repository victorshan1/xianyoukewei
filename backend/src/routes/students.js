/**
 * 学生接口 - 增删改查
 * 对应前端 students store
 *
 * 权限（三端）：
 * - 查询：教师看自己班级学生；学生/家长看自己可访问的学生
 * - 新增/更新/删除：仅教师，新增时自动归属教师班级
 */
import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getUserClassId, getAccessibleStudentIds, canAccessStudent } from '../access.js';

export const studentsRouter = Router();

// 学生接口需登录后才能访问
studentsRouter.use(requireAuth);

// 查询学生列表
studentsRouter.get('/', (req, res) => {
  // 教师默认看自己班级；学生/家长看自己可访问的学生
  const accessibleIds = getAccessibleStudentIds(req.user);
  if (accessibleIds.length === 0) return res.json({ data: [] });

  const placeholders = accessibleIds.map(() => '?').join(',');
  let sql = `SELECT * FROM students WHERE id IN (${placeholders})`;
  const params = [...accessibleIds];

  // 额外过滤
  if (req.query.className) {
    sql += ' AND class_name = ?';
    params.push(req.query.className);
  }

  sql += ' ORDER BY id ASC';
  const students = db.prepare(sql).all(...params);
  res.json({ data: students.map(formatStudent) });
});

// 查询单个学生
studentsRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  if (!student) return res.status(404).json({ error: '学生不存在' });
  if (!canAccessStudent(req.user, id)) {
    return res.status(403).json({ error: '无权限访问该学生' });
  }
  res.json({ data: formatStudent(student) });
});

// 新增学生（仅教师，自动归属教师班级）
studentsRouter.post('/', requireRole('teacher'), (req, res) => {
  const { name, grade, className, studentNo, gender, avatar, note } = req.body || {};

  if (!name) return res.status(400).json({ error: '学生姓名不能为空' });

  // 自动归属教师的班级
  const teacherClassId = getUserClassId(req.user.id);

  const result = db.prepare(
    `INSERT INTO students (name, grade, class_name, class_id, student_no, gender, avatar, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    name,
    grade || null,
    className || null,
    teacherClassId || null,
    studentNo || null,
    gender || null,
    avatar || null,
    note || null
  );

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: '学生添加成功', data: formatStudent(student) });
});

// 更新学生（仅教师）
studentsRouter.put('/:id', requireRole('teacher'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: '学生不存在' });

  const fields = ['name', 'grade', 'className', 'studentNo', 'gender', 'avatar', 'note'];
  const setClauses = [];
  const params = [];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      const col = field === 'className' ? 'class_name' : field === 'studentNo' ? 'student_no' : field;
      setClauses.push(`${col} = ?`);
      params.push(req.body[field]);
    }
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ error: '没有需要更新的字段' });
  }

  params.push(id);
  db.prepare(`UPDATE students SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  res.json({ message: '学生更新成功', data: formatStudent(student) });
});

// 删除学生（仅教师）
studentsRouter.delete('/:id', requireRole('teacher'), (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM students WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: '学生不存在' });
  res.json({ message: '学生删除成功' });
});

// 数据库行 -> 前端字段
function formatStudent(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    grade: row.grade,
    className: row.class_name,
    classId: row.class_id,
    studentNo: row.student_no,
    gender: row.gender,
    avatar: row.avatar,
    note: row.note,
    createdAt: row.created_at
  };
}