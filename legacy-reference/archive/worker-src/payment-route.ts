import { paymentCreateSchema } from '../../../packages/contracts/src';
import { ApiError, D1Repository, now } from './repository';
import { parseJson } from './domain';
import { beginMutation, completeMutation, failMutation } from './idempotency';
import { paymentPostingStatements } from './accounting';

const response = (data: unknown, status = 200) => Response.json({ data }, { status });

export async function createPaymentRoute(repo: D1Repository, request: Request, actor: string) {
  const raw = await parseJson(request);
  const parsed = paymentCreateSchema.safeParse(raw);
  if (!parsed.success) throw new ApiError(422, 'VALIDATION_ERROR', 'Validation failed', parsed.error.flatten());
  const body = parsed.data;
  const key = request.headers.get('Idempotency-Key');
  if (!key?.trim()) throw new ApiError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key is required for payment creation');
  const mutation = await beginMutation(repo, actor, 'payment.create', key, body);
  if (mutation?.kind === 'REPLAY') return new Response(JSON.stringify(mutation.body), { status: mutation.status, headers: { 'content-type': 'application/json; charset=utf-8' } });
  try {
    const tenancy = await repo.first('SELECT id,unit_id,person_id FROM tenancies WHERE id=?', body.tenancy_id);
    if (!tenancy) throw new ApiError(404, 'NOT_FOUND', 'Tenancy not found');
    const id = crypto.randomUUID();
    const timestamp = now();
    const paidAt = body.status === 'PAID' ? (body.paid_at ?? timestamp) : body.paid_at ?? null;
    const base = [id, body.tenancy_id, body.due_date, body.amount_centavos, body.type, body.status, paidAt, body.method ?? null, body.notes ?? null, null, timestamp, timestamp];
    let result: Record<string, unknown> | null;
    if (body.status === 'PAID') {
      const posting = await paymentPostingStatements(repo, { payment_id: id, tenancy_id: String(tenancy.id), unit_id: String(tenancy.unit_id), person_id: tenancy.person_id ? String(tenancy.person_id) : null, amount_centavos: body.amount_centavos, type: body.type, method: body.method ?? null, paid_at: paidAt!, actor });
      base[9] = posting.entryId;
      const statements = [{ sql: 'INSERT INTO payments (id,tenancy_id,due_date,amount_centavos,type,status,paid_at,method,notes,journal_entry_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', args: base }, ...posting.statements.filter(statement => !statement.sql.startsWith('UPDATE payments')), { sql: 'INSERT INTO audit_log (id,action,entity_type,entity_id,payload_json,occurred_at) VALUES (?,?,?,?,?,?)', args: [crypto.randomUUID(), 'CREATE', 'payment', id, JSON.stringify({ type: body.type, amount_centavos: body.amount_centavos, journal_entry_id: posting.entryId, actor }), timestamp] }];
      await repo.batch(statements);
    } else {
      await repo.batch([{ sql: 'INSERT INTO payments (id,tenancy_id,due_date,amount_centavos,type,status,paid_at,method,notes,journal_entry_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', args: base }, { sql: 'INSERT INTO audit_log (id,action,entity_type,entity_id,payload_json,occurred_at) VALUES (?,?,?,?,?,?)', args: [crypto.randomUUID(), 'CREATE', 'payment', id, JSON.stringify({ type: body.type, amount_centavos: body.amount_centavos, actor }), timestamp] }]);
    }
    result = await repo.first('SELECT * FROM payments WHERE id=?', id);
    const payload = { data: result };
    if (mutation?.kind === 'NEW') await completeMutation(repo, mutation.id, 201, payload);
    return response(result, 201);
  } catch (error) {
    if (mutation?.kind === 'NEW') await failMutation(repo, mutation.id);
    throw error;
  }
}
