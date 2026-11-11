import { ApiError, D1Repository, now } from './repository';

export const inventoryPresence = ['TRUE', 'FALSE', 'UNKNOWN'] as const;
export type InventoryPresence = typeof inventoryPresence[number];
export type InventoryEditorInput = { present: InventoryPresence; quantity?: number | null; inverter?: InventoryPresence | null; hp?: number | null; item_type?: 'WINDOW'|'SPLIT'|null; screen_inches?: number|null; bed_size?: 'SINGLE'|'DOUBLE'|'QUEEN'|'KING'|null };

const assertUnit = async (repo: D1Repository, unitId: string) => {
  const unit = await repo.first('SELECT id FROM units WHERE id=?', unitId);
  if (!unit) throw new ApiError(404, 'NOT_FOUND', 'Room not found');
};

export const normalizeInventoryState = (input: InventoryEditorInput, isAirConditioner: boolean) => ({
  present: input.present,
  quantity: input.present === 'TRUE' ? (input.quantity ?? 1) : null,
  inverter: isAirConditioner ? (input.inverter ?? 'UNKNOWN') : null,
  hp: isAirConditioner ? (input.hp ?? null) : null,
  item_type: isAirConditioner ? (input.item_type ?? null) : null,
  screen_inches: input.screen_inches ?? null,
  bed_size: input.bed_size ?? null,
});

type CatalogNode = { id:string; scope_unit_id:string|null; parent_id:string|null; level:'MACRO'|'CATEGORY'|'ITEM'; name:string; is_air_conditioner:number; attribute_schema?:string|null; sort_order:number; active:number };
type RoomState = { catalog_item_id:string; present:InventoryPresence; quantity:number|null; inverter:InventoryPresence|null; hp:number|null; item_type?:string|null; screen_inches?:number|null; bed_size?:string|null };

export const buildCanonicalInventory = (unitId:string, nodes:CatalogNode[], states:RoomState[]) => {
  const stateMap = new Map(states.map(state => [state.catalog_item_id, state]));
  const active = nodes.filter(node => node.active === 1).sort((a,b) => a.sort_order-b.sort_order || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const categories = active.filter(node => node.level === 'CATEGORY');
  const macros = active.filter(node => node.level === 'MACRO');
  return { schema_version: 1, unit_id: unitId, macros: macros.map(macro => ({ id:macro.id, name:macro.name, categories: categories.filter(category => category.parent_id === macro.id).map(category => ({ id:category.id, name:category.name, items: active.filter(item => item.level === 'ITEM' && item.parent_id === category.id).map(item => { const state:RoomState = stateMap.get(item.id) ?? { catalog_item_id:item.id, present:'UNKNOWN', quantity:null, inverter:item.is_air_conditioner ? 'UNKNOWN' : null, hp:null, item_type:null, screen_inches:null, bed_size:null }; return { id:item.id, name:item.name, present:state.present, quantity:state.quantity, ...(item.is_air_conditioner ? { item_type:state.item_type ?? null, inverter:state.inverter ?? 'UNKNOWN', hp:state.hp } : {}), ...(item.id === 'inv-item-smart-tv' || item.attribute_schema?.includes('screen_inches') ? { screen_inches:state.screen_inches ?? null } : {}), ...(item.id === 'inv-item-bed' || item.attribute_schema?.includes('bed_size') ? { bed_size:state.bed_size ?? null } : {}) }; }) })) })) };
};

const loadNodes = async (repo:D1Repository, unitId:string) => await repo.all("SELECT id,scope_unit_id,parent_id,level,name,is_air_conditioner,attribute_schema,sort_order,active FROM inventory_catalog_nodes WHERE active=1 AND (scope_unit_id IS NULL OR scope_unit_id=?) ORDER BY sort_order,name,id", unitId) as unknown as CatalogNode[];
const loadStates = async (repo:D1Repository, unitId:string) => await repo.all('SELECT catalog_item_id,present,quantity,inverter,hp,item_type,screen_inches,bed_size FROM inventory_room_item_states WHERE unit_id=?', unitId) as unknown as RoomState[];

export const getRoomInventoryEditor = async (repo:D1Repository, unitId:string) => {
  await assertUnit(repo, unitId);
  const nodes = await loadNodes(repo, unitId); const states = await loadStates(repo, unitId);
  const stateMap = new Map(states.map(state => [state.catalog_item_id, state]));
  return { unit_id: unitId, nodes: nodes.map(node => ({ ...node, state: node.level === 'ITEM' ? stateMap.get(node.id) ?? { catalog_item_id:node.id, present:'UNKNOWN', quantity:null, inverter:node.is_air_conditioner ? 'UNKNOWN' : null, hp:null, item_type:null, screen_inches:null, bed_size:null } : undefined })), states, canonical: buildCanonicalInventory(unitId, nodes, states) };
};

const assertCatalogParent = async (repo:D1Repository, input:{ scope_unit_id?:string|null; parent_id?:string|null; level:'MACRO'|'CATEGORY'|'ITEM' }) => {
  if (input.level === 'MACRO' && input.parent_id) throw new ApiError(422, 'VALIDATION_ERROR', 'Macro categories cannot have a parent');
  if (input.level !== 'MACRO' && !input.parent_id) throw new ApiError(422, 'VALIDATION_ERROR', 'A category or item requires a parent');
  if (!input.parent_id) return null;
  const parent = await repo.first('SELECT id,scope_unit_id,level,active FROM inventory_catalog_nodes WHERE id=?', input.parent_id);
  if (!parent || Number(parent.active) !== 1) throw new ApiError(422, 'VALIDATION_ERROR', 'Parent taxonomy node is not active');
  const expected = input.level === 'CATEGORY' ? 'MACRO' : 'CATEGORY';
  if (String(parent.level) !== expected) throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid taxonomy hierarchy');
  if (parent.scope_unit_id && parent.scope_unit_id !== (input.scope_unit_id ?? null)) throw new ApiError(422, 'VALIDATION_ERROR', 'Parent belongs to another Room');
  return parent;
};

export const updateRoomInventoryItem = async (repo:D1Repository, unitId:string, itemId:string, input:InventoryEditorInput, actor:string) => {
  await assertUnit(repo, unitId);
  const item = await repo.first("SELECT id,is_air_conditioner,scope_unit_id,level,active FROM inventory_catalog_nodes WHERE id=?", itemId);
  if (!item || String(item.level) !== 'ITEM' || Number(item.active) !== 1 || (item.scope_unit_id && item.scope_unit_id !== unitId)) throw new ApiError(404, 'NOT_FOUND', 'Inventory item not found for Room');
  const state = normalizeInventoryState(input, Number(item.is_air_conditioner) === 1); const timestamp = now();
  await repo.run('INSERT INTO inventory_room_item_states (id,unit_id,catalog_item_id,present,quantity,inverter,hp,item_type,screen_inches,bed_size,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(unit_id,catalog_item_id) DO UPDATE SET present=excluded.present,quantity=excluded.quantity,inverter=excluded.inverter,hp=excluded.hp,item_type=excluded.item_type,screen_inches=excluded.screen_inches,bed_size=excluded.bed_size,updated_at=excluded.updated_at', crypto.randomUUID(), unitId, itemId, state.present, state.quantity, state.inverter, state.hp, state.item_type, state.screen_inches, state.bed_size, timestamp, timestamp);
  repo.setActor(actor); await repo.audit('UPDATE', 'inventory_room_item_state', `${unitId}:${itemId}`, { unit_id:unitId, catalog_item_id:itemId, fields:['present','quantity',...(Number(item.is_air_conditioner) === 1 ? ['inverter','hp'] : [])] });
  return getRoomInventoryEditor(repo, unitId);
};

export const createRoomInventoryNode = async (repo:D1Repository, input:{scope_unit_id?:string|null; parent_id?:string|null; level:'MACRO'|'CATEGORY'|'ITEM'; name:string; is_air_conditioner?:boolean; sort_order?:number}, actor:string) => {
  const scope = input.scope_unit_id ?? null; if (scope) await assertUnit(repo, scope); await assertCatalogParent(repo, input);
  if (input.level !== 'ITEM' && input.is_air_conditioner) throw new ApiError(422, 'VALIDATION_ERROR', 'Only an item can be an air conditioner');
  const id = crypto.randomUUID(), timestamp = now();
  await repo.run('INSERT INTO inventory_catalog_nodes (id,scope_unit_id,parent_id,level,name,is_air_conditioner,sort_order,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)', id, scope, input.parent_id ?? null, input.level, input.name.trim(), input.is_air_conditioner ? 1 : 0, input.sort_order ?? 0, 1, timestamp, timestamp);
  repo.setActor(actor); await repo.audit('CREATE', 'inventory_catalog_node', id, { scope_unit_id:scope, parent_id:input.parent_id ?? null, level:input.level });
  return repo.first('SELECT * FROM inventory_catalog_nodes WHERE id=?', id);
};

export const updateRoomInventoryNode = async (repo:D1Repository, nodeId:string, input:{name?:string; active?:boolean; sort_order?:number; is_air_conditioner?:boolean}, actor:string) => {
  const current = await repo.first('SELECT * FROM inventory_catalog_nodes WHERE id=?', nodeId); if (!current) throw new ApiError(404, 'NOT_FOUND', 'Inventory taxonomy node not found');
  if (!current.scope_unit_id && input.active === false) throw new ApiError(409, 'MASTER_TAXONOMY', 'Master taxonomy cannot be archived');
  if (input.active === false) { const child = await repo.first('SELECT id FROM inventory_catalog_nodes WHERE parent_id=? AND active=1 LIMIT 1', nodeId); if (child) throw new ApiError(409, 'NODE_NOT_EMPTY', 'Archive child taxonomy nodes first'); }
  const fields: Array<[string,unknown]> = []; if (input.name !== undefined) fields.push(['name', input.name.trim()]); if (input.active !== undefined) fields.push(['active', input.active ? 1 : 0]); if (input.sort_order !== undefined) fields.push(['sort_order', input.sort_order]); if (input.is_air_conditioner !== undefined) fields.push(['is_air_conditioner', input.is_air_conditioner ? 1 : 0]);
  if (!fields.length) throw new ApiError(422, 'VALIDATION_ERROR', 'No editable fields supplied'); const timestamp = now(); await repo.run(`UPDATE inventory_catalog_nodes SET ${fields.map(([key]) => `${key}=?`).join(',')},updated_at=? WHERE id=?`, ...fields.map(([,value]) => value), timestamp, nodeId); repo.setActor(actor); await repo.audit('UPDATE', 'inventory_catalog_node', nodeId, { fields:fields.map(([key]) => key) }); return repo.first('SELECT * FROM inventory_catalog_nodes WHERE id=?', nodeId);
};

export const copyRoomInventory = async (repo:D1Repository, sourceUnitId:string, targetUnitId:string, actor:string) => {
  await assertUnit(repo, sourceUnitId); await assertUnit(repo, targetUnitId); const sourceNodes = await repo.all('SELECT * FROM inventory_catalog_nodes WHERE scope_unit_id=? AND active=1 ORDER BY level,sort_order,name,id', sourceUnitId) as unknown as CatalogNode[]; const map = new Map<string,string>();
  for (const node of sourceNodes) { const parent = node.parent_id && map.get(node.parent_id) ? map.get(node.parent_id)! : node.parent_id; const existing = await repo.first('SELECT id FROM inventory_catalog_nodes WHERE scope_unit_id=? AND parent_id IS ? AND level=? AND name=? AND active=1', targetUnitId, parent ?? null, node.level, node.name); const id = existing ? String(existing.id) : crypto.randomUUID(); map.set(node.id, id); if (!existing) await repo.run('INSERT INTO inventory_catalog_nodes (id,scope_unit_id,parent_id,level,name,is_air_conditioner,sort_order,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)', id,targetUnitId,parent ?? null,node.level,node.name,node.is_air_conditioner,node.sort_order,1,now(),now()); }
  const states = await repo.all('SELECT * FROM inventory_room_item_states WHERE unit_id=?', sourceUnitId) as Array<Record<string,unknown>>; for (const state of states) { const targetItem = map.get(String(state.catalog_item_id)) ?? String(state.catalog_item_id); await repo.run('INSERT INTO inventory_room_item_states (id,unit_id,catalog_item_id,present,quantity,inverter,hp,item_type,screen_inches,bed_size,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(unit_id,catalog_item_id) DO UPDATE SET present=excluded.present,quantity=excluded.quantity,inverter=excluded.inverter,hp=excluded.hp,item_type=excluded.item_type,screen_inches=excluded.screen_inches,bed_size=excluded.bed_size,updated_at=excluded.updated_at',crypto.randomUUID(),targetUnitId,targetItem,state.present,state.quantity,state.inverter,state.hp,state.item_type,state.screen_inches,state.bed_size,now(),now()); }
  repo.setActor(actor); await repo.audit('COPY', 'inventory_room_item_state', targetUnitId, { source_unit_id:sourceUnitId, target_unit_id:targetUnitId }); return getRoomInventoryEditor(repo,targetUnitId);
};
