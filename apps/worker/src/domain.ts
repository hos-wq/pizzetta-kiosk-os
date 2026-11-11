import { AvailabilityService, InvalidAvailabilityInterval, type AvailabilityBlock } from '../../../packages/domain/src/availability';
import { ApiError, D1Repository, now } from './repository';
import { hotForScore, isMeaningfulLeadSignal, scoreLeadSignal, scoreSignalForLeadEvent, type LeadScoreSignal } from '../../../packages/domain/src/lead-intelligence';
import { qualifyLead } from '../../../packages/domain/src/qualification';
import { RecommendationService, type RecommendationUnit } from '../../../packages/domain/src/recommendation';
import { createPerson, ensurePersonForExternalIdentity, linkLeadToPerson } from './people';
import { getOccupancyProjection, getRoomOccupancy } from './occupancy';
export const parseJson = async (request:Request) => { try { return await request.json(); } catch { throw new ApiError(400,'INVALID_JSON','Request body must be valid JSON'); } };
const availabilityTimestamp = (value:unknown) => { const text=String(value); return /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00+08:00` : text; };
const availabilityBlocks = async (repo:D1Repository, unitId:string, excludeTenancyId?:string) => {
  const blocks:AvailabilityBlock[] = [];
  const unit=await repo.first('SELECT u.status,rm.declared_occupancy,rm.occupancy_as_of FROM units u LEFT JOIN room_master_data rm ON rm.unit_id=u.id WHERE u.id=?',unitId);
  if(unit?.status==='OFF_MARKET') blocks.push({ unitId, startAt:'1970-01-01T00:00:00.000Z', endAt:null, source:'OFF_MARKET' });
  for (const r of await repo.all("SELECT unit_id,start_at,end_at,status FROM reservations WHERE unit_id=? AND status IN ('HELD','CONFIRMED')", unitId)) blocks.push({ unitId:String(r.unit_id), startAt:availabilityTimestamp(r.start_at), endAt:r.end_at ? availabilityTimestamp(r.end_at) : null, source:'RESERVATION', status:String(r.status) });
  const tenancies = excludeTenancyId
    ? await repo.all("SELECT unit_id,start_at,end_at,status FROM tenancies WHERE unit_id=? AND id<>? AND status IN ('UPCOMING','ACTIVE')", unitId, excludeTenancyId)
    : await repo.all("SELECT unit_id,start_at,end_at,status FROM tenancies WHERE unit_id=? AND status IN ('UPCOMING','ACTIVE')", unitId);
  for (const r of tenancies) blocks.push({ unitId:String(r.unit_id), startAt:availabilityTimestamp(r.start_at), endAt:r.end_at ? availabilityTimestamp(r.end_at) : null, source:'TENANCY', status:String(r.status) });
  if (unit?.declared_occupancy === 'OCCUPIED' && tenancies.length === 0) blocks.push({ unitId, startAt:availabilityTimestamp(unit.occupancy_as_of ?? '1970-01-01'), endAt:null, source:'OWNER_DECLARED_OCCUPIED' });
  for (const r of await repo.all('SELECT unit_id,start_at,end_at,block_type FROM availability_blocks WHERE unit_id=? AND cancelled_at IS NULL', unitId)) blocks.push({ unitId:String(r.unit_id), startAt:availabilityTimestamp(r.start_at), endAt:r.end_at ? availabilityTimestamp(r.end_at) : null, source:String(r.block_type) as 'MAINTENANCE'|'OFF_MARKET' });
  return blocks;
};
const availabilityError = (error:unknown):never => { if(error instanceof InvalidAvailabilityInterval) throw new ApiError(422,'INVALID_AVAILABILITY_INTERVAL',error.message); throw error; };
export const availability = async (repo:D1Repository, unitId:string, startAt:string, endAt:string, excludeTenancyId?:string) => {
  try { return new AvailabilityService(await availabilityBlocks(repo,unitId,excludeTenancyId)).isAvailable({ unitId, startAt, endAt }); } catch(error) { return availabilityError(error); }
};
export const availableUnits = async (repo:D1Repository, startAt:string, endAt:string) => {
  try {
    const units=await repo.all("SELECT id FROM units WHERE status <> 'OFF_MARKET' ORDER BY id");
    const serviceBlocks=await Promise.all(units.map(async unit=>({ id:String(unit.id), blocks:await availabilityBlocks(repo,String(unit.id)) })));
    return serviceBlocks.filter(unit=>new AvailabilityService(unit.blocks).isAvailable({ unitId:unit.id, startAt, endAt })).map(unit=>unit.id);
  } catch(error) { return availabilityError(error); }
};
export const nextAvailability = async (repo:D1Repository, unitId:string, fromAt:string, durationMs:number) => {
  try { return new AvailabilityService(await availabilityBlocks(repo,unitId)).nextAvailableDate(unitId,fromAt,durationMs); } catch(error) { return availabilityError(error); }
};
export const viewingTransitions:Record<string,string[]> = { PROPOSED:['SCHEDULED','CANCELLED'], SCHEDULED:['SCHEDULED','COMPLETED','CANCELLED','NO_SHOW'], COMPLETED:[], CANCELLED:[], NO_SHOW:[] };
export const createViewing = async (repo:D1Repository, input:Record<string,unknown>) => {
  if(!await repo.first('SELECT id FROM leads WHERE id=?',input.lead_id)) throw new ApiError(404,'NOT_FOUND','Lead not found');
  if(!await repo.first('SELECT id FROM units WHERE id=?',input.unit_id)) throw new ApiError(404,'NOT_FOUND','Unit not found');
  const id=crypto.randomUUID(), t=now();
  const confirmationStatus=String(input.confirmation_status??'UNCONFIRMED');
  const status=confirmationStatus==='CONFIRMED'?'SCHEDULED':'PROPOSED';
  await repo.run('INSERT INTO viewings (id,lead_id,unit_id,start_at,end_at,status,confirmation_status,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',id,input.lead_id,input.unit_id,input.start_at,input.end_at,status,confirmationStatus,input.notes??null,t,t);
  await repo.audit('CREATE','viewing',id,{lead_id:input.lead_id,unit_id:input.unit_id,start_at:input.start_at,end_at:input.end_at,status,confirmation_status:confirmationStatus});
  return repo.first('SELECT * FROM viewings WHERE id=?',id);
};
export const updateViewing = async (repo:D1Repository, viewingId:string, input:Record<string,unknown>) => {
  const current=await repo.first('SELECT * FROM viewings WHERE id=?',viewingId); if(!current) throw new ApiError(404,'NOT_FOUND','Viewing not found');
  if(input.status) assertTransition('viewing',String(current.status),String(input.status),viewingTransitions);
  if(('start_at' in input) !== ('end_at' in input)) throw new ApiError(422,'VALIDATION_ERROR','start_at and end_at must be provided together when rescheduling');
  if(input.start_at && input.end_at) {
    const start=Date.parse(String(input.start_at));
    const end=Date.parse(String(input.end_at));
    if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end) throw new ApiError(422,'VALIDATION_ERROR','end_at must be after start_at');
  }
  const updates=Object.entries(input); if(updates.length) await repo.run(`UPDATE viewings SET ${updates.map(([key])=>`${key}=?`).join(',')},updated_at=? WHERE id=?`,...updates.map(([,value])=>value),now(),viewingId);
  await repo.audit('UPDATE','viewing',viewingId,{fields:Object.keys(input)});
  return repo.first('SELECT * FROM viewings WHERE id=?',viewingId);
};
const manilaDateTime = (date:string) => `${date}T00:00:00+08:00`;
const addMonths = (date:string, months:number) => { const [year,month,day]=date.split('-').map(Number); const result=new Date(Date.UTC(year,month-1+months,1)); const lastDay=new Date(Date.UTC(result.getUTCFullYear(),result.getUTCMonth()+1,0)).getUTCDate(); return `${result.getUTCFullYear()}-${String(result.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(day,lastDay)).padStart(2,'0')}`; };
export const leadOperationalDetail = async (repo:D1Repository, lead:Record<string,unknown>) => {
  const objections=(await repo.all('SELECT objection FROM lead_objections WHERE lead_id=? ORDER BY objection',String(lead.id))).map(row=>String(row.objection));
  const unitInterests=await repo.all('SELECT unit_id,interest_type FROM lead_unit_interests WHERE lead_id=? ORDER BY interest_type,unit_id',String(lead.id));
  const qualification=qualifyLead({moveInDate:lead.move_in_date as string|undefined,moveInPrecision:lead.move_in_precision as string|undefined,durationMonths:lead.duration_months as number|undefined,objections});
  if(!qualification.qualified || !lead.move_in_date) return { qualification, availability:null, recommendation:null, objections, unit_interests:unitInterests };
  const startAt=manilaDateTime(String(lead.move_in_date));
  const endAt=lead.duration_months ? manilaDateTime(addMonths(String(lead.move_in_date),Number(lead.duration_months))) : String(lead.viewing_datetime??startAt);
  const rows=await repo.all('SELECT id,sqm,commercial_priority FROM units ORDER BY id');
  const units:RecommendationUnit[]=[]; const availabilityResults:Record<string,boolean>={};
  for(const row of rows){const id=String(row.id);const features=await repo.all('SELECT feature_key,feature_value FROM unit_features WHERE unit_id=?',id);units.push({id,sqm:Number(row.sqm),commercialPriority:String(row.commercial_priority),features:Object.fromEntries(features.map(feature=>[String(feature.feature_key),feature.feature_value===null?true:String(feature.feature_value)==='true'?true:String(feature.feature_value)]))});availabilityResults[id]=await availability(repo,id,startAt,endAt);}
  const recommendation=new RecommendationService().recommend({requestedUnitId:unitInterests.find(row=>row.interest_type==='PRIMARY')?.unit_id as string|undefined,objections,units,availability:availabilityResults});
  return { qualification, availability:{start_at:startAt,end_at:endAt,unit_ids:Object.entries(availabilityResults).filter(([,available])=>available).map(([id])=>id)}, recommendation, objections, unit_interests:unitInterests };
};
export const assertTransition = (entity:string, from:string, to:string, allowed:Record<string,string[]>) => { if (from !== to && !allowed[from]?.includes(to)) throw new ApiError(409,'INVALID_STATE_TRANSITION',`Cannot transition ${entity} from ${from} to ${to}`); };
const unitOrderColumns:Record<string,string> = { id:'id', actual_unit_number:'actual_unit_number', floor:'floor', type:'type', sqm:'sqm', monthly_rent_centavos:'monthly_rent_centavos', status:'status', updated_at:'updated_at' };
const unitFeatures = async (repo:D1Repository, unitId:string) => repo.all(`
  SELECT feature_key,feature_value FROM unit_features WHERE unit_id=?
  UNION ALL
  SELECT d.attribute_key,
    CASE
      WHEN json_type(v.value_json) IN ('object','array') THEN v.value_json
      ELSE json_extract(v.value_json,'$')
    END AS feature_value
  FROM room_attribute_values v
  JOIN room_attribute_definitions d ON d.id=v.definition_id
  WHERE v.unit_id=?
    AND NOT EXISTS (SELECT 1 FROM unit_features existing WHERE existing.unit_id=v.unit_id AND existing.feature_key=d.attribute_key)
  ORDER BY feature_key`,unitId,unitId);
const unitOperationalContext = async (repo:D1Repository, unit:Record<string,unknown>) => {
  const unitId=String(unit.id);
  const features=await unitFeatures(repo,unitId);
  const currentTenancy=await repo.first("SELECT id,person_id,tenant_name,start_at,end_at,status,monthly_rent_centavos FROM tenancies WHERE unit_id=? AND status IN ('UPCOMING','ACTIVE') ORDER BY start_at LIMIT 1",unitId);
  const tenancyHistory=await repo.all("SELECT id,person_id,tenant_name,start_at,end_at,status,monthly_rent_centavos FROM tenancies WHERE unit_id=? ORDER BY start_at DESC LIMIT 100",unitId);
  const maintenance=await repo.first("SELECT id,start_at,end_at,reason FROM availability_blocks WHERE unit_id=? AND block_type='MAINTENANCE' AND cancelled_at IS NULL AND (end_at IS NULL OR end_at>=?) ORDER BY start_at LIMIT 1",unitId,now());
  const maintenanceIssues=await repo.all("SELECT id,service_type,object_snapshot,action_snapshot,area,asset,title,description,priority,status,opened_at,resolved_at,updated_at FROM maintenance_issues WHERE unit_id=? ORDER BY CASE WHEN status IN ('OPEN','IN_PROGRESS','WAITING') THEN 0 ELSE 1 END,updated_at DESC LIMIT 100",unitId);
  const nextAvailableAt=await nextAvailability(repo,unitId,now(),86400000);
  const occupancy=await getRoomOccupancy(repo,unitId);
  const occupancyProjection=await getOccupancyProjection(repo,unitId);
  const master=await repo.first('SELECT canonical_display_id,physical_unit_number,building,address,orientation,view_classification,view_description,room_type,geometry_json,declared_occupancy,occupancy_as_of FROM room_master_data WHERE unit_id=?',unitId);
  const effectiveOccupancy=master?.declared_occupancy ? String(master.declared_occupancy) : occupancy.state;
  return {...unit,...master,features,current_tenancy:currentTenancy,tenancy_history:tenancyHistory,occupancy_state:effectiveOccupancy,occupancy_tenancy:occupancy.tenancy,occupancy_projection:occupancyProjection,maintenance:maintenance??null,maintenance_issues:maintenanceIssues,service_tasks:maintenanceIssues,next_available_at:nextAvailableAt};
};
export const listUnits = async (repo:D1Repository, query:Record<string,unknown>) => {
  const limit=Number(query.limit??50); const status=query.status?String(query.status):null; const search=String(query.search??'').trim();
  const sort=unitOrderColumns[String(query.sort??'id')]??'id'; const direction=String(query.direction??'asc').toLowerCase()==='desc'?'DESC':'ASC'; const pattern=`%${search}%`;
  const rows=await repo.all(`SELECT * FROM units WHERE (? IS NULL OR status=?) AND (?='' OR id LIKE ? OR actual_unit_number LIKE ? OR type LIKE ?) ORDER BY ${sort} ${direction} LIMIT ?`,status,status,search,pattern,pattern,pattern,limit);
  return Promise.all(rows.map(row=>unitOperationalContext(repo,row as Record<string,unknown>)));
};
export const getUnitDetail = async (repo:D1Repository, unitId:string) => {
  const unit=await repo.first('SELECT * FROM units WHERE id=?',unitId); if(!unit) throw new ApiError(404,'NOT_FOUND','Unit not found');
  const detail=await unitOperationalContext(repo,unit);
  return {...detail,maintenance_blocks:await repo.all("SELECT id,start_at,end_at,reason,block_type,maintenance_issue_id,cancelled_at FROM availability_blocks WHERE unit_id=? ORDER BY start_at DESC LIMIT 50",unitId),history:await repo.all("SELECT action,entity_type,entity_id,occurred_at FROM audit_log WHERE entity_type='unit' AND entity_id=? ORDER BY occurred_at DESC LIMIT 50",unitId)};
};
export const updateUnit = async (repo:D1Repository, unitId:string, input:Record<string,unknown>) => {
  const current=await repo.first('SELECT * FROM units WHERE id=?',unitId); if(!current) throw new ApiError(404,'NOT_FOUND','Unit not found');
  const {features,expected_updated_at:expectedUpdatedAt,...raw}=input;
  if(expectedUpdatedAt && String(expectedUpdatedAt) !== String(current.updated_at)) throw new ApiError(409,'STALE_UNIT_UPDATE','The Room changed since it was loaded. Reload before saving.');
  if(raw.actual_unit_number && raw.actual_unit_number!==current.actual_unit_number) { const duplicate=await repo.first('SELECT id FROM units WHERE actual_unit_number=? AND id<>?',raw.actual_unit_number,unitId); if(duplicate) throw new ApiError(409,'DUPLICATE_UNIT_NUMBER','Actual unit number is already assigned'); }
  const entries=Object.entries(raw); if(entries.length) { const timestamp=now(); const result=expectedUpdatedAt ? await repo.run(`UPDATE units SET ${entries.map(([key])=>`${key}=?`).join(',')},updated_at=? WHERE id=? AND updated_at=?`,...entries.map(([,value])=>value),timestamp,unitId,expectedUpdatedAt) : await repo.run(`UPDATE units SET ${entries.map(([key])=>`${key}=?`).join(',')},updated_at=? WHERE id=?`,...entries.map(([,value])=>value),timestamp,unitId); if(expectedUpdatedAt && !result.meta.changes) throw new ApiError(409,'STALE_UNIT_UPDATE','The Room changed since it was loaded. Reload before saving.'); }
  const featureKeys=features&&typeof features==='object'?Object.keys(features as Record<string,unknown>):[];
  if(features&&typeof features==='object') for(const [key,value] of Object.entries(features as Record<string,unknown>)) {
    if(value===null) await repo.run('DELETE FROM unit_features WHERE unit_id=? AND feature_key=?',unitId,key);
    else await repo.run('INSERT INTO unit_features (unit_id,feature_key,feature_value) VALUES (?,?,?) ON CONFLICT(unit_id,feature_key) DO UPDATE SET feature_value=excluded.feature_value',unitId,key,String(value));
  }
  await repo.audit('UPDATE','unit',unitId,{fields:entries.map(([key])=>key),feature_keys:featureKeys});
  return getUnitDetail(repo,unitId);
};
export const aggregateDashboard = (units:unknown[], leads:unknown[], viewings:unknown[], payments:unknown[], followUps:unknown[]) => ({ units, leads, viewings, payments, follow_ups: followUps });
export const createLead = async (repo:D1Repository, input:Record<string,unknown>) => { const duplicate=input.platform&&input.external_contact_id?await repo.first('SELECT id FROM leads WHERE platform=? AND external_contact_id=?',input.platform,input.external_contact_id):null;if(duplicate)throw new ApiError(409,'DUPLICATE_LEAD','A lead already exists for this channel identifier');for(const unitId of input.unit_interest_ids as string[]|undefined??[])if(!await repo.first('SELECT id FROM units WHERE id=?',unitId))throw new ApiError(422,'INVALID_UNIT_REFERENCE',`Unit ${unitId} does not exist`);let personId=input.person_id?String(input.person_id):undefined;if(personId&&!await repo.first('SELECT id FROM persons WHERE id=?',personId))throw new ApiError(404,'NOT_FOUND','Person not found');if(!personId&&input.platform&&input.external_contact_id){const person=await ensurePersonForExternalIdentity(repo,{platform:String(input.platform),externalId:String(input.external_contact_id),displayName:input.display_name?String(input.display_name):undefined});if(person?.id)personId=String(person.id);}if(!personId&&input.display_name){const person=await createPerson(repo,{display_name:input.display_name});if(person?.id)personId=String(person.id);}const id=crypto.randomUUID(), t=now(); await repo.run('INSERT INTO leads (id,display_name,platform,external_contact_id,messenger_psid,source,source_detail,campaign,ad,current_unit_interest,move_in_date,move_in_precision,duration_months,people_count,occupancy_count,viewing_requested,viewing_datetime,human_takeover,notes,status,first_seen_at,last_seen_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', id,input.display_name??null,input.platform??null,input.external_contact_id??null,input.messenger_psid??null,input.source??null,input.source_detail??null,input.campaign??null,input.ad??null,input.current_unit_interest??null,input.move_in_date??null,input.move_in_precision??null,input.duration_months??null,input.people_count??null,input.occupancy_count??null,input.viewing_requested?1:0,input.viewing_datetime??null,input.human_takeover?1:0,input.notes??null,'NEW',t,t,t,t);if(personId)await linkLeadToPerson(repo,personId,id); await repo.audit('CREATE','lead',id,{fields:Object.keys(input),person_id:personId??null}); return repo.first('SELECT * FROM leads WHERE id=?',id); };
export const applyLeadFacts = async (repo:D1Repository, leadId:string, input:Record<string,unknown>) => {
  const t=now(); const { unit_interest_ids, objections, ...raw } = input;
  const dbNames = new Set(['display_name','platform','external_contact_id','source','source_detail','campaign','ad','current_unit_interest','move_in_date','move_in_precision','duration_months','people_count','occupancy_count','price_known','terms_known','owner_known','viewing_requested','viewing_datetime','human_takeover','notes','status']);
  const entries=Object.entries(raw).filter(([key])=>dbNames.has(key));
  if(Array.isArray(unit_interest_ids)) for(const unitId of unit_interest_ids) if(!await repo.first('SELECT id FROM units WHERE id=?',unitId)) throw new ApiError(422,'INVALID_UNIT_REFERENCE',`Unit ${unitId} does not exist`);
  if('platform' in raw || 'external_contact_id' in raw) { const current=await repo.first('SELECT platform,external_contact_id FROM leads WHERE id=?',leadId); const platform=raw.platform??current?.platform; const externalId=raw.external_contact_id??current?.external_contact_id; if(platform&&externalId){const duplicate=await repo.first('SELECT id FROM leads WHERE platform=? AND external_contact_id=? AND id<>?',platform,externalId,leadId);if(duplicate)throw new ApiError(409,'DUPLICATE_LEAD','A lead already exists for this channel identifier');} }
  if(entries.length) await repo.run(`UPDATE leads SET ${entries.map(([key])=>`${key}=?`).join(',')},updated_at=? WHERE id=?`,...entries.map(([,value])=>value===true?1:value===false?0:value),t,leadId);
  if(Array.isArray(unit_interest_ids)) { await repo.run('DELETE FROM lead_unit_interests WHERE lead_id=?',leadId); for(const [index,unitId] of unit_interest_ids.entries()) await repo.run('INSERT INTO lead_unit_interests (lead_id,unit_id,interest_type,created_at) VALUES (?,?,?,?)',leadId,unitId,index===0?'PRIMARY':'ALTERNATIVE',t); }
  if(Array.isArray(objections)) { await repo.run('DELETE FROM lead_objections WHERE lead_id=?',leadId); for(const objection of objections) await repo.run('INSERT INTO lead_objections (lead_id,objection,created_at) VALUES (?,?,?)',leadId,objection,t); }
  return repo.first('SELECT * FROM leads WHERE id=?',leadId);
};
export const appendLeadEvent = async (repo:D1Repository, leadId:string, input:Record<string,unknown>) => {
  const eid=crypto.randomUUID(), t=String(input.occurred_at??now()), signal=scoreSignalForLeadEvent(String(input.event_type));
  const unitIds=[...new Set([...(input.unit_ids as string[]|undefined??[]), ...(input.unit_id?[String(input.unit_id)]:[])])];
  for(const unitId of unitIds) if(!await repo.first('SELECT id FROM units WHERE id=?',unitId)) throw new ApiError(422,'INVALID_UNIT_REFERENCE',`Unit ${unitId} does not exist`);
  await repo.run('INSERT INTO lead_events (id,lead_id,event_type,unit_id,structured_payload_json,occurred_at,source) VALUES (?,?,?,?,?,?,?)',eid,leadId,input.event_type,input.unit_id??null,JSON.stringify(input.structured_payload??{}),t,input.source??null);
  if(input.objection) await repo.run('INSERT OR IGNORE INTO lead_objections (lead_id,objection,created_at) VALUES (?,?,?)',leadId,input.objection,now());
  if(unitIds.length) { await repo.run('DELETE FROM lead_unit_interests WHERE lead_id=?',leadId); for(const [index,unitId] of unitIds.entries()) await repo.run('INSERT INTO lead_unit_interests (lead_id,unit_id,interest_type,created_at) VALUES (?,?,?,?)',leadId,unitId,index===0?'PRIMARY':'ALTERNATIVE',now()); }
  if(signal) { const current=await repo.first('SELECT interest_score FROM leads WHERE id=?',leadId); const score=Number(current?.interest_score??0)+scoreLeadSignal(signal); const meaningful=isMeaningfulLeadSignal(signal); await repo.run('UPDATE leads SET interest_score=?,is_hot=?,last_meaningful_interaction_at=CASE WHEN ? THEN ? ELSE last_meaningful_interaction_at END,updated_at=? WHERE id=?',score,hotForScore(score)?1:0,meaningful?1:0,meaningful?t:null,now(),leadId); }
  await repo.audit('CREATE','lead_event',eid,{event_type:input.event_type,unit_id:input.unit_id??null,source:input.source??null,occurred_at:t}); return repo.first('SELECT * FROM lead_events WHERE id=?',eid);
};
// Conversation fact promotion is once per concept, atomically with its score and audit.
export const promoteConversationScore=async(repo:D1Repository,leadId:string,eventType:string,source:string,messageId?:string)=>{
  const signal=scoreSignalForLeadEvent(eventType);if(!signal)return;
  const eventId=crypto.randomUUID(),timestamp=now(),weight=scoreLeadSignal(signal);
  await repo.batch([
    {sql:'INSERT INTO lead_events (id,lead_id,event_type,structured_payload_json,occurred_at,source) SELECT ?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM lead_events WHERE lead_id=? AND event_type=?)',args:[eventId,leadId,eventType,JSON.stringify({source_message_id:messageId??null}),timestamp,source,leadId,eventType]},
    {sql:'UPDATE leads SET interest_score=interest_score+?,is_hot=CASE WHEN interest_score+?>=8 THEN 1 ELSE is_hot END,last_meaningful_interaction_at=?,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM lead_events WHERE id=?)',args:[weight,weight,timestamp,timestamp,leadId,eventId]},
    {sql:'INSERT INTO audit_log (id,action,entity_type,entity_id,payload_json,occurred_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM lead_events WHERE id=?)',args:[crypto.randomUUID(),'CREATE','lead_event',eventId,JSON.stringify({event_type:eventType,source,actor:'conversation-engine'}),timestamp,eventId]},
  ]);
};
