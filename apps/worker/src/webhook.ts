import { processMessengerPayload } from './messenger';
import { processWhatsAppPayload } from './whatsapp';

export interface MetaWebhookEnv {
  META_VERIFY_TOKEN?: string;
  META_APP_SECRET?: string;
  META_PAGE_TOKEN?: string;
  META_GRAPH_VERSION?: string;
  META_PAGE_ID?: string;
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_WABA_ID?: string;
  WHATSAPP_GRAPH_VERSION?: string;
  AUTH_SESSION_SECRET?: string;
  DB?: D1Database;
}

const textResponse = (body: string, status: number) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });

const constantTimeEqual = (left: Uint8Array, right: Uint8Array) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
};

const hexToBytes = (value: string) => {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return bytes;
};

export async function verifyMetaSignature(rawBody: ArrayBuffer, signatureHeader: string | null, appSecret: string | undefined) {
  if (!appSecret || !signatureHeader?.startsWith('sha256=')) return false;
  const signature = signatureHeader.slice('sha256='.length);
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(appSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, rawBody));
  return constantTimeEqual(expected, hexToBytes(signature));
}

export function handleMetaVerification(url: URL, env: MetaWebhookEnv) {
  const mode = url.searchParams.get('hub.mode');
  const verifyToken = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && verifyToken && challenge && env.META_VERIFY_TOKEN && verifyToken === env.META_VERIFY_TOKEN) return textResponse(challenge, 200);
  return textResponse('Forbidden', 403);
}

export async function handleMetaEvent(request: Request, env: MetaWebhookEnv, ctx?:Pick<ExecutionContext,'waitUntil'>) {
  if(Number(request.headers.get('content-length')??0)>1048576) return textResponse('Payload too large',413);
  const rawBody = await request.arrayBuffer();
  if(rawBody.byteLength>1048576) return textResponse('Payload too large',413);
  if (!env.META_APP_SECRET) return textResponse('Webhook secret is not configured', 503);
  if (!await verifyMetaSignature(rawBody, request.headers.get('x-hub-signature-256'), env.META_APP_SECRET)) return textResponse('Invalid signature', 401);
  let payload:unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(rawBody));
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return textResponse('Invalid payload', 400);
  } catch {
    return textResponse('Invalid payload', 400);
  }
  if(env.DB) {
    const root=payload as Record<string,unknown>;
    const isWhatsApp=root.object==='whatsapp_business_account';
    if(root.object!=='page' && !isWhatsApp) return textResponse('EVENT_RECEIVED',200);
    if(isWhatsApp) {
      if(!env.WHATSAPP_ACCESS_TOKEN || !/^\d+$/.test(env.WHATSAPP_WABA_ID??'') || !/^\d+$/.test(env.WHATSAPP_PHONE_NUMBER_ID??'')) return textResponse('WhatsApp is not configured',503);
      try {
        const result=await processWhatsAppPayload(payload,{DB:env.DB,WHATSAPP_ACCESS_TOKEN:env.WHATSAPP_ACCESS_TOKEN,WHATSAPP_PHONE_NUMBER_ID:env.WHATSAPP_PHONE_NUMBER_ID,WHATSAPP_WABA_ID:env.WHATSAPP_WABA_ID,WHATSAPP_GRAPH_VERSION:env.WHATSAPP_GRAPH_VERSION});
        console.info(JSON.stringify({event:'whatsapp_processed',received:result.received,processed:result.processed,duplicates:result.duplicates,failed:result.failed}));
        return textResponse(result.retryable?'Retry later':'EVENT_RECEIVED',result.retryable?503:200);
      } catch { console.error(JSON.stringify({event:'whatsapp_processing_failed'})); return textResponse('Retry later',503); }
    }
    if(!isWhatsApp && !env.META_PAGE_TOKEN) return textResponse('Messenger is not configured',503);
    const processing=processMessengerPayload(payload,{DB:env.DB,META_PAGE_TOKEN:env.META_PAGE_TOKEN,META_GRAPH_VERSION:env.META_GRAPH_VERSION,META_PAGE_ID:env.META_PAGE_ID,AUTH_SESSION_SECRET:env.AUTH_SESSION_SECRET}).then(result=>{console.info(JSON.stringify({event:'messenger_processed',received:result.received,processed:result.processed,duplicates:result.duplicates,failed:result.failed}));});
    const tracked=processing.catch(()=>{console.error(JSON.stringify({event:isWhatsApp?'whatsapp_processing_failed':'messenger_processing_failed'}));});
    if(ctx) ctx.waitUntil(tracked); else await tracked;
  }
  return textResponse('EVENT_RECEIVED', 200);
}
