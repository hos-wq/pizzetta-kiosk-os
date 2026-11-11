import { describe, expect, it } from 'vitest';
import { listTemporalItems } from '../../apps/worker/src/calendar';
import { getAttentionItems } from '../../apps/worker/src/attention';

const contractRows = [
  { id: 'cv-1', tenancy_id: 'tenancy-jeff', version_number: 1, start_date: '2026-09-16', end_exclusive: '2026-10-15', last_occupied_date: '2026-10-14', unit_id: 'BR·27', person_id: 'person-jeff', person_name: 'Padilla Jeff Emmanuel Irinco', status: 'ACTIVE' },
  { id: 'cv-2', tenancy_id: 'tenancy-jeff', version_number: 2, start_date: '2026-10-15', end_exclusive: '2026-12-15', last_occupied_date: '2026-12-14', unit_id: 'BR·27', person_id: 'person-jeff', person_name: 'Padilla Jeff Emmanuel Irinco', status: 'ACTIVE' },
];

describe('T05 tenancy calendar projections', () => {
  it('uses contract versions, distinguishes renewal, and emits only the final expiry', async () => {
    const repo = { all: async (sql: string) => sql.includes('tenancy_contract_versions') ? contractRows : sql.includes('tenancy_terminations') ? [] : [] };
    const items = await listTemporalItems(repo as never, { from: '2026-10-01T00:00:00+08:00', to: '2026-12-20T00:00:00+08:00' });
    expect(items.filter(item => item.source_entity_type === 'TENANCY_CONTRACT_VERSION').map(item => [item.event_type, item.date])).toEqual([
      ['TENANCY_RENEWAL', '2026-10-15'],
      ['TENANCY_EXPIRY', '2026-12-15'],
    ]);
    expect(items.find(item => item.event_type === 'TENANCY_RENEWAL')?.projection_id).toBe('TENANCY_CONTRACT_VERSION:cv-2:TENANCY_RENEWAL');
    expect(items.find(item => item.event_type === 'TENANCY_RENEWAL')?.metadata).toMatchObject({ tenancy_id: 'tenancy-jeff', contract_version_id: 'cv-2' });
    expect(items.find(item => item.event_type === 'TENANCY_RENEWAL')?.navigation_target).toMatchObject({ screen: 'tenancies', entity_id: 'tenancy-jeff' });
  });

  it('suppresses future contractual events after termination but preserves the termination event', async () => {
    const repo = { all: async (sql: string) => sql.includes('tenancy_contract_versions') ? contractRows : sql.includes('tenancy_terminations') ? [{ id: 'termination-1', tenancy_id: 'tenancy-jeff', effective_date: '2026-11-01', reason: 'Owner decision' }] : [] };
    const items = await listTemporalItems(repo as never, { from: '2026-10-01T00:00:00+08:00', to: '2026-12-20T00:00:00+08:00' });
    expect(items.map(item => item.event_type)).toContain('TENANCY_TERMINATION');
    expect(items.map(item => item.event_type)).not.toContain('TENANCY_EXPIRY');
  });
});

describe('T05 attention projections', () => {
  it('reports missing physical evidence and required documents without creating records', async () => {
    const repo = {
      all: async (sql: string) => {
        if (sql.includes('tenancies t') && sql.includes('tenancy_check_ins')) return [{ kind: 'CHECK_IN_MISSING', id: 'tenancy-bianca', unit_id: 'BR·03', status: 'ACTIVE', due_at: '2026-10-15', person_name: 'Bianca Dema-ala Liwanag' }];
        if (sql.includes('tenancy_document_requirements')) return [{ kind: 'DOCUMENT_REQUIRED', id: 'req-1', tenancy_id: 'tenancy-bianca', label: 'NOTARIZED_LEASE', status: 'REQUIRED', due_at: '2026-10-15' }];
        return [];
      },
    };
    const items = await getAttentionItems(repo as never, new Date('2026-10-15T00:00:00+08:00'));
    expect(items.map(item => item.kind)).toEqual(['CHECK_IN_MISSING', 'DOCUMENT_REQUIRED']);
  });
});
