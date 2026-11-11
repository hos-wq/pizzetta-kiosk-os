import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const app = readFileSync(resolve(process.cwd(), 'apps/web/src/v2/V2App.tsx'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'apps/web/src/v2/V2.css'), 'utf8');
const tokens = readFileSync(resolve(process.cwd(), 'apps/web/src/v2/tokens.css'), 'utf8');

describe('BR OFFICE RC shell contract', () => {
  it('uses horizontal Office navigation and keeps the sidebar Mobile-only', () => {
    expect(app).toContain('V2PrimaryNav');
    expect(app).toContain('V2OfficeSubNav');
    expect(app).toContain("location.surface === 'mobile' && <V2Sidebar");
    expect(css).toContain('.v2-primary-nav');
    expect(css).toContain('.v2-office-subnav');
    expect(app).toContain('function OfficeCanvas');
    expect(app).toContain('return items.length ?');
  });

  it('defines the approved flat four-column card system', () => {
    expect(css).toContain('.v2-card-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));');
    expect(tokens).toContain('--br-canvas: #F7F5F1');
    expect(tokens).toContain('--br-white: #FFFFFF');
    expect(tokens).toContain('--br-brass: #A98552');
    expect(tokens).toContain('--br-amaranto: #8B1830');
  });

  it('requires explicit logout confirmation with cancel and escape paths', () => {
    expect(app).toContain('role="dialog" aria-label="Confirm logout"');
    expect(app).toContain('Log out?');
    expect(app).toContain('>Cancel</button>');
    expect(app).toContain("event.key === 'Escape'");
  });

  it('keeps account logout on the existing server-side endpoint', () => {
    expect(app).toContain("fetch('/auth/logout'");
    expect(app).not.toContain('onClick={() => void logout()}><UserCircle');
  });
});
