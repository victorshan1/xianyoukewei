import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { localPreviewApiPlugin } from './server/localPreviewApiPlugin';

const configuredPort = Number.parseInt(process.env['LOCAL_PREVIEW_PORT'] ?? '', 10);
const port = Number.isInteger(configuredPort) ? configuredPort : 4173;
const configuredProjectRoot = process.env['LOCAL_PREVIEW_PROJECT_ROOT'];
const projectRoot =
  configuredProjectRoot === undefined
    ? fileURLToPath(new URL('..', import.meta.url))
    : resolve(configuredProjectRoot);

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [localPreviewApiPlugin(projectRoot), react()],
  server: {
    host: '127.0.0.1',
    port,
    strictPort: true,
    open: true,
  },
});
