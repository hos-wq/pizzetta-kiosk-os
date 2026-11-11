import { ConversationService, type QuickReply, type TextSender } from './conversation';
import { D1Repository } from './repository';
import { syncMessengerProfile } from './messenger-profile';
import { notifyNewAttention } from './web-push';

export type MessengerEnv = { DB:D1Database; META_PAGE_TOKEN?:string; META_GRAPH_VERSION?:string; META_PAGE_ID?:string; AUTH_SESSION_SECRET?:string };
export type MessengerInbound = { senderId:string; text:string; messageId?:string; timestamp?:number };

export class MessengerSendAdapter implements TextSender {
  constructor(private readonly token?:string, private readonly graphVersion='v26.0', private readonly pageId='me') {}
  async sendText(recipientId:string,text:string) {
    if(!this.token) return {sent:false,reason:'MISSING_PAGE_TOKEN'};
    if(!/^v\d+\.\d+$/.test(this.graphVersion) || !/^(me|\d+)$/.test(this.pageId)) return {sent:false,reason:'INVALID_SEND_CONFIGURATION'};
    try {
      const response=await fetch(`https://graph.facebook.com/${this.graphVersion}/${this.pageId}/messages`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${this.token}`},body:JSON.stringify({messaging_type:'RESPONSE',recipient:{id:recipientId},message:{text}}),signal:AbortSignal.timeout(8000)});
      if(!response.ok) return {sent:false,reason:`SEND_FAILED_${response.status}`};
      const result=await response.json() as {message_id?:unknown};
      return typeof result.message_id==='string'?{sent:true}:{sent:false,reason:'SEND_UNCERTAIN'};
    } catch { return {sent:false,reason:'SEND_UNCERTAIN'}; }
  }
  async sendPrompt(recipientId:string,text:string,quickReplies:QuickReply[]) {
    if(!this.token) return {sent:false,reason:'MISSING_PAGE_TOKEN'};
    if(!/^v\d+\.\d+$/.test(this.graphVersion) || !/^(me|\d+)$/.test(this.pageId) || quickReplies.length<1 || quickReplies.length>13) return {sent:false,reason:'INVALID_SEND_CONFIGURATION'};
    try {
      const response=await fetch(`https://graph.facebook.com/${this.graphVersion}/${this.pageId}/messages`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${this.token}`},body:JSON.stringify({messaging_type:'RESPONSE',recipient:{id:recipientId},message:{text,quick_replies:quickReplies.map(reply=>({content_type:'text',title:reply.title,payload:reply.payload}))}}),signal:AbortSignal.timeout(8000)});
      if(!response.ok) return {sent:false,reason:`SEND_FAILED_${response.status}`};
      const result=await response.json() as {message_id?:unknown};
      return typeof result.message_id==='string'?{sent:true}:{sent:false,reason:'SEND_UNCERTAIN'};
    } catch { return {sent:false,reason:'SEND_UNCERTAIN'}; }
  }
}

export const parseMessengerInbound = (payload:unknown, pageId?:string):MessengerInbound[] => {
  if(!payload || typeof payload!=='object' || Array.isArray(payload)) return [];
  const root=payload as Record<string,unknown>; if(root.object!=='page') return []; const entries=Array.isArray(root.entry)?root.entry:[]; const messages:MessengerInbound[]=[];
  for(const entry of entries) {
    if(!entry || typeof entry!=='object' || Array.isArray(entry)) continue;
    if(pageId && (entry as Record<string,unknown>).id!==pageId) continue;
    const messaging=Array.isArray((entry as Record<string,unknown>).messaging)?(entry as Record<string,unknown>).messaging as unknown[]:[];
    for(const event of messaging) {
      if(!event || typeof event!=='object' || Array.isArray(event)) continue;
      const item=event as Record<string,unknown>; const sender=item.sender as Record<string,unknown>|undefined; const message=item.message as Record<string,unknown>|undefined; const postback=item.postback as Record<string,unknown>|undefined;
      const recipient=item.recipient as Record<string,unknown>|undefined;
      const quickReply=message?.quick_reply as Record<string,unknown>|undefined;
      const postbackPayload=typeof postback?.payload==='string'?postback.payload.trim():'';
      const text=typeof quickReply?.payload==='string'?quickReply.payload.trim():typeof message?.text==='string'?message.text.trim():postbackPayload;
      if(message?.is_echo || typeof sender?.id!=='string' || !sender.id || !text || text.length>2000 || (!message?.text && !postbackPayload)) continue;
      if(pageId && (sender.id===pageId || recipient?.id!==pageId)) continue;
      if(item.timestamp!==undefined && (typeof item.timestamp!=='number' || !Number.isFinite(item.timestamp) || !Number.isFinite(new Date(item.timestamp).getTime()))) continue;
      messages.push({senderId:sender.id,text,messageId:typeof message?.mid==='string'?message.mid:typeof postback?.mid==='string'?postback.mid:undefined,timestamp:typeof item.timestamp==='number'?item.timestamp:undefined});
    }
  }
  return messages;
};

export const processMessengerPayload = async (payload:unknown, env:MessengerEnv) => {
  const inbound=parseMessengerInbound(payload,env.META_PAGE_ID); const sender=new MessengerSendAdapter(env.META_PAGE_TOKEN,env.META_GRAPH_VERSION,env.META_PAGE_ID); const repo=new D1Repository(env.DB); const service=new ConversationService(repo,sender); const results=[]; let duplicates=0; let failed=0;
  for(const message of inbound) {
    if(!message.messageId) { failed++; continue; }
    const pageId=env.META_PAGE_ID??'me'; const timestamp=new Date().toISOString();
    const claim=await repo.run('INSERT OR IGNORE INTO messenger_deliveries (page_id,message_id,status,received_at,updated_at) VALUES (?,?,?,?,?)',pageId,message.messageId,'PROCESSING',timestamp,timestamp);
    if(!claim.meta.changes) { duplicates++; continue; }
    try {
      let previousAttention = new Set<string>();
      if (env.AUTH_SESSION_SECRET) {
        try {
          previousAttention = new Set((await repo.all("SELECT id FROM messaging_attention WHERE channel='MESSENGER' AND external_conversation_id=? AND status='OPEN'", message.senderId)).map(row => String(row.id)));
        } catch { /* Push delivery is best-effort and cannot block message handling. */ }
      }
      const selection=selectionFromPayload(message.text); const result=await service.handle({platform:'MESSENGER',externalContactId:message.senderId,text:selection?.text??message.text,messageId:message.messageId,selection:selection?.selection,receivedAt:message.timestamp?new Date(message.timestamp).toISOString():undefined});
      const status=result.duplicate?'SUPPRESSED':result.delivery?.sent?'SENT':result.delivery?.reason==='SEND_UNCERTAIN'?'UNCERTAIN':result.delivery?'FAILED':'SUPPRESSED';
      await repo.run('UPDATE messenger_deliveries SET status=?,lead_id=?,failure_code=?,updated_at=? WHERE page_id=? AND message_id=?',status,result.leadId,result.delivery?.reason??null,new Date().toISOString(),pageId,message.messageId);
      if(status==='FAILED'||status==='UNCERTAIN') failed++;
      results.push(result);
      if(env.AUTH_SESSION_SECRET) {
        try {
          const newAttention = await repo.all("SELECT id FROM messaging_attention WHERE channel='MESSENGER' AND external_conversation_id=? AND status='OPEN'", message.senderId);
          for (const item of newAttention) if (!previousAttention.has(String(item.id))) await notifyNewAttention(repo, env, String(item.id));
        } catch { /* Push delivery is best-effort and cannot block message handling. */ }
      }
      // Metadata retry must never resend a successfully delivered reply.
      if(/^\d+$/.test(message.senderId))try {
        const identity=await repo.first("SELECT person_id FROM person_external_identities WHERE platform='MESSENGER' AND external_id=?",message.senderId);
        if(identity)await syncMessengerProfile(repo,String(identity.person_id),env);
      } catch { /* Owner dossier refresh can retry enrichment independently. */ }
    } catch {
      failed++;
      await repo.run('UPDATE messenger_deliveries SET status=?,failure_code=?,updated_at=? WHERE page_id=? AND message_id=?','FAILED','PROCESSING_FAILED',new Date().toISOString(),pageId,message.messageId);
      await repo.audit('FAILED','messenger_delivery',message.messageId,{code:'PROCESSING_FAILED'});
    }
  }
  return {received:inbound.length,processed:results.filter(result=>!result.duplicate).length,duplicates,failed,results};
};

const selectionFromPayload=(payload:string):{text:string;selection:import('./conversation').ConversationSelection}|undefined=>{
  const match=/^(INTEREST|DURATION|MOVE_IN|OCCUPANTS|VIEWING)_(YES|NO|3|6|12|ASAP|NEXT_WEEK|FLEXIBLE|CUSTOM|1|2|3_PLUS)$/.exec(payload);
  if(!match) return undefined;
  const [,kind,value]=match;
  if(kind==='INTEREST'||kind==='VIEWING') return {text:value==='YES'?"Yes, I'm interested":"Not right now",selection:{kind,value}};
  if(kind==='DURATION') return {text:`${value} months`,selection:{kind,value}};
  if(kind==='OCCUPANTS') return {text:`${value==='3_PLUS'?'3+':value} occupants`,selection:{kind,value:value==='3_PLUS'?'3':value}};
  return {text:value==='NEXT_WEEK'?'next week':value==='FLEXIBLE'?'later':value==='CUSTOM'?'choose a date':'asap',selection:{kind:'MOVE_IN',value}};
};
