/**
 * 限流中间件 - 内存版固定窗口限流
 *
 * 零依赖，使用 Node 内置数据结构。用于防暴力破解、防脚本刷接口。
 *
 * 用法：
 *   router.post('/login', rateLimit({ windowMs: 60_000, max: 20 }), handler)
 *
 * 触发限流时返回 429，并在响应头中标注剩余时间，便于客户端退避重试。
 */

/**
 * 创建限流中间件
 * @param {object} opts
 * @param {number} opts.windowMs - 窗口时长（毫秒），默认 60_000（1 分钟）
 * @param {number} opts.max - 窗口内允许的最大请求数，默认 20
 * @param {string} [opts.keyFn] - 自定义 key 提取函数，默认取客户端 IP
 * @param {string} [opts.name] - 限流名称，用于日志
 */
export function rateLimit({ windowMs = 60_000, max = 20, keyFn, name = 'rate-limit' } = {}) {
  // 滑动窗口记录：key -> { count, resetAt }
  const buckets = new Map();

  // 定期清理过期窗口，避免内存无限增长
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }, Math.max(windowMs, 60_000)).unref();

  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : (req.ip || req.socket.remoteAddress || 'unknown');
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      // 新窗口
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(max - 1));
      return next();
    }

    if (bucket.count >= max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', '0');
      return res.status(429).json({ error: `请求过于频繁，请 ${retryAfter} 秒后再试` });
    }

    bucket.count += 1;
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(max - bucket.count));
    next();
  };
}

/**
 * 认证接口专用限流：登录/注册，防暴力破解
 * 可通过环境变量调整：RATE_LIMIT_WINDOW_MS、RATE_LIMIT_MAX
 */
export const authRateLimit = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_MAX || 30),
  name: 'auth'
});