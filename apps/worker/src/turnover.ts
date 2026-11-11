import { ApiError, D1Repository, now } from './repository';

export const recordCheckout = async (repo: D1Repository, tenancyId: string, input: Record<string, unknown>, actor: string) => {
  const tenancy = await repo.first('SELECT id,unit_id,status FROM tenancies WHERE id=?', tenancyId); if (!tenancy) throw new ApiError(404, 'NOT_FOUND', 'Tenancy not found');
  if (input.confirmed !== true) throw new ApiError(422, 'CHECK_OUT_CONFIRMATION_REQUIRED', 'Explicit check-out confirmation is required');
  if (tenancy.status !== 'ACTIVE') throw new ApiError(409, 'INVALID_CHECK_OUT_STATE', 'Only an active checked-in tenancy can be checked out');
  const checkIn = await repo.first('SELECT id,actual_check_in_at FROM tenancy_check_ins WHERE tenancy_id=?', tenancyId); if (!checkIn) throw new ApiError(409, 'CHECK_IN_REQUIRED', 'A physical check-in is required before check-out');
  if (String(input.actual_check_out_at) <= String(checkIn.actual_check_in_at)) throw new ApiError(422, 'INVALID_CHECK_OUT_TIME', 'Check-out must occur after check-in');
  for (const [readingId, utilityType] of [[input.electricity_reading_id, 'ELECTRICITY'], [input.water_reading_id, 'WATER']] as const) if (readingId) { const reading = await repo.first('SELECT id,unit_id,tenancy_id,utility_type FROM utility_readings WHERE id=?', readingId); if (!reading || String(reading.unit_id) !== String(tenancy.unit_id) || String(reading.tenancy_id ?? '') !== tenancyId || reading.utility_type !== utilityType) throw new ApiError(422, 'INVALID_CHECK_OUT_READING', 'Closing reading does not belong to this Room/Tenancy'); }
  if (input.condition_media_id) { const media = await repo.first('SELECT id,entity_type,entity_id,status FROM media_records WHERE id=?', input.condition_media_id); const validMedia = Boolean(media && media.status === 'ACTIVE' && ((media.entity_type === 'UNIT' && String(media.entity_id) === String(tenancy.unit_id)) || (media.entity_type === 'TENANCY' && String(media.entity_id) === tenancyId))); if (!validMedia) throw new ApiError(422, 'INVALID_CHECK_OUT_MEDIA', 'Condition evidence does not belong to this Room or Tenancy'); }
  if (await repo.first('SELECT id FROM tenancy_checkouts WHERE tenancy_id=?', tenancyId)) throw new ApiError(409, 'CHECKOUT_ALREADY_RECORDED', 'Check-out has already been recorded');
  const timestamp = now(); const id = crypto.randomUUID();
  const tasks: [string, string, boolean][] = [['CLEANING','Cleaning',true],['LINEN','Linen and consumables',false],['INVENTORY_RESTORATION','Inventory restoration',true],['MAINTENANCE','Maintenance and damages',true],['AC','Air conditioning check',true],['WATER','Water service check',true],['ELECTRICITY','Electricity service check',true],['KEYS','Keys and access devices',true],['CONSUMABLES','Consumables',false],['FINAL_INSPECTION','Final inspection',true]];
  const statements = [{ sql: 'INSERT INTO tenancy_checkouts (id,tenancy_id,actual_check_out_at,performed_by,room_condition,notes,created_at,confirmed_at,electricity_reading_id,water_reading_id,condition_media_id,keys_returned,access_devices) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', args: [id, tenancyId, input.actual_check_out_at, actor, input.room_condition ?? null, input.notes ?? null, timestamp, timestamp, input.electricity_reading_id ?? null, input.water_reading_id ?? null, input.condition_media_id ?? null, input.keys_returned ?? null, input.access_devices ?? null] }, { sql: "UPDATE tenancies SET status='ENDED',updated_at=? WHERE id=? AND status='ACTIVE'", args: [timestamp, tenancyId] }, ...tasks.map(task => ({ sql: 'INSERT INTO turnover_tasks (id,unit_id,tenancy_id,task_key,label,is_blocker,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?, ?,?)', args: [crypto.randomUUID(), tenancy.unit_id, tenancyId, task[0], task[1], task[2] ? 1 : 0, 'OPEN', timestamp, timestamp] })), { sql: 'INSERT INTO audit_log (id,action,entity_type,entity_id,payload_json,occurred_at) VALUES (?,?,?,?,?,?)', args: [crypto.randomUUID(), 'CHECK_OUT', 'tenancy', tenancyId, JSON.stringify({ actual_check_out_at: input.actual_check_out_at, performed_by: actor }), timestamp] }];
  if (repo.batch) await repo.batch(statements); else { await repo.run(statements[0].sql, ...(statements[0].args ?? [])); await repo.run(statements[1].sql, ...(statements[1].args ?? [])); for (const statement of statements.slice(2, -1)) await repo.run(statement.sql, ...(statement.args ?? [])); await repo.audit('CHECK_OUT', 'tenancy', tenancyId, { actual_check_out_at: input.actual_check_out_at, performed_by: actor }); }
  return getReadiness(repo, String(tenancy.unit_id));
};

export const getReadiness = async (repo: D1Repository, unitId: string) => {
  if (!await repo.first('SELECT id FROM units WHERE id=?', unitId)) throw new ApiError(404, 'NOT_FOUND', 'Unit not found');
  const tasks = await repo.all("SELECT * FROM turnover_tasks WHERE unit_id=? ORDER BY status DESC,due_at ASC,created_at ASC", unitId);
  const blockers = tasks.filter(task => task.status !== 'DONE' && Number(task.is_blocker) === 1);
  return { unit_id: unitId, state: !tasks.length ? 'NOT_ASSESSED' : blockers.length ? 'NOT_READY' : 'READY', blockers, warnings: tasks.filter(task => task.status !== 'DONE' && Number(task.is_blocker) === 0), tasks };
};

export const updateTurnoverTask = async (repo: D1Repository, taskId: string, input: Record<string, unknown>, actor: string) => {
  const current = await repo.first('SELECT * FROM turnover_tasks WHERE id=?', taskId); if (!current) throw new ApiError(404, 'NOT_FOUND', 'Turnover task not found');
  const status = String(input.status ?? current.status); if (!['OPEN','DONE'].includes(status)) throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid turnover task status'); const timestamp = now();
  await repo.run('UPDATE turnover_tasks SET status=?,completed_at=?,completed_by=?,updated_at=? WHERE id=?', status, status === 'DONE' ? timestamp : null, status === 'DONE' ? actor : null, timestamp, taskId);
  await repo.audit('UPDATE', 'turnover_task', taskId, { status }); return repo.first('SELECT * FROM turnover_tasks WHERE id=?', taskId);
};
