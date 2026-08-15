/**
 * 日志模块 - 结构化日志写入文件
 *
 * 零依赖，使用 Node 内置 API：
 * - 访问日志与错误日志分文件存储
 * - 按日轮转（默认保留 7 天）
 * - export 当前日志路径，便于运维排查
 *
 * 日志目录：backend/logs/ （可通过环境变量 LOG_DIR 覆盖）
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '..', 'logs');
const KEEP_DAYS = Number(process.env.LOG_KEEP_DAYS || 7);

fs.mkdirSync(LOG_DIR, { recursive: true });

function dayStamp(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function fileFor(type) {
  return path.join(LOG_DIR, `${type}-${dayStamp()}.log`);
}

/**
 * 追加一行日志到指定类型文件
 * @param {string} type - 'access' | 'error'
 * @param {string} line - 已格式化的日志内容（不含时间戳）
 */
function append(type, line) {
  try {
    const time = new Date().toISOString();
    fs.appendFileSync(fileFor(type), `${time} ${line}\n`);
  } catch (e) {
    // 日志失败不应影响主流程
    console.error('[LOGGER] 写入日志失败:', e.message);
  }
}

/**
 * 清理过期的日志文件
 */
function cleanup() {
  try {
    const cutoff = Date.now() - KEEP_DAYS * 24 * 3600 * 1000;
    for (const f of fs.readdirSync(LOG_DIR)) {
      const m = f.match(/^(access|error)-(\d{4}-\d{2}-\d{2})\.log$/);
      if (!m) continue;
      const t = new Date(m[2] + 'T00:00:00Z').getTime();
      if (t < cutoff) {
        fs.unlinkSync(path.join(LOG_DIR, f));
      }
    }
  } catch (e) {
    console.error('[LOGGER] 清理日志失败:', e.message);
  }
}

/**
 * 记录一条访问日志
 * @param {string} line - 如 "GET /api/health 200 5ms"
 */
export function logAccess(line) {
  append('access', line);
}

/**
 * 记录一条错误日志
 * @param {string} line - 如 "POST /api/scores 500 服务器内部错误"
 */
export function logError(line) {
  append('error', line);
}

/**
 * 供健康检查返回当前日志目录
 */
export function getLogDir() {
  return LOG_DIR;
}

// 启动时清理一次过期日志
cleanup();