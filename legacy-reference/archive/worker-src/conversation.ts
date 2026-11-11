import { appendLeadEvent, applyLeadFacts, createLead, leadOperationalDetail, promoteConversationScore } from './domain';
import { ApiError, D1Repository, now } from './repository';
import { interpretMessage, type NluResult } from '../../../packages/domain/src/nlu';
import { analyzeMessagingTextWithAliases, canAutoReply, getMessagingControl, persistMessagingSignals } from './messaging-intelligence';

export type QuickReply = { title:string; payload:string };
export type TextSender = { sendText: (recipientId:string, text:string) => Promise<{ sent:boolean; reason?:string; messageId?:string }>; sendPrompt?: (recipientId:string, text:string, quickReplies:QuickReply[]) => Promise<{ sent:boolean; reason?:string; messageId?:string }> };
export type ConversationSelection = { kind:'INTEREST'|'DURATION'|'MOVE_IN'|'OCCUPANTS'|'VIEWING'; value:string };
export type ConversationInput = { platform:'MESSENGER'|'WHATSAPP'|'SIMULATOR'; externalContactId:string; displayName?:string; text:string; messageId?:string; receivedAt?:string; referenceDate?:Date; selection?:ConversationSelection };
export type ConversationResult = { duplicate:boolean; leadId:string; detected:NluResult; signals?:unknown[]; knownLeadFacts:Record<string,unknown>; action:string; reply:string; qualification:unknown; recommendation:unknown; escalation?:{ required:boolean; reason?:string }; delivery?:{sent:boolean;reason?:string;messageId?:string} };

export const BR_WHATSAPP_NUMBER = '+63 905 547 4651';

const mirroredGreeting=(text:string) => {
  const match=text.trim().match(/^(hi|hello|hey|good morning|good afternoon|good evening)\b/i);
  return match?.[1];
};

const ownerWelcome=(text:string) => {
  const greeting=mirroredGreeting(text);
  return `${greeting ? `${greeting}\n\n` : ''}I have apartments available in Poblacion, Makati.`;
};

type QuestionCode='INTEREST'|'MOVE_IN'|'DATE_CUSTOM'|'DURATION'|'OCCUPANTS'|'VIEWING'|'VIEWING_DATE';
type Prompt={code:QuestionCode;text:string;quickReplies:QuickReply[]};
const prompts:Record<QuestionCode,Prompt>={
  INTEREST:{code:'INTEREST',text:'Are you interested in renting?',quickReplies:[{title:"Yes, I'm interested",payload:'INTEREST_YES'},{title:'Not right now',payload:'INTEREST_NO'}]},
  MOVE_IN:{code:'MOVE_IN',text:'When would you like to move in?',quickReplies:[{title:'ASAP',payload:'MOVE_IN_ASAP'},{title:'Next week',payload:'MOVE_IN_NEXT_WEEK'},{title:'Later / flexible',payload:'MOVE_IN_FLEXIBLE'},{title:'Choose a date',payload:'MOVE_IN_CUSTOM'}]},
  DATE_CUSTOM:{code:'DATE_CUSTOM',text:'What move-in date works for you? You can type a date, like November 1.',quickReplies:[]},
  DURATION:{code:'DURATION',text:'How long are you planning to stay?',quickReplies:[{title:'3 months',payload:'DURATION_3'},{title:'6 months',payload:'DURATION_6'},{title:'1 year',payload:'DURATION_12'}]},
  OCCUPANTS:{code:'OCCUPANTS',text:'How many occupants will there be?',quickReplies:[{title:'1',payload:'OCCUPANTS_1'},{title:'2',payload:'OCCUPANTS_2'},{title:'3+',payload:'OCCUPANTS_3_PLUS'}]},
  VIEWING:{code:'VIEWING',text:'Would you like to arrange a viewing?',quickReplies:[{title:'Yes, a viewing',payload:'VIEWING_YES'},{title:'Not right now',payload:'VIEWING_NO'}]},
  VIEWING_DATE:{code:'VIEWING_DATE',text:'What day and time would work for a viewing? I’ll check the appointment with Alan.',quickReplies:[]},
};
const simpleText=(text:string)=>text.toLowerCase().replace(/[’]/g,"'").replace(/[.!?,]/g,'').trim();
const isGreetingOnly=(text:string)=>/^(hi|hello|hey|good morning|good afternoon|good evening)(\s+po)?[\s.!?,👋]*$/i.test(text.trim());
const contextualSelection=(text:string,pending?:QuestionCode):ConversationSelection|undefined=>{
  const value=simpleText(text);
  if(/^(no thanks|not right now|not interested|i'm not interested)$/.test(value))return {kind:pending==='VIEWING'?'VIEWING':'INTEREST',value:'NO'};
  if((!pending||pending==='INTEREST'||pending==='VIEWING')&&/^(yes|yes po|yep|yeah|sure|interested|i'm interested|opo|oo|yes a viewing)$/.test(value))return {kind:pending==='VIEWING'?'VIEWING':'INTEREST',value:'YES'};
  if((pending==='INTEREST'||pending==='VIEWING')&&/^(no|no thanks|not right now|not interested|no po|hindi)$/.test(value))return {kind:pending,value:'NO'};
  if(/^(asap|as soon as possible|agad)$/.test(value))return {kind:'MOVE_IN',value:'ASAP'};
  if(/^(the )?next week$/.test(value))return {kind:'MOVE_IN',value:'NEXT_WEEK'};
  if(/^(later|later \/ flexible|far away|flexible)$/.test(value))return {kind:'MOVE_IN',value:'FLEXIBLE'};
  if(/^(choose|choose a date)$/.test(value))return {kind:'MOVE_IN',value:'CUSTOM'};
  if(/^(1 year|one year|a year|12 months)$/.test(value))return {kind:'DURATION',value:'12'};
  if(pending==='OCCUPANTS'&&/^(1|2|3\+|alone|just me|one|two|three)$/.test(value))return {kind:'OCCUPANTS',value:({alone:'1','just me':'1',one:'1',two:'2',three:'3','3+':'3'} as Record<string,string>)[value]??value};
  if(pending==='DURATION'&&/^(3|6|12)$/.test(value))return {kind:'DURATION',value};
  return undefined;
};
const validateSelection=(selection?:ConversationSelection)=>{
  if(!selection)return;
  const values:Record<ConversationSelection['kind'],string[]>={INTEREST:['YES','NO'],VIEWING:['YES','NO'],DURATION:['3','6','12'],MOVE_IN:['ASAP','NEXT_WEEK','FLEXIBLE','CUSTOM'],OCCUPANTS:['1','2','3']};
  if(!values[selection.kind]?.includes(selection.value))throw new ApiError(422,'INVALID_SELECTION','Invalid conversation choice');
};
const questionFor=(qualification:Record<string,unknown>,lead:Record<string,unknown>):Prompt=>{
  if(qualification.nextQuestionCode==='ASK_MOVE_IN_DATE')return prompts.MOVE_IN;
  if(qualification.nextQuestionCode==='ASK_DURATION')return prompts.DURATION;
  if(!lead.occupancy_count)return prompts.OCCUPANTS;
  return prompts.VIEWING;
};
const reasonFor=(nlu:NluResult):string|undefined=>nlu.intents.includes('NEGOTIATION')?'NEGOTIATION':nlu.intents.includes('SHORT_STAY')?'SHORT_STAY':nlu.intents.includes('RESERVATION')?'RESERVATION':nlu.intents.includes('GHOSTS')?'GHOSTS':nlu.intents.includes('CONTRACT')?'CONTRACT':nlu.intents.includes('COMPLAINT')?'COMPLAINT':nlu.intents.includes('LOW_CONFIDENCE')?'LOW_CONFIDENCE':undefined;
const factualAnswer=(nlu:NluResult, operational:Record<string,unknown>|null, inputText:string, useOwnerWelcome:boolean, selection?:ConversationSelection) => {
  const intents=nlu.intents;
  if(selection?.kind==='INTEREST') return selection.value==='YES'?'Great — let’s find the right apartment for you.':'No problem.';
  if(useOwnerWelcome && (intents.includes('GREETING') || intents.includes('OTHER') || intents.length===0)) return ownerWelcome(inputText);
  if(intents.includes('LEGIT_SCAM')) return 'Yes — Boutique Rooms is run by a direct private owner. We arrange a physical viewing and owner meeting first; please do not send a reservation payment before that.';
  if(intents.includes('GHOSTS')) return 'I can only give verified property information. I cannot confirm claims about ghosts, so I will flag this for the owner.';
  if(intents.includes('COMPLAINT')) return 'I’m sorry you’re dealing with this. I will flag the complaint for the owner instead of guessing at a resolution.';
  if(intents.includes('CONTRACT')) return 'A special contract needs the owner’s review. I will flag it for a decision.';
  if(intents.includes('RESERVATION')) return 'Please view the apartment and meet the owner first. No reservation payment is requested before that; reservation conditions must be owner-confirmed.';
  if(intents.includes('OWNER_AGENT')) return 'Boutique Rooms is run by a direct private owner, not an agent.';
  if(intents.includes('NEGOTIATION')) return 'The standard rent is ₱25,000/month. I cannot promise a discount, but I can flag your request for the owner.';
  if(intents.includes('SHORT_STAY')) return 'The standard minimum is 3 months. A shorter stay may be possible at a different rate, but the owner must confirm it.';
  if(intents.includes('PETS')) return 'Cats are allowed. Dogs are not allowed.';
  if(intents.includes('PAYMENT')) return 'Payment can be made by GCash or cash. Bank transfer is not currently available.';
  if(intents.includes('WIFI')) return 'Optional Wi-Fi is 50 Mbps at ₱840/month. Higher-speed options may be available but are not guaranteed.';
  if(intents.includes('WATER')) return 'Water is ₱40/m³.';
  if(intents.includes('ELECTRICITY')) return 'Electricity is individually metered and paid by the tenant to Meralco.';
  if(intents.includes('UTILITIES')) return 'Electricity is individually metered and paid to Meralco. Water is ₱40/m³, and association dues are paid by the owner.';
  if(intents.includes('PARKING')) return 'Nearby third-party parking is around ₱3,000/month, but availability is not guaranteed.';
  if(intents.includes('SMOKING')) return 'Smoking is allowed on the balcony only. Vaping is allowed.';
  if(intents.includes('OCCUPANCY')) return 'The standard maximum is 2 residents. Exceptions need owner review.';
  if(intents.includes('TERMS')) return 'The standard terms are 3 months minimum, 1 month advance and 1 month security deposit. No PDC.';
  if(intents.includes('QUIET')) return 'I will prioritize the quiet-side rooms, BR·07 and BR·09, when they fit your dates.';
  if(intents.includes('VIEW')) return 'I will prioritize rooms with a conventional or panoramic view when they fit your dates.';
  if(intents.includes('FURNISHED')||intents.includes('KITCHEN')||intents.includes('AIRCON')||intents.includes('TV')) return 'Apartments are furnished and move-in ready, with a kitchenette, inverter AC, hot shower and bidet. Induction is available on request.';
  if(intents.includes('SECURITY')||intents.includes('BUILDING')) return 'The building has 24/7 security and CCTV in common areas. Reception is 9 AM–5 PM except Sundays; there is no pool or gym.';
  if(intents.includes('VIEWING')) return `Viewings are by appointment, normally 8 AM–5 PM, and I personally show the apartment. Once we agree on a viewing, we can also use WhatsApp at ${BR_WHATSAPP_NUMBER} if that is easier.`;
  if(intents.includes('PRICE')||intents.includes('HM')) return 'Standard rent is ₱25,000/month, with a 3-month minimum.';
  if(intents.includes('AVAILABILITY') && !operational?.availability) return 'I can check availability for your dates.';
  if(operational?.availability) {
    const availability=operational.availability as Record<string,unknown>; const recommendation=operational.recommendation as Record<string,unknown>|null;
    const ids=Array.isArray(availability.unit_ids)?availability.unit_ids.map(String):[];
    if(recommendation && Array.isArray(recommendation.recommendations) && recommendation.recommendations.length) return `For those dates, compatible options include ${(recommendation.recommendations as Record<string,unknown>[]).slice(0,3).map(item=>String(item.unitId)).join(', ')}.`;
    return ids.length?`For those dates, available rooms are ${ids.slice(0,3).join(', ')}.`:'I do not see a compatible available room for those dates yet, so I will flag it for the owner.';
  }
  if(intents.includes('TOO_SMALL')) return 'I will check the larger upgrade options first, including BR·04, BR·32 and BR·27.';
  if(intents.includes('TOO_DARK')) return 'I will prioritize brighter view-facing alternatives instead of the quiet-side rooms.';
  if(intents.includes('SPECIFIC_ROOM') && nlu.entities.unitId) return `I will check ${nlu.entities.unitId} first for your dates.`;
  if(intents.includes('GREETING')) return ownerWelcome(inputText);
  if(intents.includes('THANKS')) return 'You’re welcome!';
  return 'Tell me what you’re looking for, and I’ll help you find an apartment that fits.';
};

export class ConversationService {
  constructor(private readonly repo:D1Repository, private readonly sender?:TextSender) {}

  async handle(input:ConversationInput):Promise<ConversationResult> {
    if(!input.externalContactId.trim() || !input.text.trim()) throw new ApiError(422,'VALIDATION_ERROR','external_contact_id and text are required');
    validateSelection(input.selection);
    if(input.messageId) { const duplicate=await this.repo.first('SELECT payload_json FROM audit_log WHERE entity_type=? AND entity_id=? LIMIT 1','messenger_message',input.messageId); if(duplicate) { let payload:Record<string,unknown>={}; try { payload=JSON.parse(String(duplicate.payload_json??'{}')) as Record<string,unknown>; } catch {} return {duplicate:true,leadId:String(payload.lead_id??''),detected:interpretMessage(input.text,input.referenceDate),knownLeadFacts:{},action:'DUPLICATE_IGNORED',reply:'',qualification:null,recommendation:null}; } }
    const analysis=await analyzeMessagingTextWithAliases(this.repo,input.text,input.referenceDate);
    const existing=await this.repo.first('SELECT * FROM leads WHERE platform=? AND external_contact_id=? LIMIT 1',input.platform,input.externalContactId) ?? (input.platform==='MESSENGER'?await this.repo.first('SELECT * FROM leads WHERE platform=? AND messenger_psid=? LIMIT 1','MESSENGER',input.externalContactId):null);
    const previous=existing?await this.repo.first("SELECT payload_json FROM audit_log WHERE entity_type='conversation_turn' AND entity_id=? ORDER BY rowid DESC LIMIT 1",existing.id):null;
    let pending:QuestionCode|undefined;
    try { const code=JSON.parse(String(previous?.payload_json??'{}')).pending_question; if(typeof code==='string'&&Object.hasOwn(prompts,code))pending=code as QuestionCode; } catch { /* Old/malformed context cannot authorize any action. */ }
    const precision=analysis.signals.find(signal=>signal.key==='MOVE_IN_DATE'&&signal.valueJson?.precision);
    const selection=input.selection??contextualSelection(input.text,pending)??(precision?{kind:'MOVE_IN' as const,value:String(precision.valueJson?.precision)}:undefined);
    validateSelection(selection);
    const greetingOnly=isGreetingOnly(input.text);
    const sharedEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.text.trim())&&input.text.trim().length<=254?input.text.trim():undefined;
    const sharedPhone=/^\+\d[\d ()-]{7,20}$/.test(input.text.trim())?input.text.trim().replace(/[ ()-]/g,''):undefined;
    const acknowledgement=/^(ok|okay|ok po|okay po|👍|thank you|thanks|salamat)$/.test(simpleText(input.text));
    if(selection||greetingOnly||acknowledgement||sharedEmail||sharedPhone) {
      analysis.intents=analysis.intents.filter(intent=>intent!=='LOW_CONFIDENCE'&&intent!=='OTHER');
      analysis.signals=analysis.signals.filter(signal=>signal.key!=='LOW_CONFIDENCE');
    }
    if(selection?.kind==='MOVE_IN'&&selection.value!=='CUSTOM') {
      analysis.meaningful=true;
      analysis.signals=analysis.signals.filter(signal=>signal.key!=='MOVE_IN_DATE');
      analysis.signals.push({key:'MOVE_IN_DATE',value:selection.value,valueJson:{precision:selection.value},priority:'INTERESTING',needsAlan:false,botCanContinue:true});
    }
    if(selection?.kind==='DURATION') { analysis.entities.durationMonths=Number(selection.value); analysis.meaningful=true; analysis.signals=analysis.signals.filter(signal=>signal.key!=='STAY_DURATION'); analysis.signals.push({key:'STAY_DURATION',value:Number(selection.value),priority:'INTERESTING',needsAlan:false,botCanContinue:true}); }
    if(selection?.kind==='OCCUPANTS') { analysis.entities.occupancyCount=Number(selection.value); analysis.meaningful=true; analysis.signals=analysis.signals.filter(signal=>signal.key!=='OCCUPANCY'); analysis.signals.push({key:'OCCUPANCY',value:Number(selection.value),priority:'INTERESTING',needsAlan:false,botCanContinue:true}); }
    const viewingProposal=(pending==='VIEWING_DATE'&&!greetingOnly&&!selection&&!acknowledgement&&!/\bmove[ -]?in\b/i.test(input.text)&&!analysis.intents.some(intent=>['PRICE','HM','WIFI','PETS','TERMS','UTILITIES','PAYMENT'].includes(intent)))||(analysis.intents.includes('VIEWING')&&Boolean(analysis.entities.moveInDate||/\b(?:at|around)\s+\d/i.test(input.text)));
    const priorProposal=viewingProposal&&existing?await this.repo.first("SELECT structured_payload_json FROM lead_events WHERE lead_id=? AND event_type='VIEWING_DATE_PROPOSED' ORDER BY rowid DESC LIMIT 1",existing.id):null;
    let proposed:Record<string,unknown>={}; try { proposed=JSON.parse(String(priorProposal?.structured_payload_json??'{}')); } catch { /* Ignore invalid legacy proposal metadata. */ }
    const proposedDate=viewingProposal?(analysis.entities.moveInDate??proposed.date):undefined;
    const proposedTime=viewingProposal?input.text.match(/(?:^|\b(?:at|around|mga)\s+)(1[0-2]|[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i):null;
    const proposedHour=proposedTime?Number(proposedTime[1]):proposed.hour;
    const proposedMinute=proposedTime?Number(proposedTime[2]??0):proposed.minute;
    const proposedMeridiem=proposedTime?.[3]?.toLowerCase()??proposed.meridiem;
    if(viewingProposal) {
      analysis.entities.moveInDate=undefined; analysis.intents=analysis.intents.filter(intent=>intent!=='MOVE_IN'&&intent!=='LOW_CONFIDENCE'&&intent!=='OTHER');
      analysis.signals=analysis.signals.filter(signal=>signal.key!=='MOVE_IN_DATE'&&signal.key!=='LOW_CONFIDENCE'&&signal.key!=='VIEWING_DATE_PROPOSED');
      if(proposedDate||proposedTime)analysis.signals.push({key:'VIEWING_DATE_PROPOSED',value:String(proposedDate??'TIME_PROPOSED'),valueJson:{date:proposedDate??null,hour:proposedHour??null,meridiem:proposedMeridiem??null,confirmed:false},priority:'HIGH',needsAlan:true,botCanContinue:true});
    }
    const nlu:NluResult=analysis;
    let lead:Record<string,unknown>; let action='UPDATED_LEAD';
    if(existing) { lead=existing; await this.repo.run('UPDATE leads SET message_count=message_count+1,last_seen_at=?,updated_at=? WHERE id=?',input.receivedAt??now(),now(),existing.id); }
    else { const created=await createLead(this.repo,{platform:input.platform,external_contact_id:input.externalContactId,messenger_psid:input.platform==='MESSENGER'?input.externalContactId:null,display_name:input.displayName,source:input.platform}); if(!created) throw new ApiError(500,'LEAD_CREATE_FAILED','Unable to create lead'); lead=created; await this.repo.run('UPDATE leads SET message_count=1,last_seen_at=?,updated_at=? WHERE id=?',input.receivedAt??now(),now(),lead.id); action='CREATED_LEAD'; }
    const knownUnit=nlu.entities.unitId?await this.repo.first('SELECT id FROM units WHERE id=?',nlu.entities.unitId):null;
    const facts:Record<string,unknown>={}; if(nlu.entities.moveInDate) { facts.move_in_date=nlu.entities.moveInDate; facts.move_in_precision=null; } if(nlu.entities.durationMonths) facts.duration_months=nlu.entities.durationMonths; if(nlu.entities.occupancyCount) facts.occupancy_count=nlu.entities.occupancyCount; if(selection?.kind==='MOVE_IN') { facts.move_in_precision=selection.value==='CUSTOM'?null:selection.value; facts.move_in_date=null; } if(nlu.entities.unitId&&knownUnit) facts.unit_interest_ids=[nlu.entities.unitId]; if(nlu.entities.preference) facts.objections=[nlu.entities.preference]; if(nlu.entities.objection) facts.objections=[nlu.entities.objection]; if(nlu.intents.includes('PRICE')) facts.price_known=true; if(nlu.intents.includes('TERMS')) facts.terms_known=true; if(nlu.intents.includes('OWNER_AGENT')) facts.owner_known=true; if(nlu.intents.includes('VIEWING')||selection?.kind==='VIEWING'&&selection.value==='YES'||viewingProposal) facts.viewing_requested=true;
    if(Object.keys(facts).length) { await applyLeadFacts(this.repo,String(lead.id),facts); action='UPDATED_FACTS'; }
    // Promote meaningful facts to the existing scoring vocabulary, once per concept.
    const scoredEvents:string[]=[];
    if(facts.move_in_date||facts.move_in_precision)scoredEvents.push('MOVE_IN_CAPTURED');
    if(facts.duration_months)scoredEvents.push('DURATION_CAPTURED');
    if(facts.unit_interest_ids)scoredEvents.push('UNIT_SELECTED');
    if(facts.viewing_requested)scoredEvents.push('VIEWING_REQUESTED');
    if(viewingProposal&&(proposedDate||proposedTime))scoredEvents.push('VIEWING_PROPOSED');
    if(nlu.intents.some(intent=>['PRICE','HM'].includes(intent)))scoredEvents.push('ASKED_PRICE');
    if(nlu.intents.includes('OWNER_AGENT'))scoredEvents.push('ASKED_OWNER');
    for(const eventType of scoredEvents)await promoteConversationScore(this.repo,String(lead.id),eventType,input.platform,input.messageId);
    if(nlu.meaningful) { await appendLeadEvent(this.repo,String(lead.id),{event_type:'MESSAGE_INTERPRETED',structured_payload:{intents:nlu.intents,entities:nlu.entities},source:input.platform}); await this.repo.run('UPDATE leads SET last_meaningful_interaction_at=?,updated_at=? WHERE id=?',input.receivedAt??now(),now(),lead.id); }
    const personLink=await this.repo.first('SELECT person_id FROM person_leads WHERE lead_id=?',String(lead.id)); const signals=personLink?.person_id?await persistMessagingSignals(this.repo,String(personLink.person_id),input.platform,input.externalContactId,analysis,input.messageId):[];
    if(personLink?.person_id&&(sharedEmail||sharedPhone)) {
      await this.repo.run("UPDATE persons SET email=COALESCE(NULLIF(email,''),?),phone=COALESCE(NULLIF(phone,''),?),updated_at=? WHERE id=?",sharedEmail??null,sharedPhone??null,now(),personLink.person_id);
      await this.repo.audit('CONTACT_SHARED','person',String(personLink.person_id),{fields:[...(sharedEmail?['email']:[]),...(sharedPhone?['phone']:[])],channel:input.platform});
    }
    const refreshed=await this.repo.first('SELECT * FROM leads WHERE id=?',String(lead.id)); if(!refreshed) throw new ApiError(500,'LEAD_NOT_FOUND','Lead disappeared during conversation processing');
    if(viewingProposal&&(proposedDate||proposedTime))await appendLeadEvent(this.repo,String(lead.id),{event_type:'VIEWING_DATE_PROPOSED',structured_payload:{date:proposedDate??null,hour:proposedHour??null,minute:proposedMinute??null,meridiem:proposedMeridiem??null,confirmation_status:'AWAITING_OWNER'},source:input.platform});
    const operational=await leadOperationalDetail(this.repo,refreshed); const qualification=operational.qualification as Record<string,unknown>;
    if(qualification.qualified&&refreshed.status==='NEW') {
      await this.repo.run("UPDATE leads SET status='QUALIFIED',updated_at=? WHERE id=? AND status='NEW'",now(),lead.id);
      await this.repo.audit('QUALIFY','lead',String(lead.id),{source:input.platform});refreshed.status='QUALIFIED';
    }
    const directReason=Number(refreshed.occupancy_count)>2?'OCCUPANCY_EXCEPTION':viewingProposal||selection?.kind==='VIEWING'&&selection.value==='YES'?'VIEWING_REQUEST':reasonFor(nlu); const recommendationEscalates=Boolean((operational.recommendation as Record<string,unknown>|null)?.escalationRequired); const escalationReason=directReason??(recommendationEscalates?'OWNER_DECISION':undefined);
    let finalLead=refreshed;
    if(escalationReason) { await appendLeadEvent(this.repo,String(lead.id),{event_type:'NEEDS_ALAN',structured_payload:{reason:escalationReason,priority:'HIGH'},source:input.platform}); finalLead=await this.repo.first('SELECT * FROM leads WHERE id=?',String(lead.id))??refreshed; action='NEEDS_ALAN'; }
    let answer=factualAnswer(nlu,operational,input.text,greetingOnly,selection);
    let prompt:Prompt|undefined;
    if(greetingOnly) { answer=ownerWelcome(input.text); prompt=prompts.INTEREST; }
    else if(selection?.value==='NO')answer='No problem — message me whenever you’re ready.';
    else if(selection?.kind==='VIEWING'&&selection.value==='YES') { answer='Sure — let’s arrange a time.'; prompt=prompts.VIEWING_DATE; }
    else if(viewingProposal) { answer=proposedDate&&proposedHour&&proposedMeridiem?'Got it — Alan will confirm the viewing time here. Your appointment isn’t confirmed yet.':proposedDate?'Got the day. What time works for you? Please include AM or PM.':proposedHour?'Got the time. What date works for you?':'What date and time would suit you? Please include AM or PM.'; }
    else if(selection?.kind==='MOVE_IN'&&selection.value==='CUSTOM') { answer='Sure.'; prompt=prompts.DATE_CUSTOM; }
    else if(nlu.intents.includes('VIEWING')) { answer='Sure — I personally show the apartments. Viewings are by appointment, usually between 8 AM and 5 PM.'; prompt=prompts.VIEWING_DATE; }
    else if(selection||nlu.entities.moveInDate||nlu.entities.durationMonths||nlu.entities.occupancyCount) {
      const confirmations:string[]=[];
      if(selection?.kind==='INTEREST')confirmations.push('Great — let’s find the right apartment for you.');
      if(selection?.kind==='MOVE_IN')confirmations.push(({ASAP:'ASAP — got it.',NEXT_WEEK:'Next week — got it.',FLEXIBLE:'No rush — we can work around your dates.'} as Record<string,string>)[selection.value]);
      if(nlu.entities.moveInDate)confirmations.push(`${nlu.entities.moveInDate} — got it.`);
      if(nlu.entities.durationMonths)confirmations.push(`${nlu.entities.durationMonths} months — got it.`);
      if(nlu.entities.occupancyCount)confirmations.push(`${nlu.entities.occupancyCount} occupant${nlu.entities.occupancyCount===1?'':'s'} — got it.`);
      const factualIntents=nlu.intents.some(intent=>!['MOVE_IN','DURATION','OCCUPANCY','OTHER','LOW_CONFIDENCE','GREETING'].includes(intent));
      answer=factualIntents?`${factualAnswer(nlu,operational,input.text,false)}\n\n${confirmations.filter(Boolean).join(' ')}`:confirmations.filter(Boolean).join(' ');
      if(Number(refreshed.occupancy_count)>2)answer+=' Three or more occupants need Alan’s approval; I’ll check with him.';
      prompt=questionFor(qualification,refreshed);
    }
    else if(sharedEmail||sharedPhone){answer='Got it — thank you.';prompt=pending?prompts[pending]:questionFor(qualification,refreshed);}
    else if(acknowledgement)answer=/^(thanks|thank you|salamat)$/.test(simpleText(input.text))?'You’re welcome!':'Got it.';
    else if(nlu.intents.includes('LOW_CONFIDENCE')||nlu.intents.every(intent=>intent==='OTHER')) { answer='I’m not sure I understood that. Could you tell me a little more?'; prompt=pending?prompts[pending]:undefined; }
    else prompt=pending==='VIEWING_DATE'||pending==='DATE_CUSTOM'?prompts[pending]:questionFor(qualification,refreshed);
    if(['GHOSTS','COMPLAINT'].includes(escalationReason??''))prompt=undefined;
    if(nlu.entities.unitId&&!knownUnit) { answer='I don’t have that room in the Boutique Rooms inventory. Which apartment did you mean?'; prompt=undefined; }
    const promptText=prompt?`${answer}\n\n${prompt.text}`:answer; const greeting=mirroredGreeting(input.text); const reply=greeting && !promptText.toLowerCase().startsWith(greeting.toLowerCase())?`${greeting}\n\n${promptText}`:promptText;
    const control=await getMessagingControl(this.repo,input.platform,input.externalContactId); const delivery=this.sender && canAutoReply(control)?prompt?.quickReplies.length&&this.sender.sendPrompt?await this.sender.sendPrompt(input.externalContactId,reply,prompt.quickReplies):await this.sender.sendText(input.externalContactId,reply):undefined;
    if(canAutoReply(control)&&(!this.sender||delivery?.sent))await this.repo.audit('TURN','conversation_turn',String(lead.id),{pending_question:prompt?.code??(viewingProposal?'VIEWING_DATE':acknowledgement?pending??null:null),channel:input.platform});
    if(delivery && !delivery.sent) await this.repo.audit('SEND_FAILED','messenger_delivery',input.messageId??String(lead.id),{lead_id:String(lead.id),code:delivery.reason??'SEND_FAILED'});
    if(input.messageId) await this.repo.audit('RECEIVE','messenger_message',input.messageId,{lead_id:String(lead.id),intents:nlu.intents,action});
    return {duplicate:false,leadId:String(lead.id),detected:nlu,signals,knownLeadFacts:{...finalLead,objections:operational.objections,unit_interests:operational.unit_interests},action,reply,qualification,recommendation:operational.recommendation,escalation:escalationReason?{required:true,reason:escalationReason}:{required:false},delivery};
  }
}
