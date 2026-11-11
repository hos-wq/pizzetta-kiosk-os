import { describe, expect, it } from 'vitest';
import { calculateUtilityCharge, createUtilityRate } from '../../apps/worker/src/tenancies';

describe('V2.13D utility finalization', () => {
  it('rejects overlapping effective rate intervals', async () => { const repo = { async first() { return { id: 'existing' }; } }; await expect(createUtilityRate(repo as never, { utility_type: 'WATER', unit: 'M3', rate_centavos: 4000, effective_from: '2026-10-01', effective_until: '2026-11-01' }, 'owner')).rejects.toMatchObject({ code: 'OVERLAPPING_UTILITY_RATE' }); });
  it('uses deterministic centavo arithmetic for decimal consumption', async () => { const readings = [{ id: 'r1', recorded_at: '2026-10-01T00:00:00Z', reading_value: '184.2' }, { id: 'r2', recorded_at: '2026-10-02T00:00:00Z', reading_value: '188.7' }]; const repo = { async all() { return readings; }, async first() { return { id: 'rate', rate_centavos: 4000, method: 'UNIT_RATE' }; } }; const result = await calculateUtilityCharge(repo as never, 'BR·07', 'WATER'); expect(result.charges[0]).toMatchObject({ consumption: 4.5, amount_centavos: 18000 }); });
});
