/**
 * 数据库备份/恢复脚本
 *
 * 用法：
 *   node scripts/backup-db.mjs              # 备份当前数据库到 backups/
 *   node scripts/backup-db.mjs --keep 14     # 备份并仅保留最近 14 份
 *   node scripts/backup-db.mjs --restore <file>  # 从指定备份文件恢复
 *
 * SQLite 单文件，可直接安全复制（带 WAL 时先执行 checkpoint 保证一致性）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, '..', 'data', 'rural-ai.db');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

const args = process.argv.slice(2);
const keepIdx = args.indexOf('--keep');
const keep = keepIdx >= 0 ? Number(args[keepIdx + 1] || 10) : 10;
const restoreIdx = args.indexOf('--restore');

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function backup() {
  if (!fs.existsSync(DB_FILE)) {
    console.error(`❌ 数据库不存在：${DB_FILE}`);
    process.exit(1);
  }
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  // 执行一次 WAL checkpoint，确保数据文件包含全部已提交事务
  try {
    execFileSync('node', ['-e', `
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(process.argv[1]);
      db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
      db.close();
    `, DB_FILE]);
  } catch (e) {
    console.warn('[备份] WAL checkpoint 失败（忽略）:', e.message);
  }

  const file = path.join(BACKUP_DIR, `rural-ai-${stamp()}.db`);
  fs.copyFileSync(DB_FILE, file);
  console.log(`✅ 已备份到：${file}`);

  // 清理旧备份
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('rural-ai-') && f.endsWith('.db'))
    .sort();
  while (files.length > keep) {
    const removed = files.shift();
    fs.unlinkSync(path.join(BACKUP_DIR, removed));
    console.log(`  已删除旧备份：${removed}`);
  }
}

function restore(target) {
  if (!fs.existsSync(target)) {
    console.error(`❌ 备份文件不存在：${target}`);
    process.exit(1);
  }
  if (!fs.existsSync(DB_FILE)) {
    console.error(`❌ 目标数据库不存在：${DB_FILE}`);
    process.exit(1);
  }
  fs.copyFileSync(target, DB_FILE);
  console.log(`✅ 已从 ${target} 恢复数据库`);
}

if (restoreIdx >= 0) {
  const target = args[restoreIdx + 1];
  if (!target) {
    console.error('❌ --restore 需要指定备份文件路径');
    process.exit(1);
  }
  restore(target);
} else {
  backup();
}