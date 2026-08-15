/**
 * security.js 单元测试
 * 覆盖：密码加盐哈希/校验、token 签发/验证/过期/篡改
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../src/security.js';

test('hashPassword 生成 "盐:哈希" 格式', () => {
  const out = hashPassword('secret123');
  assert.ok(out.includes(':'), '应包含分隔符');
  const [salt, hash] = out.split(':');
  assert.equal(salt.length, 32, '盐应为 16 字节 hex');
  assert.equal(hash.length, 128, '哈希应为 64 字节 hex');
});

test('相同密码两次哈希结果不同（盐随机）', () => {
  const a = hashPassword('same');
  const b = hashPassword('same');
  assert.notEqual(a, b, '加盐后不应相同');
});

test('正确密码校验通过', () => {
  const stored = hashPassword('correct-horse');
  assert.equal(verifyPassword('correct-horse', stored), true);
});

test('错误密码校验失败', () => {
  const stored = hashPassword('correct-horse');
  assert.equal(verifyPassword('wrong-password', stored), false);
});

test('空/畸形存储值校验失败', () => {
  assert.equal(verifyPassword('anything', ''), false);
  assert.equal(verifyPassword('anything', 'no-colon-here'), false);
  assert.equal(verifyPassword('anything', null), false);
});

test('signToken 返回三段式 token 且可解码载荷', () => {
  const token = signToken({ id: 7, role: 'teacher' });
  assert.equal(token.split('.').length, 3);
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  assert.equal(payload.id, 7);
  assert.equal(payload.role, 'teacher');
  assert.ok(payload.iat, '应包含签发时间');
  assert.ok(payload.exp, '应包含过期时间');
});

test('verifyToken 校验有效 token 返回载荷', () => {
  const token = signToken({ id: 1, role: 'student' });
  const payload = verifyToken(token);
  assert.equal(payload.id, 1);
  assert.equal(payload.role, 'student');
});

test('verifyToken 拒绝被篡改的 token', () => {
  const token = signToken({ id: 1, role: 'teacher' });
  // 篡改载荷中的 role
  const [h, b, s] = token.split('.');
  const tamperedBody = Buffer.from(JSON.stringify({ id: 1, role: 'admin' })).toString('base64url');
  const tampered = `${h}.${tamperedBody}.${s}`;
  assert.equal(verifyToken(tampered), null);
});

test('verifyToken 拒绝过期 token', () => {
  // 手工构造已过期的 token（exp 为过去时间）
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ id: 1, role: 'teacher', iat: now - 100, exp: now - 50 })).toString('base64url');
  const data = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', process.env.JWT_SECRET || 'rural-ai-dev-secret-change-me').update(data).digest('base64url');
  const expired = `${data}.${sig}`;
  assert.equal(verifyToken(expired), null);
});

test('verifyToken 拒绝畸形 token', () => {
  assert.equal(verifyToken(''), null);
  assert.equal(verifyToken('not-a-token'), null);
  assert.equal(verifyToken('a.b'), null);
  assert.equal(verifyToken('a.b.c.d'), null);
});