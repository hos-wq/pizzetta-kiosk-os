import { ConversationService } from './conversation';
import { D1Repository } from './repository';

export type WhatsAppEnv = { DB:D1Database; WHATSAPP_ACCESS_TOKEN?:string; WHATSAPP_PHONE_NUMBER_ID?:string; WHATSAPP_WABA_ID?:string; WHATSAPP_GRAPH_VERSION?:string };
export type WhatsAppInbound = { accountId:string; phoneNumberId:string; senderId:string; displayName?:string; text:string; messageId:string; timestamp?:number };

export class WhatsAppSendAdapter {
  constructor(private readonly token?:string, private readonly graphVersion='v26.0', private readonly phoneNumberId?:string) {}
  async sendText(recipientId:string,text:string) {
    if(!this.token) return {sent:false,reason:'MISSING_WHATSAPP_ACCESS_TOKEN'};
    if(!/^v\d+\.\d+$/.test(this.graphVersion) || !/^\d+$/.test(this.phoneNumberId??'')) return {sent:false,reason:'INVALID_WHATSAPP_CONFIGURATION'};
    if(!/^\d{7,15}$/.test(recipientId) || !text.trim() || text.length>4096) return {sent:false,reason:'INVALID_WHATSAPP_MESSAGE'};
    try {
      const response=await fetch(`https://graph.facebook.com/${this.graphVersion}/${this.phoneNumberId}/messages`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${this.token}`},body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to:recipientId,type:'text',text:{preview_url:false,body:text}}),signal:AbortSignal.timeout(8000)});
      if(!response.ok) return {sent:false,reason:`WHATSAPP_SEND_FAILED_${response.status}`};
      const result=await response.json() as {messages?:Array<{id?:unknown}>}; const messageId=result.messages?.[0]?.id;
      return typeof messageId==='string'?{sent:true,messageId}:{sent:false,reason:'WHATSAPP_SEND_UNCERTAIN'};
    } catch { return {sent:false,reason:'WHATSAPP_SEND_UNCERTAIN'}; }
  }
}

export const parseWhatsAppInbound = (payload:unknown, expectedWabaId?:string, expectedPhoneNumberId?:string):WhatsAppInbound[] => {
  if(!payload || typeof payload!=='object' || Array.isArray(payload)) return [];
  const root=payload as Record<string,unknown>; if(root.object!=='whatsapp_business_account') return [];
  const entries=Array.isArray(root.entry)?root.entry:[]; const messages:WhatsAppInbound[]=[];
  for(const rawEntry of entries) {
    if(!rawEntry || typeof rawEntry!=='object' || Array.isArray(rawEntry)) continue;
    const entry=rawEntry as Record<string,unknown>; const accountId=typeof entry.id==='string'?entry.id:'';
    if(!accountId || (expectedWabaId&&accountId!==expectedWabaId)) continue;
    const changes=Array.isArray(entry.changes)?entry.changes:[];
    for(const rawChange of changes) {
      if(!rawChange || typeof rawChange!=='object' || Array.isArray(rawChange)) continue;
      const change=rawChange as Record<string,unknown>; if(change.field!=='messages') continue;
      const value=change.value as Record<string,unknown>|undefined; if(!value||typeof value!=='object'||Array.isArray(value)) continue;
      const metadata=value.metadata as Record<string,unknown>|undefined; const phoneNumberId=typeof metadata?.phone_number_id==='string'?metadata.phone_number_id:'';
      if(!phoneNumberId || (expectedPhoneNumberId&&phoneNumberId!==expectedPhoneNumberId)) continue;
      const contacts=Array.isArray(value.contacts)?value.contacts as unknown[]:[]; const messagesPayload=Array.isArray(value.messages)?value.messages as unknown[]:[];
      for(const rawMessage of messagesPayload) {
        if(!rawMessage||typeof rawMessage!=='object'||Array.isArray(rawMessage)) continue;
        const message=rawMessage as Record<string,unknown>; const senderId=typeof message.from==='string'?message.from:''; const messageId=typeof message.id==='string'?message.id:'';
        const textValue=message.text as Record<string,unknown>|undefined; const text=message.type==='text'&&typeof textValue?.body==='string'?textValue.body.trim():'';
        const timestamp=typeof message.timestamp==='string'&&/^\d+$/.test(message.timestamp)?Number(message.timestamp):undefined;
        if(!/^\d{7,15}$/.test(senderId)||!messageId||!text||text.length>2000||timestamp===undefined||!Number.isSafeInteger(timestamp)||timestamp<=0||timestamp>8640000000000) continue;
        const contact=contacts.find(item=>item&&typeof item==='object'&&!Array.isArray(item)&&String((item as Record<string,unknown>).wa_id??'')===senderId) as Record<string,unknown>|undefined;
        const profile=contact?.profile as Record<string,unknown>|undefined;
        messages.push({accountId,phoneNumberId,senderId,messageId,displayName:typeof profile?.name==='string'?profile.name:undefined,text,timestamp});
      }
    }
  }
  return messages;
};

export const processWhatsAppPayload = async (payload:unknown, env:WhatsAppEnv) => {
  const inbound=parseWhatsAppInbound(payload,env.WHATSAPP_WABA_ID,env.WHATSAPP_PHONE_NUMBER_ID); const adapter=new WhatsAppSendAdapter(env.WHATSAPP_ACCESS_TOKEN,env.WHATSAPP_GRAPH_VERSION,env.WHATSAPP_PHONE_NUMBER_ID); const repo=new D1Repository(env.DB); const results=[]; let duplicates=0; let failed=0; let retryable=0;
  for(const message of inbound) {
    const receivedAt=message.timestamp?new Date(message.timestamp*1000).toISOString():new Date().toISOString();
    // D1 batch is atomic: never acknowledge a claim whose inbound record was lost.
    const claims=await repo.batch([
      {sql:'INSERT OR IGNORE INTO channel_message_deliveries (channel,external_account_id,external_message_id,status,received_at,updated_at) VALUES (?,?,?,?,?,?)',args:['WHATSAPP',message.accountId,message.messageId,'PROCESSING',receivedAt,receivedAt]},
      {sql:'INSERT OR IGNORE INTO conversation_messages (id,channel,direction,external_account_id,external_conversation_id,external_message_id,message_type,text,author_type,status,received_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',args:[crypto.randomUUID(),'WHATSAPP','INBOUND',message.accountId,message.senderId,message.messageId,'TEXT',message.text,'CUSTOMER','RECEIVED',receivedAt,receivedAt]},
    ]);
    if(!claims[0].meta.changes) {
      const reclaimed=await repo.run("UPDATE channel_message_deliveries SET status='PROCESSING',failure_code=NULL,updated_at=? WHERE channel='WHATSAPP' AND external_account_id=? AND external_message_id=? AND status='FAILED' AND failure_code='WHATSAPP_RETRYABLE_PRE_SEND'",new Date().toISOString(),message.accountId,message.messageId);
      if(!reclaimed.meta.changes){duplicates++;continue;}
    }
    let sendStarted=false;
    try {
      const service=new ConversationService(repo,{sendText:async(recipientId,text)=>{
        // Persist reply intent and uncertainty BEFORE the external side effect.
        // A timeout/crash must not make a Meta retry send a second reply.
        const outboundId=crypto.randomUUID();
        const identity=await repo.first('SELECT person_id FROM person_external_identities WHERE platform=? AND external_id=?','WHATSAPP',message.senderId);
        const lead=await repo.first('SELECT id FROM leads WHERE platform=? AND external_contact_id=? LIMIT 1','WHATSAPP',message.senderId);
        await repo.batch([
          {sql:'INSERT INTO conversation_messages (id,channel,direction,external_account_id,external_conversation_id,message_type,text,author_type,status,lead_id,person_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',args:[outboundId,'WHATSAPP','OUTBOUND',message.accountId,message.senderId,'TEXT',text,'BOT','RECEIVED',lead?.id??null,identity?.person_id??null,new Date().toISOString()]},
          {sql:"UPDATE channel_message_deliveries SET status='UNCERTAIN',failure_code='WHATSAPP_SEND_PENDING',updated_at=? WHERE channel='WHATSAPP' AND external_account_id=? AND external_message_id=?",args:[new Date().toISOString(),message.accountId,message.messageId]},
        ]);
        sendStarted=true;
        const delivery=await adapter.sendText(recipientId,text);
        await repo.run('UPDATE conversation_messages SET external_message_id=?,status=? WHERE id=?',delivery.messageId??null,delivery.sent?'SENT':'FAILED',outboundId);
        return delivery;
      }});
      const result=await service.handle({platform:'WHATSAPP',externalContactId:message.senderId,displayName:message.displayName,text:message.text,messageId:`WHATSAPP:${message.messageId}`,receivedAt});
      const identity=await repo.first('SELECT person_id FROM person_external_identities WHERE platform=? AND external_id=?','WHATSAPP',message.senderId);
      await repo.run("UPDATE conversation_messages SET lead_id=?,person_id=?,status='PROCESSED' WHERE channel='WHATSAPP' AND direction='INBOUND' AND external_account_id=? AND external_message_id=?",result.leadId,identity?.person_id??null,message.accountId,message.messageId);
      const uncertain=result.delivery?.reason==='WHATSAPP_SEND_UNCERTAIN';
      const status=uncertain?'UNCERTAIN':result.delivery?.sent?'SENT':'FAILED';
      await repo.run('UPDATE channel_message_deliveries SET status=?,failure_code=?,lead_id=?,updated_at=? WHERE channel=? AND external_account_id=? AND external_message_id=?',status,result.delivery?.reason??(result.delivery?null:'AUTO_REPLY_SUPPRESSED'),result.leadId,new Date().toISOString(),'WHATSAPP',message.accountId,message.messageId);
      if(result.delivery?.sent===false)failed++; results.push(result);
    } catch {
      failed++; if(!sendStarted)retryable++;
      await repo.run('UPDATE channel_message_deliveries SET status=?,failure_code=?,updated_at=? WHERE channel=? AND external_account_id=? AND external_message_id=?',sendStarted?'UNCERTAIN':'FAILED',sendStarted?'WHATSAPP_PROCESSING_UNCERTAIN':'WHATSAPP_RETRYABLE_PRE_SEND',new Date().toISOString(),'WHATSAPP',message.accountId,message.messageId);
    }
  }
  return {received:inbound.length,processed:results.length,duplicates,failed,retryable,results};
};
