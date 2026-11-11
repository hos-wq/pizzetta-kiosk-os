import { ApiError, D1Repository, now } from './repository';

const statuses = new Set(['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED']);
const priorities = new Set(['URGENT', 'MEDIUM', 'NORMAL']);
const openStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING'];

const issueDetail = async (repo: D1Repository, id: string) => {
  const issue = await repo.first('SELECT * FROM maintenance_issues WHERE id=?', id);
  if (!issue) throw new ApiError(404, 'NOT_FOUND', 'Maintenance issue not found');
  const [events, room, block, tenancy, asset] = await Promise.all([
    repo.all('SELECT id,event_type,note,occurred_at,actor,created_at FROM maintenance_events WHERE issue_id=? ORDER BY occurred_at DESC', id),
    repo.first('SELECT id,actual_unit_number,floor,type,sqm,status FROM units WHERE id=?', issue.unit_id),
    repo.first('SELECT id,start_at,end_at,block_type,reason,maintenance_issue_id,cancelled_at FROM availability_blocks WHERE maintenance_issue_id=? ORDER BY start_at DESC LIMIT 1', id),
    repo.first("SELECT t.id,t.person_id,t.start_at,t.end_at,t.status,p.display_name FROM tenancies t LEFT JOIN persons p ON p.id=t.person_id WHERE t.unit_id=? AND t.status IN ('UPCOMING','ACTIVE') ORDER BY t.start_at LIMIT 1", issue.unit_id),
    repo.first('SELECT a.id,a.name,a.asset_type,a.brand,a.model,a.serial_number,a.condition,a.status FROM inventory_assets a WHERE a.id=?', issue.inventory_asset_id ?? ''),
  ]);
  return { ...issue, events, room, availability_block: block, tenancy_context: tenancy, inventory_asset: asset };
};

const assertUnit = async (repo: D1Repository, unitId: string) => {
  const unit = await repo.first('SELECT id FROM units WHERE id=?', unitId);
  if (!unit) throw new ApiError(404, 'NOT_FOUND', 'Unit not found');
};
const assertInventoryAssetForUnit = async (repo: D1Repository, assetId: unknown, unitId: string) => {
  if (!assetId) return;
  const asset = await repo.first('SELECT a.id,n.unit_id FROM inventory_assets a JOIN inventory_nodes n ON n.id=a.node_id WHERE a.id=?', String(assetId));
  if (!asset) throw new ApiError(404, 'NOT_FOUND', 'Inventory asset not found');
  if (String(asset.unit_id) !== unitId) throw new ApiError(422, 'VALIDATION_ERROR', 'Inventory asset belongs to another Room');
};

const assertPriority = (value: unknown) => { if (!priorities.has(String(value))) throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid maintenance priority'); };
const assertStatus = (value: unknown) => { if (!statuses.has(String(value))) throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid maintenance status'); };
const issueId = () => crypto.randomUUID();

export const listMaintenance = async (repo: D1Repository, query: Record<string, unknown>) => {
  const limit = Number(query.limit ?? 50); const search = String(query.search ?? '').trim(); const pattern = `%${search}%`;
  const status = query.status ? String(query.status) : null; const priority = query.priority ? String(query.priority) : null; const unitId = query.unit_id ? String(query.unit_id) : null;
  if (status) assertStatus(status); if (priority) assertPriority(priority);
  const rows = await repo.all(`SELECT m.*,u.actual_unit_number, u.status AS room_status, p.display_name AS tenant_name FROM maintenance_issues m JOIN units u ON u.id=m.unit_id LEFT JOIN tenancies t ON t.unit_id=m.unit_id AND t.status IN ('UPCOMING','ACTIVE') LEFT JOIN persons p ON p.id=t.person_id WHERE (? IS NULL OR m.status=?) AND (? IS NULL OR m.priority=?) AND (? IS NULL OR m.unit_id=?) AND (?='' OR m.title LIKE ? OR m.description LIKE ? OR m.area LIKE ? OR COALESCE(m.asset,'') LIKE ?) ORDER BY CASE WHEN m.status IN ('OPEN','IN_PROGRESS','WAITING') THEN 0 ELSE 1 END, CASE m.priority WHEN 'URGENT' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END, m.updated_at DESC LIMIT ?`, status, status, priority, priority, unitId, unitId, search, pattern, pattern, pattern, pattern, limit);
  return rows;
};

export const createMaintenanceIssue = async (repo: D1Repository, input: Record<string, unknown>, actor: string) => {
  await assertUnit(repo, String(input.unit_id)); await assertInventoryAssetForUnit(repo, input.inventory_asset_id, String(input.unit_id)); assertPriority(input.priority);
  const id = issueId(); const timestamp = now(); const openedAt = String(input.opened_at ?? timestamp);
  await repo.run('INSERT INTO maintenance_issues (id,unit_id,inventory_asset_id,area,asset,title,description,priority,status,opened_at,resolved_at,closed_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', id, input.unit_id, input.inventory_asset_id ?? null, input.area, input.asset ?? null, input.title, input.description, input.priority, 'OPEN', openedAt, null, null, timestamp, timestamp);
  await repo.run('INSERT INTO maintenance_events (id,issue_id,event_type,note,occurred_at,actor,created_at) VALUES (?,?,?,?,?,?,?)', issueId(), id, 'NOTE', `Issue opened: ${String(input.title)}`, openedAt, actor, timestamp);
  if (input.availability_impact === true) await createAvailabilityBlock(repo, id, String(input.unit_id), input.availability_start_at, input.availability_end_at, input.availability_reason ?? input.title, timestamp);
  await repo.audit('CREATE', 'maintenance_issue', id, { unit_id: input.unit_id, priority: input.priority, availability_impact: input.availability_impact === true });
  return issueDetail(repo, id);
};

const createAvailabilityBlock = async (repo: D1Repository, issueIdValue: string, unitId: string, startAt: unknown, endAt: unknown, reason: unknown, timestamp: string) => {
  const startMs = startAt ? Date.parse(String(startAt)) : NaN; const endMs = endAt == null ? null : Date.parse(String(endAt));
  if (!Number.isFinite(startMs) || (endMs !== null && (!Number.isFinite(endMs) || startMs >= endMs))) throw new ApiError(422, 'VALIDATION_ERROR', 'A valid availability interval is required');
  await repo.run('INSERT INTO availability_blocks (id,unit_id,start_at,end_at,block_type,reason,created_at,updated_at,maintenance_issue_id) VALUES (?,?,?,?,?,?,?,?,?)', issueId(), unitId, startAt, endAt ?? null, 'MAINTENANCE', reason ?? null, timestamp, timestamp, issueIdValue);
};

export const updateMaintenanceIssue = async (repo: D1Repository, id: string, input: Record<string, unknown>, actor: string) => {
  const current = await repo.first('SELECT * FROM maintenance_issues WHERE id=?', id); if (!current) throw new ApiError(404, 'NOT_FOUND', 'Maintenance issue not found');
  if (input.inventory_asset_id !== undefined) await assertInventoryAssetForUnit(repo, input.inventory_asset_id, String(current.unit_id));
  if (input.priority !== undefined) assertPriority(input.priority); if (input.status !== undefined) assertStatus(input.status);
  const fields = ['priority', 'status', 'title', 'description', 'area', 'asset', 'inventory_asset_id']; const entries = Object.entries(input).filter(([key]) => fields.includes(key));
  const timestamp = now(); const events: { type: string; note: string }[] = [];
  if (input.priority !== undefined && input.priority !== current.priority) events.push({ type: 'PRIORITY_CHANGED', note: `Priority changed to ${String(input.priority)}` });
  if (input.status !== undefined && input.status !== current.status) events.push({ type: input.status === 'RESOLVED' ? 'RESOLVED' : input.status === 'OPEN' && current.status === 'RESOLVED' ? 'REOPENED' : 'STATUS_CHANGED', note: `Status changed to ${String(input.status)}` });
  if (!entries.length && input.availability_impact === undefined) throw new ApiError(422, 'VALIDATION_ERROR', 'No editable maintenance fields supplied');
  if (entries.length) {
    const resolved = input.status === 'RESOLVED' ? timestamp : input.status === 'OPEN' && current.status === 'RESOLVED' ? null : current.resolved_at;
    const closed = input.status === 'CLOSED' ? timestamp : current.closed_at;
    await repo.run(`UPDATE maintenance_issues SET ${entries.map(([key]) => `${key}=?`).join(',')},resolved_at=?,closed_at=?,updated_at=? WHERE id=?`, ...entries.map(([, value]) => value), resolved, closed, timestamp, id);
  }
  if (input.availability_impact === true) {
    await createAvailabilityBlock(repo, id, String(current.unit_id), input.availability_start_at, input.availability_end_at, input.availability_reason ?? current.title, timestamp);
    events.push({ type: 'AVAILABILITY_CHANGED', note: 'Availability block created by operator' });
  }
  if (input.availability_impact === false) { await repo.run('UPDATE availability_blocks SET cancelled_at=?,updated_at=? WHERE maintenance_issue_id=? AND cancelled_at IS NULL', timestamp, timestamp, id); events.push({ type: 'AVAILABILITY_CHANGED', note: 'Availability block cancelled by operator; historical record retained' }); }
  for (const event of events) await repo.run('INSERT INTO maintenance_events (id,issue_id,event_type,note,occurred_at,actor,created_at) VALUES (?,?,?,?,?,?,?)', issueId(), id, event.type, event.note, timestamp, actor, timestamp);
  await repo.audit('UPDATE', 'maintenance_issue', id, { fields: Object.keys(input) });
  return issueDetail(repo, id);
};

export const addMaintenanceEvent = async (repo: D1Repository, id: string, input: Record<string, unknown>, actor: string) => {
  const current = await repo.first('SELECT id FROM maintenance_issues WHERE id=?', id); if (!current) throw new ApiError(404, 'NOT_FOUND', 'Maintenance issue not found');
  const timestamp = now(); await repo.run('INSERT INTO maintenance_events (id,issue_id,event_type,note,occurred_at,actor,created_at) VALUES (?,?,?,?,?,?,?)', issueId(), id, input.event_type ?? 'NOTE', input.note, input.occurred_at ?? timestamp, actor, timestamp); await repo.run('UPDATE maintenance_issues SET updated_at=? WHERE id=?', timestamp, id); await repo.audit('ACTIVITY', 'maintenance_issue', id, { event_type: input.event_type ?? 'NOTE' }); return issueDetail(repo, id);
};

export const getMaintenanceIssue = (repo: D1Repository, id: string) => issueDetail(repo, id);
