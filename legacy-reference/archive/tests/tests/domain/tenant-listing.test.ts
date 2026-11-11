import { describe, expect, it } from 'vitest';
import { getRoomTenantWorkspace } from '../../apps/worker/src/tenant-listing';

describe('Listing Tenant workspace', () => {
  it('returns an empty workspace when a room has no active or upcoming tenancy', async () => {
    const repo = {
      first: async (sql: string) => sql.includes('FROM units') ? { id: 'BR·07', actual_unit_number: 'U-1007' } : null,
    };
    await expect(getRoomTenantWorkspace(repo as never, 'BR·07')).resolves.toEqual({ room_id: 'BR·07', tenancy: null, person: null });
  });

  it('rejects an unknown room instead of returning unrelated tenant data', async () => {
    const repo = { first: async () => null };
    await expect(getRoomTenantWorkspace(repo as never, 'BR·99')).rejects.toThrow('Unit not found');
  });
});
