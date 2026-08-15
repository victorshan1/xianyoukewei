/**
 * 安全模块 - 密码加密与 token 签发/验证
 *
 * 全部使用 Node 内置 crypto，无额外依赖：
 * - 密码：scrypt 加盐哈希存储
 * - Token：JWT 风格的 HMAC-SHA256 签名令牌（header.payload.signature）
 */

import crypto from 'node:crypto';

// 生产环境务必通过环境变量设置强密钥；约定的默认值仅允许在非生产环境使用
const SECRET = process.env.JWT_SECRET || 'rural-ai-dev-secret-change-me';
const IS_PROD = process.env.NODE_ENV === 'production';

if (IS_PROD && SECRET === 'rural-ai-dev-secret-change-me') {
  throw new Error(
    '[安全] 生产环境必须通过环境变量 JWT_SECRET 设置强密钥，禁止使用默认值。'
  );
}

const TOKEN_TTL = 7 * 24 * 3600; // token 有效期：7 天（秒）

/**
 * 密码加盐哈希
 * @param {string} password 明文密码
 * @returns {string} "盐:哈希" 格式存储
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * 校验密码
 * @param {string} password 明文密码
 * @param {string} stored 数据库中存储的 "盐:哈希"
 * @returns {boolean}
 */
export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(testHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * base64url 编码
 */
function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

/**
 * 签发 token
 * @param {object} payload 载荷（至少包含 id、role）
 * @returns {string} token
 */
export function signToken(payload) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const body = b64url({ ...payload, iat: now, exp: now + TOKEN_TTL });
  const data = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

/**
 * 验证 token
 * @param {string} token
 * @returns {object|null} 解码后的载荷（含 id/role/exp），无效或过期返回 null
 */
export function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, sig] = parts;
    const data = `${header}.${body}`;

    // 验证签名
    const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;

    // 验证过期时间
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}