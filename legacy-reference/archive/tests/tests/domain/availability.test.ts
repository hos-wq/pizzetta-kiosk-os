import { describe, expect, it } from 'vitest';
import { AvailabilityService, InvalidAvailabilityInterval, type AvailabilityBlock } from '../../packages/domain/src/availability';

const block = (overrides: Partial<AvailabilityBlock> = {}): AvailabilityBlock => ({
  unitId: 'BR·07', startAt: '2026-10-10T00:00:00Z', endAt: '2026-10-20T00:00:00Z', source: 'MAINTENANCE', ...overrides,
});

describe('AvailabilityService with [start_at, end_at) intervals', () => {
  it('allows separated intervals', () => expect(new AvailabilityService([block()]).isAvailable({ unitId: 'BR·07', startAt: '2026-10-21T00:00:00Z', endAt: '2026-10-30T00:00:00Z' })).toBe(true));
  it('detects partial overlap at the beginning', () => expect(new AvailabilityService([block()]).isAvailable({ unitId: 'BR·07', startAt: '2026-10-01T00:00:00Z', endAt: '2026-10-11T00:00:00Z' })).toBe(false));
  it('detects partial overlap at the end', () => expect(new AvailabilityService([block()]).isAvailable({ unitId: 'BR·07', startAt: '2026-10-19T00:00:00Z', endAt: '2026-10-25T00:00:00Z' })).toBe(false));
  it('detects a requested interval contained by an existing block', () => expect(new AvailabilityService([block()]).isAvailable({ unitId: 'BR·07', startAt: '2026-10-12T00:00:00Z', endAt: '2026-10-13T00:00:00Z' })).toBe(false));
  it('detects an existing block contained by the requested interval', () => expect(new AvailabilityService([block()]).isAvailable({ unitId: 'BR·07', startAt: '2026-10-01T00:00:00Z', endAt: '2026-10-30T00:00:00Z' })).toBe(false));
  it('allows exact end-to-start boundaries', () => expect(new AvailabilityService([block()]).isAvailable({ unitId: 'BR·07', startAt: '2026-10-20T00:00:00Z', endAt: '2026-10-30T00:00:00Z' })).toBe(true));
  it('blocks active reservations', () => expect(new AvailabilityService([block({ source: 'RESERVATION', status: 'CONFIRMED' })]).isAvailable({ unitId: 'BR·07', startAt: '2026-10-15T00:00:00Z', endAt: '2026-10-16T00:00:00Z' })).toBe(false));
  it('does not block cancelled reservations', () => expect(new AvailabilityService([block({ source: 'RESERVATION', status: 'CANCELLED' })]).isAvailable({ unitId: 'BR·07', startAt: '2026-10-15T00:00:00Z', endAt: '2026-10-16T00:00:00Z' })).toBe(true));
  it('blocks active tenancies', () => expect(new AvailabilityService([block({ source: 'TENANCY', status: 'ACTIVE' })]).isAvailable({ unitId: 'BR·07', startAt: '2026-10-15T00:00:00Z', endAt: '2026-10-16T00:00:00Z' })).toBe(false));
  it('blocks maintenance intervals', () => expect(new AvailabilityService([block({ source: 'MAINTENANCE' })]).isAvailable({ unitId: 'BR·07', startAt: '2026-10-15T00:00:00Z', endAt: '2026-10-16T00:00:00Z' })).toBe(false));
  it('checks all blocks on the same unit', () => expect(new AvailabilityService([block(), block({ startAt: '2026-11-01T00:00:00Z', endAt: '2026-11-10T00:00:00Z' })]).isAvailable({ unitId: 'BR·07', startAt: '2026-11-05T00:00:00Z', endAt: '2026-11-06T00:00:00Z' })).toBe(false));
  it('does not let a block on another unit interfere', () => expect(new AvailabilityService([block({ unitId: 'BR·08' })]).isAvailable({ unitId: 'BR·07', startAt: '2026-10-15T00:00:00Z', endAt: '2026-10-16T00:00:00Z' })).toBe(true));
  it('allows an available unit now', () => expect(new AvailabilityService([]).isAvailable({ unitId:'BR·01', startAt:'2026-10-05T00:00:00Z', endAt:'2026-10-06T00:00:00Z' })).toBe(true));
  it('allows a currently occupied unit after the tenancy ends', () => expect(new AvailabilityService([block({ source:'TENANCY', status:'ACTIVE', startAt:'2026-10-01T00:00:00Z', endAt:'2026-10-10T00:00:00Z' })]).isAvailable({ unitId:'BR·07', startAt:'2026-10-10T00:00:00Z', endAt:'2026-10-20T00:00:00Z' })).toBe(true));
  it('blocks an off-market unit indefinitely', () => expect(new AvailabilityService([block({ source:'OFF_MARKET', startAt:'1970-01-01T00:00:00Z', endAt:null })]).isAvailable({ unitId:'BR·07', startAt:'2030-01-01T00:00:00Z', endAt:'2030-01-02T00:00:00Z' })).toBe(false));
  it('returns the next interval after a blocking tenancy', () => expect(new AvailabilityService([block({ source:'TENANCY', status:'ACTIVE', startAt:'2026-10-01T00:00:00Z', endAt:'2026-10-10T00:00:00Z' })]).nextAvailableDate('BR·07','2026-10-05T00:00:00+08:00',86400000)).toBe('2026-10-10T00:00:00.000Z'));
  it('walks a touching reservation, tenancy and maintenance chain to D', () => {
    const service=new AvailabilityService([
      block({source:'RESERVATION',status:'CONFIRMED',startAt:'2026-10-01T00:00:00Z',endAt:'2026-10-10T00:00:00Z'}),
      block({source:'TENANCY',status:'ACTIVE',startAt:'2026-10-10T00:00:00Z',endAt:'2026-10-20T00:00:00Z'}),
      block({source:'MAINTENANCE',startAt:'2026-10-20T00:00:00Z',endAt:'2026-10-30T00:00:00Z'}),
    ]);
    expect(service.nextAvailableDate('BR·07','2026-10-05T00:00:00Z',86400000)).toBe('2026-10-30T00:00:00.000Z');
  });
  it('uses the furthest end among overlapping blockers', () => {
    const service=new AvailabilityService([
      block({startAt:'2026-10-01T00:00:00Z',endAt:'2026-10-15T00:00:00Z'}),
      block({source:'TENANCY',status:'ACTIVE',startAt:'2026-10-05T00:00:00Z',endAt:'2026-10-20T00:00:00Z'}),
      block({source:'RESERVATION',status:'HELD',startAt:'2026-10-08T00:00:00Z',endAt:'2026-10-12T00:00:00Z'}),
    ]);
    expect(service.nextAvailableDate('BR·07','2026-10-02T00:00:00Z',86400000)).toBe('2026-10-20T00:00:00.000Z');
  });
  it('returns no next date for an open-ended active blocker', () => expect(new AvailabilityService([block({source:'TENANCY',status:'ACTIVE',endAt:null})]).nextAvailableDate('BR·07','2026-11-01T00:00:00Z',86400000)).toBeNull());
  it('supports different future availability per unit without ranking', () => {
    const service=new AvailabilityService([block({unitId:'BR·01',startAt:'2026-11-01T00:00:00Z',endAt:'2026-11-20T00:00:00Z'})]);
    expect(service.isAvailable({unitId:'BR·01',startAt:'2026-11-05T00:00:00Z',endAt:'2026-11-06T00:00:00Z'})).toBe(false);
    expect(service.isAvailable({unitId:'BR·02',startAt:'2026-11-05T00:00:00Z',endAt:'2026-11-06T00:00:00Z'})).toBe(true);
  });
  it('rejects invalid intervals and timestamps without timezone', () => {
    expect(() => new AvailabilityService([]).isAvailable({unitId:'BR·01',startAt:'2026-10-02T00:00:00Z',endAt:'2026-10-01T00:00:00Z'})).toThrow(InvalidAvailabilityInterval);
    expect(() => new AvailabilityService([]).isAvailable({unitId:'BR·01',startAt:'2026-10-01T00:00:00',endAt:'2026-10-02T00:00:00Z'})).toThrow(InvalidAvailabilityInterval);
  });
});
