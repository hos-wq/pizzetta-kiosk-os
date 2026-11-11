import {readFileSync} from 'node:fs';

const appId = '1095591632872369';
const pageId = '1314972938374848';
const version = 'v26.0';
const values = Object.fromEntries(readFileSync('.dev.vars', 'utf8').split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^\s*(META_[A-Z_]+)\s*=\s*(.*?)\s*$/);
  return match ? [[match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]] : [];
}));

for (const name of ['META_APP_SECRET', 'META_PAGE_TOKEN']) {
  if (!values[name]) throw new Error(`Missing ${name}`);
}

async function graph(path, token, init = {}) {
  const response = await fetch(`https://graph.facebook.com/${version}/${path}`, {
    ...init,
    headers: {authorization: `Bearer ${token}`, ...(init.headers ?? {})},
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error('Meta request failed');
  return body;
}

try {
  const appToken = `${appId}|${values.META_APP_SECRET}`;
  if (process.argv.includes('--inspect-app')) {
    const subscriptions = await graph(`${appId}/subscriptions`, appToken);
    console.log(JSON.stringify({subscriptions: subscriptions.data ?? []}));
    process.exit(0);
  }
  if (process.argv.includes('--configure-app')) {
    const form = new URLSearchParams({
      object: 'page',
      callback_url: 'https://boutique-rooms-os-rc.boutiquerooms-makati.workers.dev/webhook',
      verify_token: values.META_VERIFY_TOKEN,
      fields: 'messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads',
    });
    const configured = await graph(`${appId}/subscriptions`, appToken, {
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      body: form,
    });
    if (configured.success !== true) throw new Error('Meta app webhook configuration failed');
    const subscriptions = await graph(`${appId}/subscriptions`, appToken);
    console.log(JSON.stringify({success: true, subscriptions: subscriptions.data ?? []}));
    process.exit(0);
  }
  const original = await graph(`debug_token?input_token=${encodeURIComponent(values.META_PAGE_TOKEN)}`, appToken);
  let pageToken = values.META_PAGE_TOKEN;
  if (original.data?.type === 'USER') {
    const exchanged = await graph(
      `oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${encodeURIComponent(values.META_APP_SECRET)}&fb_exchange_token=${encodeURIComponent(values.META_PAGE_TOKEN)}`,
      appToken,
    );
    const pages = await graph('me/accounts?fields=id,access_token', exchanged.access_token);
    pageToken = pages.data?.find((page) => page.id === pageId)?.access_token;
  }
  const verified = await graph(`debug_token?input_token=${encodeURIComponent(pageToken)}`, appToken);
  if (verified.data?.type !== 'PAGE' || !verified.data?.is_valid || verified.data?.app_id !== appId || verified.data?.profile_id !== pageId || !verified.data?.scopes?.includes('pages_messaging')) {
    throw new Error('Page token validation failed');
  }
  const fields = 'messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads';
  const subscribed = await graph(`${pageId}/subscribed_apps?subscribed_fields=${fields}`, pageToken, {method: 'POST'});
  if (subscribed.success !== true) throw new Error('Page subscription failed');
  const confirmed = await graph(`${pageId}/subscribed_apps?fields=id,name,subscribed_fields`, pageToken);
  console.log(JSON.stringify({success: true, subscriptions: confirmed.data?.map(({id, name, subscribed_fields}) => ({id, name, subscribed_fields})) ?? []}));
} catch {
  console.error('Messenger Page subscription failed; no secret values printed.');
  process.exitCode = 1;
}
