import { describe, expect, it } from 'vitest';
import { createMaintenanceIssue, addMaintenanceEvent, updateMaintenanceIssue } from '../../apps/worker/src/maintenance';
import { maintenanceCreateSchema, maintenancePatchSchema } from '../../packages/contracts/src';

const issue = { id: 'issue-1', unit_id: 'BR·09', area: 'Bathroom', asset: null, title: 'Water leak', description: 'Water coming from ceiling', priority: 'URGENT', status: 'OPEN', opened_at: '2026-10-10T01:00:00Z', resolved_at: null, closed_at: null, updated_at: '2026-10-10T01:00:00Z' };
const repoFactory = () => {
  const runs: { sql: string; args: unknown[] }[] = []; const audits: unknown[][] = [];
  const current = { ...issue };
  const repo = {
    runs, audits,
    first: async (sql: string) => { if (sql.includes('FROM units')) return { id: 'BR·09' }; if (sql.includes('inventory_assets a JOIN')) return { id: 'asset-1', unit_id: 'BR·09' }; if (sql.includes('FROM maintenance_issues')) return current; if (sql.includes('FROM availability_blocks')) return null; return null; },
    all: async (sql: string) => { if (sql.includes('maintenance_events')) return []; return []; },
    run: async (sql: string, ...args: unknown[]) => { runs.push({ sql, args }); if (sql.includes('UPDATE maintenance_issues SET') && sql.includes('status=?')) current.status = String(args[0]); },
    audit: async (...args: unknown[]) => { audits.push(args); },
  };
  return repo;
};

describe('V2.4 maintenance domain', () => {
  it('validates structured issue fields and permits unknown assets', () => {
    expect(maintenanceCreateSchema.safeParse({ unit_id: 'BR·09', area: 'Bathroom', title: 'Leak', description: 'Ceiling leak', priority: 'URGENT' }).success).toBe(true);
    expect(maintenanceCreateSchema.safeParse({ unit_id: 'BR·09', area: 'Bathroom', title: 'Leak', description: 'Ceiling leak', priority: 'URGENT', availability_impact: true }).success).toBe(false);
    expect(maintenancePatchSchema.safeParse({ status: 'BROKEN' }).success).toBe(false);
  });

  it('creates a non-blocking issue without changing availability', async () => {
    const repo = repoFactory();
    await createMaintenanceIssue(repo as never, { unit_id: 'BR·09', area: 'Bathroom', title: 'Water leak', description: 'Water from ceiling', priority: 'URGENT' }, 'owner');
    expect(repo.runs.some(item => item.sql.includes('INSERT INTO maintenance_issues'))).toBe(true);
    expect(repo.runs.some(item => item.sql.includes('INSERT INTO availability_blocks'))).toBe(false);
    expect(repo.audits[0][0]).toBe('CREATE');
  });

  it('links a known inventory asset without requiring one for every issue', async () => {
    const repo = repoFactory();
    await createMaintenanceIssue(repo as never, { unit_id: 'BR·09', area: 'Air Conditioning', asset: 'AC Unit', inventory_asset_id: 'asset-1', title: 'Compressor noise', description: 'Noise from the AC compressor', priority: 'MEDIUM' }, 'owner');
    const insert = repo.runs.find(item => item.sql.includes('INSERT INTO maintenance_issues'));
    expect(insert?.args).toContain('asset-1');
  });

  it('creates an explicit availability block only when requested', async () => {
    const repo = repoFactory();
    await createMaintenanceIssue(repo as never, { unit_id: 'BR·09', area: 'Air Conditioning', asset: 'AC Unit', title: 'Replacement', description: 'Replace AC', priority: 'MEDIUM', availability_impact: true, availability_start_at: '2026-10-10T00:00:00Z', availability_end_at: '2026-10-12T00:00:00Z' }, 'owner');
    const block = repo.runs.find(item => item.sql.includes('INSERT INTO availability_blocks'));
    expect(block?.args).toContain('BR·09');
    expect(block?.args).toContain('MAINTENANCE');
  });

  it('preserves activity, resolution and reopen history', async () => {
    const repo = repoFactory();
    await addMaintenanceEvent(repo as never, 'issue-1', { note: 'Technician attended' }, 'owner');
    await updateMaintenanceIssue(repo as never, 'issue-1', { status: 'RESOLVED' }, 'owner');
    await updateMaintenanceIssue(repo as never, 'issue-1', { status: 'OPEN' }, 'owner');
    expect(repo.runs.filter(item => item.sql.includes('INSERT INTO maintenance_events'))).toHaveLength(3);
    expect(repo.audits.map(item => item[0])).toEqual(['ACTIVITY', 'UPDATE', 'UPDATE']);
  });
});
