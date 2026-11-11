export type Interval = { startAt: string; endAt: string | null };

export type AvailabilityBlock = Interval & {
  unitId: string;
  source: 'RESERVATION' | 'TENANCY' | 'MAINTENANCE' | 'OFF_MARKET' | 'OWNER_DECLARED_OCCUPIED';
  status?: string;
};

export type AvailabilityRequest = { unitId: string; startAt: string; endAt: string };

export class InvalidAvailabilityInterval extends Error {}

const requireUtcTimestamp = (value: string, field: string): number => {
  if (!/T/.test(value) || !/(Z|[+-]\d{2}:?\d{2})$/.test(value)) throw new InvalidAvailabilityInterval(`${field} must be an ISO timestamp with timezone`);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new InvalidAvailabilityInterval(`${field} must be a valid timestamp`);
  return parsed;
};

export const normalizeUtcTimestamp = (value: string, field = 'timestamp'): string => new Date(requireUtcTimestamp(value, field)).toISOString();
export const validateInterval = (interval: Interval): void => {
  const start = requireUtcTimestamp(interval.startAt, 'start_at');
  const end = interval.endAt === null ? null : requireUtcTimestamp(interval.endAt, 'end_at');
  if (end !== null && start >= end) throw new InvalidAvailabilityInterval('start_at must be before end_at');
};

export const overlaps = (a: Interval, b: Interval): boolean => {
  validateInterval(a); validateInterval(b);
  const aStart = requireUtcTimestamp(a.startAt, 'start_at');
  const bStart = requireUtcTimestamp(b.startAt, 'start_at');
  const aEnd = a.endAt === null ? Number.POSITIVE_INFINITY : requireUtcTimestamp(a.endAt, 'end_at');
  const bEnd = b.endAt === null ? Number.POSITIVE_INFINITY : requireUtcTimestamp(b.endAt, 'end_at');
  return aStart < bEnd && bStart < aEnd;
};

export const isBlocking = (block: AvailabilityBlock): boolean => {
  if (block.source === 'RESERVATION') return block.status === 'HELD' || block.status === 'CONFIRMED';
  if (block.source === 'TENANCY') return block.status === 'UPCOMING' || block.status === 'ACTIVE';
  return true;
};

export class AvailabilityService {
  constructor(private readonly blocks: AvailabilityBlock[]) {}

  conflicts(request: AvailabilityRequest): AvailabilityBlock[] {
    validateInterval(request);
    return this.blocks.filter((block) => block.unitId === request.unitId && isBlocking(block) && overlaps(request, block));
  }

  isAvailable(request: AvailabilityRequest): boolean {
    return this.conflicts(request).length === 0;
  }

  nextAvailableDate(unitId: string, fromAt: string, durationMs: number): string | null {
    requireUtcTimestamp(fromAt, 'from_at');
    if (!Number.isFinite(durationMs) || durationMs <= 0) throw new InvalidAvailabilityInterval('duration must be positive');
    let candidate = requireUtcTimestamp(fromAt, 'from_at');
    const blocks = this.blocks.filter((block) => block.unitId === unitId && isBlocking(block)).sort((a, b) => requireUtcTimestamp(a.startAt, 'start_at') - requireUtcTimestamp(b.startAt, 'start_at'));
    for (const block of blocks) {
      const request = { unitId, startAt: new Date(candidate).toISOString(), endAt: new Date(candidate + durationMs).toISOString() };
      if (!overlaps(request, block)) continue;
      if (block.endAt === null) return null;
      candidate = Math.max(candidate, requireUtcTimestamp(block.endAt, 'end_at'));
    }
    return new Date(candidate).toISOString();
  }
}
