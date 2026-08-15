type UnknownRecord = Record<string, unknown>;

type LocalDbAction = 'lingguang.db.query' | 'lingguang.db.execute';

function toRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : {};
}

export async function callLocalDatabase(
  action: LocalDbAction,
  payload: unknown,
): Promise<unknown> {
  const payloadRecord = toRecord(payload);
  const response = await fetch('/__lingguang__/db', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action,
      request: toRecord(payloadRecord['req']),
    }),
  });
  const result = (await response.json()) as unknown;
  if (!response.ok) {
    const resultRecord = toRecord(result);
    const message = resultRecord['message'];
    throw new Error(typeof message === 'string' ? message : `Local DB HTTP ${String(response.status)}`);
  }
  return result;
}
