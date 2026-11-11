import { ApiError, D1Repository, now } from './repository';
import { catalogId, catalogKey, expandedCatalog } from './service-catalog';

const types = new Set(['MAINTENANCE','HOUSEKEEPING']);
const priorities = new Set(['NORMAL','URGENT']);
const statuses = new Set(['PENDING','IN_PROGRESS','DONE']);
const id = () => crypto.randomUUID();
const assert = (condition: unknown, message: string) => { if (!condition) throw new ApiError(422, 'VALIDATION_ERROR', message); };

const assertUnit = async (repo: D1Repository, unitId: string) => { if (!await repo.first('SELECT id FROM units WHERE id=?', unitId)) throw new ApiError(404, 'NOT_FOUND', 'Room not found'); };
const row = async (repo: D1Repository, taskId: string) => {
  const result = await repo.first("SELECT m.*,CASE WHEN m.status IN ('OPEN','WAITING') THEN 'PENDING' WHEN m.status='RESOLVED' OR m.status='CLOSED' THEN 'DONE' ELSE m.status END AS service_status,u.actual_unit_number,p.display_name AS tenant_name FROM maintenance_issues m JOIN units u ON u.id=m.unit_id LEFT JOIN tenancies t ON t.unit_id=m.unit_id AND t.status IN ('UPCOMING','ACTIVE') LEFT JOIN persons p ON p.id=t.person_id WHERE m.id=?", taskId);
  if (!result) throw new ApiError(404, 'NOT_FOUND', 'Service task not found');
  return result;
};

export const listServiceTasks = async (repo: D1Repository, query: Record<string, unknown>) => {
  const type = query.service_type ? String(query.service_type) : null; const unit = query.unit_id ? String(query.unit_id) : null; const status = query.status ? String(query.status) : null; const limit = Number(query.limit ?? 100);
  if (type) assert(types.has(type), 'Invalid service type'); if (status) assert(statuses.has(status), 'Invalid service status');
  const oldStatus = status === 'PENDING' ? 'OPEN' : status === 'DONE' ? 'RESOLVED' : status;
  return repo.all("SELECT m.*,CASE WHEN m.status IN ('OPEN','WAITING') THEN 'PENDING' WHEN m.status IN ('RESOLVED','CLOSED') THEN 'DONE' ELSE m.status END AS service_status,u.actual_unit_number,p.display_name AS tenant_name FROM maintenance_issues m JOIN units u ON u.id=m.unit_id LEFT JOIN tenancies t ON t.unit_id=m.unit_id AND t.status IN ('UPCOMING','ACTIVE') LEFT JOIN persons p ON p.id=t.person_id WHERE (? IS NULL OR m.service_type=?) AND (? IS NULL OR m.unit_id=?) AND (? IS NULL OR m.status=? OR (m.status='WAITING' AND ?='OPEN') OR (m.status='CLOSED' AND ?='RESOLVED')) ORDER BY CASE WHEN m.status IN ('OPEN','IN_PROGRESS','WAITING') THEN 0 ELSE 1 END,CASE m.priority WHEN 'URGENT' THEN 0 ELSE 1 END,m.scheduled_at,m.updated_at DESC LIMIT ?", type,type,unit,unit,status,oldStatus,oldStatus,limit);
};

export const createServiceTask = async (repo: D1Repository, input: Record<string, unknown>, actor: string) => {
  const serviceType = String(input.service_type); const priority = String(input.priority ?? 'NORMAL');
  assert(types.has(serviceType), 'Invalid service type'); assert(priorities.has(priority), 'Invalid service priority'); await assertUnit(repo, String(input.unit_id));
  const chain = await assertCatalogChain(repo,input); const objectSnapshot = chain ? String(chain.object.label) : String(input.object_snapshot); const actionSnapshot = chain ? String(chain.action.label) : String(input.action_snapshot); const objectKey = chain ? String(chain.object.node_key) : String(input.object_key); const actionKey = chain ? String(chain.action.node_key) : String(input.action_key);
  const timestamp = now(); const taskId = id(); const title = `${objectSnapshot} · ${actionSnapshot}`;
  await repo.run('INSERT INTO maintenance_issues (id,unit_id,area,asset,title,description,priority,status,opened_at,resolved_at,closed_at,created_at,updated_at,service_type,object_key,action_key,object_snapshot,action_snapshot,assigned_to,scheduled_at,notes,catalog_macro_id,catalog_category_id,catalog_object_id,catalog_action_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', taskId,input.unit_id,serviceType,objectSnapshot,title,String(input.notes ?? title),priority,'OPEN',timestamp,null,null,timestamp,timestamp,serviceType,objectKey,actionKey,objectSnapshot,actionSnapshot,input.assigned_to ?? null,input.scheduled_at ?? null,input.notes ?? null,chain?.macro.id ?? null,chain?.category.id ?? null,chain?.object.id ?? null,chain?.action.id ?? null);
  await repo.run('INSERT INTO maintenance_events (id,issue_id,event_type,note,occurred_at,actor,created_at) VALUES (?,?,?,?,?,?,?)',id(),taskId,'NOTE','Service task created',timestamp,actor,timestamp);
  await repo.audit('CREATE','service_task',taskId,{service_type:serviceType,unit_id:input.unit_id,object_key:input.object_key,action_key:input.action_key}); return row(repo,taskId);
};

export const updateServiceTask = async (repo: D1Repository, taskId: string, input: Record<string, unknown>, actor: string) => {
  const current = await row(repo,taskId); const requested = input.status == null ? String(current.service_status) : String(input.status); const currentStatus = String(current.service_status);
  assert(statuses.has(requested), 'Invalid service status'); assert(priorities.has(String(input.priority ?? current.priority)), 'Invalid service priority');
  if (currentStatus === 'DONE' && requested !== 'DONE') throw new ApiError(409,'TASK_FINALIZED','Completed service tasks are immutable; create a replacement task');
  const nextDbStatus = requested === 'PENDING' ? 'OPEN' : requested === 'DONE' ? 'RESOLVED' : 'IN_PROGRESS'; const timestamp = now();
  await repo.run('UPDATE maintenance_issues SET status=?,priority=?,assigned_to=?,scheduled_at=?,notes=?,resolved_at=?,updated_at=? WHERE id=?',nextDbStatus,input.priority ?? current.priority,input.assigned_to === undefined ? current.assigned_to : input.assigned_to,input.scheduled_at === undefined ? current.scheduled_at : input.scheduled_at,input.notes === undefined ? current.notes : input.notes,requested === 'DONE' ? timestamp : null,timestamp,taskId);
  if (requested !== currentStatus) await repo.run('INSERT INTO maintenance_events (id,issue_id,event_type,note,occurred_at,actor,created_at) VALUES (?,?,?,?,?,?,?)',id(),taskId,requested === 'DONE' ? 'RESOLVED' : 'STATUS_CHANGED',`Service status changed to ${requested}`,timestamp,actor,timestamp);
  await repo.audit('UPDATE','service_task',taskId,{fields:Object.keys(input),from:currentStatus,to:requested}); return row(repo,taskId);
};

export const getServiceTask = (repo: D1Repository, taskId: string) => row(repo,taskId);

const catalogLevels = new Set(['MACRO','CATEGORY','OBJECT','ACTION']);
const catalogNode = async (repo: D1Repository, id: string) => repo.first('SELECT * FROM service_catalog_nodes WHERE id=?', id);

export const ensureServiceCatalog = async (repo: D1Repository) => {
  const seed = expandedCatalog();
  const existing = await repo.first('SELECT id FROM service_catalog_nodes WHERE id=? LIMIT 1', seed[0]?.id);
  if (existing) return;
  const timestamp = now();
  await repo.batch(seed.map(node => ({ sql:'INSERT OR IGNORE INTO service_catalog_nodes (id,service_type,level,parent_id,node_key,label,active,created_at,updated_at) VALUES (?,?,?,?,?,?,1,?,?)', args:[node.id,node.service_type,node.level,node.parent_id,node.node_key,node.label,timestamp,timestamp] })));
};

export const listServiceCatalog = async (repo: D1Repository, query: Record<string, unknown>) => {
  await ensureServiceCatalog(repo);
  const service = query.service_type ? String(query.service_type) : null;
  const parent = query.parent_id ? String(query.parent_id) : null;
  const level = query.level ? String(query.level) : null;
  const includeArchived = Boolean(query.include_archived);
  if (service) assert(types.has(service), 'Invalid service type');
  if (level) assert(catalogLevels.has(level), 'Invalid catalog level');
  return repo.all('SELECT id,service_type,level,parent_id,node_key,label,active,created_at,updated_at,archived_at FROM service_catalog_nodes WHERE (? IS NULL OR service_type=?) AND (? IS NULL OR parent_id=?) AND (? IS NULL OR level=?) AND (?=1 OR active=1) ORDER BY label COLLATE NOCASE', service,service,parent,parent,level,level,includeArchived ? 1 : 0);
};

const assertCatalogChain = async (repo: D1Repository, input: Record<string, unknown>) => {
  const ids = ['catalog_macro_id','catalog_category_id','catalog_object_id','catalog_action_id'].map(key => input[key] == null ? null : String(input[key]));
  if (ids.every(value => value === null)) return null;
  assert(ids.every(Boolean), 'Complete catalog hierarchy is required');
  const [macro, category, object, action] = await Promise.all(ids.map(value => catalogNode(repo, value!)));
  assert(macro && category && object && action, 'Catalog entry not found');
  const macroNode = macro!; const categoryNode = category!; const objectNode = object!; const actionNode = action!;
  assert(macroNode.service_type === input.service_type && categoryNode.service_type === input.service_type && objectNode.service_type === input.service_type && actionNode.service_type === input.service_type, 'Catalog service mismatch');
  assert(macroNode.level === 'MACRO' && categoryNode.level === 'CATEGORY' && objectNode.level === 'OBJECT' && actionNode.level === 'ACTION', 'Invalid catalog hierarchy levels');
  assert(categoryNode.parent_id === macroNode.id && objectNode.parent_id === categoryNode.id && actionNode.parent_id === objectNode.id, 'Invalid catalog parent-child relationship');
  assert(Number(macroNode.active) === 1 && Number(categoryNode.active) === 1 && Number(objectNode.active) === 1 && Number(actionNode.active) === 1, 'Archived catalog entry cannot be used for a new task');
  return { macro: macroNode, category: categoryNode, object: objectNode, action: actionNode };
};

export const createServiceCatalogNode = async (repo: D1Repository, input: Record<string, unknown>, actor: string) => {
  await ensureServiceCatalog(repo);
  const serviceType = String(input.service_type); const level = String(input.level); const label = String(input.label).trim();
  assert(types.has(serviceType), 'Invalid service type'); assert(catalogLevels.has(level), 'Invalid catalog level'); assert(label.length > 0, 'Catalog label is required');
  const parentId = input.parent_id == null ? null : String(input.parent_id);
  if (level === 'MACRO') assert(parentId === null, 'Macro cannot have a parent');
  else { assert(Boolean(parentId), 'Parent is required'); const parent = await catalogNode(repo,parentId!); assert(parent && parent.service_type === serviceType && ((level === 'CATEGORY' && parent.level === 'MACRO') || (level === 'OBJECT' && parent.level === 'CATEGORY') || (level === 'ACTION' && parent.level === 'OBJECT')), 'Invalid catalog parent'); assert(Number(parent!.active) === 1, 'Parent catalog entry is archived'); }
  const key = catalogKey(label); const nodeId = catalogId(serviceType,level,parentId ? String((await catalogNode(repo,parentId))?.node_key ?? parentId) : null,label); const timestamp = now();
  if (await repo.first('SELECT id FROM service_catalog_nodes WHERE service_type=? AND (parent_id=? OR (parent_id IS NULL AND ? IS NULL)) AND node_key=?',serviceType,parentId,parentId,key)) throw new ApiError(409,'DUPLICATE_CATALOG_ENTRY','Catalog entry already exists under this parent');
  const insertion = await repo.run('INSERT OR IGNORE INTO service_catalog_nodes (id,service_type,level,parent_id,node_key,label,active,created_at,updated_at) VALUES (?,?,?,?,?,?,1,?,?)',nodeId,serviceType,level,parentId,key,label,timestamp,timestamp) as { meta?: { changes?: number } };
  if (insertion.meta?.changes === 0) throw new ApiError(409,'DUPLICATE_CATALOG_ENTRY','Catalog entry already exists under this parent');
  await repo.audit('CREATE','service_catalog_node',nodeId,{service_type:serviceType,level,parent_id:parentId,label});
  return catalogNode(repo,nodeId);
};

export const updateServiceCatalogNode = async (repo: D1Repository, nodeId: string, input: Record<string, unknown>, actor: string) => {
  await ensureServiceCatalog(repo); const current = await catalogNode(repo,nodeId); if (!current) throw new ApiError(404,'NOT_FOUND','Catalog entry not found');
  const updates: string[] = []; const values: unknown[] = [];
  if (input.label !== undefined) { const label = String(input.label).trim(); assert(label.length > 0, 'Catalog label is required'); const key = catalogKey(label); const parentId = current.parent_id ?? null; if (await repo.first('SELECT id FROM service_catalog_nodes WHERE service_type=? AND (parent_id=? OR (parent_id IS NULL AND ? IS NULL)) AND node_key=? AND id<>?',current.service_type,parentId,parentId,key,nodeId)) throw new ApiError(409,'DUPLICATE_CATALOG_ENTRY','Catalog entry already exists under this parent'); updates.push('label=?','node_key=?'); values.push(label,key); }
  if (input.active === false) { updates.push('active=?','archived_at=?'); values.push(0,now()); }
  if (input.active === true) { assert(current.parent_id === null || await repo.first('SELECT id FROM service_catalog_nodes WHERE id=? AND active=1',current.parent_id), 'Cannot restore under an archived parent'); updates.push('active=?','archived_at=?'); values.push(1,null); }
  assert(updates.length > 0, 'No catalog changes supplied'); updates.push('updated_at=?'); values.push(now(),nodeId);
  await repo.run(`UPDATE service_catalog_nodes SET ${updates.join(',')} WHERE id=?`,...values); await repo.audit('UPDATE','service_catalog_node',nodeId,{fields:Object.keys(input),actor}); return catalogNode(repo,nodeId);
};
