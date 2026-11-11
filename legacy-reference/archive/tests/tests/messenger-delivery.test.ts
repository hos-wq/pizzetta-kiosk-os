import { afterEach, describe, expect, it, vi } from 'vitest';
const handle=vi.hoisted(()=>vi.fn());
vi.mock('../apps/worker/src/conversation',()=>({ConversationService:class {handle=handle;}}));
import {processMessengerPayload} from '../apps/worker/src/messenger';
import {handleMetaEvent} from '../apps/worker/src/webhook';

function database() {
  const deliveries=new Map<string,{status:unknown;code?:unknown}>();
  const db={prepare:(sql:string)=>({bind:(...args:unknown[])=>({run:async()=>{
    if(sql.startsWith('INSERT OR IGNORE INTO messenger_deliveries')) {
      const key=`${args[0]}:${args[1]}`;if(deliveries.has(key))return {meta:{changes:0}};
      deliveries.set(key,{status:args[2]});return {meta:{changes:1}};
    }
    if(sql.startsWith('UPDATE messenger_deliveries')) {
      const key=`${args.at(-2)}:${args.at(-1)}`;deliveries.set(key,{status:args[0],code:args[2]});
    }
    return {meta:{changes:1}};
  }})})};
  return {db:db as unknown as D1Database,deliveries};
}
const payload={object:'page',entry:[{id:'123',messaging:[{sender:{id:'user'},recipient:{id:'123'},message:{mid:'m1',text:'hm?'}}]}]};
describe('Messenger delivery ownership and duplicate protection',()=>{
  afterEach(()=>{vi.clearAllMocks();});
  it('concurrent and repeated deliveries produce one conversation/send operation',async()=>{
    const {db,deliveries}=database();handle.mockResolvedValue({duplicate:false,leadId:'lead-1',delivery:{sent:true}});
    const env={DB:db,META_PAGE_TOKEN:'synthetic',META_PAGE_ID:'123'};
    const results=await Promise.all([processMessengerPayload(payload,env),processMessengerPayload(payload,env)]);
    expect(handle).toHaveBeenCalledTimes(1);expect(results.reduce((n,r)=>n+r.duplicates,0)).toBe(1);
    expect(deliveries.get('123:m1')?.status).toBe('SENT');
    await processMessengerPayload(payload,env);expect(handle).toHaveBeenCalledTimes(1);
  });
  it('retains uncertain send state rather than silently claiming success',async()=>{
    const {db,deliveries}=database();handle.mockResolvedValue({duplicate:false,leadId:'lead-1',delivery:{sent:false,reason:'SEND_UNCERTAIN'}});
    expect((await processMessengerPayload(payload,{DB:db,META_PAGE_TOKEN:'synthetic',META_PAGE_ID:'123'})).failed).toBe(1);
    expect(deliveries.get('123:m1')?.status).toBe('UNCERTAIN');
  });
  it('records processing failure without logging message text',async()=>{
    const {db,deliveries}=database();handle.mockRejectedValue(new Error('private message'));
    expect((await processMessengerPayload(payload,{DB:db,META_PAGE_TOKEN:'synthetic',META_PAGE_ID:'123'})).failed).toBe(1);
    expect(deliveries.get('123:m1')?.status).toBe('FAILED');
    expect(JSON.stringify([...deliveries])).not.toContain('private message');
  });
  it('marks human-controlled conversations as suppressed',async()=>{
    const {db,deliveries}=database();handle.mockResolvedValue({duplicate:false,leadId:'lead-1'});
    await processMessengerPayload(payload,{DB:db,META_PAGE_TOKEN:'synthetic',META_PAGE_ID:'123'});
    expect(deliveries.get('123:m1')?.status).toBe('SUPPRESSED');
  });
  it('acknowledges a signed webhook before background processing completes',async()=>{
    const {db}=database();let resolve:((value:unknown)=>void)|undefined;
    const pending=new Promise(r=>{resolve=r;});handle.mockReturnValue(pending);
    const body=JSON.stringify(payload);const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('synthetic-secret'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(body)));
    const signature='sha256='+Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
    let background:Promise<unknown>|undefined;
    const response=await handleMetaEvent(new Request('https://rc.example/webhook',{method:'POST',body,headers:{'x-hub-signature-256':signature}}),{DB:db,META_APP_SECRET:'synthetic-secret',META_PAGE_TOKEN:'synthetic',META_PAGE_ID:'123'},{waitUntil:(p)=>{background=p;}});
    expect(response.status).toBe(200);expect(background).toBeDefined();
    resolve?.({duplicate:false,leadId:'lead-1',delivery:{sent:true}});await background;
  });
});
