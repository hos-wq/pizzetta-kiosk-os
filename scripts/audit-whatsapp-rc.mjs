// Non-destructive RC-only signature/verification probe. Never prints secrets,
// sends messages, writes business records or changes Meta subscriptions.
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';

const rc = 'https://boutique-rooms-os-rc.boutiquerooms-makati.workers.dev';
const appId = '1095591632872369';
const values = Object.fromEntries(readFileSync('.dev.vars', 'utf8').split(/\r?\n/).flatMap(line => {
  const match = line.match(/^\s*(META_APP_SECRET|META_VERIFY_TOKEN)\s*=\s*(.*?)\s*$/);
  return match ? [[match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]] : [];
}));
if (!values.META_APP_SECRET || !values.META_VERIFY_TOKEN) throw new Error('Required local Meta configuration missing');
try {
  const verify = new URL(`${rc}/webhook`);
  verify.search = new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': values.META_VERIFY_TOKEN, 'hub.challenge': 'rc-safe-audit' }).toString();
  const verification = await fetch(verify, { signal: AbortSignal.timeout(15000) });
  const probes = {};
  for (const [name, body, valid] of [
    ['signed_whatsapp_empty', JSON.stringify({ object: 'whatsapp_business_account', entry: [] }), true],
    ['signed_messenger_empty', JSON.stringify({ object: 'page', entry: [] }), true],
    ['signed_malformed', '{', true], ['invalid_signature', '{}', false],
  ]) {
    const signature = valid ? createHmac('sha256', values.META_APP_SECRET).update(body).digest('hex') : '0'.repeat(64);
    const response = await fetch(`${rc}/webhook`, { method: 'POST', body, headers: { 'x-hub-signature-256': `sha256=${signature}` }, signal: AbortSignal.timeout(15000) });
    probes[name] = response.status;
  }
  const subscriptions = await fetch(`https://graph.facebook.com/v26.0/${appId}/subscriptions`, { headers: { authorization: `Bearer ${appId}|${values.META_APP_SECRET}` }, signal: AbortSignal.timeout(15000) });
  const result = subscriptions.ok ? await subscriptions.json() : {};
  console.log(JSON.stringify({ rc, app_id: appId, verification: verification.status === 200 && (await verification.text()) === 'rc-safe-audit', probes,
    app_subscription_read_status: subscriptions.status, subscriptions: (result.data ?? []).map(item => ({ object: item.object, callback_url: item.callback_url, active: item.active, fields: (item.fields ?? []).map(field => ({ name: field.name, version: field.version })) })) }));
  if (verification.status !== 200 || probes.signed_whatsapp_empty !== 200 || probes.signed_messenger_empty !== 200 || probes.signed_malformed !== 400 || probes.invalid_signature !== 401) process.exitCode = 1;
} catch { console.error('RC audit probe failed; no credentials or provider error bodies printed.'); process.exitCode = 1; }
