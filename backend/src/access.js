/**
 * 三端权限辅助模块
 *
 * 定义"某个用户能访问哪些学生数据"的规则：
 * - 教师：自己班级的学生（students.class_id = 教师的 class_id）
 * - 学生：关联到自己账号的学生记录（students.user_id = 用户 id）
 * - 家长：通过 parent_students 关联表绑定的孩子
 *
 * 所有业务接口在读写学生相关数据时，先调用本模块校验归属权。
 */

import db from './db.js';

/**
 * 获取当前用户的班级ID（教师/学生）
 * @param {number} userId
 * @returns {number|null}
 */
export function getUserClassId(userId) {
  const user = db.prepare('SELECT class_id FROM users WHERE id = ?').get(userId);
  return user ? user.class_id : null;
}

/**
 * 获取当前用户可访问的学生ID列表
 * @param {object} user - 已鉴权的用户 { id, role }
 * @returns {number[]} 学生ID数组
 */
export function getAccessibleStudentIds(user) {
  if (user.role === 'teacher') {
    const classId = getUserClassId(user.id);
    if (!classId) return [];
    return db.prepare('SELECT id FROM students WHERE class_id = ?')
      .all(classId)
      .map((r) => r.id);
  }

  if (user.role === 'student') {
    return db.prepare('SELECT id FROM students WHERE user_id = ?')
      .all(user.id)
      .map((r) => r.id);
  }

  if (user.role === 'parent') {
    return db.prepare('SELECT student_id FROM parent_students WHERE parent_user_id = ?')
      .all(user.id)
      .map((r) => r.student_id);
  }

  return [];
}

/**
 * 判断某学生是否对当前用户可见
 * @param {object} user - 已鉴权的用户
 * @param {number} studentId
 * @returns {boolean}
 */
export function canAccessStudent(user, studentId) {
  return getAccessibleStudentIds(user).includes(Number(studentId));
}

/**
 * 校验请求中的 studentId 是否属于当前用户可访问范围
 * 不可访问时直接返回 403 响应
 */
export function assertStudentAccess(req, res, next) {
  const studentId = Number(req.params.studentId || req.body.studentId || req.query.studentId);
  if (!studentId) {
    return res.status(400).json({ error: '缺少 studentId' });
  }
  if (!canAccessStudent(req.user, studentId)) {
    return res.status(403).json({ error: '无权限访问该学生的数据' });
  }
  req.studentId = studentId;
  next();
}

/**
 * JSON 字段解析辅助：数据库 TEXT 字段 <-> JS 对象
 */
export function parseJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function stringifyJson(value) {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}