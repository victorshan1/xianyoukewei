type UnknownRecord = Record<string, unknown>;

export type ApiRequestMessage = {
  type: 'API';
  id: string;
  action: string;
  payload: unknown;
};

export type CandyJarCallMessage = {
  type: 'CANDYJAR_CALL';
  callId: string;
  method: string;
  action: string;
  params: unknown;
};

export type RuntimeReadyMessage = {
  type: 'FLASH_APP_DOM_CONTENT_LOADED';
};

export type AppMessage = ApiRequestMessage | CandyJarCallMessage | RuntimeReadyMessage;

function toRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : null;
}

function getString(record: UnknownRecord, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value !== '' ? value : null;
}

export function parseAppMessage(value: unknown): AppMessage | null {
  const record = toRecord(value);
  if (record === null) return null;

  const type = getString(record, 'type');
  if (type === 'FLASH_APP_DOM_CONTENT_LOADED') {
    return { type };
  }

  if (type === 'API') {
    const id = getString(record, 'id');
    const action = getString(record, 'action');
    if (id === null || action === null) return null;
    return {
      type,
      id,
      action,
      payload: record['payload'],
    };
  }

  if (type === 'CANDYJAR_CALL') {
    const callId = getString(record, 'callId');
    const method = getString(record, 'method');
    const action = getString(record, 'action');
    if (callId === null || method === null || action === null) return null;
    return {
      type,
      callId,
      method,
      action,
      params: record['params'],
    };
  }

  return null;
}
