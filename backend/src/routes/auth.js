/**
 * 账号接口 - 注册 / 登录 / 当前用户 / 班级管理
 *
 * 阶段1：密码加密存储、token 鉴权、三端角色权限控制
 */
import { Router } from 'express';
import db from '../db.js';
import { hashPassword, verifyPassword, signToken } from '../security.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { authRateLimit } from '../rate-limit.js';

export const authRouter = Router();

/**
 * 生成 6 位班级邀请码（去掉易混淆字符，保证唯一）
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (db.prepare('SELECT 1 FROM classes WHERE invite_code = ?').get(code));
  return code;
}

/**
 * 注册
 * 密码以 scrypt 加盐哈希存储；可选设置密保问题用于忘记密码找回
 */
authRouter.post('/register', authRateLimit, (req, res) => {
  const { username, password, role = 'teacher', name, phone, classId, securityQuestion, securityAnswer } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码长度至少 6 位' });
  }
  if (!['teacher', 'student', 'parent'].includes(role)) {
    return res.status(400).json({ error: '角色不合法' });
  }

  try {
    const hashed = hashPassword(password);
    const result = db.prepare(
      `INSERT INTO users (username, password, role, name, phone, class_id, security_question, security_answer)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      username, hashed, role, name || null, phone || null, classId || null,
      securityQuestion || null, securityAnswer ? String(securityAnswer).trim() : null
    );

    const user = db.prepare('SELECT id, username, role, name, class_id FROM users WHERE id = ?')
      .get(result.lastInsertRowid);

    // 注册成功后直接签发 token
    const token = signToken({ id: user.id, role: user.role });

    res.status(201).json({ message: '注册成功', user, token });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: '用户名已存在' });
    }
    res.status(500).json({ error: e.message });
  }
});

/**
 * 登录
 * 校验密码后签发 token
 */
authRouter.post('/login', authRateLimit, (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const token = signToken({ id: user.id, role: user.role });

  res.json({
    message: '登录成功',
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      phone: user.phone,
      class_id: user.class_id
    }
  });
});

/**
 * 获取当前登录用户信息（需要 token）
 * 三端通用，前端启动时用它恢复登录态
 */
authRouter.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, username, role, name, phone, class_id, created_at FROM users WHERE id = ?'
  ).get(req.user.id);

  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ user });
});

/**
 * 教师创建班级（仅教师）
 * 创建成功后自动把教师绑定为该班班主任
 */
authRouter.post('/classes', requireAuth, requireRole('teacher'), (req, res) => {
  const { name, grade, schoolName } = req.body || {};

  if (!name) return res.status(400).json({ error: '班级名称不能为空' });

  const result = db.prepare(
    'INSERT INTO classes (name, grade, teacher_id, school_name, invite_code) VALUES (?, ?, ?, ?, ?)'
  ).run(name, grade || null, req.user.id, schoolName || null, generateInviteCode());

  // 教师绑定班级（一名教师对应一个班级，简化处理）
  db.prepare('UPDATE users SET class_id = ? WHERE id = ?')
    .run(Number(result.lastInsertRowid), req.user.id);

  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: '班级创建成功', data: cls });
});

/**
 * 获取我的班级信息（需登录，返回当前用户绑定的班级）
 */
authRouter.get('/my-class', requireAuth, (req, res) => {
  const user = db.prepare('SELECT class_id FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.class_id) {
    return res.status(200).json({ data: null });
  }

  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(user.class_id);
  res.json({ data: cls || null });
});

/**
 * 学生绑定自己的学生身份（仅学生）
 * 绑定后学生才能提交/查看自己的答疑、练习、错题等数据
 */
authRouter.post('/bind-student', requireAuth, requireRole('student'), (req, res) => {
  const { studentId } = req.body || {};
  if (!studentId) return res.status(400).json({ error: '缺少 studentId' });

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(Number(studentId));
  if (!student) return res.status(404).json({ error: '学生不存在' });

  db.prepare('UPDATE students SET user_id = ? WHERE id = ?').run(req.user.id, Number(studentId));

  res.json({ message: '学生身份绑定成功', data: { studentId: Number(studentId), name: student.name } });
});

/**
 * 家长绑定孩子（仅家长）
 * 绑定后家长才能查看孩子的成绩、报告、错题等数据
 */
authRouter.post('/bind-child', requireAuth, requireRole('parent'), (req, res) => {
  const { studentId, relation } = req.body || {};
  if (!studentId) return res.status(400).json({ error: '缺少 studentId' });

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(Number(studentId));
  if (!student) return res.status(404).json({ error: '学生不存在' });

  try {
    db.prepare(
      'INSERT OR IGNORE INTO parent_students (parent_user_id, student_id, relation) VALUES (?, ?, ?)'
    ).run(req.user.id, Number(studentId), relation || 'parent');
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  res.json({ message: '孩子绑定成功', data: { studentId: Number(studentId), name: student.name } });
});

/**
 * 家长查看已绑定的孩子（仅家长）
 */
authRouter.get('/my-children', requireAuth, requireRole('parent'), (req, res) => {
  const rows = db.prepare(
    `SELECT s.id, s.name, s.grade, s.class_name, ps.relation
     FROM parent_students ps
     JOIN students s ON s.id = ps.student_id
     WHERE ps.parent_user_id = ?
     ORDER BY s.id ASC`
  ).all(req.user.id);

  res.json({ data: rows.map((r) => ({ id: r.id, name: r.name, grade: r.grade, className: r.class_name, relation: r.relation })) });
});

/**
 * 教师重置班级邀请码（仅教师）
 * 生成新的 6 位邀请码，旧邀请码立即失效
 */
authRouter.post('/class-invite', requireAuth, requireRole('teacher'), (req, res) => {
  const user = db.prepare('SELECT class_id FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.class_id) {
    return res.status(400).json({ error: '请先创建班级' });
  }
  const code = generateInviteCode();
  db.prepare('UPDATE classes SET invite_code = ? WHERE id = ?').run(code, user.class_id);
  const cls = db.prepare('SELECT id, name, invite_code FROM classes WHERE id = ?').get(user.class_id);
  res.json({ message: '邀请码已重置', data: { id: cls.id, name: cls.name, inviteCode: cls.invite_code } });
});

/**
 * 查询邀请码对应的班级与可加入的学生列表（学生/家长绑定用）
 */
authRouter.get('/class-info', requireAuth, (req, res) => {
  const code = String(req.query.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: '缺少邀请码' });

  const cls = db.prepare('SELECT * FROM classes WHERE invite_code = ?').get(code);
  if (!cls) return res.status(404).json({ error: '邀请码无效' });

  const students = db.prepare(
    'SELECT id, name, grade, student_no FROM students WHERE class_id = ? ORDER BY id'
  ).all(cls.id);

  res.json({
    data: {
      id: cls.id,
      name: cls.name,
      grade: cls.grade,
      schoolName: cls.school_name,
      students
    }
  });
});

/**
 * 忘记密码：通过密保答案重置密码
 */
authRouter.post('/reset-password', (req, res) => {
  const { username, securityAnswer, newPassword } = req.body || {};

  if (!username || !securityAnswer || !newPassword) {
    return res.status(400).json({ error: '请填写完整信息' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码长度至少 6 位' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (!user.security_question || !user.security_answer) {
    return res.status(400).json({ error: '该账号未设置密保，暂无法找回密码' });
  }
  if (String(securityAnswer).trim().toLowerCase() !== String(user.security_answer).trim().toLowerCase()) {
    return res.status(403).json({ error: '密保答案错误' });
  }

  const hashed = hashPassword(newPassword);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, user.id);
  res.json({ message: '密码重置成功，请使用新密码登录' });
});