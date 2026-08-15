/**
 * 鉴权中间件
 *
 * - requireAuth：校验请求携带的 token，注入 req.user
 * - requireRole：限制接口只能被指定角色访问
 */

import { verifyToken } from '../security.js';

/**
 * 从请求头解析 Bearer token
 */
function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/**
 * 登录鉴权：必须携带有效 token
 */
export function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: '未登录，请先登录' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: '登录已失效，请重新登录' });
  }

  req.user = payload; // { id, role, ... }
  next();
}

/**
 * 角色权限：限制仅指定角色可访问（需先经过 requireAuth）
 * @param {...string} roles - 允许的角色，如 requireRole('teacher')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未登录，请先登录' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '无权限访问该接口' });
    }
    next();
  };
}