/**
 * 一键测试编排
 *
 * 启动后端 → 等待就绪 → 依次运行 smoke + sync 测试 → 优雅停机后退出。
 *
 * 用法：npm test
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const BASE = `http://localhost:${PORT}`;

function waitForServer(host, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(host + '/api/health');
        if (res.ok) return resolve();
      } catch { /* 未就绪，继续等 */ }
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`服务 ${host} 启动超时`));
      }
      setTimeout(tick, 500);
    };
    tick();
  });
}

function runScript(name) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(__dirname, name)], {
      stdio: 'inherit',
      env: { ...process.env, PORT: String(PORT) }
    });
    child.on('exit', (code) => resolve(code || 0));
  });
}

const server = spawn(process.execPath, ['src/index.js'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' }
});

let failed = false;
try {
  await waitForServer(BASE);
  console.log(`\n✅ 后端已就绪：${BASE}`);

  const smoke = await runScript('smoke-test.mjs');
  if (smoke !== 0) failed = true;

  const sync = await runScript('frontend-sync-test.mjs');
  if (sync !== 0) failed = true;

  console.log(`\n========== 整体测试结果：${failed ? '存在失败' : '全部通过'} ==========`);
} catch (e) {
  console.error('[测试] 失败:', e.message);
  failed = true;
} finally {
  // 优雅停机（顺带验证 SIGTERM 处理）
  server.kill('SIGTERM');
  await new Promise((r) => server.on('exit', r));
}

process.exit(failed ? 1 : 0);