import { ApiError, D1Repository, now } from './repository';

const nodeTypes = new Set(['LOCATION', 'CATEGORY']);
const conditions = new Set(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']);
const assetStatuses = new Set(['ACTIVE', 'RETIRED']);
const id = () => crypto.randomUUID();

const assertUnit = async (repo: D1Repository, unitId: string) => {
  const unit = await repo.first('SELECT id FROM units WHERE id=?', unitId);
  if (!unit) throw new ApiError(404, 'NOT_FOUND', 'Unit not found');
};
const assertNode = async (repo: D1Repository, nodeId: string) => {
  const node = await repo.first('SELECT * FROM inventory_nodes WHERE id=?', nodeId);
  if (!node) throw new ApiError(404, 'NOT_FOUND', 'Inventory node not found');
  return node;
};
const assertAsset = async (repo: D1Repository, assetId: string) => {
  const asset = await repo.first('SELECT * FROM inventory_assets WHERE id=?', assetId);
  if (!asset) throw new ApiError(404, 'NOT_FOUND', 'Inventory asset not found');
  return asset;
};
const assertEnum = (set: Set<string>, value: unknown, message: string) => { if (!set.has(String(value))) throw new ApiError(422, 'VALIDATION_ERROR', message); };

const assertSameUnit = (node: Record<string, unknown>, unitId: string) => { if (String(node.unit_id) !== unitId) throw new ApiError(422, 'VALIDATION_ERROR', 'Inventory parent belongs to another Room'); };

const assertNoCycle = async (repo: D1Repository, nodeId: string, parentId: string | null) => {
  let current = parentId; const visited = new Set<string>();
  while (current) {
    if (current === nodeId || visited.has(current)) throw new ApiError(422, 'VALIDATION_ERROR', 'Inventory re-parenting would create a cycle');
    visited.add(current); const parent = await assertNode(repo, current); current = parent.parent_id ? String(parent.parent_id) : null;
    if (visited.size > 100) throw new ApiError(422, 'VALIDATION_ERROR', 'Inventory hierarchy is too deep');
  }
};

export const getInventoryTree = async (repo: D1Repository, unitId: string, includeRetired = true) => {
  await assertUnit(repo, unitId);
  const nodes = await repo.all('SELECT id,unit_id,parent_id,node_type,name,sort_order,active,created_at,updated_at FROM inventory_nodes WHERE unit_id=? ORDER BY sort_order,name', unitId);
  const assets = await repo.all(`SELECT a.id,a.node_id,a.name,a.asset_type,a.brand,a.model,a.serial_number,a.installed_on,a.condition,a.status,a.notes,a.retired_at,a.created_at,a.updated_at FROM inventory_assets a JOIN inventory_nodes n ON n.id=a.node_id WHERE n.unit_id=? ${includeRetired ? '' : "AND a.status='ACTIVE'"} ORDER BY a.name`, unitId);
  return { unit_id: unitId, nodes, assets };
};

export const getInventoryAsset = async (repo: D1Repository, assetId: string) => {
  const asset = await assertAsset(repo, assetId);
  const [node, room, maintenance] = await Promise.all([
    repo.first('SELECT id,unit_id,parent_id,node_type,name FROM inventory_nodes WHERE id=?', asset.node_id),
    repo.first('SELECT id,actual_unit_number,floor,type,status FROM units WHERE id=(SELECT unit_id FROM inventory_nodes WHERE id=?)', asset.node_id),
    repo.all('SELECT id,title,priority,status,opened_at,resolved_at FROM maintenance_issues WHERE inventory_asset_id=? ORDER BY opened_at DESC', assetId),
  ]);
  return { ...asset, node, room, maintenance };
};

export const createInventoryNode = async (repo: D1Repository, input: Record<string, unknown>, actor: string) => {
  const unitId = String(input.unit_id); await assertUnit(repo, unitId); assertEnum(nodeTypes, input.node_type, 'Invalid inventory node type');
  if (input.parent_id) { const parent = await assertNode(repo, String(input.parent_id)); assertSameUnit(parent, unitId); if (!parent.active) throw new ApiError(422, 'VALIDATION_ERROR', 'Cannot add below an inactive inventory node'); }
  const nodeId = id(); const timestamp = now();
  await repo.run('INSERT INTO inventory_nodes (id,unit_id,parent_id,node_type,name,sort_order,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)', nodeId, unitId, input.parent_id ?? null, input.node_type, input.name, input.sort_order ?? 0, 1, timestamp, timestamp);
  await repo.audit('CREATE', 'inventory_node', nodeId, { unit_id: unitId, node_type: input.node_type });
  return repo.first('SELECT * FROM inventory_nodes WHERE id=?', nodeId);
};

export const createInventoryAsset = async (repo: D1Repository, input: Record<string, unknown>, actor: string) => {
  const node = await assertNode(repo, String(input.node_id)); assertEnum(conditions, input.condition ?? 'GOOD', 'Invalid inventory condition');
  if (input.status !== undefined) assertEnum(assetStatuses, input.status, 'Invalid inventory asset status');
  const assetId = id(); const timestamp = now();
  await repo.run('INSERT INTO inventory_assets (id,node_id,name,asset_type,brand,model,serial_number,installed_on,condition,status,notes,retired_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', assetId, node.id, input.name, input.asset_type ?? null, input.brand ?? null, input.model ?? null, input.serial_number ?? null, input.installed_on ?? null, input.condition ?? 'GOOD', input.status ?? 'ACTIVE', input.notes ?? null, null, timestamp, timestamp);
  await repo.audit('CREATE', 'inventory_asset', assetId, { node_id: node.id, unit_id: node.unit_id });
  return getInventoryAsset(repo, assetId);
};

export const updateInventoryNode = async (repo: D1Repository, nodeId: string, input: Record<string, unknown>, actor: string) => {
  const current = await assertNode(repo, nodeId); const parentId = input.parent_id === undefined ? (current.parent_id ? String(current.parent_id) : null) : input.parent_id ? String(input.parent_id) : null;
  if (parentId) { const parent = await assertNode(repo, parentId); assertSameUnit(parent, String(current.unit_id)); await assertNoCycle(repo, nodeId, parentId); }
  if (input.node_type !== undefined) assertEnum(nodeTypes, input.node_type, 'Invalid inventory node type');
  if (input.active === false && current.active) { const children = await repo.first('SELECT id FROM inventory_nodes WHERE parent_id=? AND active=1 LIMIT 1', nodeId); const assets = await repo.first('SELECT a.id FROM inventory_assets a WHERE a.node_id=? AND a.status=\'ACTIVE\' LIMIT 1', nodeId); if (children || assets) throw new ApiError(409, 'NODE_NOT_EMPTY', 'Archive child nodes and assets before archiving this node'); }
  const fields = Object.entries(input).filter(([key]) => ['name', 'parent_id', 'node_type', 'sort_order', 'active'].includes(key));
  if (!fields.length) throw new ApiError(422, 'VALIDATION_ERROR', 'No editable inventory node fields supplied');
  const timestamp = now(); await repo.run(`UPDATE inventory_nodes SET ${fields.map(([key]) => `${key}=?`).join(',')},updated_at=? WHERE id=?`, ...fields.map(([, value]) => value === true ? 1 : value === false ? 0 : value), timestamp, nodeId); await repo.audit('UPDATE', 'inventory_node', nodeId, { fields: fields.map(([key]) => key) }); return repo.first('SELECT * FROM inventory_nodes WHERE id=?', nodeId);
};

export const updateInventoryAsset = async (repo: D1Repository, assetId: string, input: Record<string, unknown>, actor: string) => {
  const current = await assertAsset(repo, assetId); const fields = Object.entries(input).filter(([key]) => ['name', 'asset_type', 'brand', 'model', 'serial_number', 'installed_on', 'condition', 'status', 'notes'].includes(key));
  if (!fields.length) throw new ApiError(422, 'VALIDATION_ERROR', 'No editable inventory asset fields supplied');
  if (input.condition !== undefined) assertEnum(conditions, input.condition, 'Invalid inventory condition'); if (input.status !== undefined) assertEnum(assetStatuses, input.status, 'Invalid inventory asset status');
  const timestamp = now(); const status = input.status ?? current.status; const retiredAt = status === 'RETIRED' ? (current.retired_at ?? timestamp) : null;
  await repo.run(`UPDATE inventory_assets SET ${fields.map(([key]) => `${key}=?`).join(',')},retired_at=?,updated_at=? WHERE id=?`, ...fields.map(([, value]) => value), retiredAt, timestamp, assetId); await repo.audit('UPDATE', 'inventory_asset', assetId, { fields: fields.map(([key]) => key) }); return getInventoryAsset(repo, assetId);
};

export const restoreInventoryAsset = (repo: D1Repository, assetId: string, actor: string) => updateInventoryAsset(repo, assetId, { status: 'ACTIVE' }, actor);
