import { interpretMessage, type NluResult } from '../../../packages/domain/src/nlu';
import { ApiError, D1Repository, now } from './repository';
import { appendLeadEvent, createViewing } from './domain';

export type MessagingPriority = 'NORMAL'|'INTERESTING'|'HIGH'|'URGENT';
export type MessagingControlMode = 'BOT'|'HUMAN';
export type MessagingSignal = {
  key:string;
  value?:string|number|boolean;
  valueJson?:Record<string,unknown>;
  priority:MessagingPriority;
  needsAlan:boolean;
  botCanContinue:boolean;
  supersedes?:string;
};
export type MessagingAlias = { signal_key:string; alias:string };

export const SIGNAL_DEFINITIONS: ReadonlyArray<Omit<MessagingSignal,'value'|'valueJson'|'supersedes'> & {category:string}> = [
  {key:'PRICE_QUERY',category:'COMMERCIAL',priority:'NORMAL',needsAlan:false,botCanContinue:true},
  {key:'AVAILABILITY_QUERY',category:'COMMERCIAL',priority:'INTERESTING',needsAlan:false,botCanContinue:true},
  {key:'ROOM_INTEREST',category:'ROOM',priority:'INTERESTING',needsAlan:false,botCanContinue:true},
  {key:'PREFERENCE_QUIET',category:'PREFERENCE',priority:'INTERESTING',needsAlan:false,botCanContinue:true},
  {key:'PREFERENCE_VIEW',category:'PREFERENCE',priority:'INTERESTING',needsAlan:false,botCanContinue:true},
  {key:'PREFERENCE_NO_VIEW',category:'PREFERENCE',priority:'INTERESTING',needsAlan:false,botCanContinue:true},
  {key:'OBJECTION_TOO_SMALL',category:'OBJECTION',priority:'INTERESTING',needsAlan:false,botCanContinue:true},
  {key:'OBJECTION_TOO_DARK',category:'OBJECTION',priority:'INTERESTING',needsAlan:false,botCanContinue:true},
  {key:'OBJECTION_PRICE',category:'OBJECTION',priority:'HIGH',needsAlan:true,botCanContinue:true},
  {key:'LOW_OFFER',category:'COMMERCIAL',priority:'HIGH',needsAlan:true,botCanContinue:true},
  {key:'VIEWING_INTEREST',category:'VIEWING',priority:'INTERESTING',needsAlan:false,botCanContinue:true},
  {key:'VIEWING_CONFIRMED',category:'VIEWING',priority:'HIGH',needsAlan:false,botCanContinue:true},
  {key:'VIEWING_DATE_PROPOSED',category:'VIEWING',priority:'HIGH',needsAlan:true,botCanContinue:true},
  {key:'SHORT_STAY_REQUEST',category:'COMMERCIAL',priority:'HIGH',needsAlan:true,botCanContinue:true},
  {key:'NEGOTIATION_REQUEST',category:'COMMERCIAL',priority:'HIGH',needsAlan:true,botCanContinue:true},
  {key:'RESERVATION_REQUEST',category:'COMMERCIAL',priority:'HIGH',needsAlan:true,botCanContinue:true},
  {key:'CONTRACT_REQUEST',category:'COMMERCIAL',priority:'HIGH',needsAlan:true,botCanContinue:true},
  {key:'COMPLAINT',category:'ESCALATION',priority:'URGENT',needsAlan:true,botCanContinue:true},
  {key:'SPECIAL_REQUEST',category:'ESCALATION',priority:'HIGH',needsAlan:true,botCanContinue:true},
  {key:'LOW_CONFIDENCE',category:'ESCALATION',priority:'NORMAL',needsAlan:true,botCanContinue:true},
  {key:'TRUST_LEGITIMACY',category:'TRUST',priority:'INTERESTING',needsAlan:false,botCanContinue:true},
  {key:'TRUST_SCAM_CONCERN',category:'TRUST',priority:'HIGH',needsAlan:true,botCanContinue:true},
  {key:'PAYMENT_GCASH',category:'PAYMENT',priority:'NORMAL',needsAlan:false,botCanContinue:true},
  {key:'PAYMENT_BANK_TRANSFER',category:'PAYMENT',priority:'NORMAL',needsAlan:false,botCanContinue:true},
  {key:'PET_CAT',category:'LIFESTYLE',priority:'NORMAL',needsAlan:false,botCanContinue:true},
  {key:'PET_DOG',category:'LIFESTYLE',priority:'HIGH',needsAlan:true,botCanContinue:true},
  {key:'PARKING_REQUIRED',category:'AMENITY',priority:'INTERESTING',needsAlan:true,botCanContinue:true},
  {key:'PARKING_NOT_REQUIRED',category:'AMENITY',priority:'NORMAL',needsAlan:false,botCanContinue:true},
  {key:'WIFI_QUERY',category:'AMENITY',priority:'NORMAL',needsAlan:false,botCanContinue:true},
  {key:'LAUNDRY_QUERY',category:'AMENITY',priority:'NORMAL',needsAlan:false,botCanContinue:true},
  {key:'WASHING_MACHINE_QUERY',category:'AMENITY',priority:'NORMAL',needsAlan:false,botCanContinue:true},
  {key:'POOL_QUERY',category:'AMENITY',priority:'NORMAL',needsAlan:false,botCanContinue:true},
  {key:'GYM_QUERY',category:'AMENITY',priority:'NORMAL',needsAlan:false,botCanContinue:true},
  {key:'MOVE_IN_DATE',category:'QUALIFICATION',priority:'INTERESTING',needsAlan:false,botCanContinue:true},
  {key:'STAY_DURATION',category:'QUALIFICATION',priority:'INTERESTING',needsAlan:false,botCanContinue:true},
  {key:'OCCUPANCY',category:'QUALIFICATION',priority:'INTERESTING',needsAlan:false,botCanContinue:true},
  {key:'GHOSTS_CONCERN',category:'ESCALATION',priority:'HIGH',needsAlan:true,botCanContinue:true},
];

const aliasRules:ReadonlyArray<[string,RegExp]> = [
  ['PRICE_QUERY',/\b(hm+|hmm+|how much|magkano|magkano po|price|rent|expensive|mahal|last price)\b/i],
  ['AVAILABILITY_QUERY',/\b(available|availability|vacant|free|meron pa|may bakante|mayroon pa)\b/i],
  ['VIEWING_INTEREST',/\b(can i view|can view|viewing|visit|see the room|(?:can|pwede)(?:\s+\w+){0,2}\s+makita|patingin)\b/i],
  ['PREFERENCE_QUIET',/\b(quiet|peaceful|tahimik|di maingay|hindi maingay)\b/i],
  ['PREFERENCE_VIEW',/\b(want a view|good view|may view|panoramic|tanawin)\b/i],
  ['OBJECTION_TOO_SMALL',/\b(too small|masikip|maliit)\b/i],
  ['OBJECTION_TOO_DARK',/\b(too dark|madilim)\b/i],
  ['OBJECTION_PRICE',/\b(too expensive|expensive|mahal|too pricey|pricey|still too expensive)\b/i],
  ['LOW_OFFER',/\b\d{2,3}k\b.*\b(kaya|budget|offer|pwede)\b|\b(kaya|budget|offer)\b.*\b\d{2,3}k\b/i],
  ['NEGOTIATION_REQUEST',/\b(negotiable|nego|discount|lower price|last price|tawad)\b/i],
  ['SHORT_STAY_REQUEST',/\b(short stay|short-term|short term|only one month|1 month|2 months|isang buwan)\b/i],
  ['RESERVATION_REQUEST',/\b(reserve|reservation|hold the room|reservation fee|pareserve)\b/i],
  ['CONTRACT_REQUEST',/\b(contract|special contract|kontrata)\b/i],
  ['COMPLAINT',/\b(complaint|complain|reklamo|problem|problema)\b/i],
  ['TRUST_LEGITIMACY',/\b(legit|real|totoo)\b/i],
  ['TRUST_SCAM_CONCERN',/\b(scam|scam ba|legit ba)\b/i],
  ['PAYMENT_GCASH',/\bgcash\b/i],
  ['PAYMENT_BANK_TRANSFER',/\b(bank transfer|wire transfer|bank)\b/i],
  ['PET_CAT',/\b(cat|cats|pusa|pusang)\b/i],
  ['PET_DOG',/\b(dog|dogs|aso|asong)\b/i],
  ['WIFI_QUERY',/\b(wifi|wi-fi|internet)\b/i],
  ['WASHING_MACHINE_QUERY',/\b(washing machine|laundry machine)\b/i],
  ['LAUNDRY_QUERY',/\blaundry\b/i],
  ['POOL_QUERY',/\bpool\b/i],
  ['GYM_QUERY',/\bgym\b/i],
  ['GHOSTS_CONCERN',/\b(ghost|ghosts|haunted|multo)\b/i],
];

const hasNegation = (text:string, term:RegExp) => term.test(text) && /\b(no|not|don't|dont|do not|without|wala|hindi|ayaw)\b/i.test(text.slice(Math.max(0,text.search(term)-24),text.search(term)));
const normalized = (value:string) => value.normalize('NFKC').toLowerCase().replace(/[₱]/g,' php ').replace(/[“”‘’]/g,"'").replace(/\s+/g,' ').trim();

export const normalizeMessagingText = (message:string) => normalized(message).replace(/[!?]+/g,'').replace(/\b(available|avail|availl)\b/g,'available').replace(/\b(nego|negotiable)\b/g,'negotiable').replace(/\b(tmrw|tmr|bukas)\b/g,'tomorrow').replace(/\b(pde|pwd|pwede)\b/g,'can').replace(/\b(mkta|mkita)\b/g,'makita').replace(/\b(meron|mayron|mayroon)\b/g,'available');

export const analyzeMessagingText = (message:string, referenceDate=new Date(), customAliases:MessagingAlias[] = []) => {
  const text=normalizeMessagingText(message); const base=NluSafe(text,referenceDate); const signals:MessagingSignal[]=[];
  const add=(key:string, value?:string|number|boolean, valueJson?:Record<string,unknown>) => { const definition=SIGNAL_DEFINITIONS.find(item=>item.key===key); if(!definition || signals.some(item=>item.key===key))return; signals.push({...definition,value,valueJson}); };
  for(const [key,rule] of aliasRules) {
    if(!rule.test(text)) continue;
    if((key==='PARKING_REQUIRED'||key==='PARKING_NOT_REQUIRED') && hasNegation(text,/\bparking\b/i)) continue;
    if(key==='PREFERENCE_VIEW' && hasNegation(text,/\bview\b/i)) { add('PREFERENCE_NO_VIEW',false); continue; }
    add(key);
  }
  for(const alias of customAliases) {
    if(!SIGNAL_DEFINITIONS.some(item=>item.key===alias.signal_key)) continue;
    const escaped=alias.alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
    if(new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`,'i').test(text)) add(alias.signal_key);
  }
  if(/\b(parking|car park)\b/i.test(text)) add(hasNegation(text,/\b(parking|car park)\b/i)?'PARKING_NOT_REQUIRED':'PARKING_REQUIRED');
  if(/\b(?:available|view|makita|room|br)\b/i.test(text) && !base.entities.unitId) { const shorthand=text.match(/(?:^|\s)(0?\d{1,2})(?=\s|$)/); if(shorthand) add('ROOM_INTEREST',`BR·${String(Number(shorthand[1])).padStart(2,'0')}`,{unit_id:`BR·${String(Number(shorthand[1])).padStart(2,'0')}`}); }
  if(/\b(wala akong car|no car|without a car)\b/i.test(text)) add('PARKING_NOT_REQUIRED');
  if(/\b(asap|as soon as possible|agad)\b/i.test(text)) add('MOVE_IN_DATE','ASAP',{precision:'ASAP'});
  if(base.entities.unitId) add('ROOM_INTEREST',base.entities.unitId,{unit_id:base.entities.unitId});
  if(base.entities.moveInDate) add('MOVE_IN_DATE',base.entities.moveInDate,{date:base.entities.moveInDate});
  if(base.entities.durationMonths) add('STAY_DURATION',base.entities.durationMonths,{months:base.entities.durationMonths});
  if(base.entities.occupancyCount) add('OCCUPANCY',base.entities.occupancyCount,{count:base.entities.occupancyCount});
  if(base.entities.preference==='WANTS_QUIET') add('PREFERENCE_QUIET');
  if(base.entities.preference==='WANTS_VIEW') add('PREFERENCE_VIEW');
  if(base.entities.preference==='NO_VIEW') add('PREFERENCE_NO_VIEW',false);
  const proposedTime=text.match(/\b(?:around|at|mga)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if(signals.some(signal=>signal.key==='VIEWING_INTEREST') && (base.entities.moveInDate || proposedTime)) add('VIEWING_DATE_PROPOSED',base.entities.moveInDate,{date:base.entities.moveInDate,time:proposedTime?.[1]??null,approximate:true});
  if(base.intents.includes('LOW_CONFIDENCE') || (!base.meaningful && !/^h+m+\??$/i.test(text) && !/^(thanks|thank you|salamat)\b/i.test(text))) add('LOW_CONFIDENCE');
  const preference=signals.some(signal=>signal.key==='PREFERENCE_QUIET')?'WANTS_QUIET':signals.some(signal=>signal.key==='PREFERENCE_NO_VIEW')?'NO_VIEW':signals.some(signal=>signal.key==='PREFERENCE_VIEW')?'WANTS_VIEW':base.entities.preference;
  return { normalizedText:text, intents:base.intents, entities:{...base.entities,preference}, meaningful:base.meaningful, signals };
};

const NluSafe = (text:string, referenceDate:Date):NluResult => interpretMessage(text,referenceDate);

export async function ensureMessagingDefinitions(repo:D1Repository) {
  const timestamp=now();
  for(const definition of SIGNAL_DEFINITIONS) await repo.run('INSERT OR IGNORE INTO messaging_signal_definitions (signal_key,category,priority,needs_alan,bot_can_continue,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',definition.key,definition.category,definition.priority,definition.needsAlan?1:0,definition.botCanContinue?1:0,timestamp,timestamp);
}

export async function analyzeMessagingTextWithAliases(repo:D1Repository, message:string, referenceDate=new Date()) {
  const aliases=await repo.all('SELECT signal_key,alias FROM messaging_aliases WHERE active=1');
  return analyzeMessagingText(message,referenceDate,aliases.map(alias=>({signal_key:String(alias.signal_key),alias:String(alias.alias)})));
}

export async function explainMessagingText(repo:D1Repository, message:string, referenceDate=new Date()) {
  const analysis=await analyzeMessagingTextWithAliases(repo,message,referenceDate); const text=analysis.normalizedText;
  const transformations:Array<{from:string;to:string;reason:string}>=[];
  const transformationRules:[RegExp,string,string][]=[[/\b(avail|availl)\b/gi,'available','availability shorthand'],[/\b(nego)\b/gi,'negotiable','chat shorthand'],[/\b(pde|pwd|pwede)\b/gi,'can','Taglish shorthand'],[/\b(tmrw|tmr|bukas)\b/gi,'tomorrow','date shorthand'],[/\b(meron|mayron|mayroon)\b/gi,'available','Tagalog availability alias']];
  for(const [rule,to,reason] of transformationRules) if(rule.test(message)) transformations.push({from:message.match(rule)?.[0]??'',to,reason});
  const matchedAliases=[...aliasRules.filter(([,rule])=>rule.test(text)).map(([key,rule])=>({alias:text.match(rule)?.[0]??'',signal_key:key,method:'PATTERN',confidence:1})),...(await repo.all('SELECT signal_key,alias FROM messaging_aliases WHERE active=1')).filter(row=>new RegExp(`(?:^|\\s)${String(row.alias).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:$|\\s)`,'i').test(text)).map(row=>({alias:String(row.alias),signal_key:String(row.signal_key),method:'ALIAS',confidence:1}))];
  const timeMatch=text.match(/\b(?:around|at|mga)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  const candidates:Array<Record<string,unknown>>=[];
  if(analysis.signals.some(signal=>signal.key==='VIEWING_INTEREST')) candidates.push({event:'VIEWING_INTEREST',effect:'BOT may continue; viewing remains unconfirmed'});
  if(analysis.signals.some(signal=>signal.key==='VIEWING_INTEREST') && (analysis.entities.moveInDate || timeMatch)) candidates.push({event:'VIEWING_DATE_PROPOSED',date:analysis.entities.moveInDate??'tomorrow',time:timeMatch?.[1] ? `~${timeMatch[1]}${timeMatch[3]??''}` : undefined,effect:'WOULD REQUIRE OWNER CONFIRMATION; no Viewing is created in DRY_RUN'});
  const persistWould=analysis.meaningful?analysis.signals.filter(signal=>signal.key!=='LOW_CONFIDENCE'):[];
  const needsAlan=analysis.signals.filter(signal=>signal.needsAlan).sort((a,b)=>({NORMAL:0,INTERESTING:1,HIGH:2,URGENT:3}[b.priority]-({NORMAL:0,INTERESTING:1,HIGH:2,URGENT:3}[a.priority])))[0];
  const noise=text.split(/\s+/).filter(token=>['po','boss','haha'].includes(token)||/^[😂🤣🙂👍]+$/.test(token));
  return {rawInput:message,normalizedText:text,tokens:text.split(/\s+/).filter(Boolean),transformations,matchedAliases,negationContext:text.match(/\b(no|not|don't|dont|do not|without|wala|hindi|ayaw)\b[^.!?]{0,40}/i)?.[0]??null,signals:analysis.signals.map(signal=>({...signal,persist:analysis.meaningful && signal.key!=='LOW_CONFIDENCE'?'YES':'NO',lifecycle:signal.key.includes('OBJECTION')?'REPLACEABLE':'ACTIVE'})),domainEventCandidates:candidates,conversationControl:{mode:'BOT',doNotAutoReply:false,needsAlan:Boolean(needsAlan),priority:needsAlan?.priority??'NORMAL'},discardedNoise:noise,summary:{signals:persistWould.map(signal=>signal.key),needsAlan:Boolean(needsAlan),priority:needsAlan?.priority??'NORMAL',sideEffects:'NONE'}};
}

type ViewingNotifier = { externalAccountId?: string; sendText: (recipientId:string, text:string) => Promise<{sent:boolean; reason?:string; messageId?:string}> };

export async function promoteConfirmedViewing(repo:D1Repository, input:{lead_id:string;unit_id:string;start_at:string;end_at:string;actor:string}, notifier?:ViewingNotifier) {
  const lead=await repo.first('SELECT id,platform,external_contact_id,messenger_psid FROM leads WHERE id=?',input.lead_id); if(!lead) throw new ApiError(404,'NOT_FOUND','Lead not found');
  const unit=await repo.first('SELECT id FROM units WHERE id=?',input.unit_id); if(!unit) throw new ApiError(404,'NOT_FOUND','Unit not found');
  const existing=await repo.first("SELECT * FROM viewings WHERE lead_id=? AND unit_id=? AND start_at=? AND end_at=? AND status NOT IN ('CANCELLED','COMPLETED','NO_SHOW') ORDER BY created_at LIMIT 1",input.lead_id,input.unit_id,input.start_at,input.end_at);
  let viewing:Record<string,unknown>|null;
  let newlyConfirmed=false;
  if(existing && String(existing.confirmation_status)==='CONFIRMED' && String(existing.status)==='SCHEDULED') viewing=existing;
  else if(existing) {
    await repo.run("UPDATE viewings SET status='SCHEDULED',confirmation_status='CONFIRMED',updated_at=? WHERE id=? AND status='PROPOSED'",now(),existing.id);
    viewing=await repo.first('SELECT * FROM viewings WHERE id=?',existing.id); newlyConfirmed=true;
  } else {
    viewing=await createViewing(repo,{lead_id:input.lead_id,unit_id:input.unit_id,start_at:input.start_at,end_at:input.end_at,confirmation_status:'CONFIRMED'}); newlyConfirmed=true;
  }
  if(!viewing) throw new ApiError(409,'VIEWING_CONFIRMATION_FAILED','Viewing confirmation was not persisted');
  if(newlyConfirmed && !(await repo.first("SELECT id FROM lead_events WHERE lead_id=? AND event_type='VIEWING_CONFIRMED' AND structured_payload_json LIKE ? LIMIT 1",input.lead_id,`%${String(viewing.id)}%`))) {
    await appendLeadEvent(repo,input.lead_id,{event_type:'VIEWING_CONFIRMED',unit_id:input.unit_id,structured_payload:{viewing_id:viewing.id,start_at:input.start_at,end_at:input.end_at},source:'MESSAGING'});
    await repo.audit('PROMOTE','viewing',String(viewing.id),{lead_id:input.lead_id,unit_id:input.unit_id,actor:input.actor,status:'SCHEDULED',confirmation_status:'CONFIRMED'});
  }
  const notification=await notifyViewingConfirmation(repo,lead,viewing,notifier,input.actor,newlyConfirmed);
  return { viewing, notification };
}

async function notifyViewingConfirmation(repo:D1Repository, lead:Record<string,unknown>, viewing:Record<string,unknown>, notifier:ViewingNotifier|undefined, actor:string, newlyConfirmed:boolean) {
  if(!newlyConfirmed) return {status:'NOT_ATTEMPTED',reason:'ALREADY_CONFIRMED'} as const;
  const platform=String(lead.platform??'').toUpperCase();
  const recipient=platform==='MESSENGER'?String(lead.messenger_psid??lead.external_contact_id??''):String(lead.external_contact_id??'');
  if(!notifier || !['MESSENGER','WHATSAPP'].includes(platform) || !recipient) return {status:'NOT_ATTEMPTED',reason:'NO_SUPPORTED_CHANNEL'} as const;
  const person=await repo.first('SELECT person_id FROM person_leads WHERE lead_id=? LIMIT 1',lead.id);
  const id=crypto.randomUUID(); const text=`Your viewing for ${String(viewing.unit_id)} on ${String(viewing.start_at)} is confirmed. See you then.`; const timestamp=now();
  await repo.run('INSERT INTO conversation_messages (id,channel,direction,external_account_id,external_conversation_id,message_type,text,author_type,status,lead_id,person_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',id,platform,'OUTBOUND',notifier.externalAccountId??platform,recipient,'TEXT',text,'OWNER','RECEIVED',lead.id,person?.person_id??null,timestamp);
  let delivery:{sent:boolean;reason?:string;messageId?:string};
  try { delivery=await notifier.sendText(recipient,text); } catch { delivery={sent:false,reason:'SEND_UNCERTAIN'}; }
  await repo.run('UPDATE conversation_messages SET external_message_id=?,status=? WHERE id=?',delivery.messageId??null,delivery.sent?'SENT':'FAILED',id);
  await repo.audit(delivery.sent?'SENT':'SEND_FAILED','conversation_message',id,{channel:platform,lead_id:lead.id,actor,provider_status:delivery.sent?'ACCEPTED':'FAILED',reason:delivery.reason??null});
  return {status:delivery.sent?'SENT':'FAILED',reason:delivery.reason??null,providerAccepted:delivery.sent} as const;
}

export async function persistMessagingSignals(repo:D1Repository, personId:string, channel:string, conversationId:string, analysis:ReturnType<typeof analyzeMessagingText>, sourceMessageId?:string) {
  if(!personId) throw new ApiError(422,'PERSON_REQUIRED','Messaging signals require a canonical Person');
  await ensureMessagingDefinitions(repo); const timestamp=now(); const persisted:Record<string,unknown>[]=[];
  for(const signal of analysis.signals) {
    const value=signal.value===undefined?'TRUE':String(signal.value); const valueJson=JSON.stringify(signal.valueJson??(signal.value===undefined?true:signal.value));
    const existing=await repo.first('SELECT id,occurrence_count,status FROM person_messaging_signals WHERE person_id=? AND signal_key=? AND normalized_value=? AND source_message_id IS ? LIMIT 1',personId,signal.key,value,sourceMessageId??null);
    let id=String(existing?.id??crypto.randomUUID());
    if(existing) await repo.run('UPDATE person_messaging_signals SET occurrence_count=occurrence_count+1,last_seen_at=? WHERE id=?',timestamp,id);
    else { await repo.run('UPDATE person_messaging_signals SET status=\'SUPERSEDED\' WHERE person_id=? AND signal_key=? AND status=\'ACTIVE\' AND normalized_value<>?',personId,signal.key,value); await repo.run('INSERT INTO person_messaging_signals (id,person_id,signal_key,normalized_value,value_json,status,source_channel,source_message_id,first_seen_at,last_seen_at,occurrence_count) VALUES (?,?,?,?,?,?,?,?,?,?,1)',id,personId,signal.key,value,valueJson,'ACTIVE',channel,sourceMessageId??null,timestamp,timestamp); }
    const definition=SIGNAL_DEFINITIONS.find(item=>item.key===signal.key)!;
    if(definition.needsAlan) await repo.run("INSERT INTO messaging_attention (id,person_id,signal_id,channel,external_conversation_id,signal_key,priority,status,bot_can_continue,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(person_id,external_conversation_id,signal_key,status) DO UPDATE SET signal_id=excluded.signal_id,priority=excluded.priority,bot_can_continue=excluded.bot_can_continue,updated_at=excluded.updated_at",crypto.randomUUID(),personId,id,channel,conversationId,signal.key,definition.priority,'OPEN',definition.botCanContinue?1:0,timestamp,timestamp);
    persisted.push({id,signal_key:signal.key,normalized_value:value,status:'ACTIVE'});
  }
  return persisted;
}

export async function getMessagingControl(repo:D1Repository, channel:string, conversationId:string) { return repo.first('SELECT * FROM messaging_conversation_controls WHERE channel=? AND external_conversation_id=?',channel,conversationId); }
export async function updateMessagingControl(repo:D1Repository, personId:string, channel:string, conversationId:string, action:'TAKE_OVER'|'RETURN_TO_BOT'|'DO_NOT_AUTO_REPLY'|'CLEAR_DO_NOT_AUTO_REPLY', actor:string) {
  const current=await getMessagingControl(repo,channel,conversationId); const timestamp=now(); const id=String(current?.id??crypto.randomUUID()); const mode=action==='TAKE_OVER'?'HUMAN':action==='RETURN_TO_BOT'?'BOT':String(current?.control_mode??'BOT'); const dnr=action==='DO_NOT_AUTO_REPLY'?1:action==='CLEAR_DO_NOT_AUTO_REPLY'?0:Number(current?.do_not_auto_reply??0);
  if(current) await repo.run('UPDATE messaging_conversation_controls SET control_mode=?,do_not_auto_reply=?,taken_over_by=CASE WHEN ?=\'HUMAN\' THEN ? ELSE taken_over_by END,taken_over_at=CASE WHEN ?=\'HUMAN\' THEN ? ELSE taken_over_at END,returned_by=CASE WHEN ?=\'BOT\' THEN ? ELSE returned_by END,returned_at=CASE WHEN ?=\'BOT\' THEN ? ELSE returned_at END,updated_at=? WHERE id=?',mode,dnr,mode,actor,mode,timestamp,mode,actor,mode,timestamp,timestamp,id);
  else await repo.run('INSERT INTO messaging_conversation_controls (id,person_id,channel,external_conversation_id,control_mode,do_not_auto_reply,taken_over_by,taken_over_at,returned_by,returned_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',id,personId,channel,conversationId,mode,dnr,mode==='HUMAN'?actor:null,mode==='HUMAN'?timestamp:null,mode==='BOT'&&action==='RETURN_TO_BOT'?actor:null,mode==='BOT'&&action==='RETURN_TO_BOT'?timestamp:null,timestamp);
  await repo.audit('UPDATE','messaging_conversation_control',id,{action,channel,external_conversation_id:conversationId,control_mode:mode,do_not_auto_reply:Boolean(dnr)});
  return getMessagingControl(repo,channel,conversationId);
}

export async function updateMessagingAttention(repo:D1Repository, attentionId:string, action:'CONFIRM'|'NOT_CONFIRMED', actor:string) {
  const current=await repo.first('SELECT id,status FROM messaging_attention WHERE id=?',attentionId);
  if(!current) throw new ApiError(404,'ATTENTION_NOT_FOUND','Attention item not found');
  const status=action==='CONFIRM'?'ACKNOWLEDGED':'RESOLVED'; const timestamp=now();
  await repo.run('UPDATE messaging_attention SET status=?,updated_at=? WHERE id=? AND status=\'OPEN\'',status,timestamp,attentionId);
  await repo.audit('UPDATE','messaging_attention',attentionId,{action,status,actor});
  return repo.first('SELECT * FROM messaging_attention WHERE id=?',attentionId);
}

export const canAutoReply = (control:Record<string,unknown>|null) => !control || (String(control.control_mode)==='BOT' && Number(control.do_not_auto_reply??0)===0);
