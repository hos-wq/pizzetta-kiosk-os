import { ApiError } from './repository';

export async function assertEvidenceForContext(repo: { first(sql: string, ...args: unknown[]): Promise<Record<string, unknown> | null> }, mediaId: unknown, unitId: string, tenancyId?: string | null) {
  if (!mediaId) return;
  const media = await repo.first('SELECT id,entity_type,entity_id,status FROM media_records WHERE id=?', String(mediaId));
  const valid = Boolean(media && media.status === 'ACTIVE' && ((media.entity_type === 'UNIT' && String(media.entity_id) === unitId) || (tenancyId && media.entity_type === 'TENANCY' && String(media.entity_id) === tenancyId)));
  if (!valid) throw new ApiError(422, 'INVALID_EVIDENCE_CONTEXT', 'Evidence does not belong to the requested Room/Tenancy');
}
