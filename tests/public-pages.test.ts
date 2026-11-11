import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const publicRoot = resolve(process.cwd(), 'apps/web/public');
const publicPages = ['privacy', 'terms', 'data-deletion'];

describe('public legal infrastructure', () => {
  it.each(publicPages)('has a public crawler-accessible route for /%s', (page) => {
    const file = resolve(publicRoot, page, 'index.html');
    expect(existsSync(file)).toBe(true);
    const html = readFileSync(file, 'utf8');
    expect(html).toContain('name="robots" content="index,follow"');
    expect(html).toContain('Boutique Rooms Makati');
    expect(html).toContain('boutiquerooms.makati@gmail.com');
    expect(html).not.toContain('META_APP_SECRET');
    expect(html).not.toContain('META_VERIFY_TOKEN');
  });

  it('links the legal routes without an authenticated API dependency', () => {
    const privacy = readFileSync(resolve(publicRoot, 'privacy/index.html'), 'utf8');
    expect(privacy).toContain('href="/terms"');
    expect(privacy).toContain('href="/data-deletion"');
    expect(privacy).not.toContain('/api/');
  });

});
