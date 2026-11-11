import { ApiError, now } from './repository';

type Repo = {
  all(sql: string, ...args: unknown[]): Promise<Record<string, unknown>[]>;
  first(sql: string, ...args: unknown[]): Promise<Record<string, unknown> | null>;
  run(sql: string, ...args: unknown[]): Promise<unknown>;
  batch?(statements: Array<{ sql: string; args?: unknown[] }>): Promise<unknown>;
  audit(action: string, entityType: string, entityId: string, payload: unknown): Promise<void>;
};

const money = (value: unknown) => Math.max(0, Number(value ?? 0));

export async function settlementClosureSummary(repo: Repo, tenancyId: string) {
  const tenancy = await repo.first('SELECT id,unit_id,person_id,security_deposit_centavos FROM tenancies WHERE id=?', tenancyId);
  if (!tenancy) throw new ApiError(404, 'NOT_FOUND', 'Tenancy not found');
  const checkout = await repo.first('SELECT id,settlement_state,settlement_status FROM tenancy_checkouts WHERE tenancy_id=?', tenancyId);
  const payments = await repo.all("SELECT id,amount_centavos,type,status,paid_at,method FROM payments WHERE tenancy_id=?", tenancyId);
  const items = await repo.all("SELECT * FROM settlement_items WHERE tenancy_id=? ORDER BY created_at ASC", tenancyId);
  const actions = checkout ? await repo.all('SELECT * FROM settlement_financial_actions WHERE checkout_id=? ORDER BY created_at ASC', checkout.id) : [];
  const paid = payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + money(p.amount_centavos), 0);
  const due = payments.filter(p => ['DUE', 'LATE', 'UPCOMING'].includes(String(p.status))).reduce((sum, p) => sum + money(p.amount_centavos), 0);
  const held = payments.filter(p => p.status === 'PAID' && p.type === 'SECURITY_DEPOSIT').reduce((sum, p) => sum + money(p.amount_centavos), 0);
  const approvedDeductions = items.filter(i => i.status === 'APPROVED').reduce((sum, i) => sum + money(i.amount_centavos), 0);
  const amountDue = Math.max(0, due + approvedDeductions - held);
  const refundDue = Math.max(0, held - approvedDeductions - due);
  return { tenancy_id: tenancyId, checkout_id: checkout?.id ?? null, settlement_state: checkout?.settlement_state ?? 'CALCULATED', paid_centavos: paid, amount_due_centavos: amountDue, security_deposit_held_centavos: held, agreed_security_deposit_centavos: money(tenancy.security_deposit_centavos), approved_deductions_centavos: approvedDeductions, refund_due_centavos: refundDue, items, actions };
}

async function assertSettlementContext(repo: Repo, tenancyId: string, evidenceMediaId: string | undefined, entityType: string | undefined, entityId: string | undefined) {
  const tenancy = await repo.first('SELECT id,unit_id FROM tenancies WHERE id=?', tenancyId);
  if (!tenancy) throw new ApiError(404, 'NOT_FOUND', 'Tenancy not found');
  if (evidenceMediaId) {
    const media = await repo.first('SELECT id,entity_type,entity_id,status FROM media_records WHERE id=?', evidenceMediaId);
    const valid = Boolean(media && media.status === 'ACTIVE' && ((media.entity_type === 'TENANCY' && String(media.entity_id) === tenancyId) || (media.entity_type === 'UNIT' && String(media.entity_id) === String(tenancy.unit_id))));
    if (!valid) throw new ApiError(422, 'INVALID_SETTLEMENT_MEDIA', 'Evidence does not belong to this Tenancy or Room');
  }
  if (entityType && entityId) {
    if (entityType === 'TENANCY' && entityId !== tenancyId) throw new ApiError(422, 'INVALID_SETTLEMENT_ENTITY', 'Settlement entity does not belong to this Tenancy');
    if (entityType === 'UNIT' && entityId !== String(tenancy.unit_id)) throw new ApiError(422, 'INVALID_SETTLEMENT_ENTITY', 'Settlement entity does not belong to this Room');
    if (entityType === 'INVENTORY_ASSET') {
      const asset = await repo.first('SELECT a.id FROM inventory_assets a JOIN inventory_nodes n ON n.id=a.node_id WHERE a.id=? AND n.unit_id=?', entityId, tenancy.unit_id);
      if (!asset) throw new ApiError(422, 'INVALID_SETTLEMENT_ENTITY', 'Inventory asset does not belong to this Room');
    }
  }
}

export async function proposeSettlementItemSafe(repo: Repo, tenancyId: string, input: Record<string, unknown>, actor: string) {
  await assertSettlementContext(repo, tenancyId, input.evidence_media_id ? String(input.evidence_media_id) : undefined, input.entity_type ? String(input.entity_type) : undefined, input.entity_id ? String(input.entity_id) : undefined);
  const id = crypto.randomUUID(); const timestamp = now();
  await repo.run('INSERT INTO settlement_items (id,tenancy_id,item_type,reason,amount_centavos,entity_type,entity_id,evidence_media_id,status,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)', id, tenancyId, input.item_type, input.reason, input.amount_centavos, input.entity_type ?? null, input.entity_id ?? null, input.evidence_media_id ?? null, 'PROPOSED', actor, timestamp);
  await repo.audit('CREATE', 'settlement_item', id, { tenancy_id: tenancyId, item_type: input.item_type, amount_centavos: input.amount_centavos });
  return settlementClosureSummary(repo, tenancyId);
}

async function settlementJournal(repo: Repo, tenancy: Record<string, unknown>, checkout: Record<string, unknown>, held: number, deductions: number, due: number, actor: string) {
  if (checkout.settlement_journal_entry_id) return String(checkout.settlement_journal_entry_id);
  for (const account of ['acct-deposit', 'acct-restoration-income', 'acct-refund-payable', 'acct-ar-rent']) {
    if (!await repo.first('SELECT id FROM chart_accounts WHERE id=? AND active=1', account)) throw new ApiError(500, 'ACCOUNTING_CONFIGURATION_ERROR', 'Settlement accounts are not configured');
  }
  const appliedDeductions = Math.min(held, deductions); const amountAppliedToDue = Math.min(Math.max(0, held - appliedDeductions), due); const refund = Math.max(0, held - appliedDeductions - due); const excessDeduction = Math.max(0, deductions - held);
  if (held === 0 && deductions === 0) return null;
  const id = crypto.randomUUID(); const timestamp = now(); const lines: Array<{ account: string; debit: number; credit: number; description: string }> = [];
  if (held) lines.push({ account: 'acct-deposit', debit: held, credit: 0, description: `Security deposit settlement ${String(tenancy.id)}` });
  if (excessDeduction) lines.push({ account: 'acct-ar-rent', debit: excessDeduction, credit: 0, description: `Settlement amount due ${String(tenancy.id)}` });
  if (deductions) lines.push({ account: 'acct-restoration-income', debit: 0, credit: deductions, description: `Approved deductions ${String(tenancy.id)}` });
  if (amountAppliedToDue) lines.push({ account: 'acct-ar-rent', debit: 0, credit: amountAppliedToDue, description: `Deposit applied to due ${String(tenancy.id)}` });
  if (refund) lines.push({ account: 'acct-refund-payable', debit: 0, credit: refund, description: `Refund payable ${String(tenancy.id)}` });
  const debit = lines.reduce((sum, line) => sum + line.debit, 0); const credit = lines.reduce((sum, line) => sum + line.credit, 0);
  if (debit !== credit || debit === 0) throw new ApiError(422, 'UNBALANCED_JOURNAL', 'Settlement journal is not balanced');
  const entryNumber = `JE-${Date.now()}-${id.slice(0, 8)}`;
  const statements = [
    { sql: 'INSERT INTO journal_entries (id,entry_number,entry_date,description,status,person_id,tenancy_id,unit_id,reversal_of,created_by,created_at,posted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', args: [id, entryNumber, timestamp.slice(0, 10), `Settlement ${tenancy.id}`, 'DRAFT', tenancy.person_id ?? null, tenancy.id, tenancy.unit_id, null, actor, timestamp, null] },
    ...lines.map(line => ({ sql: 'INSERT INTO journal_lines (id,entry_id,account_id,debit_centavos,credit_centavos,line_description) VALUES (?,?,?,?,?,?)', args: [crypto.randomUUID(), id, line.account, line.debit, line.credit, line.description] })),
    { sql: "UPDATE journal_entries SET status='POSTED',posted_at=? WHERE id=? AND status='DRAFT'", args: [timestamp, id] },
    { sql: "UPDATE tenancy_checkouts SET settlement_status='POSTED',settlement_journal_entry_id=?,settlement_state='POSTED' WHERE id=? AND settlement_journal_entry_id IS NULL", args: [id, checkout.id] },
    { sql: 'INSERT INTO audit_log (id,action,entity_type,entity_id,payload_json,occurred_at) VALUES (?,?,?,?,?,?)', args: [crypto.randomUUID(), 'POST', 'settlement', tenancy.id, JSON.stringify({ journal_entry_id: id, held_centavos: held, deductions_centavos: deductions, due_centavos: due, actor }), timestamp] },
  ];
  if (repo.batch) await repo.batch(statements); else for (const statement of statements) await repo.run(statement.sql, ...(statement.args ?? []));
  return id;
}

export async function postSettlementClosure(repo: Repo, tenancyId: string, actor: string) {
  const tenancy = await repo.first('SELECT id,unit_id,person_id FROM tenancies WHERE id=?', tenancyId); if (!tenancy) throw new ApiError(404, 'NOT_FOUND', 'Tenancy not found');
  const checkout = await repo.first('SELECT * FROM tenancy_checkouts WHERE tenancy_id=?', tenancyId); if (!checkout) throw new ApiError(409, 'CHECKOUT_REQUIRED', 'A checkout is required before settlement');
  if (checkout.settlement_state === 'SETTLED') return settlementClosureSummary(repo, tenancyId);
  const summary = await settlementClosureSummary(repo, tenancyId); if (summary.approved_deductions_centavos > 0 && summary.security_deposit_held_centavos <= 0) throw new ApiError(409, 'DEPOSIT_NOT_RECEIVED', 'Approved deductions cannot be applied without a received security deposit');
  await settlementJournal(repo, tenancy, checkout, summary.security_deposit_held_centavos, summary.approved_deductions_centavos, summary.amount_due_centavos, actor);
  const fresh = await repo.first('SELECT * FROM tenancy_checkouts WHERE id=?', checkout.id) ?? checkout; const actions: Array<{ type: string; amount: number }> = [];
  if (summary.amount_due_centavos > 0) actions.push({ type: 'AMOUNT_DUE_PAYMENT', amount: summary.amount_due_centavos });
  if (summary.refund_due_centavos > 0) actions.push({ type: 'REFUND', amount: summary.refund_due_centavos });
  const statements = actions.map(action => ({ sql: 'INSERT OR IGNORE INTO settlement_financial_actions (id,tenancy_id,checkout_id,action_type,amount_centavos,status,idempotency_key,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)', args: [crypto.randomUUID(), tenancyId, fresh.id, action.type, action.amount, 'PENDING', `settlement:${tenancyId}:${action.type}`, actor, now()] }));
  statements.push({ sql: "UPDATE tenancy_checkouts SET settlement_state=? WHERE id=? AND settlement_state IN ('CALCULATED','APPROVED','POSTED')", args: [actions.length ? 'PAYMENT_OR_REFUND_PENDING' : 'SETTLED', fresh.id] });
  if (repo.batch && statements.length) await repo.batch(statements); else for (const statement of statements) await repo.run(statement.sql, ...(statement.args ?? []));
  await repo.audit('SETTLEMENT_POSTED', 'tenancy', tenancyId, { amount_due_centavos: summary.amount_due_centavos, refund_due_centavos: summary.refund_due_centavos, actor });
  return settlementClosureSummary(repo, tenancyId);
}

export async function confirmSettlementAction(repo: Repo, actionId: string, actor: string, input: Record<string, unknown>) {
  const action = await repo.first('SELECT a.*,t.unit_id,t.person_id FROM settlement_financial_actions a JOIN tenancies t ON t.id=a.tenancy_id WHERE a.id=?', actionId); if (!action) throw new ApiError(404, 'NOT_FOUND', 'Settlement action not found'); if (action.status === 'CONFIRMED') return settlementClosureSummary(repo, String(action.tenancy_id)); if (action.status !== 'PENDING') throw new ApiError(409, 'INVALID_SETTLEMENT_ACTION', 'Settlement action is not pending');
  const timestamp = now(); const amount = Number(action.amount_centavos); const journalId = crypto.randomUUID(); const paymentId = action.action_type === 'AMOUNT_DUE_PAYMENT' ? crypto.randomUUID() : null; const method = String(input.method ?? 'CASH'); const debitAccount = method === 'GCASH' ? 'acct-gcash' : 'acct-cash';
  if (!await repo.first('SELECT id FROM chart_accounts WHERE id=? AND active=1', debitAccount)) throw new ApiError(500, 'ACCOUNTING_CONFIGURATION_ERROR', 'Payment account is not configured');
  const creditAccount = action.action_type === 'REFUND' ? 'acct-refund-payable' : 'acct-ar-rent';
  const entryNumber = `JE-${Date.now()}-${journalId.slice(0, 8)}`;
  const statements = [
    { sql: 'INSERT INTO journal_entries (id,entry_number,entry_date,description,status,person_id,tenancy_id,unit_id,reversal_of,created_by,created_at,posted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', args: [journalId, entryNumber, timestamp.slice(0, 10), `${action.action_type} ${action.tenancy_id}`, 'DRAFT', action.person_id ?? null, action.tenancy_id, action.unit_id, null, actor, timestamp, null] },
    { sql: 'INSERT INTO journal_lines (id,entry_id,account_id,debit_centavos,credit_centavos,line_description) VALUES (?,?,?,?,?,?)', args: [crypto.randomUUID(), journalId, action.action_type === 'REFUND' ? creditAccount : debitAccount, action.action_type === 'REFUND' ? amount : amount, 0, `${action.action_type} ${action.tenancy_id}`] },
    { sql: 'INSERT INTO journal_lines (id,entry_id,account_id,debit_centavos,credit_centavos,line_description) VALUES (?,?,?,?,?,?)', args: [crypto.randomUUID(), journalId, action.action_type === 'REFUND' ? debitAccount : creditAccount, 0, amount, `${action.action_type} ${action.tenancy_id}`] },
    { sql: "UPDATE journal_entries SET status='POSTED',posted_at=? WHERE id=? AND status='DRAFT'", args: [timestamp, journalId] },
    ...(paymentId ? [{ sql: 'INSERT INTO payments (id,tenancy_id,due_date,amount_centavos,type,status,paid_at,method,notes,journal_entry_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', args: [paymentId, action.tenancy_id, timestamp.slice(0, 10), amount, 'OTHER', 'PAID', timestamp, method, 'Settlement amount due payment', journalId, timestamp, timestamp] }] : []),
    { sql: 'UPDATE settlement_financial_actions SET status=\'CONFIRMED\',payment_id=?,journal_entry_id=?,confirmed_by=?,confirmed_at=? WHERE id=? AND status=\'PENDING\'', args: [paymentId, journalId, actor, timestamp, actionId] },
    { sql: "UPDATE tenancy_checkouts SET settlement_state=CASE WHEN (SELECT COUNT(*) FROM settlement_financial_actions WHERE checkout_id=tenancy_checkouts.id AND status<>'CONFIRMED')=0 THEN 'SETTLED' ELSE 'PAYMENT_OR_REFUND_PENDING' END WHERE id=?", args: [action.checkout_id] },
    { sql: 'INSERT INTO audit_log (id,action,entity_type,entity_id,payload_json,occurred_at) VALUES (?,?,?,?,?,?)', args: [crypto.randomUUID(), 'SETTLEMENT_ACTION_CONFIRMED', 'settlement_financial_action', actionId, JSON.stringify({ tenancy_id: action.tenancy_id, action_type: action.action_type, amount_centavos: amount, actor }), timestamp] },
  ];
  if (repo.batch) await repo.batch(statements); else for (const statement of statements) await repo.run(statement.sql, ...(statement.args ?? []));
  return settlementClosureSummary(repo, String(action.tenancy_id));
}
