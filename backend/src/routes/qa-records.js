/**
 * 答疑记录接口 - 对应前端 qa_records store
 *
 * 权限：
 * - 提交：学生提交自己的答疑（自动绑定到自己账号关联的学生）；教师也可代学生录入
 * - 查询：教师看班级学生答疑；学生看自己的；家长看孩子的
 * - 删除：教师或该答疑归属的学生本人
 */
import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getAccessibleStudentIds, canAccessStudent, parseJson, stringifyJson } from '../access.js';

export const qaRouter = Router();

// 需登录后访问
qaRouter.use(requireAuth);

// 查询答疑记录
qaRouter.get('/', (req, res) => {
  const accessibleIds = getAccessibleStudentIds(req.user);

  if (req.query.studentId) {
    const studentId = Number(req.query.studentId);
    if (!accessibleIds.includes(studentId)) {
      return res.status(403).json({ error: '无权限访问该学生的数据' });
    }
    const rows = db.prepare('SELECT * FROM qa_records WHERE student_id = ? ORDER BY id DESC').all(studentId);
    return res.json({ data: rows.map(formatQa) });
  }

  if (accessibleIds.length === 0) return res.json({ data: [] });
  const placeholders = accessibleIds.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT * FROM qa_records WHERE student_id IN (${placeholders}) ORDER BY id DESC`
  ).all(...accessibleIds);

  res.json({ data: rows.map(formatQa) });
});

// 提交答疑
qaRouter.post('/', (req, res) => {
  const { studentId, question, answer, steps, knowledgePoints, imageUrl } = req.body || {};

  let targetStudentId = studentId;
  // 学生只能以自己的身份提交；教师可指定学生
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
    return res.status(403).json({ error: '无权限为该学生提交答疑' });
  }

  if (!question) return res.status(400).json({ error: '问题内容不能为空' });

  const result = db.prepare(
    `INSERT INTO qa_records (student_id, image_url, question, answer, steps, knowledge_points)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    targetStudentId,
    imageUrl || null,
    question,
    answer || null,
    steps || null,
    stringifyJson(knowledgePoints || [])
  );

  const row = db.prepare('SELECT * FROM qa_records WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: '答疑记录已保存', data: formatQa(row) });
});

// 更新答疑记录（教师 或 归属学生本人）
qaRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM qa_records WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: '答疑记录不存在' });

  const canUpdate = req.user.role === 'teacher' || canAccessStudent(req.user, row.student_id);
  if (!canUpdate) {
    return res.status(403).json({ error: '无权限修改该记录' });
  }

  const { imageUrl, question, answer, steps, knowledgePoints } = req.body || {};
  db.prepare(
    `UPDATE qa_records SET image_url = ?, question = ?, answer = ?, steps = ?, knowledge_points = ? WHERE id = ?`
  ).run(
    imageUrl ?? null,
    question ?? row.question,
    answer ?? null,
    steps ?? null,
    stringifyJson(knowledgePoints ?? []),
    id
  );

  const updated = db.prepare('SELECT * FROM qa_records WHERE id = ?').get(id);
  res.json({ message: '答疑记录已更新', data: formatQa(updated) });
});

// 删除答疑记录（教师 或 归属学生本人）
qaRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM qa_records WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: '答疑记录不存在' });

  const canDelete = req.user.role === 'teacher' || canAccessStudent(req.user, row.student_id);
  if (!canDelete) {
    return res.status(403).json({ error: '无权限删除该记录' });
  }

  db.prepare('DELETE FROM qa_records WHERE id = ?').run(id);
  res.json({ message: '答疑记录删除成功' });
});

function formatQa(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    imageUrl: row.image_url,
    question: row.question,
    answer: row.answer,
    steps: row.steps,
    knowledgePoints: parseJson(row.knowledge_points) || [],
    createdAt: row.created_at
  };
}