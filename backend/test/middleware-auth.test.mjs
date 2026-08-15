/**
 * middleware/auth.js 单元测试
 * 覆盖：requireAuth 鉴权、requireRole 角色权限
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireAuth, requireRole } from '../src/middleware/auth.js';
import { signToken } from '../src/security.js';

/** 构造 res 桩，捕获 status + json */
function makeRes() {
  const res = {
    _status: 200,
    _body: null,
    status(code) {
      res._status = code;
      return this;
    },
    json(obj) {
      res._body = obj;
      return this;
    }
  };
  return res;
}

test('requireAuth：无 token 返回 401', () => {
  const req = { headers: {} };
  const res = makeRes();
  let nextCalled = false;
  requireAuth(req, res, () => { nextCalled = true; });
  assert.equal(res._status, 401);
  assert.equal(nextCalled, false);
});

test('requireAuth：token 前缀错误返回 401', () => {
  const req = { headers: { authorization: 'Basic abc' } };
  const res = makeRes();
  requireAuth(req, res, () => {});
  assert.equal(res._status, 401);
});

test('requireAuth：无效 token 返回 401', () => {
  const req = { headers: { authorization: 'Bearer invalid.token.value' } };
  const res = makeRes();
  requireAuth(req, res, () => {});
  assert.equal(res._status, 401);
});

test('requireAuth：有效 token 注入 req.user 并放行', () => {
  const token = signToken({ id: 5, role: 'teacher' });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = makeRes();
  let nextCalled = false;
  requireAuth(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.user.id, 5);
  assert.equal(req.user.role, 'teacher');
});

test('requireRole：允许的角色放行', () => {
  const mw = requireRole('teacher');
  const req = { user: { role: 'teacher' } };
  const res = makeRes();
  let nextCalled = false;
  mw(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('requireRole：多角色之一放行', () => {
  const mw = requireRole('student', 'parent');
  const req = { user: { role: 'parent' } };
  const res = makeRes();
  let nextCalled = false;
  mw(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('requireRole：无 req.user 返回 401', () => {
  const mw = requireRole('teacher');
  const req = {};
  const res = makeRes();
  mw(req, res, () => {});
  assert.equal(res._status, 401);
});

test('requireRole：角色不符返回 403', () => {
  const mw = requireRole('teacher');
  const req = { user: { role: 'student' } };
  const res = makeRes();
  let nextCalled = false;
  mw(req, res, () => { nextCalled = true; });
  assert.equal(res._status, 403);
  assert.equal(nextCalled, false);
});