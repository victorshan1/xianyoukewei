/**
 * 乡村课堂AI助教平台 - 后端数据库模块
 *
 * 使用 Node.js 内置的 node:sqlite（Node 22.5+ 支持），无需安装额外数据库驱动。
 * SQLite 单文件数据库，零配置，适合本项目从演示到小规模使用。
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const DB_FILE = join(DATA_DIR, 'rural-ai.db');

// 确保数据目录存在
mkdirSync(DATA_DIR, { recursive: true });

// 打开数据库（单例）
const db = new DatabaseSync(DB_FILE);

// 开启外键约束
db.exec('PRAGMA foreign_keys = ON;');

/**
 * 初始化数据表结构
 * 与前端 IndexedDB 的 8 个数据模型一一对应，并新增用户、班级表用于三端互通
 */
export function initSchema() {
  db.exec(`
    -- ============================================================
    -- 用户表：教师 / 学生 / 家长
    -- ============================================================
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT UNIQUE NOT NULL,          -- 登录账号
      password   TEXT NOT NULL,                 -- 密码（后续改为哈希存储）
      role       TEXT NOT NULL CHECK(role IN ('teacher','student','parent')),
      name       TEXT,
      phone      TEXT,
      class_id   INTEGER,                       -- 教师/学生绑定的班级
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 班级表
    -- ============================================================
    CREATE TABLE IF NOT EXISTS classes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      grade       TEXT,
      teacher_id  INTEGER,
      school_name TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 学生表（对应前端 students store）
    -- ============================================================
    CREATE TABLE IF NOT EXISTS students (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER,                       -- 关联用户（学生已注册时）
      name       TEXT NOT NULL,
      grade      TEXT,
      class_name TEXT,
      class_id   INTEGER,
      student_no TEXT,
      gender     TEXT,
      avatar     TEXT,
      note       TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 成绩表（对应前端 scores store）
    -- ============================================================
    CREATE TABLE IF NOT EXISTS scores (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id      INTEGER NOT NULL,
      subject         TEXT,
      type            TEXT,
      score           REAL,
      max_score       REAL,
      knowledge_points TEXT,
      date            TEXT,
      created_by      INTEGER,
      created_at      TEXT DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 学生画像表（对应前端 profiles store）
    -- ============================================================
    CREATE TABLE IF NOT EXISTS profiles (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id  INTEGER NOT NULL,
      dimensions  TEXT,      -- JSON 数组
      attribution TEXT,      -- JSON 对象
      suggestions TEXT,      -- JSON 数组
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 教案表（对应前端 lessons store）
    -- ============================================================
    CREATE TABLE IF NOT EXISTS lessons (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id      INTEGER,
      subject         TEXT,
      grade           TEXT,
      topic           TEXT,
      content         TEXT,
      homework_levels TEXT,   -- JSON 对象 {basic,advanced,extended}
      class_id        INTEGER,
      created_at      TEXT DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 答疑记录表（对应前端 qa_records store）
    -- ============================================================
    CREATE TABLE IF NOT EXISTS qa_records (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id       INTEGER NOT NULL,
      image_url        TEXT,
      question         TEXT,
      answer           TEXT,
      steps            TEXT,
      knowledge_points TEXT,
      created_at       TEXT DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 练习记录表（对应前端 practice_records store）
    -- ============================================================
    CREATE TABLE IF NOT EXISTS practice_records (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id       INTEGER NOT NULL,
      knowledge_point  TEXT,
      difficulty       INTEGER,
      total_questions  INTEGER,
      correct_count    INTEGER,
      time_spent       INTEGER,
      created_at       TEXT DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 学情报告表（对应前端 reports store）
    -- ============================================================
    CREATE TABLE IF NOT EXISTS reports (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id  INTEGER NOT NULL,
      type        TEXT,
      start_date  TEXT,
      end_date    TEXT,
      data        TEXT,      -- JSON 对象
      created_by  INTEGER,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 错题本表（对应前端 wrong_answers store）
    -- ============================================================
    CREATE TABLE IF NOT EXISTS wrong_answers (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id      INTEGER NOT NULL,
      subject         TEXT,
      question        TEXT,
      student_answer  TEXT,
      correct_answer  TEXT,
      analysis        TEXT,
      knowledge_point TEXT,
      status          TEXT DEFAULT 'unmastered',
      created_at      TEXT DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- 家长-孩子关联表：实现家长绑定孩子、查看孩子数据
    -- ============================================================
    CREATE TABLE IF NOT EXISTS parent_students (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_user_id  INTEGER NOT NULL,
      student_id      INTEGER NOT NULL,
      relation        TEXT DEFAULT 'parent',   -- 与孩子的关系
      created_at      TEXT DEFAULT (datetime('now')),
      UNIQUE(parent_user_id, student_id)
    );

    -- ============================================================
    -- 家校沟通消息表：教师 <-> 家长 围绕某学生的对话
    -- ============================================================
    CREATE TABLE IF NOT EXISTS messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id  INTEGER NOT NULL,             -- 消息关联的学生
      sender_id   INTEGER NOT NULL,             -- 发送者用户ID
      sender_role TEXT NOT NULL CHECK(sender_role IN ('teacher','parent')),
      receiver_id INTEGER,                      -- 接收者用户ID（教师端为班级教师，可为空表示班级教师）
      content     TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    -- 常用索引
    CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
    CREATE INDEX IF NOT EXISTS idx_scores_student ON scores(student_id);
    CREATE INDEX IF NOT EXISTS idx_qa_student ON qa_records(student_id);
    CREATE INDEX IF NOT EXISTS idx_practice_student ON practice_records(student_id);
    CREATE INDEX IF NOT EXISTS idx_wrong_student ON wrong_answers(student_id);
    CREATE INDEX IF NOT EXISTS idx_parent_student ON parent_students(student_id);
    CREATE INDEX IF NOT EXISTS idx_messages_student ON messages(student_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
  `);

  // ============================================================
  // 幂等迁移：为已存在的表补充新列（CREATE TABLE IF NOT EXISTS 不会改已有表）
  // ============================================================
  migrateColumn('classes', 'invite_code', 'invite_code TEXT');
  migrateColumn('users', 'security_question', 'security_question TEXT');
  migrateColumn('users', 'security_answer', 'security_answer TEXT');
}

/**
 * 幂等地为表添加一列（若列已存在则跳过）
 * @param {string} table
 * @param {string} column
 * @param {string} ddl - 如 "invite_code TEXT"
 */
function migrateColumn(table, column, ddl) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
      console.log(`[DB] 迁移：${table}.${column} 已添加`);
    }
  } catch (e) {
    console.warn(`[DB] 迁移 ${table}.${column} 失败:`, e.message);
  }
}

export default db;