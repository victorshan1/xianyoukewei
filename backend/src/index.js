/**
 * 乡村课堂AI助教平台 - 后端服务入口
 *
 * Express 服务器，提供 REST API。
 * 阶段0：骨架 + 健康检查 + 学生基础接口
 */

import express from 'express';
import path from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initSchema } from './db.js';
import { logAccess, logError } from './logger.js';

// 加载项目根目录下的 .env（不存在则忽略）
try {
  process.loadEnvFile(path.join(dirname(fileURLToPath(import.meta.url)), '..', '.env'));
} catch {
  // 无 .env 文件时使用系统环境变量，非致命
}
import { studentsRouter } from './routes/students.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { scoresRouter } from './routes/scores.js';
import { profilesRouter } from './routes/profiles.js';
import { lessonsRouter } from './routes/lessons.js';
import { qaRouter } from './routes/qa-records.js';
import { practiceRouter } from './routes/practice-records.js';
import { reportsRouter } from './routes/reports.js';
import { wrongAnswersRouter } from './routes/wrong-answers.js';
import { messagesRouter } from './routes/messages.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;
// 前端静态目录（项目根目录，即 backend 的上一级）
const FRONTEND_DIR = process.env.FRONTEND_DIR || path.join(__dirname, '..', '..');

// 中间件：解析 JSON 请求体（限制 10MB，容纳 base64 图片）
app.use(express.json({ limit: '10mb' }));

// 中间件：CORS，允许前端跨域调用
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// 简单请求日志（控制台 + 文件）
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`;
    console.log(`[${new Date().toISOString()}] ${line}`);
    // 注意：用 originalUrl 判断，req.path 在路由挂载后会被改写为相对路径
    if (req.originalUrl === '/api/health') return; // 健康检查不计入访问日志，避免刷屏
    logAccess(line);
  });
  next();
});

// 挂载路由
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/students', studentsRouter);
app.use('/api/scores', scoresRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/lessons', lessonsRouter);
app.use('/api/qa', qaRouter);
app.use('/api/practice', practiceRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/wrong-answers', wrongAnswersRouter);
app.use('/api/messages', messagesRouter);

// ============================================================
// 前端静态托管（同源部署：浏览器访问本服务即可同时获得页面和 API）
// 只放行前端资源路径，避免暴露 backend/、data/ 等敏感目录
// ============================================================
const ALLOWED_FRONTEND_PREFIXES = ['/index.html', '/css/', '/js/', '/pages/', '/sw.js', '/manifest', '/icons/', '/images/', '/favicon'];
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  const ok = req.path === '/'
    || ALLOWED_FRONTEND_PREFIXES.some((p) => req.path === p || req.path.startsWith(p));
  if (!ok) return res.status(404).json({ error: 'Not Found' });
  next();
});
app.use(express.static(FRONTEND_DIR));

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在', path: req.originalUrl });
});

// 统一错误处理
app.use((err, req, res, next) => {
  const line = `${req.method} ${req.originalUrl} ${err.status || 500} ${err.message}`;
  console.error('[ERROR]', err);
  logError(line);
  res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
});

// 初始化数据库结构后启动
initSchema();

const server = app.listen(PORT, () => {
  console.log(`✅ 乡村课堂AI助教 服务已启动: http://localhost:${PORT}`);
  console.log(`   网页入口: http://localhost:${PORT}/`);
  console.log(`   健康检查: http://localhost:${PORT}/api/health`);
});

// ============================================================
// 优雅停机：收到 SIGTERM/SIGINT 时停止接收新连接并关闭数据库
// ============================================================
async function shutdown(signal) {
  console.log(`\n收到 ${signal}，正在优雅停机...`);
  server.close(async () => {
    try {
      const { default: db } = await import('./db.js');
      db.close();
      console.log('✅ 数据库已关闭，服务已安全退出');
      process.exit(0);
    } catch (e) {
      console.error('[ERROR] 停机时关闭数据库失败:', e.message);
      process.exit(1);
    }
  });

  // 兜底：10 秒内未完成则强制退出
  setTimeout(() => {
    console.error('⏰ 优雅停机超时，强制退出');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));