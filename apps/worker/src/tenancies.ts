import { ApiError, D1Repository, now } from './repository';
import { createPerson } from './people';
import { availability } from './domain';
import { getOccupancyProjection, getRoomOccupancy, getTenancyOperationalState } from './occupancy';

const statusTransitions: Record<string, string[]> = {
  UPCOMING: ['ACTIVE', 'ENDED', 'TERMINATED'],
  ACTIVE: ['ENDED', 'TERMINATED'],
  ENDED: [],
  TERMINATED: [],
};
const sortColumns: Record<string, string> = {
  start_at: 't.start_at', end_at: 't.end_at', monthly_rent_centavos: 't.monthly_rent_centavos', updated_at: 't.updated_at', status: 't.status',
};
const openEndedAt = '9999-12-31T23:59:59.999Z';

const personName = (person: Record<string, unknown> | null, fallback?: unknown) => String(person?.display_name ?? ([person?.first_name, person?.last_name].filter(Boolean).join(' ') || fallback || 'Unnamed person'));
const personForTenancy = async (repo: D1Repository, personId: string) => {
  const person = await repo.first('SELECT id,display_name,first_name,last_name FROM persons WHERE id=?', personId);
  if (!person) throw new ApiError(404, 'NOT_FOUND', 'Person not found');
  return person;
};
const ensurePerson = async (repo: D1Repository, input: Record<string, unknown>) => {
  if (input.person_id) return personForTenancy(repo, String(input.person_id));
  const displayName = String(input.tenant_name ?? '').trim();
  if (!displayName) throw new ApiError(422, 'VALIDATION_ERROR', 'A canonical person is required');
  const person = await createPerson(repo, { display_name: displayName });
  if (!person?.id) throw new ApiError(500, 'PERSON_CREATE_FAILED', 'Could not create canonical person');
  return person;
};
const assertUnit = async (repo: D1Repository, unitId: string) => {
  const unit = await repo.first('SELECT id,monthly_rent_centavos FROM units WHERE id=?', unitId);
  if (!unit) throw new ApiError(404, 'NOT_FOUND', 'Unit not found');
  return unit;
};
const validateAvailability = async (repo: D1Repository, unitId: string, startAt: string, endAt: string | null, excludeId?: string) => {
  if (!await availability(repo, unitId, startAt, endAt ?? openEndedAt, excludeId)) throw new ApiError(409, 'UNIT_UNAVAILABLE', 'Unit is not available for this tenancy interval');
};
const derivedAttention = (row: Record<string, unknown>, reference = Date.now()) => {
  const start = Date.parse(String(row.start_at)); const end = row.end_at ? Date.parse(String(row.end_at)) : Number.POSITIVE_INFINITY;
  if (row.status === 'UPCOMING' && Number.isFinite(start) && start - reference <= 30 * 86400000 && start >= reference) return 'STARTING_SOON';
  if (row.status === 'ACTIVE' && Number.isFinite(end) && end - reference <= 30 * 86400000 && end >= reference) return 'ENDING_SOON';
  if ((row.status === 'ENDED' || (Number.isFinite(end) && end < reference)) && row.status !== 'TERMINATED') return 'FOLLOW_UP_REQUIRED';
  return null;
};

const contractVersionForDate = (contracts: Record<string, unknown>[], date: string) => contracts.find(contract => String(contract.start_date) <= date && date < String(contract.end_exclusive)) ?? null;

const withRelations = async (repo: D1Repository, row: Record<string, unknown>) => {
  const [contracts, documentRequirements, termination] = await Promise.all([
    repo.all('SELECT id,version_number,start_date,end_exclusive,last_occupied_date,monthly_rent_centavos,currency_code,monthly_due_day,expected_payment_day,deposit_centavos,minimum_term_exception,source,created_at,updated_at FROM tenancy_contract_versions WHERE tenancy_id=? ORDER BY start_date,version_number', String(row.id)),
    repo.all('SELECT id,document_key,status,provenance,created_at,updated_at FROM tenancy_document_requirements WHERE tenancy_id=? ORDER BY document_key', String(row.id)),
    repo.first('SELECT id,effective_date,reason,previous_status,resulting_status,actor,created_at FROM tenancy_terminations WHERE tenancy_id=?', String(row.id)),
  ]);
  return {
    ...row,
    attention_state: derivedAttention(row),
    person: row.person_id ? await repo.first('SELECT id,display_name,first_name,last_name,phone,email FROM persons WHERE id=?', String(row.person_id)) : null,
    room: row.unit_id ? await repo.first('SELECT id,actual_unit_number,floor,type,sqm,monthly_rent_centavos,status FROM units WHERE id=?', String(row.unit_id)) : null,
    room_occupancy: row.unit_id ? await getRoomOccupancy(repo, String(row.unit_id)) : null,
    occupancy_projection: row.unit_id ? await getOccupancyProjection(repo, String(row.unit_id)) : null,
    contracts,
    current_contract: contractVersionForDate(contracts as Record<string, unknown>[], new Date().toISOString().slice(0, 10)),
    document_requirements: documentRequirements,
    termination: termination ?? null,
    operational: await getTenancyOperationalState(repo, String(row.id)),
  };
};

export const listTenancies = async (repo: D1Repository, query: Record<string, unknown>) => {
  const limit = Number(query.limit ?? 50); const search = String(query.search ?? '').trim(); const pattern = `%${search}%`;
  const sort = sortColumns[String(query.sort ?? 'start_at')] ?? 't.start_at'; const direction = String(query.direction ?? 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const status = query.status ? String(query.status) : null; const unitId = query.unit_id ? String(query.unit_id) : null; const personId = query.person_id ? String(query.person_id) : null;
  const rows = await repo.all(`SELECT t.*, COALESCE(p.display_name, p.first_name || ' ' || p.last_name, t.tenant_name) AS person_name, u.id AS room_id FROM tenancies t LEFT JOIN persons p ON p.id=t.person_id LEFT JOIN units u ON u.id=t.unit_id WHERE (? IS NULL OR t.status=?) AND (? IS NULL OR t.unit_id=?) AND (? IS NULL OR t.person_id=?) AND (?='' OR COALESCE(p.display_name, t.tenant_name) LIKE ? OR u.id LIKE ?) ORDER BY ${sort} ${direction} LIMIT ?`, status, status, unitId, unitId, personId, personId, search, pattern, pattern, limit);
  return Promise.all(rows.map(row => withRelations(repo, row as Record<string, unknown>)));
};

export const getTenancyDetail = async (repo: D1Repository, tenancyId: string) => {
  const row = await repo.first('SELECT * FROM tenancies WHERE id=?', tenancyId);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Tenancy not found');
  const detail = await withRelations(repo, row);
  const [payments, history, contracts, financialFacts, documentRequirements] = await Promise.all([
    repo.all('SELECT id,due_date,amount_centavos,type,status,paid_at,method FROM payments WHERE tenancy_id=? ORDER BY due_date DESC', tenancyId),
    repo.all("SELECT action,entity_type,entity_id,occurred_at FROM audit_log WHERE entity_type='tenancy' AND entity_id=? ORDER BY occurred_at DESC LIMIT 100", tenancyId),
    repo.all('SELECT id,version_number,start_date,end_exclusive,last_occupied_date,monthly_rent_centavos,currency_code,monthly_due_day,expected_payment_day,deposit_centavos,minimum_term_exception,source,created_at,updated_at FROM tenancy_contract_versions WHERE tenancy_id=? ORDER BY start_date,version_number', tenancyId),
    repo.all('SELECT id,fact_type,amount_centavos,currency_code,effective_date,provenance,notes FROM tenancy_financial_facts WHERE tenancy_id=? ORDER BY effective_date,fact_type', tenancyId),
    repo.all('SELECT id,document_key,status,provenance FROM tenancy_document_requirements WHERE tenancy_id=? ORDER BY document_key', tenancyId),
  ]);
  const currentContract = contractVersionForDate(contracts as Record<string, unknown>[], new Date().toISOString().slice(0, 10));
  return { ...detail, payments, contracts, current_contract: currentContract, financial_facts: financialFacts, document_requirements: documentRequirements, history };
};

export const createContractVersion = async (repo: D1Repository, tenancyId: string, input: Record<string, unknown>, actor: string) => {
  const tenancy = await repo.first('SELECT id,unit_id,status,start_at,end_at,monthly_rent_centavos,security_deposit_centavos,payment_due_day FROM tenancies WHERE id=?', tenancyId);
  if (!tenancy) throw new ApiError(404, 'NOT_FOUND', 'Tenancy not found');
  if (tenancy.status === 'ENDED' || tenancy.status === 'TERMINATED') throw new ApiError(409, 'TENANCY_NOT_OPERATIONAL', 'A closed tenancy cannot receive a new contract version');
  const start = String(input.start_date); const end = String(input.end_exclusive); const lastOccupied = String(input.last_occupied_date);
  if (!(start < end) || !(lastOccupied < end)) throw new ApiError(422, 'INVALID_CONTRACT_INTERVAL', 'Contract dates must use an exclusive end date and remain chronological');
  const contracts = await repo.all('SELECT id,version_number,start_date,end_exclusive FROM tenancy_contract_versions WHERE tenancy_id=? ORDER BY start_date,version_number', tenancyId) as Record<string, unknown>[];
  for (const existing of contracts) if (start < String(existing.end_exclusive) && end > String(existing.start_date)) throw new ApiError(409, 'OVERLAPPING_CONTRACT_VERSION', 'The contract interval overlaps an existing version');
  const latest = contracts[contracts.length - 1];
  if (latest && start !== String(latest.end_exclusive)) throw new ApiError(409, 'CONTRACT_VERSION_NOT_ADJACENT', 'A renewal must begin on the previous version exclusive end date');
  const id = crypto.randomUUID(); const timestamp = now(); const versionNumber = Math.max(0, ...contracts.map(contract => Number(contract.version_number) || 0)) + 1;
  const values = [id, tenancyId, versionNumber, start, end, lastOccupied, input.monthly_rent_centavos, input.currency_code ?? 'PHP', input.monthly_due_day ?? null, input.expected_payment_day ?? null, input.deposit_centavos ?? 0, input.minimum_term_exception ? 1 : 0, input.source, timestamp, timestamp];
  await repo.run('INSERT INTO tenancy_contract_versions (id,tenancy_id,version_number,start_date,end_exclusive,last_occupied_date,monthly_rent_centavos,currency_code,monthly_due_day,expected_payment_day,deposit_centavos,minimum_term_exception,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', ...values);
  const today = new Date().toISOString().slice(0, 10);
  if (start <= today && today < end) {
    await repo.run('UPDATE tenancies SET start_at=?,end_at=?,monthly_rent_centavos=?,security_deposit_centavos=?,payment_due_day=?,updated_at=? WHERE id=?', `${start}T00:00:00+08:00`, `${end}T00:00:00+08:00`, input.monthly_rent_centavos, input.deposit_centavos ?? 0, input.monthly_due_day ?? tenancy.payment_due_day ?? null, timestamp, tenancyId);
  }
  await repo.audit('CREATE', 'tenancy_contract_version', id, { tenancy_id: tenancyId, version_number: versionNumber, actor, start_date: start, end_exclusive: end });
  return getTenancyDetail(repo, tenancyId);
};

export const terminateTenancy = async (repo: D1Repository, tenancyId: string, input: Record<string, unknown>, actor: string) => {
  const tenancy = await repo.first('SELECT id,status,start_at FROM tenancies WHERE id=?', tenancyId);
  if (!tenancy) throw new ApiError(404, 'NOT_FOUND', 'Tenancy not found');
  if (tenancy.status === 'ENDED' || tenancy.status === 'TERMINATED') throw new ApiError(409, 'INVALID_TERMINATION_STATE', 'This tenancy has already closed');
  const effectiveDate = String(input.effective_date); const startDate = String(tenancy.start_at).slice(0, 10);
  if (effectiveDate < startDate) throw new ApiError(422, 'INVALID_TERMINATION_DATE', 'Termination cannot precede the tenancy start date');
  const existing = await repo.first('SELECT id FROM tenancy_terminations WHERE tenancy_id=?', tenancyId);
  if (existing) throw new ApiError(409, 'TERMINATION_ALREADY_RECORDED', 'Termination has already been recorded');
  const timestamp = now(); const id = crypto.randomUUID();
  const statements = [
    { sql: 'INSERT INTO tenancy_terminations (id,tenancy_id,effective_date,reason,previous_status,resulting_status,actor,created_at) VALUES (?,?,?,?,?,?,?,?)', args: [id, tenancyId, effectiveDate, String(input.reason), String(tenancy.status), 'TERMINATED', actor, timestamp] },
    { sql: "UPDATE tenancies SET status='TERMINATED',updated_at=? WHERE id=?", args: [timestamp, tenancyId] },
    { sql: 'INSERT INTO audit_log (id,action,entity_type,entity_id,payload_json,occurred_at) VALUES (?,?,?,?,?,?)', args: [crypto.randomUUID(), 'TERMINATE', 'tenancy', tenancyId, JSON.stringify({ effective_date: effectiveDate, reason: String(input.reason), previous_status: String(tenancy.status), resulting_status: 'TERMINATED', actor }), timestamp] },
  ];
  if (repo.batch) await repo.batch(statements); else { for (const statement of statements) await repo.run(statement.sql, ...(statement.args ?? [])); }
  return getTenancyDetail(repo, tenancyId);
};

export const createTenancy = async (repo: D1Repository, input: Record<string, unknown>) => {
  const unitId = String(input.unit_id); await assertUnit(repo, unitId);
  const person = await ensurePerson(repo, input); const startAt = String(input.start_at); const endAt = input.end_at == null ? null : String(input.end_at);
  await validateAvailability(repo, unitId, startAt, endAt);
  const id = crypto.randomUUID(); const timestamp = now(); const tenantName = personName(person, input.tenant_name);
  await repo.run('INSERT INTO tenancies (id,unit_id,person_id,lead_id,tenant_name,start_at,end_at,monthly_rent_centavos,security_deposit_centavos,advance_amount_centavos,payment_due_day,pdc_required,status,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', id, unitId, String(person.id), input.lead_id ?? null, tenantName, startAt, endAt, input.monthly_rent_centavos, input.security_deposit_centavos ?? 0, input.advance_amount_centavos ?? 0, input.payment_due_day, input.pdc_required ? 1 : 0, 'UPCOMING', input.notes ?? null, timestamp, timestamp);
  await repo.audit('CREATE', 'tenancy', id, { fields: Object.keys(input), person_id: String(person.id), unit_id: unitId });
  return getTenancyDetail(repo, id);
};

export const updateTenancy = async (repo: D1Repository, tenancyId: string, input: Record<string, unknown>) => {
  const current = await repo.first('SELECT * FROM tenancies WHERE id=?', tenancyId); if (!current) throw new ApiError(404, 'NOT_FOUND', 'Tenancy not found');
  const unitId = String(input.unit_id ?? current.unit_id); await assertUnit(repo, unitId);
  const personId = String(input.person_id ?? current.person_id ?? ''); const person = personId ? await personForTenancy(repo, personId) : null;
  const startAt = String(input.start_at ?? current.start_at); const endAt = input.end_at === undefined ? (current.end_at == null ? null : String(current.end_at)) : input.end_at == null ? null : String(input.end_at);
  await validateAvailability(repo, unitId, startAt, endAt, tenancyId);
  if (input.status) { const from = String(current.status); const to = String(input.status); if (from !== to && !statusTransitions[from]?.includes(to)) throw new ApiError(409, 'INVALID_STATE_TRANSITION', `Cannot transition tenancy from ${from} to ${to}`); }
  const allowed = new Set(['unit_id', 'person_id', 'start_at', 'end_at', 'monthly_rent_centavos', 'security_deposit_centavos', 'advance_amount_centavos', 'payment_due_day', 'pdc_required', 'status', 'notes']);
  const entries = Object.entries(input).filter(([key]) => allowed.has(key)); if (person && !('tenant_name' in input)) entries.push(['tenant_name', personName(person)]);
  if (!entries.length) throw new ApiError(422, 'VALIDATION_ERROR', 'No editable tenancy fields supplied');
  await repo.run(`UPDATE tenancies SET ${entries.map(([key]) => `${key}=?`).join(',')},updated_at=? WHERE id=?`, ...entries.map(([, value]) => value === true ? 1 : value === false ? 0 : value), now(), tenancyId);
  await repo.audit('UPDATE', 'tenancy', tenancyId, { fields: entries.map(([key]) => key) });
  return getTenancyDetail(repo, tenancyId);
};

const tenancyForOperation = async (repo: D1Repository, tenancyId: string) => {
  const tenancy = await repo.first('SELECT id,unit_id,person_id,status FROM tenancies WHERE id=?', tenancyId);
  if (!tenancy) throw new ApiError(404, 'NOT_FOUND', 'Tenancy not found');
  if (tenancy.status === 'ENDED' || tenancy.status === 'TERMINATED') throw new ApiError(409, 'TENANCY_NOT_OPERATIONAL', 'This tenancy is no longer operational');
  return tenancy;
};

export const recordCheckIn = async (repo: D1Repository, tenancyId: string, input: Record<string, unknown>, performedBy: string) => {
  if (input.confirmed !== true) throw new ApiError(422, 'CHECK_IN_CONFIRMATION_REQUIRED', 'Explicit check-in confirmation is required');
  const tenancy = await tenancyForOperation(repo, tenancyId);
  if (tenancy.status !== 'UPCOMING') throw new ApiError(409, 'INVALID_CHECK_IN_STATE', 'Only an upcoming tenancy can be checked in');
  if (await repo.first('SELECT id FROM tenancy_check_ins WHERE tenancy_id=?', tenancyId)) throw new ApiError(409, 'CHECK_IN_ALREADY_RECORDED', 'Check-in has already been recorded');
  for (const readingId of [input.electricity_reading_id, input.water_reading_id].filter(Boolean)) { const reading = await repo.first('SELECT id,unit_id,tenancy_id FROM utility_readings WHERE id=?', readingId); if (!reading || String(reading.unit_id) !== String(tenancy.unit_id) || (reading.tenancy_id && String(reading.tenancy_id) !== tenancyId)) throw new ApiError(422, 'INVALID_CHECK_IN_READING', 'Opening reading does not belong to this Room/Tenancy'); }
  if (input.condition_media_id) { const media = await repo.first('SELECT id,entity_type,entity_id,status FROM media_records WHERE id=?', input.condition_media_id); const validMedia = Boolean(media && media.status === 'ACTIVE' && ((media.entity_type === 'UNIT' && String(media.entity_id) === String(tenancy.unit_id)) || (media.entity_type === 'TENANCY' && String(media.entity_id) === tenancyId))); if (!validMedia) throw new ApiError(422, 'INVALID_CHECK_IN_MEDIA', 'Condition evidence does not belong to this Room or Tenancy'); }
  const id = crypto.randomUUID(); const timestamp = now(); const statements = [
    { sql: 'INSERT INTO tenancy_check_ins (id,tenancy_id,actual_check_in_at,performed_by,created_at,confirmed_at,electricity_reading_id,water_reading_id,condition_media_id,keys_handed_over,access_devices,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', args: [id, tenancyId, input.actual_check_in_at, performedBy, timestamp, timestamp, input.electricity_reading_id ?? null, input.water_reading_id ?? null, input.condition_media_id ?? null, input.keys_handed_over ?? 0, input.access_devices ?? null, input.notes ?? null] },
    { sql: "UPDATE tenancies SET status='ACTIVE',updated_at=? WHERE id=? AND status='UPCOMING'", args: [timestamp, tenancyId] },
    { sql: 'INSERT INTO audit_log (id,action,entity_type,entity_id,payload_json,occurred_at) VALUES (?,?,?,?,?,?)', args: [crypto.randomUUID(), 'CHECK_IN', 'tenancy', tenancyId, JSON.stringify({ actual_check_in_at: input.actual_check_in_at, performed_by: performedBy }), timestamp] },
  ];
  if (repo.batch) await repo.batch(statements); else { for (const statement of statements.slice(0, 2)) await repo.run(statement.sql, ...(statement.args ?? [])); await repo.audit('CHECK_IN', 'tenancy', tenancyId, { actual_check_in_at: input.actual_check_in_at, performed_by: performedBy }); }
  return getTenancyDetail(repo, tenancyId);
};

export const recordUtilityReading = async (repo: D1Repository, tenancyId: string, input: Record<string, unknown>) => {
  const tenancy = await tenancyForOperation(repo, tenancyId); const id = crypto.randomUUID(); const timestamp = now();
  await repo.run('INSERT INTO utility_readings (id,tenancy_id,unit_id,utility_type,reading_kind,reading_value,recorded_at,created_at,context,operator_id,media_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)', id, tenancyId, tenancy.unit_id, input.utility_type, input.reading_kind ?? 'OPENING', input.reading_value, input.recorded_at, timestamp, input.context ?? 'MANUAL', input.operator_id ?? null, input.media_id ?? null);
  await repo.run('UPDATE tenancies SET updated_at=? WHERE id=?', timestamp, tenancyId);
  await repo.audit('CREATE', 'utility_reading', id, { tenancy_id: tenancyId, unit_id: tenancy.unit_id, utility_type: input.utility_type, reading_kind: input.reading_kind ?? 'OPENING', recorded_at: input.recorded_at });
  return getTenancyDetail(repo, tenancyId);
};

export const recordRoomUtilityReading = async (repo: D1Repository, input: Record<string, unknown>, actor: string) => {
  const unitId = String(input.unit_id); if (!await repo.first('SELECT id FROM units WHERE id=?', unitId)) throw new ApiError(404, 'NOT_FOUND', 'Unit not found');
  const tenancyId = input.tenancy_id == null ? null : String(input.tenancy_id);
  if (tenancyId) { const tenancy = await repo.first('SELECT id,unit_id FROM tenancies WHERE id=?', tenancyId); if (!tenancy) throw new ApiError(404, 'NOT_FOUND', 'Tenancy not found'); if (String(tenancy.unit_id) !== unitId) throw new ApiError(422, 'TENANCY_ROOM_MISMATCH', 'Tenancy does not belong to this Room'); }
  const utilityType = String(input.utility_type); const readingValue = String(input.reading_value); const recordedAt = String(input.recorded_at); const meterEvent = String(input.meter_event ?? 'READING');
  if (await repo.first('SELECT id FROM utility_readings WHERE unit_id=? AND utility_type=? AND recorded_at=? AND reading_value=? AND meter_event=?', unitId, utilityType, recordedAt, readingValue, meterEvent)) throw new ApiError(409, 'DUPLICATE_UTILITY_READING', 'An identical meter reading already exists for this Room');
  const existing = await repo.all('SELECT id,reading_value,recorded_at,meter_event FROM utility_readings WHERE unit_id=? AND utility_type=? ORDER BY recorded_at ASC,created_at ASC,id ASC', unitId, utilityType);
  const candidate = { id: '__candidate__', reading_value: readingValue, recorded_at: recordedAt, meter_event: meterEvent };
  const ordered = [...existing, candidate].sort((a, b) => `${String(a.recorded_at)}|${String(a.id)}`.localeCompare(`${String(b.recorded_at)}|${String(b.id)}`));
  for (let index = 1; index < ordered.length; index += 1) { const previous = ordered[index - 1]; const current = ordered[index]; if (String(current.meter_event ?? 'READING') !== 'READING') continue; if (Number(current.reading_value) < Number(previous.reading_value) && String(previous.meter_event ?? 'READING') === 'READING') throw new ApiError(422, 'NEGATIVE_CONSUMPTION_REQUIRES_RESET', 'A lower reading requires a RESET or REPLACEMENT event'); }
  const id = crypto.randomUUID(); const timestamp = now();
  await repo.run('INSERT INTO utility_readings (id,tenancy_id,unit_id,utility_type,reading_kind,reading_value,recorded_at,created_at,context,operator_id,media_id,meter_event) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', id, tenancyId, unitId, utilityType, input.reading_kind ?? 'OPENING', readingValue, recordedAt, timestamp, input.context ?? 'MANUAL', actor, input.media_id ?? null, meterEvent);
  await repo.audit('CREATE', 'utility_reading', id, { unit_id: unitId, tenancy_id: tenancyId, utility_type: utilityType, reading_kind: input.reading_kind ?? 'OPENING', meter_event: meterEvent, recorded_at: recordedAt, actor });
  return repo.first('SELECT * FROM utility_readings WHERE id=?', id);
};

export const listUtilityReadings = async (repo: D1Repository, query: Record<string, unknown>) => repo.all(`SELECT * FROM utility_readings WHERE unit_id=?${query.utility_type ? ' AND utility_type=?' : ''}${query.tenancy_id ? ' AND tenancy_id=?' : ''} ORDER BY recorded_at ASC`, ...[String(query.unit_id), ...(query.utility_type ? [String(query.utility_type)] : []), ...(query.tenancy_id ? [String(query.tenancy_id)] : [])]);

export const utilitySummary = async (repo: D1Repository, unitId: string, utilityType: string) => {
  const readings = await listUtilityReadings(repo, { unit_id: unitId, utility_type: utilityType }); let previous: Record<string, unknown> | null = null; const rows = readings.map(row => { const currentValue = Number(row.reading_value); const previousValue = previous ? Number(previous.reading_value) : null; const isReset = String(row.meter_event ?? 'READING') !== 'READING'; const consumption = !isReset && previousValue != null && Number.isFinite(currentValue) && Number.isFinite(previousValue) && currentValue >= previousValue ? currentValue - previousValue : null; const result = { ...row, previous_reading: previous && !isReset ? { id: previous.id, reading_value: previous.reading_value, recorded_at: previous.recorded_at } : null, consumption }; previous = row as Record<string, unknown>; return result; }); return { unit_id: unitId, utility_type: utilityType, readings: rows };
};

export const getRoomUtilities = async (repo: D1Repository, unitId: string) => {
  if (!await repo.first('SELECT id FROM units WHERE id=?', unitId)) throw new ApiError(404, 'NOT_FOUND', 'Unit not found');
  const services = await repo.all('SELECT * FROM utility_services WHERE unit_id=? ORDER BY utility_type', unitId);
  const [water, electricity] = await Promise.all([utilitySummary(repo, unitId, 'WATER'), utilitySummary(repo, unitId, 'ELECTRICITY')]);
  const building = await repo.first('SELECT rb.building_id,b.name AS building_name FROM room_buildings rb JOIN buildings b ON b.id=rb.building_id WHERE rb.unit_id=?', unitId);
  const configs = building ? await repo.all('SELECT * FROM building_utility_config WHERE building_id=? ORDER BY utility_type', String(building.building_id)) : [];
  const tariffs = building ? await repo.all('SELECT id,building_id,utility_type,unit,rate_centavos,currency_code,effective_from,effective_until,provenance FROM utility_rates WHERE building_id=? ORDER BY utility_type,effective_from DESC', String(building.building_id)) : [];
  const internetPlans = building ? await repo.all('SELECT id,building_id,plan_name,service_brand,underlying_isp,technology,advertised_speed_mbps,monthly_fee_centavos,currency_code,activation_policy,payment_responsibility,payment_recipient,billing,effective_from,effective_until,provenance FROM building_internet_plans WHERE building_id=? ORDER BY effective_from DESC', String(building.building_id)) : [];
  const internetEquipment = await repo.all('SELECT id,unit_id,equipment_type,service_brand,technology,serial_number,provenance FROM room_internet_equipment WHERE unit_id=? ORDER BY equipment_type', unitId);
  const internetSubscriptions = await repo.all('SELECT s.id,s.tenancy_id,s.building_internet_plan_id,s.subscription_status,s.activation_status,s.payment_status,s.monthly_fee_centavos,s.currency_code,s.selected_at,s.activated_at,s.ended_at,s.provenance FROM tenancy_internet_subscriptions s JOIN tenancies t ON t.id=s.tenancy_id WHERE t.unit_id=? ORDER BY s.created_at DESC', unitId);
  const dues = building ? await repo.first('SELECT r.id,r.building_id,r.rate_centavos_per_sqm,r.currency_code,r.unit,r.responsibility,r.effective_from,r.effective_until,r.provenance,r.source,r.notes,r.recorded_at,o.floor_area_sqm,o.commercial_area_sqm,o.condo_billable_area_sqm,o.monthly_amount_centavos,o.area_source,o.amount_basis,o.assessment_status,o.billing_period_start,o.billing_period_end,o.statement_reference,o.payment_due_date,o.payment_status,o.actual_paid_centavos,o.paid_at,o.adjustment_centavos,o.payer FROM building_dues_rates r LEFT JOIN room_dues_obligations o ON o.building_dues_rate_id=r.id AND o.unit_id=? WHERE r.building_id=? ORDER BY r.effective_from DESC LIMIT 1', unitId, String(building.building_id)) : null;
  const pricingTarget = await repo.first("SELECT unit_id,target_type,amount_centavos,currency_code,effective_from,provenance FROM unit_pricing_targets WHERE unit_id=? AND target_type='ASKING_RENT' ORDER BY effective_from DESC LIMIT 1", unitId);
  return { unit_id: unitId, building, services, building_utility_config: configs, utility_tariffs: tariffs, internet_plans: internetPlans, internet_equipment: internetEquipment, internet_subscriptions: internetSubscriptions, dues, pricing_target: pricingTarget, readings: { WATER: water.readings, ELECTRICITY: electricity.readings } };
};

export const updateRoomUtilityService = async (repo: D1Repository, unitId: string, utilityType: string, input: Record<string, unknown>, actor: string) => {
  if (!await repo.first('SELECT id FROM units WHERE id=?', unitId)) throw new ApiError(404, 'NOT_FOUND', 'Unit not found');
  if (!['WATER', 'ELECTRICITY', 'INTERNET'].includes(utilityType)) throw new ApiError(422, 'VALIDATION_ERROR', 'Unsupported utility type');
  const current = await repo.first('SELECT * FROM utility_services WHERE unit_id=? AND utility_type=?', unitId, utilityType); const timestamp = now();
  if (current) { const entries = Object.entries(input); await repo.run(`UPDATE utility_services SET ${entries.map(([key]) => `${key}=?`).join(',')},updated_at=? WHERE unit_id=? AND utility_type=?`, ...entries.map(([, value]) => value), timestamp, unitId, utilityType); await repo.audit('UPDATE', 'utility_service', String(current.id), { unit_id: unitId, utility_type: utilityType, fields: entries.map(([key]) => key), actor }); }
  else { const id = crypto.randomUUID(); await repo.run('INSERT INTO utility_services (id,unit_id,utility_type,meter_identifier,average_month,billing,wifi_ready,monthly_cost_centavos,provider,connection,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', id, unitId, utilityType, input.meter_identifier ?? null, input.average_month ?? null, input.billing ?? null, input.wifi_ready ?? null, input.monthly_cost_centavos ?? null, input.provider ?? null, input.connection ?? null, timestamp, timestamp); await repo.audit('CREATE', 'utility_service', id, { unit_id: unitId, utility_type: utilityType, actor }); }
  return getRoomUtilities(repo, unitId);
};

export const createUtilityRate = async (repo: D1Repository, input: Record<string, unknown>, actor: string) => {
  const overlap = await repo.first("SELECT id FROM utility_rates WHERE utility_type=? AND effective_from < COALESCE(?, '9999-12-31') AND COALESCE(effective_until, '9999-12-31') > ? LIMIT 1", input.utility_type, input.effective_until ?? null, input.effective_from);
  if (overlap) throw new ApiError(409, 'OVERLAPPING_UTILITY_RATE', 'The utility rate interval overlaps an existing rate');
  const id = crypto.randomUUID(); const timestamp = now();
  await repo.run('INSERT INTO utility_rates (id,utility_type,unit,rate_centavos,effective_from,effective_until,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)', id, input.utility_type, input.unit, input.rate_centavos, input.effective_from, input.effective_until ?? null, actor, timestamp);
  await repo.audit('CREATE', 'utility_rate', id, { utility_type: input.utility_type, unit: input.unit, effective_from: input.effective_from });
  return repo.first('SELECT * FROM utility_rates WHERE id=?', id);
};

export const calculateUtilityCharge = async (repo: D1Repository, unitId: string, utilityType: string) => {
  const readings = await listUtilityReadings(repo, { unit_id: unitId, utility_type: utilityType });
  const charges: Record<string, unknown>[] = [];
  for (let index = 1; index < readings.length; index += 1) {
    const previous = readings[index - 1]; const current = readings[index]; const previousValue = Number(previous.reading_value); const currentValue = Number(current.reading_value);
    if (String(previous.recorded_at) >= String(current.recorded_at)) { charges.push({ previous_reading_id: previous.id, current_reading_id: current.id, status: 'INVALID_CHRONOLOGY', reason: 'READING_ORDER_INVALID' }); continue; }
    if (!Number.isFinite(previousValue) || !Number.isFinite(currentValue) || currentValue < previousValue) { charges.push({ previous_reading_id: previous.id, current_reading_id: current.id, status: 'METER_RESET_REQUIRED', reason: 'NEGATIVE_CONSUMPTION' }); continue; }
    const rate = await repo.first('SELECT * FROM utility_rates WHERE utility_type=? AND effective_from<=? AND (effective_until IS NULL OR effective_until>?) ORDER BY effective_from DESC LIMIT 1', utilityType, String(current.recorded_at).slice(0, 10), String(current.recorded_at).slice(0, 10));
    const consumption = currentValue - previousValue; const amount = rate && rate.method !== 'MANUAL_AMOUNT' ? calculateCentavos(String(consumption), Number(rate.rate_centavos)) : null;
    charges.push({ unit_id: unitId, utility_type: utilityType, period_start: previous.recorded_at, period_end: current.recorded_at, previous_reading_id: previous.id, current_reading_id: current.id, consumption, rate: rate ?? null, amount_centavos: amount, status: 'CALCULATED' });
  }
  return { unit_id: unitId, utility_type: utilityType, charges };
};

const calculateCentavos = (consumption: string, rateCentavos: number) => {
  const match = /^([0-9]+)(?:\.([0-9]{1,6}))?$/.exec(consumption.trim());
  if (!match || !Number.isInteger(rateCentavos) || rateCentavos < 0) return null;
  const scale = 1_000_000n; const scaled = BigInt(match[1]) * scale + BigInt((match[2] ?? '').padEnd(6, '0') || '0');
  return Number((scaled * BigInt(rateCentavos) + scale / 2n) / scale);
};

export const selectWifi = async (repo: D1Repository, tenancyId: string, input: Record<string, unknown>) => {
  await tenancyForOperation(repo, tenancyId); const id = crypto.randomUUID(); const timestamp = now();
  if (!input.ended_at) await repo.run('UPDATE tenancy_wifi_selections SET ended_at=? WHERE tenancy_id=? AND ended_at IS NULL', input.selected_at, tenancyId);
  await repo.run('INSERT INTO tenancy_wifi_selections (id,tenancy_id,provider,plan_name,speed_mbps,monthly_amount_centavos,selected_at,ended_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)', id, tenancyId, input.provider ?? null, input.plan_name, input.speed_mbps ?? null, input.monthly_amount_centavos ?? null, input.selected_at, input.ended_at ?? null, timestamp);
  await repo.run('UPDATE tenancies SET updated_at=? WHERE id=?', timestamp, tenancyId);
  await repo.audit('WIFI_SELECTION', 'tenancy_wifi_selection', id, { tenancy_id: tenancyId, plan_name: input.plan_name, selected_at: input.selected_at });
  return getTenancyDetail(repo, tenancyId);
};

export const attachTenancyDocument = async (repo: D1Repository, tenancyId: string, input: Record<string, unknown>) => {
  await tenancyForOperation(repo, tenancyId); const id = crypto.randomUUID(); const timestamp = now();
  await repo.run('INSERT INTO tenancy_documents (id,tenancy_id,document_type,reference,label,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)', id, tenancyId, input.document_type, input.reference, input.label ?? null, input.notes ?? null, timestamp, timestamp);
  await repo.run('UPDATE tenancies SET updated_at=? WHERE id=?', timestamp, tenancyId);
  await repo.audit('DOCUMENT_REFERENCE', 'tenancy_document', id, { tenancy_id: tenancyId, document_type: input.document_type });
  return getTenancyDetail(repo, tenancyId);
};
