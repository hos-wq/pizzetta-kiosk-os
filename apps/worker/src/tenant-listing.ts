import { ApiError, D1Repository } from './repository';
import { getPersonDetail } from './people';
import { getTenancyDetail } from './tenancies';

/**
 * Read model for the Tenant drawer in Listing.
 * The returned objects are assembled from the canonical Person, Tenancy,
 * Payment and tenancy_documents domains; this is deliberately not a second
 * tenant/document registry.
 */
export const getRoomTenantWorkspace = async (repo: D1Repository, unitId: string) => {
  const room = await repo.first('SELECT id,actual_unit_number FROM units WHERE id=?', unitId);
  if (!room) throw new ApiError(404, 'NOT_FOUND', 'Unit not found');

  const tenancy = await repo.first(
    "SELECT id FROM tenancies WHERE unit_id=? AND status IN ('ACTIVE','UPCOMING') ORDER BY CASE status WHEN 'ACTIVE' THEN 0 ELSE 1 END, start_at ASC LIMIT 1",
    unitId,
  );
  if (!tenancy) return { room_id: unitId, tenancy: null, person: null };

  const detail = await getTenancyDetail(repo, String(tenancy.id));
  const person = detail.person?.id ? await getPersonDetail(repo, String(detail.person.id)) : null;
  return { room_id: unitId, tenancy: detail, person };
};
