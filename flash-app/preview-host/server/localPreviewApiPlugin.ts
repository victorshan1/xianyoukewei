import { mkdirSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import type {
  LocalPreviewDatabase,
  LocalDbRequest,
} from './localPreviewDatabase';
import { validateDatabaseProject } from '../../scripts/database-contract.mjs';

const DB_API_PATH = '/__lingguang__/db';
const MAX_BODY_BYTES = 32 * 1024 * 1024;

type UnknownRecord = Record<string, unknown>;

function toRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : {};
}

function parseDbRequest(value: unknown): LocalDbRequest | null {
  const record = toRecord(value);
  const sql = record['sql'];
  const binds = record['binds'];
  const timeoutMs = record['timeoutMs'];
  if (typeof sql !== 'string' || sql.trim() === '') {
    return null;
  }
  if (binds !== undefined && !Array.isArray(binds)) {
    return null;
  }
  if (timeoutMs !== undefined && typeof timeoutMs !== 'number') {
    return null;
  }
  return {
    sql,
    ...(Array.isArray(binds) ? { binds } : {}),
    ...(typeof timeoutMs === 'number' ? { timeoutMs } : {}),
  };
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    request.on('data', (chunk: unknown) => {
      if (!(chunk instanceof Uint8Array)) {
        reject(new TypeError('Unsupported request body chunk'));
        return;
      }
      totalBytes += chunk.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        reject(new Error('Request body is too large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.once('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(body) as unknown);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
    request.once('error', (error: Error) => {
      reject(error);
    });
  });
}

function sendJson(response: ServerResponse, statusCode: number, value: unknown): void {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(value));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function localPreviewApiPlugin(projectRoot: string): Plugin {
  const localDataDirectory = join(projectRoot, '.local-preview');
  const databasePath = join(localDataDirectory, 'app.sqlite');
  let localDatabase: LocalPreviewDatabase | undefined;

  return {
    name: 'local-preview-api',
    apply: 'serve',
    async configureServer(server) {
      mkdirSync(localDataDirectory, { recursive: true });
      const { LocalPreviewDatabase: LocalPreviewDatabaseConstructor } = await import(
        './localPreviewDatabase'
      );
      const databaseBundle = validateDatabaseProject({ projectRoot });
      localDatabase = new LocalPreviewDatabaseConstructor({
        databasePath,
        databaseBundle,
      });
      console.info('[local-preview] SQLite ready', {
        databasePath,
        migrations: localDatabase.migrationIds,
      });

      server.httpServer?.once('close', () => {
        localDatabase?.close();
        localDatabase = undefined;
      });

      server.middlewares.use((request, response, next) => {
        const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
        if (requestUrl.pathname !== DB_API_PATH) {
          next();
          return;
        }
        if (request.method !== 'POST') {
          sendJson(response, 405, { message: 'Method not allowed' });
          return;
        }

        void readJsonBody(request)
          .then((bodyValue) => {
            const body = toRecord(bodyValue);
            const action = body['action'];
            const dbRequest = parseDbRequest(body['request']);
            if (
              (action !== 'lingguang.db.query' && action !== 'lingguang.db.execute') ||
              dbRequest === null
            ) {
              sendJson(response, 400, { message: 'Invalid local DB request' });
              return;
            }
            if (localDatabase === undefined) {
              sendJson(response, 503, { message: 'Local database is unavailable' });
              return;
            }

            const result =
              action === 'lingguang.db.query'
                ? localDatabase.query(dbRequest)
                : localDatabase.execute(dbRequest);
            sendJson(response, 200, result);
          })
          .catch((error: unknown) => {
            sendJson(response, 500, { message: getErrorMessage(error) });
          });
      });
    },
  };
}
