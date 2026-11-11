import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { processMessengerPayload } from '../apps/worker/src/messenger';
import { getPersonDetail, listPeople } from '../apps/worker/src/people';
import { D1Repository } from '../apps/worker/src/repository';
import { safeMessengerLink, syncMessengerProfile } from '../apps/worker/src/messenger-profile';
import { promoteConversationScore } from '../apps/worker/src/domain';

const opened:DatabaseSync[]=[];
afterEach(()=>{for(const db of opened.splice(0))db.close();vi.unstubAllGlobals();});
function journey() {
  const sqlite=new DatabaseSync(':memory:'); opened.push(sqlite);
  for(const file of readdirSync('db/migrations-rc').filter(name=>name.endsWith('.sql')).sort())sqlite.exec(readFileSync(`db/migrations-rc/${file}`,'utf8'));
  sqlite.exec("PRAGMA foreign_keys=ON; INSERT INTO units (id,actual_unit_number,floor,type,sqm,monthly_rent_centavos,commercial_priority,status,created_at,updated_at) VALUES ('BR·07','707',7,'STUDIO',24,2500000,'HIGH','AVAILABLE','2026-01-01','2026-01-01')");
  const prepare=(sql:string)=>{
    const bind=(...values:unknown[])=>{const args=values.map(value=>value??null) as SQLInputValue[];return {
      run:async()=>({meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}}),
      first:async()=>sqlite.prepare(sql).get(...args)??null,
      all:async()=>({results:sqlite.prepare(sql).all(...args)}),
    };};return {bind,...bind()};
  };
  let batchQueue=Promise.resolve<unknown>(null);
  const db={prepare,batch:(statements:Array<{run:()=>Promise<unknown>}>)=>{const task=batchQueue.then(async()=>{sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}});batchQueue=task.catch(()=>null);return task;}} as unknown as D1Database;
  const requests:Array<{message:{text:string;quick_replies?:Array<{title:string;payload:string}>}}> = [];
  let graphFails=false;
  const graph=vi.fn(async(_url:unknown,init:RequestInit)=>{requests.push(JSON.parse(String(init.body)));return Response.json({message_id:`out-${requests.length}`},{status:graphFails?503:200});});
  vi.stubGlobal('fetch',graph);
  let sequence=0;
  const send=async(text:string,payload?:string,id?:string)=>{
    const result=await processMessengerPayload({object:'page',entry:[{id:'123',messaging:[{sender:{id:'synthetic-person'},recipient:{id:'123'},message:{mid:id??`mid-${++sequence}`,text,...(payload?{quick_reply:{payload}}:{})}}]}]}, {DB:db,META_PAGE_ID:'123',META_PAGE_TOKEN:'synthetic-only'});
    expect(result.failed).toBe(graphFails?1:0);
    return result.results[0];
  };
  const last=()=>requests.at(-1)!.message;
  const lead=()=>sqlite.prepare('SELECT * FROM leads').get()!;
  return {sqlite,db,send,last,lead,requests,graph,failGraph:()=>{graphFails=true;}};
}

describe('real Messenger journeys: parser → migrated D1 → shared engine → Graph',()=>{
  it.each(['updated_at','last_activity','name','created_at'])('loads Office People against migrated D1 sorted by %s',async sort=>{
    const j=journey();await j.send('Hi');const people=await listPeople(new D1Repository(j.db),{limit:100,sort,direction:'desc'});
    expect(people).toHaveLength(1);expect(people[0].lead_count).toBe(1);
  });
  it('People search finds canonical identity and private label, and returns no unrelated matches',async()=>{
    const j=journey();await j.send('Hi');const repo=new D1Repository(j.db);const personId=String(j.sqlite.prepare('SELECT id FROM persons').get()!.id);
    await repo.run('INSERT INTO person_labels (id,person_id,label,visibility,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?)','test-label',personId,'Private test label','PRIVATE',1,'2026-10-08','2026-10-08');
    expect(await listPeople(repo,{search:'synthetic-person',sort:'updated_at'})).toHaveLength(1);
    expect(await listPeople(repo,{search:'Private test',sort:'last_activity'})).toHaveLength(1);
    expect(await listPeople(repo,{search:'no-such-person'})).toHaveLength(0);
  });
  it('concurrent scoring promotion creates exactly one event and one score increase',async()=>{
    const j=journey();await j.send('Hi');const repo=new D1Repository(j.db),leadId=String(j.lead().id);
    await Promise.all([promoteConversationScore(repo,leadId,'MOVE_IN_CAPTURED','MESSENGER','one'),promoteConversationScore(repo,leadId,'MOVE_IN_CAPTURED','MESSENGER','two')]);
    expect(j.lead().interest_score).toBe(2);expect(j.sqlite.prepare("SELECT COUNT(*) AS count FROM lead_events WHERE event_type='MOVE_IN_CAPTURED'").get()?.count).toBe(1);
  });
  it('failure between scoring event and lead update rolls back, then retry succeeds once',async()=>{
    const j=journey();await j.send('Hi');const repo=new D1Repository(j.db),leadId=String(j.lead().id);
    j.sqlite.exec("CREATE TRIGGER injected_score_failure BEFORE UPDATE OF interest_score ON leads BEGIN SELECT RAISE(ABORT,'injected'); END");
    await expect(promoteConversationScore(repo,leadId,'MOVE_IN_CAPTURED','MESSENGER','one')).rejects.toThrow();
    expect(j.lead().interest_score).toBe(0);expect(j.sqlite.prepare("SELECT COUNT(*) AS count FROM lead_events WHERE event_type='MOVE_IN_CAPTURED'").get()?.count).toBe(0);
    j.sqlite.exec('DROP TRIGGER injected_score_failure');await promoteConversationScore(repo,leadId,'MOVE_IN_CAPTURED','MESSENGER','one');expect(j.lead().interest_score).toBe(2);
  });
  it('consolidates repeated signal memory, scores once and qualifies the stored lead',async()=>{
    const j=journey();await j.send('hm?');await j.send('ASAP');await j.send('ASAP');await j.send('6 months');
    expect(j.lead()).toMatchObject({status:'QUALIFIED',interest_score:5});
    const person=j.sqlite.prepare('SELECT id FROM persons').get()!;
    const detail=await getPersonDetail(new D1Repository(j.db),String(person.id));
    const moves=detail.signals.filter(signal=>signal.signal_key==='MOVE_IN_DATE');
    expect(moves).toHaveLength(1);expect(Number(moves[0].occurrence_count)).toBe(2);
    expect(detail.leads[0]).toMatchObject({move_in_precision:'ASAP',duration_months:6});
    expect(detail.attention).toHaveLength(0);
    expect(j.sqlite.prepare('SELECT COUNT(*) AS count FROM viewings').get()?.count).toBe(0);
  });
  it('never regresses advanced lifecycle status during qualification',async()=>{
    const j=journey();await j.send('hm?');j.sqlite.exec("UPDATE leads SET status='TENANT'");await j.send('ASAP');await j.send('6 months');expect(j.lead().status).toBe('TENANT');
  });
  it('saves only explicitly shared contact details, with no false low-confidence alert',async()=>{
    const j=journey();await j.send('Hi');await j.send('allan@example.test');await j.send('+63 905 111 2222');
    const person=j.sqlite.prepare('SELECT * FROM persons').get();expect(person).toMatchObject({email:'allan@example.test',phone:'+639051112222'});
    expect(j.sqlite.prepare("SELECT COUNT(*) AS count FROM messaging_attention WHERE signal_key='LOW_CONFIDENCE'").get()?.count).toBe(0);
    expect(j.last().text).toContain('Are you interested');
  });
  it('fills profile blanks, preserves owner edits, caches and saves only a matching provider link',async()=>{
    const j=journey();await j.send('Hi');j.sqlite.exec("UPDATE person_external_identities SET external_id='123456';UPDATE persons SET display_name='Owner edited'");
    const personId=String(j.sqlite.prepare('SELECT id FROM persons').get()!.id);
    const fetcher=vi.fn(async(url:unknown)=>String(url).includes('/conversations?')?Response.json({data:[{id:'thread-1',link:'https://www.facebook.com/messages/t/thread-1',participants:{data:[{id:'123456'}]}}]}):Response.json({id:'123456',first_name:'Allan',last_name:'Test',email:'must-not-save',access_token:'must-not-save'}));vi.stubGlobal('fetch',fetcher);
    const env={META_PAGE_TOKEN:'synthetic-token',META_PAGE_ID:'123'};
    await syncMessengerProfile(new D1Repository(j.db),personId,env);await syncMessengerProfile(new D1Repository(j.db),personId,env);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const detail=await getPersonDetail(new D1Repository(j.db),personId);
    expect(detail).toMatchObject({display_name:'Owner edited',first_name:'Allan',last_name:'Test',email:null});
    expect(detail.identities[0].conversation_url).toBe('https://www.facebook.com/messages/t/thread-1');
    expect(detail.identities[0].profile_json).not.toContain('must-not-save');
  });
  it('profile permission failure remains retryable and never fabricates contact data or links',async()=>{
    const j=journey();await j.send('Hi');j.sqlite.exec("UPDATE person_external_identities SET external_id='123456'");const personId=String(j.sqlite.prepare('SELECT id FROM persons').get()!.id);
    vi.stubGlobal('fetch',vi.fn(async()=>Response.json({error:{message:'private error'}},{status:403})));
    await syncMessengerProfile(new D1Repository(j.db),personId,{META_PAGE_TOKEN:'synthetic',META_PAGE_ID:'123'},true);
    const detail=await getPersonDetail(new D1Repository(j.db),personId);expect(detail.identities[0]).toMatchObject({profile_sync_status:'UNAVAILABLE',conversation_url:null});expect(detail).toMatchObject({display_name:null});
    expect(JSON.stringify(j.sqlite.prepare('SELECT * FROM audit_log').all())).not.toContain('private error');
  });
  it.each(['https://evil.example/messages','javascript:alert(1)','https://facebook.com.evil.example/','https://user:pass@facebook.com/','https://facebook.com/?access_token=secret'])('rejects unsafe provider link %s',value=>expect(safeMessengerLink(value)).toBeNull());
  it.each(['Hi','Hello','Good afternoon','hey','Hi.'])('mirrors %s for new and returning contacts without duplicating identity',async(greeting)=>{
    const j=journey(); await j.send(greeting); expect(j.last().text).toContain('Are you interested in renting?');
    expect(j.last().text.split('\n')[0]).toBe(greeting.replace('.',''));
    await j.send(greeting); expect(j.last().text).toContain('Are you interested in renting?');
    expect(j.sqlite.prepare('SELECT COUNT(*) AS count FROM persons').get()?.count).toBe(1);
  });
  it.each(['ASAP','NEXT_WEEK','FLEXIBLE'])('advances %s through duration, occupants and a viewing proposal',async(precision)=>{
    const j=journey();await j.send('Hi');await j.send("Yes, I'm interested",'INTEREST_YES');
    expect(j.last().text).toContain('When would you like to move in?');
    await j.send('different display label',`MOVE_IN_${precision}`);
    expect(j.lead().move_in_precision).toBe(precision);expect(j.last().text).toContain('How long');
    await j.send('1 year','DURATION_12');expect(j.lead().duration_months).toBe(12);expect(j.last().text).toContain('How many occupants');
    await j.send('2','OCCUPANTS_2');expect(j.lead().occupancy_count).toBe(2);expect(j.last().text).toContain('Would you like to arrange a viewing?');
    await j.send('Yes','VIEWING_YES');expect(j.last().text).toContain('What day and time');
    await j.send('November 15 2026 at 3 pm');
    expect(j.last().text).toContain('isn’t confirmed yet');expect(j.lead().move_in_date).toBeNull();
    const event=j.sqlite.prepare("SELECT structured_payload_json FROM lead_events WHERE event_type='VIEWING_DATE_PROPOSED'").get();
    expect(JSON.parse(String(event?.structured_payload_json))).toMatchObject({date:'2026-11-15',hour:3,meridiem:'pm',confirmation_status:'AWAITING_OWNER'});
    expect(j.sqlite.prepare('SELECT COUNT(*) AS count FROM viewings').get()?.count).toBe(0);
    expect(j.sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    expect(j.requests.every(request=>!request.message.text.includes('I can help with room availability'))).toBe(true);
    expect(j.sqlite.prepare("SELECT COUNT(*) AS count FROM person_messaging_signals WHERE signal_key='LOW_CONFIDENCE'").get()?.count).toBe(0);
  });
  it('typed yes, ASAP, 6 months and bare occupants use the pending question',async()=>{
    const j=journey();await j.send('Hi');await j.send('yes');await j.send('ASAP');await j.send('6 months');await j.send('2');
    expect(j.lead()).toMatchObject({move_in_precision:'ASAP',duration_months:6,occupancy_count:2});expect(j.last().text).toContain('viewing');
  });
  it('custom date has no empty button set and advances after a valid date',async()=>{
    const j=journey();await j.send('hm?');await j.send('Choose a date','MOVE_IN_CUSTOM');
    expect(j.last().text).toContain('What move-in date');expect(j.last().quick_replies).toBeUndefined();
    await j.send('2026-11-01');expect(j.lead().move_in_date).toBe('2026-11-01');expect(j.last().text).toContain('How long');
  });
  it('side questions resume from missing facts and corrections replace old facts',async()=>{
    const j=journey();await j.send('hm?');await j.send('ASAP');await j.send('wifi?');
    expect(j.last().text).toContain('₱840');expect(j.last().text).toContain('How long');
    await j.send('6 months');await j.send('2');await j.send('3 months','DURATION_3');
    expect(j.lead().duration_months).toBe(3);expect(j.last().text).toContain('viewing');expect(j.last().text).not.toContain('How many occupants');
  });
  it('multiple facts skip already answered questions',async()=>{
    const j=journey();await j.send('November 1 2026 for 6 months for 2 occupants');
    expect(j.lead()).toMatchObject({move_in_date:'2026-11-01',duration_months:6,occupancy_count:2});expect(j.last().text).toContain('viewing');
    expect(j.last().text).not.toContain('When would');expect(j.last().text).not.toContain('How long');
  });
  it('decline and thanks do not push qualification',async()=>{
    const j=journey();await j.send('Hi');await j.send('Not right now','INTEREST_NO');
    expect(j.last().quick_replies).toBeUndefined();expect(j.last().text).toContain('No problem');
    await j.send('thanks');expect(j.last().text).toBe('You’re welcome!');
  });
  it('unknown input clarifies with context and ok does not create false alerts',async()=>{
    const j=journey();await j.send('hm?');await j.send('ok po');expect(j.last().text).toBe('Got it.');
    expect(j.sqlite.prepare('SELECT COUNT(*) AS count FROM messaging_attention').get()?.count).toBe(0);
    await j.send('unrecognized fragment');expect(j.last().text).toContain('Could you tell me');expect(j.last().text).toContain('When would');
  });
  it('3+ occupants requires approval while the conversation continues',async()=>{
    const j=journey();await j.send('ASAP');await j.send('6 months');await j.send('3+','OCCUPANTS_3_PLUS');
    expect(j.last().text).toContain('Alan’s approval');expect(j.sqlite.prepare("SELECT COUNT(*) AS count FROM lead_events WHERE event_type='NEEDS_ALAN'").get()?.count).toBeGreaterThan(0);
  });
  it.each(['HUMAN','DNR'])('respects %s control',async(mode)=>{
    const j=journey();await j.send('Hi');const person=j.sqlite.prepare('SELECT id FROM persons').get()!;
    j.sqlite.prepare('INSERT INTO messaging_conversation_controls (id,person_id,channel,external_conversation_id,control_mode,do_not_auto_reply,updated_at) VALUES (?,?,?,?,?,?,?)').run('control',person.id as string,'MESSENGER','synthetic-person',mode==='HUMAN'?'HUMAN':'BOT',mode==='DNR'?1:0,new Date().toISOString());
    await j.send('ASAP');expect(j.graph).toHaveBeenCalledTimes(1);
  });
  it('concurrent duplicate clicks send once',async()=>{
    const j=journey();await j.send('hm?');await Promise.all([j.send('ASAP','MOVE_IN_ASAP','duplicate'),j.send('ASAP','MOVE_IN_ASAP','duplicate')]);
    expect(j.graph).toHaveBeenCalledTimes(2);expect(j.lead().move_in_precision).toBe('ASAP');
  });
  it('failed Graph send preserves last delivered question',async()=>{
    const j=journey();await j.send('hm?');j.failGraph();await j.send('ASAP');
    const state=j.sqlite.prepare("SELECT payload_json FROM audit_log WHERE entity_type='conversation_turn' ORDER BY rowid DESC LIMIT 1").get();
    expect(JSON.parse(String(state?.payload_json)).pending_question).toBe('MOVE_IN');
  });
  it('stores viewing date and time supplied on separate turns with an actionable Attention item',async()=>{
    const j=journey();await j.send('can view?');await j.send('November 15 2026');
    expect(j.last().text).toContain('What time');await j.send('3 pm');expect(j.last().text).toContain('isn’t confirmed yet');
    expect(j.lead().move_in_date).toBeNull();
    expect(j.sqlite.prepare("SELECT COUNT(*) AS count FROM messaging_attention WHERE signal_key='VIEWING_DATE_PROPOSED'").get()?.count).toBeGreaterThan(0);
    await j.send('actually November 20 2026');
    const event=j.sqlite.prepare("SELECT structured_payload_json FROM lead_events WHERE event_type='VIEWING_DATE_PROPOSED' ORDER BY rowid DESC LIMIT 1").get();
    expect(JSON.parse(String(event?.structured_payload_json))).toMatchObject({date:'2026-11-20',hour:3,meridiem:'pm'});
  });
  it('annual duration and duration-only for wording never invent occupants',async()=>{
    const j=journey();await j.send('can move asap for 1 year');
    expect(j.lead()).toMatchObject({move_in_precision:'ASAP',duration_months:12,occupancy_count:null});
    expect(j.last().text).toContain('How many occupants');
  });
  it('an invalid date cannot crash parsing or advance qualification',async()=>{
    const j=journey();await j.send('Choose a date');await j.send('2026-99-40');
    expect(j.lead().move_in_date).toBeNull();expect(j.last().text).toContain('What move-in date');
  });
  it('invalid native choices cannot change financial or qualification facts',async()=>{
    const j=journey();await j.send('Hi');
    const event={object:'page',entry:[{id:'123',messaging:[{sender:{id:'synthetic-person'},recipient:{id:'123'},message:{mid:'invalid-selection',text:'12 months',quick_reply:{payload:'DURATION_NO'}}}]}]};
    const result=await processMessengerPayload(event,{DB:j.db,META_PAGE_ID:'123',META_PAGE_TOKEN:'synthetic-only'});
    expect(result.failed).toBe(1);expect(j.lead().duration_months).toBeNull();expect(j.graph).toHaveBeenCalledTimes(1);
  });
  it('structured state contains no raw transcript or outbound body',async()=>{
    const j=journey();await j.send('Hi');await j.send('yes');await j.send('ASAP');
    const state=j.sqlite.prepare("SELECT payload_json FROM audit_log WHERE entity_type='conversation_turn'").all();
    expect(state).toHaveLength(3);for(const row of state)expect(Object.keys(JSON.parse(String(row.payload_json)))).toEqual(['pending_question','channel']);
  });
});
