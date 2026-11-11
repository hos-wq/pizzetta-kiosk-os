import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

describe('V2.13G PWA resilience', () => {
  it('uses a V2-only service worker with network-first navigations', () => { const source = readFileSync(resolve(root, '../../apps/web/public/sw-v2.js'), 'utf8'); expect(source).toContain("event.request.mode === 'navigate'"); expect(source).toContain("cache: 'no-store'"); expect(source).toContain('self.skipWaiting()'); expect(source).toContain('self.clients.claim()'); expect(source).not.toContain("cache.addAll(['/'])"); });
  it('registers and refreshes the V2 worker only for V2 routes', () => { const source = readFileSync(resolve(root, '../../apps/web/src/main.tsx'), 'utf8'); expect(source).toContain("window.location.pathname.startsWith('/v2/')"); expect(source).toContain("register('/sw-v2.js',{scope:'/v2/',updateViaCache:'none'})"); expect(source).toContain('registration.update()'); });
  it('selects one manifest before the V2 app renders and serves it in the initial V2 HTML', () => {
    const main = readFileSync(resolve(root, '../../apps/web/src/main.tsx'), 'utf8');
    const worker = readFileSync(resolve(root, '../../apps/worker/src/index.ts'), 'utf8');
    const config = readFileSync(resolve(root, '../../wrangler.rc.toml'), 'utf8');
    expect(main).toContain("document.querySelector<HTMLLinkElement>('link[rel=\"manifest\"]')");
    expect(main).not.toContain("document.createElement('link');manifest.rel='manifest'");
    expect(worker).toContain("url.pathname.startsWith('/v2/')");
    expect(worker).toContain('manifest-v2.webmanifest');
    expect(worker).toContain('apple-touch-icon.png');
    expect(config).toContain('"/v2/*"');
  });
  it('updates and clears the iOS Home Screen app badge through the V2 worker/app', () => {
    const worker = readFileSync(resolve(root, '../../apps/web/public/sw-v2.js'), 'utf8');
    const app = readFileSync(resolve(root, '../../apps/web/src/v2/V2App.tsx'), 'utf8');
    expect(worker).toContain('navigator.setAppBadge');
    expect(worker).toContain('silent: false');
    expect(worker).toContain('badgeCount');
    expect(app).toContain('clearAppBadge');
  });
});
