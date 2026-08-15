/**
 * 家校沟通消息接口 - 教师 <-> 家长 围绕某学生的对话
 *
 * 权限：
 * - 发送：教师（可对班级内学生发消息）；家长（对孩子发消息给教师）
 * - 查询：教师看自己班级学生的全部消息；家长看自己孩子的消息
 * - 删除：消息发送者本人或教师
 */
import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getAccessibleStudentIds, canAccessStudent, getUserClassId } from '../access.js';

export const messagesRouter = Router();

// 需登录后访问
messagesRouter.use(requireAuth);

// 查询消息列表（可按 studentId 过滤）
messagesRouter.get('/', (req, res) => {
  const accessibleIds = getAccessibleStudentIds(req.user);

  if (req.query.studentId) {
    const studentId = Number(req.query.studentId);
    if (!accessibleIds.includes(studentId)) {
      return res.status(403).json({ error: '无权限访问该学生的消息' });
    }
    const rows = db.prepare('SELECT * FROM messages WHERE student_id = ? ORDER BY id ASC').all(studentId);
    return res.json({ data: rows.map(formatMessage) });
  }

  if (accessibleIds.length === 0) return res.json({ data: [] });
  const placeholders = accessibleIds.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT * FROM messages WHERE student_id IN (${placeholders}) ORDER BY id ASC`
  ).all(...accessibleIds);

  res.json({ data: rows.map(formatMessage) });
});

// 发送消息（教师 或 家长）
messagesRouter.post('/', (req, res) => {
  const { studentId, content } = req.body || {};

  if (!studentId) return res.status(400).json({ error: '缺少 studentId' });
  if (!content || !String(content).trim()) return res.status(400).json({ error: '消息内容不能为空' });

  if (!canAccessStudent(req.user, studentId)) {
    return res.status(403).json({ error: '无权限为该学生发送消息' });
  }

  // 家长发消息时 receiver 为班级教师；教师发消息时 receiver 可留空（发给家长群体）
  let receiverId = null;
  if (req.user.role === 'parent') {
    const student = db.prepare('SELECT class_id FROM students WHERE id = ?').get(Number(studentId));
    if (student && student.class_id) {
      const teacher = db.prepare('SELECT id FROM users WHERE class_id = ? AND role = ?').get(student.class_id, 'teacher');
      if (teacher) receiverId = teacher.id;
    }
  }

  const result = db.prepare(
    `INSERT INTO messages (student_id, sender_id, sender_role, receiver_id, content)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    Number(studentId),
    req.user.id,
    req.user.role === 'teacher' ? 'teacher' : 'parent',
    receiverId,
    String(content).trim()
  );

  const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: '消息发送成功', data: formatMessage(row) });
});

// 更新消息内容（发送者本人 或 教师）
messagesRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: '消息不存在' });

  const canUpdate = req.user.role === 'teacher' || row.sender_id === req.user.id;
  if (!canUpdate) {
    return res.status(403).json({ error: '无权限修改该消息' });
  }

  const { content } = req.body || {};
  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: '消息内容不能为空' });
  }

  db.prepare('UPDATE messages SET content = ? WHERE id = ?').run(String(content).trim(), id);
  const updated = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  res.json({ message: '消息已更新', data: formatMessage(updated) });
});

// 删除消息（发送者本人 或 教师）
messagesRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: '消息不存在' });

  const canDelete = req.user.role === 'teacher' || row.sender_id === req.user.id;
  if (!canDelete) {
    return res.status(403).json({ error: '无权限删除该消息' });
  }

  db.prepare('DELETE FROM messages WHERE id = ?').run(id);
  res.json({ message: '消息删除成功' });
});

function formatMessage(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    senderId: row.sender_id,
    senderRole: row.sender_role,
    receiverId: row.receiver_id,
    content: row.content,
    createdAt: row.created_at
  };
}
