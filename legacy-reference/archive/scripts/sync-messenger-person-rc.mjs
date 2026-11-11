// Explicit RC-only metadata refresh; no message sends, no raw conversation retrieval.
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {build} from 'esbuild';

const config=readFileSync('wrangler.rc.toml','utf8');
if(!config.includes('name = "boutique-rooms-os-rc"')||!config.includes('database_id = "5082b4c9-f0f7-43b2-a457-e92c49f7bfc8"')||config.includes('b156b6f1-3871-4113-8f46-476c1f97c02d'))throw new Error('RC isolation failed');
const personId=process.argv[2];if(!/^[a-f0-9-]{36}$/.test(personId??''))throw new Error('Explicit Person UUID required');
const values=Object.fromEntries(readFileSync('.dev.vars','utf8').split(/\r?\n/).flatMap(line=>{const m=line.match(/^\s*(META_[A-Z_]+)\s*=\s*(.*?)\s*$/);return m?[[m[1],m[2].replace(/^(['"])(.*)\1$/,'$2')]]:[];}));
if(!values.META_PAGE_TOKEN)throw new Error('Local Page credential unavailable');
const quote=value=>value===null||value===undefined?'NULL':typeof value==='number'?String(value):`'${String(value).replaceAll("'","''")}'`;
const query=(sql,args=[])=>{
  let index=0;const command=sql.replace(/\?/g,()=>quote(args[index++]));
  const child=spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','boutique-rooms-os-rc','--remote','--config','wrangler.rc.toml','--json','--command',command],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000});
  if(child.status!==0)throw new Error('RC D1 operation failed');
  const parsed=JSON.parse(child.stdout);if(parsed.some(item=>!item.success))throw new Error('RC D1 operation failed');return parsed[0]?.results??[];
};
const repo={first:async(sql,...args)=>query(sql,args)[0]??null,run:async(sql,...args)=>query(sql,args),audit:async(action,type,id,payload)=>query('INSERT INTO audit_log (id,action,entity_type,entity_id,payload_json,occurred_at) VALUES (?,?,?,?,?,?)',[crypto.randomUUID(),action,type,id,JSON.stringify({...payload,actor:'owner:rc-metadata-repair'}),new Date().toISOString()])};
let stage='CREDENTIAL_CHECK';
try {
  let pageToken=values.META_PAGE_TOKEN;
  // Local setup may still hold the original User token; use the authorized Page credential in memory only.
  const graph=async(path,token)=>{const response=await fetch(`https://graph.facebook.com/v26.0/${path}`,{headers:{authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Meta credential check failed');return response.json();};
  if(values.META_APP_SECRET) {
    const appToken=`1095591632872369|${values.META_APP_SECRET}`;
    const original=await graph(`debug_token?input_token=${encodeURIComponent(pageToken)}`,appToken);
    if(!original.data?.is_valid||original.data.app_id!=='1095591632872369')throw new Error('Wrong app credential');
    if(original.data.type==='USER') {
      const pages=await graph('me/accounts?fields=id,access_token',pageToken);
      pageToken=pages.data?.find(page=>page.id==='1314972938374848')?.access_token;
      if(!pageToken)throw new Error('Page not authorized');
    } else if(original.data.type!=='PAGE'||original.data.profile_id!=='1314972938374848')throw new Error('Wrong Page credential');
  }
  stage='MODULE_LOAD';
  const built=await build({entryPoints:['apps/worker/src/messenger-profile.ts'],bundle:true,write:false,platform:'node',format:'esm'});
  const {syncMessengerProfile}=await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
  stage='METADATA_SYNC';
  const result=await syncMessengerProfile(repo,personId,{META_PAGE_TOKEN:pageToken,META_PAGE_ID:'1314972938374848',META_GRAPH_VERSION:'v26.0'},true);
  console.log(JSON.stringify({target:'boutique-rooms-os-rc',...result}));
} catch {console.error(`RC metadata refresh failed at ${stage}; no credentials or external error payloads printed.`);process.exitCode=1;}
