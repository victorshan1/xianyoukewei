import type { CandyJar } from '../runtime/types';
import { createImageMock } from './imageMock';
import { callLocalDatabase } from './localDbClient';

type UnknownRecord = Record<string, unknown>;
const STORAGE_PREFIX = 'lingguang-local-preview:';

function toRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : {};
}

function toStorageKey(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function getStorageKey(value: unknown): string {
  return `${STORAGE_PREFIX}${toStorageKey(value)}`;
}

function setStorageItem(key: unknown, value: unknown): boolean {
  const serialized = JSON.stringify(value === undefined ? null : value);
  window.localStorage.setItem(getStorageKey(key), serialized);
  return true;
}

function getStorageItem(key: unknown): unknown {
  const serialized = window.localStorage.getItem(getStorageKey(key));
  return serialized === null ? null : (JSON.parse(serialized) as unknown);
}

function removeStorageItem(key: unknown): boolean {
  window.localStorage.removeItem(getStorageKey(key));
  return true;
}

function clearStorage(): boolean {
  const keys = Array.from({ length: window.localStorage.length }, (_, index) =>
    window.localStorage.key(index),
  ).filter((key): key is string => key !== null && key.startsWith(STORAGE_PREFIX));
  for (const key of keys) {
    window.localStorage.removeItem(key);
  }
  return true;
}

function resolveRemoteSkill(
  imageMock: ReturnType<typeof createImageMock>,
  params: unknown,
): unknown {
  const paramsRecord = toRecord(params);
  const action = paramsRecord['action'];
  const payload = toRecord(paramsRecord['payload']);

  switch (action) {
    case 'lingguang.storage.setItem':
      return setStorageItem(payload['key'], payload['value']);
    case 'lingguang.storage.getItem':
      return getStorageItem(payload['key']);
    case 'lingguang.storage.removeItem':
      return removeStorageItem(payload['key']);
    case 'lingguang.storage.clear':
      return clearStorage();
    case 'lingguang.db.query':
    case 'lingguang.db.execute':
      return callLocalDatabase(action, payload);
    case 'lingguang.db.role':
      return { role: 'USER' };
    case 'lingguang.chooseImage':
      return imageMock.chooseImage(payload);
    case 'lingguang.uploadImage':
      return imageMock.uploadImage(payload);
    default:
      return {
        success: true,
        mocked: true,
        action: typeof action === 'string' ? action : 'unknown',
      };
  }
}

function resolveCandyJarCall(
  imageMock: ReturnType<typeof createImageMock>,
  namespace: string,
  method: string,
  params: unknown,
): unknown {
  if (namespace === 'FlashApp' && method === 'remoteSkill') {
    return resolveRemoteSkill(imageMock, params);
  }
  if (namespace === 'FlashApp' && method === 'getSettings') {
    return { enableRemix: true };
  }
  if (namespace === 'FlashApp' && method === 'getSceneContext') {
    return { scene: 'localPreview' };
  }
  if (namespace === 'Env' && method === 'canIUse') {
    return { available: true };
  }
  return { success: true, mocked: true, namespace, method };
}

export function createMockCandyJar(): CandyJar {
  const imageMock = createImageMock();

  return {
    call(namespace, method, params, successCallback, errorCallback) {
      console.info('[LOCAL APP-SHELL] CandyJar.call', {
        namespace,
        method,
        params,
      });

      queueMicrotask(() => {
        Promise.resolve(resolveCandyJarCall(imageMock, namespace, method, params)).then(
          (result) => successCallback?.(result),
          (error: unknown) => errorCallback?.(error),
        );
      });
    },
  };
}
