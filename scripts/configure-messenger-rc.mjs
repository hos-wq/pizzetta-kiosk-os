// RC-only credential provisioning. Credentials stay in process memory/stdin.
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

const appId='1095591632872369';
const pageId='1314972938374848';
const version='v26.0';
const config=readFileSync('wrangler.rc.toml','utf8');
if(!config.includes('name = "boutique-rooms-os-rc"') || !config.includes('database_id = "5082b4c9-f0f7-43b2-a457-e92c49f7bfc8"') || config.includes('b156b6f1-3871-4113-8f46-476c1f97c02d')) throw new Error('RC target validation failed');
const vars=Object.fromEntries(readFileSync('.dev.vars','utf8').split(/\r?\n/).flatMap(line=>{
  const match=line.match(/^\s*(META_[A-Z_]+)\s*=\s*(.*?)\s*$/);
  return match?[[match[1],match[2].replace(/^(['"])(.*)\1$/,'$2')]]:[];
}));
for(const name of ['META_APP_SECRET','META_PAGE_TOKEN','META_VERIFY_TOKEN']) if(!vars[name])throw new Error(`Missing ${name}`);
async function graph(path,token) {
  const response=await fetch(`https://graph.facebook.com/${version}/${path}`,{headers:{authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)});
  const value=await response.json();
  if(!response.ok || value.error)throw new Error(`Meta request failed: HTTP ${response.status}, code ${value.error?.code??'unknown'}`);
  return value;
}
try {
  const appToken=`${appId}|${vars.META_APP_SECRET}`;
  const original=await graph(`debug_token?input_token=${encodeURIComponent(vars.META_PAGE_TOKEN)}`,appToken);
  if(!original.data?.is_valid || original.data.app_id!==appId)throw new Error('Token/app mismatch');
  let pageToken=vars.META_PAGE_TOKEN;
  if(original.data.type==='USER') {
    const exchange=await graph(`oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${encodeURIComponent(vars.META_APP_SECRET)}&fb_exchange_token=${encodeURIComponent(vars.META_PAGE_TOKEN)}`,appToken);
    const pages=await graph('me/accounts?fields=id,access_token',exchange.access_token);
    pageToken=pages.data?.find(page=>page.id===pageId)?.access_token;
    if(!pageToken)throw new Error('Expected Page not authorized');
  }
  const verified=await graph(`debug_token?input_token=${encodeURIComponent(pageToken)}`,appToken);
  if(verified.data?.type!=='PAGE' || !verified.data.is_valid || verified.data.app_id!==appId || verified.data.profile_id!==pageId || !verified.data.scopes?.includes('pages_messaging'))throw new Error('Page credential validation failed');
  const provisioning=spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'secret','bulk','--config','wrangler.rc.toml'],{
    input:JSON.stringify({META_APP_SECRET:vars.META_APP_SECRET,META_PAGE_TOKEN:pageToken,META_VERIFY_TOKEN:vars.META_VERIFY_TOKEN}),
    encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:120000,
  });
  // Never echo CLI output, credentials or external error payloads.
  if(provisioning.status!==0)throw new Error('RC secret provisioning failed. Run wrangler login and retry.');
  console.log('RC Messenger secrets configured; Page identity verified. No credential values printed.');
} catch {
  console.error('RC Messenger configuration failed; verify Cloudflare login and Meta Page authorization. No secret values were printed.');process.exitCode=1;
}
