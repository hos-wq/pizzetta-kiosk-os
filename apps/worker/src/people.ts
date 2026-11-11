import { ApiError, D1Repository, now } from './repository';

const personSortColumns:Record<string,string> = { name:'display_name', created_at:'created_at', updated_at:'updated_at', last_activity:'(SELECT MAX(l.last_meaningful_interaction_at) FROM leads l JOIN person_leads pl ON pl.lead_id=l.id WHERE pl.person_id=persons.id)' };
const normalizePlatform = (value:string) => value.trim().toUpperCase();

export const createPerson = async (repo:D1Repository, input:Record<string,unknown>) => {
  const id=crypto.randomUUID(); const timestamp=now();
  await repo.run('INSERT INTO persons (id,display_name,first_name,last_name,phone,email,notes,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',id,input.display_name??null,input.first_name??null,input.last_name??null,input.phone??null,input.email??null,input.notes??null,1,timestamp,timestamp);
  await repo.audit('CREATE','person',id,{fields:Object.keys(input)});
  return repo.first('SELECT * FROM persons WHERE id=?',id);
};

export const findPersonByExternalIdentity = async (repo:D1Repository, platform:string, externalId:string) => repo.first('SELECT p.* FROM persons p JOIN person_external_identities i ON i.person_id=p.id WHERE i.platform=? AND i.external_id=?',normalizePlatform(platform),externalId);

export const ensurePersonForExternalIdentity = async (repo:D1Repository, input:{ platform:string; externalId:string; displayName?:string }) => {
  const platform=normalizePlatform(input.platform); const existing=await findPersonByExternalIdentity(repo,platform,input.externalId); if(existing) return existing;
  const person=await createPerson(repo,{display_name:input.displayName??null}); const personId=String(person?.id);
  const timestamp=now(); await repo.run('INSERT INTO person_external_identities (id,person_id,platform,external_id,created_at,updated_at) VALUES (?,?,?,?,?,?)',crypto.randomUUID(),personId,platform,input.externalId,timestamp,timestamp);
  await repo.audit('LINK','person_external_identity',personId,{platform});
  return repo.first('SELECT * FROM persons WHERE id=?',personId);
};

const personSummary = async (repo:D1Repository, person:Record<string,unknown>) => {
  const personId=String(person.id);
  const leadSummary=await repo.first('SELECT COUNT(*) AS count, MAX(l.last_meaningful_interaction_at) AS last_activity, (SELECT status FROM leads l2 JOIN person_leads pl2 ON pl2.lead_id=l2.id WHERE pl2.person_id=? ORDER BY l2.updated_at DESC LIMIT 1) AS latest_lead_status FROM leads l JOIN person_leads pl ON pl.lead_id=l.id WHERE pl.person_id=?',personId,personId);
  const currentTenancy=await repo.first("SELECT DISTINCT t.id,t.unit_id,t.start_at,t.end_at,t.status,u.id AS room_id FROM tenancies t LEFT JOIN person_leads pl ON pl.lead_id=t.lead_id JOIN units u ON u.id=t.unit_id WHERE (t.person_id=? OR pl.person_id=?) AND t.status IN ('UPCOMING','ACTIVE') ORDER BY t.start_at LIMIT 1",personId,personId);
  const labels=await repo.all("SELECT id,label,visibility FROM person_labels WHERE person_id=? AND active=1 ORDER BY label",personId);
  return {...person,lead_count:Number(leadSummary?.count??0),last_activity:leadSummary?.last_activity??null,latest_lead_status:leadSummary?.latest_lead_status??null,current_tenancy:currentTenancy??null,labels};
};

export const listPeople = async (repo:D1Repository, query:Record<string,unknown>) => {
  const limit=Number(query.limit??50); const search=String(query.search??'').trim(); const pattern=`%${search}%`; const sort=personSortColumns[String(query.sort??'updated_at')]??'updated_at'; const direction=String(query.direction??'desc').toLowerCase()==='asc'?'ASC':'DESC';
  const people=await repo.all(`SELECT * FROM persons WHERE (?1='' OR display_name LIKE ?2 OR first_name LIKE ?2 OR last_name LIKE ?2 OR phone LIKE ?2 OR email LIKE ?2 OR EXISTS (SELECT 1 FROM person_external_identities ei WHERE ei.person_id=persons.id AND ei.external_id LIKE ?2) OR EXISTS (SELECT 1 FROM person_labels plb WHERE plb.person_id=persons.id AND plb.label LIKE ?2 AND plb.active=1) OR EXISTS (SELECT 1 FROM person_leads plr JOIN leads lr ON lr.id=plr.lead_id LEFT JOIN units lu ON lu.id=lr.initial_unit_id WHERE plr.person_id=persons.id AND (lr.current_unit_interest LIKE ?2 OR lu.id LIKE ?2)) OR EXISTS (SELECT 1 FROM tenancies tr JOIN units tu ON tu.id=tr.unit_id WHERE tr.person_id=persons.id AND (tu.id LIKE ?2 OR tu.actual_unit_number LIKE ?2))) ORDER BY ${sort} ${direction},persons.id ASC LIMIT ?3`,search,pattern,limit);
  return Promise.all(people.map(person=>personSummary(repo,person as Record<string,unknown>)));
};

export const getPersonDetail = async (repo:D1Repository, personId:string) => {
  const person=await repo.first('SELECT * FROM persons WHERE id=?',personId); if(!person) throw new ApiError(404,'NOT_FOUND','Person not found');
  const [summary,identities,leads,viewings,tenancies,history]=await Promise.all([
    personSummary(repo,person),
    repo.all('SELECT id,platform,external_id,profile_json,profile_sync_status,profile_synced_at,conversation_id,conversation_url,created_at,updated_at FROM person_external_identities WHERE person_id=? ORDER BY platform,external_id',personId),
    repo.all('SELECT l.id,l.display_name,l.status,l.interest_score,l.is_hot,l.move_in_date,l.move_in_precision,l.duration_months,l.occupancy_count,l.first_seen_at,l.last_seen_at,l.last_meaningful_interaction_at,pl.linked_at FROM leads l JOIN person_leads pl ON pl.lead_id=l.id WHERE pl.person_id=? ORDER BY l.updated_at DESC',personId),
    repo.all('SELECT v.id,v.unit_id,u.id AS room_id,v.start_at,v.end_at,v.status,v.confirmation_status FROM viewings v JOIN leads l ON l.id=v.lead_id JOIN person_leads pl ON pl.lead_id=l.id JOIN units u ON u.id=v.unit_id WHERE pl.person_id=? ORDER BY v.start_at DESC',personId),
    repo.all('SELECT DISTINCT t.id,t.unit_id,u.id AS room_id,t.start_at,t.end_at,t.monthly_rent_centavos,t.status FROM tenancies t LEFT JOIN person_leads pl ON pl.lead_id=t.lead_id JOIN units u ON u.id=t.unit_id WHERE (t.person_id=? OR pl.person_id=?) ORDER BY t.start_at DESC',personId,personId),
    repo.all("SELECT action,entity_type,entity_id,occurred_at FROM audit_log WHERE (entity_type='person' AND entity_id=?) OR (entity_type='person_external_identity' AND entity_id=?) OR (entity_type='person_label' AND entity_id IN (SELECT id FROM person_labels WHERE person_id=?)) ORDER BY occurred_at DESC LIMIT 100",personId,personId,personId),
  ]);
  const [labels,requirements,leadEvents]=await Promise.all([repo.all('SELECT id,label,visibility,active FROM person_labels WHERE person_id=? ORDER BY label',personId),repo.all('SELECT id,requirement_key,value_json,updated_at FROM person_requirements WHERE person_id=? ORDER BY requirement_key',personId),repo.all('SELECT e.id,e.event_type,e.structured_payload_json,e.occurred_at,e.source FROM lead_events e JOIN person_leads pl ON pl.lead_id=e.lead_id WHERE pl.person_id=? ORDER BY e.occurred_at DESC LIMIT 100',personId)]);
  const signals=await personSignalMemory(repo,personId);
  const attention=await repo.all("SELECT id,signal_key,priority,status,channel,bot_can_continue,updated_at FROM messaging_attention WHERE person_id=? AND status='OPEN' ORDER BY updated_at DESC",personId);
  return {...summary,identities,labels,requirements,signals,attention,leads,viewings,tenancies,history:[...history,...leadEvents.map(event=>({action:event.event_type,entity_type:'lead_event',entity_id:event.id,occurred_at:event.occurred_at,source:event.source}))].sort((a,b)=>String(b.occurred_at).localeCompare(String(a.occurred_at)))};
};

// Consolidated presentation of canonical signals; source records remain traceable.
export const personSignalMemory=async(repo:D1Repository,personId:string)=>repo.all("SELECT signal_key,normalized_value,MIN(first_seen_at) AS first_seen_at,MAX(last_seen_at) AS last_seen_at,SUM(occurrence_count) AS occurrence_count,GROUP_CONCAT(DISTINCT source_channel) AS channels FROM person_messaging_signals WHERE person_id=? AND status='ACTIVE' GROUP BY signal_key,normalized_value ORDER BY last_seen_at DESC",personId);

export const updatePerson = async (repo:D1Repository, personId:string, input:Record<string,unknown>) => {
  if(!await repo.first('SELECT id FROM persons WHERE id=?',personId)) throw new ApiError(404,'NOT_FOUND','Person not found');
  const allowed=new Set(['display_name','first_name','last_name','phone','email','notes']); const entries=Object.entries(input).filter(([key])=>allowed.has(key));
  if(!entries.length) throw new ApiError(422,'VALIDATION_ERROR','No editable person fields supplied');
  await repo.run(`UPDATE persons SET ${entries.map(([key])=>`${key}=?`).join(',')},updated_at=? WHERE id=?`,...entries.map(([,value])=>value),now(),personId);
  await repo.audit('UPDATE','person',personId,{fields:entries.map(([key])=>key)});
  return getPersonDetail(repo,personId);
};

export const linkPersonIdentity = async (repo:D1Repository, personId:string, input:Record<string,unknown>) => {
  if(!await repo.first('SELECT id FROM persons WHERE id=?',personId)) throw new ApiError(404,'NOT_FOUND','Person not found');
  const platform=normalizePlatform(String(input.platform)); const externalId=String(input.external_id); const existing=await repo.first('SELECT id,person_id FROM person_external_identities WHERE platform=? AND external_id=?',platform,externalId);
  if(existing && String(existing.person_id)!==personId) throw new ApiError(409,'IDENTITY_ALREADY_LINKED','External identity is already linked to another person');
  if(existing) return repo.first('SELECT id,platform,external_id,created_at,updated_at FROM person_external_identities WHERE id=?',String(existing.id));
  const timestamp=now(); const id=crypto.randomUUID(); await repo.run('INSERT INTO person_external_identities (id,person_id,platform,external_id,created_at,updated_at) VALUES (?,?,?,?,?,?)',id,personId,platform,externalId,timestamp,timestamp); await repo.audit('LINK','person_external_identity',id,{person_id:personId,platform}); return repo.first('SELECT id,platform,external_id,created_at,updated_at FROM person_external_identities WHERE id=?',id);
};

export const linkLeadToPerson = async (repo:D1Repository, personId:string, leadId:string) => {
  if(!await repo.first('SELECT id FROM persons WHERE id=?',personId)) throw new ApiError(404,'NOT_FOUND','Person not found');
  if(!await repo.first('SELECT id FROM leads WHERE id=?',leadId)) throw new ApiError(404,'NOT_FOUND','Lead not found');
  const existing=await repo.first('SELECT person_id FROM person_leads WHERE lead_id=?',leadId); if(existing && String(existing.person_id)!==personId) throw new ApiError(409,'LEAD_ALREADY_LINKED','Lead is already linked to another person');
  if(existing) return;
  await repo.run('INSERT INTO person_leads (person_id,lead_id,linked_at,linked_by) VALUES (?,?,?,?)',personId,leadId,now(),'owner'); await repo.audit('LINK','person_lead',leadId,{person_id:personId});
};

export const addPersonLabel = async (repo:D1Repository, personId:string, input:{label:string;visibility:'PRIVATE'|'SYSTEM'}) => { if(!await repo.first('SELECT id FROM persons WHERE id=?',personId))throw new ApiError(404,'NOT_FOUND','Person not found'); const id=crypto.randomUUID(),t=now(); await repo.run('INSERT INTO person_labels (id,person_id,label,visibility,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(person_id,label) DO UPDATE SET active=1,visibility=excluded.visibility,updated_at=excluded.updated_at',id,personId,input.label,input.visibility,1,t,t); await repo.audit('LINK','person_label',id,{person_id:personId,visibility:input.visibility}); return repo.first('SELECT id,label,visibility,active FROM person_labels WHERE person_id=? AND label=?',personId,input.label); };
export const removePersonLabel = async (repo:D1Repository, personId:string, labelId:string) => { const label=await repo.first('SELECT id,label,visibility FROM person_labels WHERE id=? AND person_id=?',labelId,personId); if(!label)throw new ApiError(404,'NOT_FOUND','Person label not found'); await repo.run('UPDATE person_labels SET active=0,updated_at=? WHERE id=?',now(),labelId); await repo.audit('UPDATE','person_label',labelId,{person_id:personId,action:'REMOVE'}); return {id:labelId,active:0}; };
export const setPersonRequirement = async (repo:D1Repository, personId:string, input:{requirement_key:string;value:unknown}) => { if(!await repo.first('SELECT id FROM persons WHERE id=?',personId))throw new ApiError(404,'NOT_FOUND','Person not found'); const id=crypto.randomUUID(),t=now(); await repo.run('INSERT INTO person_requirements (id,person_id,requirement_key,value_json,created_at,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(person_id,requirement_key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at',id,personId,input.requirement_key,JSON.stringify(input.value),t,t); await repo.audit('UPDATE','person_requirement',id,{person_id:personId,requirement_key:input.requirement_key}); return repo.first('SELECT id,requirement_key,value_json,updated_at FROM person_requirements WHERE person_id=? AND requirement_key=?',personId,input.requirement_key); };
