import { describe, expect, it } from 'vitest';
import { ConversationService } from '../../apps/worker/src/conversation';
import { interpretMessage } from '../../packages/domain/src/nlu';

class FakeConversationRepo {
  lead:Record<string,unknown>|null=null; objections:string[]=[]; interests:Record<string,unknown>[]=[]; events:Record<string,unknown>[]=[]; audits:Record<string,unknown>[]=[];
  async batch(statements:Array<{sql:string;args:unknown[]}>) {
    const event=statements[0].args;if(this.events.some(row=>row.event_type===event[2]))return;
    this.events.push({id:event[0],event_type:event[2],structured_payload_json:event[3]});
    if(this.lead)this.lead.interest_score=Number(this.lead.interest_score??0)+Number(statements[1].args[0]);
    const audit=statements[2].args;this.audits.push({action:audit[1],entity_type:audit[2],entity_id:audit[3],payload_json:audit[4]});
  }
  async first(sql:string,...args:unknown[]) {
    if(sql.includes('FROM audit_log')) return this.audits.find(item=>item.entity_id===args[1])??null;
    if(sql.includes('FROM leads WHERE platform')) return this.lead && this.lead.platform===args[0] && (this.lead.external_contact_id===args[1] || this.lead.messenger_psid===args[2])?this.lead:null;
    if(sql.includes('FROM leads WHERE id')) return this.lead;
    if(sql.includes('SELECT interest_score')) return {interest_score:this.lead?.interest_score??0};
    if(sql.includes('SELECT status FROM units')) return {status:'AVAILABLE'};
    if(sql.includes('SELECT id FROM units')) return args[0]==='BR·02'?{id:'BR·02'}:null;
    return null;
  }
  async all(sql:string) {
    if(sql.includes('FROM lead_objections')) return this.objections.map(objection=>({objection}));
    if(sql.includes('FROM lead_unit_interests')) return this.interests;
    if(sql.includes('SELECT id,sqm,commercial_priority FROM units')) return [{id:'BR·02',sqm:24,commercial_priority:'HIGH'}];
    if(sql.includes('FROM unit_features')) return [{feature_key:'view',feature_value:'true'}];
    return [];
  }
  async run(sql:string,...args:unknown[]) {
    if(sql.startsWith('INSERT INTO leads')) this.lead={id:'lead-1',platform:args[2],external_contact_id:args[3],messenger_psid:args[4],status:'NEW',interest_score:0,message_count:0,first_seen_at:args[20],last_seen_at:args[21],updated_at:args[23]};
    else if(sql.includes('message_count=message_count+1')) { if(this.lead){this.lead.message_count=Number(this.lead.message_count??0)+1;this.lead.last_seen_at=args[0];} }
    else if(sql.startsWith('UPDATE leads SET')) { const keys=(sql.match(/UPDATE leads SET (.*),updated_at=/)?.[1]??'').split(',').map(item=>item.split('=')[0]); keys.forEach((key,index)=>{if(key!=='message_count'&&this.lead)this.lead[key]=args[index];}); }
    else if(sql.startsWith('DELETE FROM lead_objections')) this.objections=[];
    else if(sql.startsWith('INSERT INTO lead_objections')) this.objections.push(String(args[1]));
    else if(sql.startsWith('DELETE FROM lead_unit_interests')) this.interests=[];
    else if(sql.startsWith('INSERT INTO lead_unit_interests')) this.interests.push({unit_id:args[1],interest_type:args[2]});
    else if(sql.startsWith('INSERT INTO lead_events')) this.events.push({event_type:args[2],structured_payload_json:args[4]});
  }
  async audit(action:string,entityType:string,entityId:string,payload:unknown) { this.audits.push({action,entity_type:entityType,entity_id:entityId,payload_json:JSON.stringify(payload)}); }
}

describe('deterministic Messenger conversation engine',()=>{
  it('recognizes chat aliases and safe entities without an LLM',()=>{
    const result=interpretMessage('I want BR07, quiet, 2 months from Nov 1 for 2 people',new Date('2026-10-05T00:00:00Z'));
    expect(result.intents).toEqual(expect.arrayContaining(['SPECIFIC_ROOM','QUIET','DURATION','MOVE_IN','OCCUPANCY','SHORT_STAY']));
    expect(result.entities).toMatchObject({unitId:'BR·07',moveInDate:'2026-11-01',durationMonths:2,occupancyCount:2,preference:'WANTS_QUIET'});
  });
  it('runs a multi-turn qualification sequence and suppresses duplicate delivery',async()=>{
    const repo=new FakeConversationRepo(); const service=new ConversationService(repo as never);
    const first=await service.handle({platform:'SIMULATOR',externalContactId:'psid-1',text:'hm?',messageId:'mid-1',referenceDate:new Date('2026-10-05T00:00:00Z')});
    expect(first.reply).toContain('₱25,000'); expect(first.reply).toContain('move in');
    const second=await service.handle({platform:'SIMULATOR',externalContactId:'psid-1',text:'Nov 1',messageId:'mid-2',referenceDate:new Date('2026-10-05T00:00:00Z')});
    expect(second.reply).toContain('How long');
    const third=await service.handle({platform:'SIMULATOR',externalContactId:'psid-1',text:'6 months',messageId:'mid-3',referenceDate:new Date('2026-10-05T00:00:00Z')});
    expect(third.qualification).toMatchObject({qualified:true}); expect(third.reply).toContain('How many occupants');
    const duplicate=await service.handle({platform:'SIMULATOR',externalContactId:'psid-1',text:'6 months',messageId:'mid-3'});
    expect(duplicate.duplicate).toBe(true); expect(repo.events.filter(event=>event.event_type==='MESSAGE_INTERPRETED')).toHaveLength(2);
    expect(repo.events.map(event=>event.event_type)).toEqual(expect.arrayContaining(['ASKED_PRICE','MOVE_IN_CAPTURED','DURATION_CAPTURED']));
  });
  it('uses a direct-owner welcome and mirrors the customer greeting',async()=>{
    const repo=new FakeConversationRepo(); const service=new ConversationService(repo as never);
    const result=await service.handle({platform:'SIMULATOR',externalContactId:'psid-welcome',text:'Good afternoon',messageId:'welcome-1'});
    expect(result.reply).toBe('Good afternoon\n\nI have apartments available in Poblacion, Makati.\n\nAre you interested in renting?');
    expect(result.reply).not.toContain('Thanks for contacting');
    expect(result.reply).not.toContain('WhatsApp');
  });
  it('builds the native question fallback with duration, date and occupancy choices',async()=>{
    const prompts:unknown[]=[]; const repo=new FakeConversationRepo(); const service=new ConversationService(repo as never,{sendText:async()=>({sent:true}),sendPrompt:async(_recipient,text,quickReplies)=>{prompts.push({text,quickReplies});return {sent:true};}});
    await service.handle({platform:'MESSENGER',externalContactId:'psid-prompt',text:'Hi',messageId:'prompt-1'});
    expect(prompts[0]).toMatchObject({quickReplies:[{title:"Yes, I'm interested",payload:'INTEREST_YES'},{title:'Not right now',payload:'INTEREST_NO'}]});
    expect(prompts[0]).toMatchObject({text:'Hi\n\nI have apartments available in Poblacion, Makati.\n\nAre you interested in renting?'});
  });
  it('continues qualification after explicit interest selection',async()=>{
    const repo=new FakeConversationRepo(); const service=new ConversationService(repo as never);
    await service.handle({platform:'SIMULATOR',externalContactId:'psid-interest',text:'Hi',messageId:'interest-1'});
    const result=await service.handle({platform:'SIMULATOR',externalContactId:'psid-interest',text:"Yes, I'm interested",messageId:'interest-2',selection:{kind:'INTEREST',value:'YES'}});
    expect(result.reply).toContain('Great');
    expect(result.reply).toContain('When would you like to move in?');
  });
  it('answers facts and escalates owner decisions without inventing terms',async()=>{
    const repo=new FakeConversationRepo(); const service=new ConversationService(repo as never);
    const negotiation=await service.handle({platform:'SIMULATOR',externalContactId:'psid-2',text:'negotiable?',messageId:'mid-n'});
    expect(negotiation.reply).toContain('cannot promise a discount'); expect(negotiation.escalation?.required).toBe(true);
    const pets=await service.handle({platform:'SIMULATOR',externalContactId:'psid-3',text:'do you accept dogs?',messageId:'mid-p'});
    expect(pets.reply).toContain('Dogs are not allowed');
  });
  it('answers common qualification and safety conversations with one useful question',async()=>{
    const available=await new ConversationService(new FakeConversationRepo() as never).handle({platform:'SIMULATOR',externalContactId:'psid-a',text:'available?',messageId:'a1'});
    expect(available.reply).toContain('check availability'); expect(available.reply.match(/\?/g)?.length).toBe(1);
    const tomorrow=await new ConversationService(new FakeConversationRepo() as never).handle({platform:'SIMULATOR',externalContactId:'psid-b',text:'tomorrow',messageId:'b1'});
    expect(tomorrow.reply).toContain('How long');
    const quiet=await new ConversationService(new FakeConversationRepo() as never).handle({platform:'SIMULATOR',externalContactId:'psid-c',text:'somewhere quiet',messageId:'c1'});
    expect(quiet.reply).toContain('BR·07');
    const view=await new ConversationService(new FakeConversationRepo() as never).handle({platform:'SIMULATOR',externalContactId:'psid-d',text:'I want a view',messageId:'d1'});
    expect(view.reply).not.toContain('BR·07');
    const size=await new ConversationService(new FakeConversationRepo() as never).handle({platform:'SIMULATOR',externalContactId:'psid-e',text:'too small',messageId:'e1'});
    expect(size.reply).toContain('BR·04');
    const short=await new ConversationService(new FakeConversationRepo() as never).handle({platform:'SIMULATOR',externalContactId:'psid-f',text:'only one month',messageId:'f1'});
    expect(short.escalation?.required).toBe(true);
    const legit=await new ConversationService(new FakeConversationRepo() as never).handle({platform:'SIMULATOR',externalContactId:'psid-g',text:'is this legit?',messageId:'g1'});
    expect(legit.reply).toContain('physical viewing');
    const reservation=await new ConversationService(new FakeConversationRepo() as never).handle({platform:'SIMULATOR',externalContactId:'psid-h',text:'can I pay reservation now?',messageId:'h1'});
    expect(reservation.reply).toContain('No reservation payment');
    const ghosts=await new ConversationService(new FakeConversationRepo() as never).handle({platform:'SIMULATOR',externalContactId:'psid-i',text:'ghosts?',messageId:'i1'});
    expect(ghosts.reply).toContain('verified property information');
  });
});
