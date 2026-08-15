/**
 * rate-limit.js 单元测试
 * 覆盖：窗口内放行、超限 429、窗口重置、不同 key 独立、响应头
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimit } from '../src/rate-limit.js';

/** 构造一个最小 express 风格的 req/res 桩 */
function makeCtx(key) {
  const req = { ip: key, socket: { remoteAddress: key } };
  const headers = {};
  const res = {
    setHeader: (k, v) => { headers[k] = v; },
    status: (code) => {
      let body;
      return {
        json: (obj) => { body = obj; res._status = code; res._body = obj; }
      };
    },
    _status: 200,
    _body: null,
    _headers: headers
  };
  return { req, res };
}

test('窗口内未超限时全部放行', () => {
  const mw = rateLimit({ windowMs: 60_000, max: 3 });
  for (let i = 0; i < 3; i++) {
    const { req, res } = makeCtx('ip-A');
    let called = false;
    mw(req, res, () => { called = true; });
    assert.equal(called, true, `第 ${i + 1} 次应放行`);
    assert.equal(res._status, 200);
  }
});

test('超过 max 后返回 429', () => {
  const mw = rateLimit({ windowMs: 60_000, max: 2 });
  const { req, res } = makeCtx('ip-B');
  // 前 2 次放行
  mw(req, res, () => {});
  mw(req, res, () => {});
  // 第 3 次应 429
  mw(req, res, () => {});
  assert.equal(res._status, 429);
  assert.match(res._body.error, /过于频繁/);
  assert.ok(res._headers['Retry-After'], '应返回 Retry-After');
});

test('窗口过期后计数重置', () => {
  const mw = rateLimit({ windowMs: 50, max: 1 });
  const { req, res } = makeCtx('ip-C');
  mw(req, res, () => {});
  mw(req, res, () => {});
  assert.equal(res._status, 429, '短窗口内应被限');
});

test('不同 key 限流计数相互独立', () => {
  const mw = rateLimit({ windowMs: 60_000, max: 1 });
  const ctxA = makeCtx('ip-D');
  const ctxB = makeCtx('ip-E');

  mw(ctxA.req, ctxA.res, () => {});
  mw(ctxA.req, ctxA.res, () => {}); // A 已超限
  assert.equal(ctxA.res._status, 429);

  mw(ctxB.req, ctxB.res, () => {}); // B 不受影响
  assert.equal(ctxB.res._status, 200);
});

test('通过自定义 keyFn 提取 key', () => {
  const mw = rateLimit({ windowMs: 60_000, max: 1, keyFn: (req) => req.userId });
  const req = { userId: 'u-1' };
  const r1 = makeCtx('ignored').res;
  const r2 = makeCtx('ignored').res;
  mw(req, r1, () => {});
  mw(req, r2, () => {});
  assert.equal(r2._status, 429);
});

test('响应头包含剩余额度', () => {
  const mw = rateLimit({ windowMs: 60_000, max: 5 });
  const { req, res } = makeCtx('ip-F');
  mw(req, res, () => {});
  assert.equal(res._headers['X-RateLimit-Limit'], '5');
  assert.equal(res._headers['X-RateLimit-Remaining'], '4');
});