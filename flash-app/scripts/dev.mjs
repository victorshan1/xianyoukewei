import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const HOST = '127.0.0.1';
const APP_PORT_START = 5173;
const PREVIEW_PORT_START = 4173;
const START_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 100;
const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const previewConfig = fileURLToPath(
  new URL('../preview-host/vite.config.ts', import.meta.url),
);

const children = new Set();
let shuttingDown = false;

function startService(args, env = {}) {
  const child = spawn(process.execPath, [viteBin, ...args], {
    env: {
      ...process.env,
      ...env,
    },
    stdio: 'inherit',
  });
  children.add(child);
  child.once('exit', (code, signal) => {
    children.delete(child);
    if (!shuttingDown) {
      const reason = signal ? `signal ${signal}` : `code ${String(code)}`;
      console.error(`[local-preview] service stopped unexpectedly (${reason})`);
      shutdown(code ?? 1);
    }
  });
  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    child.kill('SIGTERM');
  }
  process.exitCode = exitCode;
}

function findAvailablePort(startPort, excludedPorts = new Set()) {
  if (excludedPorts.has(startPort)) {
    return findAvailablePort(startPort + 1, excludedPorts);
  }

  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1, excludedPorts));
        return;
      }
      reject(error);
    });
    server.listen({ host: HOST, port: startPort }, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : startPort;
      server.close(() => resolve(port));
    });
  });
}

async function waitForUrl(url) {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The app server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

process.once('SIGINT', () => shutdown(0));
process.once('SIGTERM', () => shutdown(0));

try {
  const appPort = await findAvailablePort(APP_PORT_START);
  const previewPort = await findAvailablePort(PREVIEW_PORT_START, new Set([appPort]));
  const appUrl = `http://${HOST}:${String(appPort)}/`;

  startService(['--host', HOST, '--port', String(appPort), '--strictPort']);
  await waitForUrl(appUrl);
  startService(['--config', previewConfig], {
    LOCAL_PREVIEW_PORT: String(previewPort),
    VITE_LOCAL_APP_URL: appUrl,
  });
} catch (error) {
  console.error('[local-preview] failed to start:', error);
  shutdown(1);
}
