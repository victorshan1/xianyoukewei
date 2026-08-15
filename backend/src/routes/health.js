/**
 * 健康检查接口 - 验证后端与数据库是否正常运行
 * 供负载均衡/容器编排（类似 Docker HEALTHCHECK）探活使用
 */
import { Router } from 'express';
import db from '../db.js';
import { getLogDir } from '../logger.js';

export const healthRouter = Router();

const STARTED_AT = new Date();

healthRouter.get('/', (req, res) => {
  let dbOk = false;
  let dbError = null;
  try {
    db.prepare('SELECT 1 AS ok').get();
    dbOk = true;
  } catch (e) {
    dbError = e.message;
  }

  // 探活：数据库不可用时返回 503，便于编排层摘除实例
  const status = dbOk ? 'ok' : 'degraded';
  res.status(dbOk ? 200 : 503).json({
    status,
    service: '乡村课堂AI助教后端',
    version: '0.1.0',
    uptime: Math.floor(process.uptime()),
    startedAt: STARTED_AT.toISOString(),
    time: new Date().toISOString(),
    database: { ok: dbOk, error: dbError },
    logDir: getLogDir(),
    env: process.env.NODE_ENV || 'development'
  });
});