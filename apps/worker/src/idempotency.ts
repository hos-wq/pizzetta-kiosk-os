import { ApiError, D1Repository, now } from './repository';

export type MutationRecord = {
  id: string;
  idempotency_key: string;
  actor: string;
  operation: string;
  request_hash: string;
  status: 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED';
  response_status?: number | null;
  response_json?: string | null;
};

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, stableValue(item)]));
  return value;
};

export const requestHash = async (value: unknown) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(stableValue(value))));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};

export type MutationReservation = { kind: 'NEW'; id: string } | { kind: 'REPLAY'; status: number; body: unknown };

export async function beginMutation(repo: D1Repository, actor: string, operation: string, key: string | null | undefined, input: unknown): Promise<MutationReservation | null> {
  if (!key) return null;
  const normalized = key.trim();
  if (!normalized || normalized.length > 200) throw new ApiError(400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key must be between 1 and 200 characters');
  const hash = await requestHash(input);
  const existing = await repo.first('SELECT * FROM mutation_requests WHERE actor=? AND operation=? AND idempotency_key=?', actor, operation, normalized) as MutationRecord | null;
  if (existing) {
    if (existing.request_hash !== hash) throw new ApiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency-Key was already used for a different request');
    if (existing.status === 'SUCCEEDED' && existing.response_json) return { kind: 'REPLAY', status: Number(existing.response_status ?? 200), body: JSON.parse(existing.response_json) };
    if (existing.status === 'IN_PROGRESS') throw new ApiError(409, 'IDEMPOTENCY_IN_PROGRESS', 'An identical mutation is already in progress');
    await repo.run("UPDATE mutation_requests SET status='IN_PROGRESS',response_status=NULL,response_json=NULL,completed_at=NULL WHERE id=? AND status='FAILED'", existing.id);
    return { kind: 'NEW', id: existing.id };
  }
  const id = crypto.randomUUID();
  try {
    await repo.run('INSERT INTO mutation_requests (id,idempotency_key,actor,operation,request_hash,status,created_at) VALUES (?,?,?,?,?,?,?)', id, normalized, actor, operation, hash, 'IN_PROGRESS', now());
    return { kind: 'NEW', id };
  } catch {
    const raced = await repo.first('SELECT * FROM mutation_requests WHERE actor=? AND operation=? AND idempotency_key=?', actor, operation, normalized) as MutationRecord | null;
    if (raced?.request_hash === hash && raced.status === 'SUCCEEDED' && raced.response_json) return { kind: 'REPLAY', status: Number(raced.response_status ?? 200), body: JSON.parse(raced.response_json) };
    throw new ApiError(409, raced?.request_hash === hash ? 'IDEMPOTENCY_IN_PROGRESS' : 'IDEMPOTENCY_KEY_REUSED', raced?.request_hash === hash ? 'An identical mutation is already in progress' : 'Idempotency-Key was already used for a different request');
  }
}

export async function completeMutation(repo: D1Repository, id: string, status: number, body: unknown) {
  const serialized = JSON.stringify(body);
  if (serialized.length > 200000) throw new ApiError(500, 'IDEMPOTENCY_RESPONSE_TOO_LARGE', 'Mutation response is too large to replay safely');
  await repo.run("UPDATE mutation_requests SET status='SUCCEEDED',response_status=?,response_json=?,completed_at=? WHERE id=? AND status='IN_PROGRESS'", status, serialized, now(), id);
}

export async function failMutation(repo: D1Repository, id: string) {
  await repo.run("UPDATE mutation_requests SET status='FAILED',completed_at=? WHERE id=? AND status='IN_PROGRESS'", now(), id);
}
