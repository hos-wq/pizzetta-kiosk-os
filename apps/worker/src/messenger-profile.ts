import { ApiError, D1Repository, now } from './repository';

type ProfileEnv = { META_PAGE_TOKEN?:string; META_PAGE_ID?:string; META_GRAPH_VERSION?:string };
export const safeMessengerLink = (value:unknown):string|null => {
  if(typeof value!=='string')return null;
  // The Page Conversations API commonly returns `link` as a relative Page
  // inbox path. Resolve that provider-returned path against Facebook, while
  // continuing to reject arbitrary hosts, protocol-relative URLs and unsafe
  // schemes. Never synthesize a thread URL from a PSID or conversation ID.
  if(value.startsWith('//')||value.includes('\\'))return null;
  try {
    const url=new URL(value,'https://www.facebook.com');
    const allowedHosts=['facebook.com','www.facebook.com','messenger.com','www.messenger.com','business.facebook.com'];
    const isProviderRelative=value.startsWith('/')&&url.pathname.split('/').includes('inbox');
    const isApprovedAbsolute=/^https:\/\//i.test(value)&&allowedHosts.includes(url.hostname);
    return url.protocol==='https:'&&!url.username&&!url.password&&(isProviderRelative||isApprovedAbsolute)&&!url.searchParams.has('access_token')?url.href:null;
  } catch { return null; }
};
const name=(value:unknown)=>typeof value==='string'&&value.trim()?value.trim().slice(0,200):null;

type GraphResult={data:Record<string,unknown>|null; errorCode:string|null; errorSubcode:string|null};
const errorNumber=(value:unknown)=>typeof value==='number'&&Number.isInteger(value)?String(value):null;

export async function syncMessengerProfile(repo:D1Repository,personId:string,env:ProfileEnv,force=false) {
  const identity=await repo.first("SELECT * FROM person_external_identities WHERE person_id=? AND platform='MESSENGER'",personId);
  if(!identity)throw new ApiError(404,'IDENTITY_NOT_FOUND','Person has no Messenger identity');
  if(!force&&identity.profile_synced_at&&Date.now()-Date.parse(String(identity.profile_synced_at))<(identity.profile_sync_status==='AVAILABLE'?86400000:3600000))return {profile_available:identity.profile_sync_status==='AVAILABLE',conversation_link_available:Boolean(identity.conversation_url),cached:true,profile_error_code:null,profile_error_subcode:null,conversation_error_code:null,conversation_error_subcode:null};
  if(!env.META_PAGE_TOKEN||!/^\d+$/.test(String(identity.external_id))||!/^\d+$/.test(env.META_PAGE_ID??'')||!/^v\d+\.\d+$/.test(env.META_GRAPH_VERSION??'v26.0'))return {profile_available:false,conversation_link_available:Boolean(identity.conversation_url),cached:false,configuration_missing:true,profile_error_code:null,profile_error_subcode:null,conversation_error_code:null,conversation_error_subcode:null};
  const graph=async(path:string):Promise<GraphResult>=>{
    try {
      const response=await fetch(`https://graph.facebook.com/${env.META_GRAPH_VERSION??'v26.0'}/${path}`,{headers:{authorization:`Bearer ${env.META_PAGE_TOKEN}`},signal:AbortSignal.timeout(5000)});
      const body=await response.json().catch(()=>null) as Record<string,unknown>|null;
      if(response.ok)return {data:body,errorCode:null,errorSubcode:null};
      const error=body?.error as Record<string,unknown>|undefined;
      return {data:null,errorCode:errorNumber(error?.code)??`HTTP_${response.status}`,errorSubcode:errorNumber(error?.error_subcode)};
    } catch { return {data:null,errorCode:'NETWORK_OR_TIMEOUT',errorSubcode:null}; }
  };
  const [profile,conversations]=await Promise.all([
    graph(`${identity.external_id}?fields=id,name,first_name,last_name,profile_pic`),
    graph(`${env.META_PAGE_ID}/conversations?user_id=${identity.external_id}&fields=id,link,participants&limit=1`),
  ]);
  const metadata:Record<string,unknown>={};
  if(profile.data&&String(profile.data.id)===String(identity.external_id)) {
    const first=name(profile.data.first_name),last=name(profile.data.last_name),full=name(profile.data.name);
    if(first)metadata.first_name=first;if(last)metadata.last_name=last;
    if(full)metadata.name=full;
    if(typeof profile.data.profile_pic==='string') { try {const pic=new URL(profile.data.profile_pic);if(pic.protocol==='https:'&&!pic.username&&!pic.password)metadata.profile_pic=pic.href;} catch { /* Invalid provider image is not stored. */ } }
  }
  const rows=Array.isArray(conversations.data?.data)?conversations.data.data as Record<string,unknown>[]:[];
  const conversation=rows.find(row=>{const participants=row.participants as {data?:Array<{id?:unknown}>}|undefined;return participants?.data?.some(p=>String(p.id)===String(identity.external_id));});
  const participants=conversation?.participants as {data?:Array<{id?:unknown;name?:unknown}>}|undefined;
  const participant=participants?.data?.find(p=>String(p.id)===String(identity.external_id));
  const participantName=name(participant?.name);
  // Conversation participants may include a display name even when the
  // User Profile endpoint is unavailable. Preserve it as display name only;
  // do not guess first/last boundaries from culturally variable name order.
  if(!metadata.name&&participantName)metadata.name=participantName;
  const link=safeMessengerLink(conversation?.link),timestamp=now();
  await repo.run('UPDATE person_external_identities SET profile_json=COALESCE(?,profile_json),profile_synced_at=?,profile_sync_status=?,conversation_id=COALESCE(?,conversation_id),conversation_url=COALESCE(?,conversation_url),updated_at=? WHERE id=?',Object.keys(metadata).length?JSON.stringify(metadata):null,timestamp,Object.keys(metadata).length?'AVAILABLE':'UNAVAILABLE',typeof conversation?.id==='string'?conversation.id:null,link,timestamp,identity.id);
  // Provider profile fills blanks, never overwrites Alan's master-data edits.
  if(Object.keys(metadata).length) {
    const display=[metadata.first_name,metadata.last_name].filter(Boolean).join(' ')||metadata.name as string|null;
    await repo.run("UPDATE persons SET first_name=COALESCE(NULLIF(first_name,''),?),last_name=COALESCE(NULLIF(last_name,''),?),display_name=COALESCE(NULLIF(display_name,''),?),updated_at=? WHERE id=?",metadata.first_name??null,metadata.last_name??null,display,timestamp,personId);
    await repo.run("UPDATE leads SET display_name=COALESCE(NULLIF(display_name,''),?),updated_at=? WHERE id IN (SELECT lead_id FROM person_leads WHERE person_id=?)",display,timestamp,personId);
  }
  const result={profile_available:Object.keys(metadata).length>0,conversation_link_available:Boolean(link),cached:false,configuration_missing:false,profile_error_code:profile.errorCode,profile_error_subcode:profile.errorSubcode,conversation_error_code:conversations.errorCode,conversation_error_subcode:conversations.errorSubcode};
  await repo.audit('SYNC','person_external_identity',personId,{platform:'MESSENGER',...result});
  return result;
}
