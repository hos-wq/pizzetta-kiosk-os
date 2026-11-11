import { ApiError, D1Repository, now } from './repository';
import { getRoomInventoryEditor } from './room-inventory';
import { getUnitDetail } from './domain';
import { copyRoomInventory } from './room-inventory';

export const updateRoomMaster = async (repo:D1Repository, unitId:string, input:Record<string,unknown>, actor:string) => {
  const unit = await repo.first('SELECT id FROM units WHERE id=?', unitId); if (!unit) throw new ApiError(404,'NOT_FOUND','Room not found');
  const current = await repo.first('SELECT unit_id FROM room_master_data WHERE unit_id=?', unitId); const timestamp=now();
  const keys = Object.keys(input); const values = keys.map(key => key === 'terms_json' ? JSON.stringify(input[key]) : input[key]);
  if (current) await repo.run(`UPDATE room_master_data SET ${keys.map(key => `${key}=?`).join(',')},updated_at=? WHERE unit_id=?`, ...values, timestamp, unitId);
  else await repo.run(`INSERT INTO room_master_data (unit_id,${keys.join(',')},created_at,updated_at) VALUES (?,${keys.map(() => '?').join(',')},?,?)`, unitId, ...values, timestamp, timestamp);
  repo.setActor(actor); await repo.audit('UPDATE','room_master_data',unitId,{fields:keys}); return repo.first('SELECT * FROM room_master_data WHERE unit_id=?',unitId);
};

export const getEffectiveRoom = async (repo:D1Repository, unitId:string) => {
  const room = await getUnitDetail(repo,unitId); if (!room) throw new ApiError(404,'NOT_FOUND','Room not found');
  const master = await repo.first('SELECT * FROM room_master_data WHERE unit_id=?',unitId); const inventory = await getRoomInventoryEditor(repo,unitId);
  let terms:unknown = null; if (master?.terms_json) { try { terms=JSON.parse(String(master.terms_json)); } catch { terms=null; } }
  return { schema_version:1, unit:{...room, master_data:master ? {...master,terms_json:terms} : null}, features:room.features ?? [], inventory:inventory.canonical, live_availability:{operational_status:room.status, occupancy_state:room.occupancy_state, next_available_at:room.next_available_at ?? null} };
};

export const copyRoomConfiguration = async (repo:D1Repository, sourceUnitId:string, targetUnitId:string, groups:{features:boolean; inventory:boolean; terms:boolean; property:boolean; commercial:boolean}, actor:string) => {
  const source=await repo.first('SELECT * FROM units WHERE id=?',sourceUnitId); const target=await repo.first('SELECT * FROM units WHERE id=?',targetUnitId); if(!source||!target)throw new ApiError(404,'NOT_FOUND','Room not found');
  if(groups.features){await repo.run('DELETE FROM unit_features WHERE unit_id=?',targetUnitId); const rows=await repo.all('SELECT feature_key,feature_value FROM unit_features WHERE unit_id=?',sourceUnitId); for(const row of rows)await repo.run('INSERT INTO unit_features (unit_id,feature_key,feature_value) VALUES (?,?,?)',targetUnitId,row.feature_key,row.feature_value);}
  const masterFields=['building','address','orientation','view_classification','view_description','acoustic_characteristics','sleeping_configuration','standard_max_occupancy','furnished']; if(groups.property||groups.commercial){if(groups.property){const m=await repo.first('SELECT * FROM room_master_data WHERE unit_id=?',sourceUnitId); if(m){const existing=await repo.first('SELECT unit_id FROM room_master_data WHERE unit_id=?',targetUnitId); const values=masterFields.map(field=>m[field]??null); if(existing)await repo.run(`UPDATE room_master_data SET ${masterFields.map(field=>`${field}=?`).join(',')},updated_at=? WHERE unit_id=?`,...values,now(),targetUnitId); else await repo.run(`INSERT INTO room_master_data (unit_id,${masterFields.join(',')},created_at,updated_at) VALUES (?,${masterFields.map(()=>'?').join(',')},?,?)`,targetUnitId,...values,now(),now());}}
    if(groups.commercial){const values=['monthly_rent_centavos','commercial_priority'].map(field=>source[field]); await repo.run('UPDATE units SET monthly_rent_centavos=?,commercial_priority=?,updated_at=? WHERE id=?',...values,now(),targetUnitId);}}
  if(groups.terms){const sourceMaster=await repo.first('SELECT * FROM room_master_data WHERE unit_id=?',sourceUnitId); if(sourceMaster){const fields=['standard_minimum_months','advance_months','security_deposit_months','reservation_rules','association_dues_treatment','internet_price_centavos','terms_json']; const existing=await repo.first('SELECT unit_id FROM room_master_data WHERE unit_id=?',targetUnitId); const values=fields.map(field=>sourceMaster[field]??null); if(existing)await repo.run(`UPDATE room_master_data SET ${fields.map(field=>`${field}=?`).join(',')},updated_at=? WHERE unit_id=?`,...values,now(),targetUnitId); else await repo.run(`INSERT INTO room_master_data (unit_id,${fields.join(',')},created_at,updated_at) VALUES (?,${fields.map(()=>'?').join(',')},?,?)`,targetUnitId,...values,now(),now());}}
  if(groups.inventory)await copyRoomInventory(repo,sourceUnitId,targetUnitId,actor); repo.setActor(actor); await repo.audit('COPY','room_master_data',targetUnitId,{source_unit_id:sourceUnitId,target_unit_id:targetUnitId,groups}); return getEffectiveRoom(repo,targetUnitId);
};
