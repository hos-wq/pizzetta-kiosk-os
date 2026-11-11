import type { CalendarEvent, Contract, Operation, Payment, Person, Room, Tenancy } from './entities.ts';
import type { DateOnly } from './enums.ts';

export type DomainSnapshot = { rooms: readonly Room[]; people: readonly Person[]; tenancies: readonly Tenancy[]; contracts: readonly Contract[]; payments: readonly Payment[]; operations: readonly Operation[]; calendarEvents?: readonly CalendarEvent[] };
export function roomByPublicId(snapshot: DomainSnapshot, publicId: string): Room | undefined { return snapshot.rooms.find((room) => room.publicId === publicId); }
export function activeTenanciesForRoom(snapshot: DomainSnapshot, roomId: string, date: DateOnly): readonly Tenancy[] { return snapshot.tenancies.filter((tenancy) => tenancy.roomId === roomId && tenancy.status === 'ACTIVE' && tenancy.startDate <= date && (!tenancy.endDate || tenancy.endDate >= date)); }
export function deriveRoomOccupancy(snapshot: DomainSnapshot, roomId: string, date: DateOnly): Room['occupancy'] { return activeTenanciesForRoom(snapshot, roomId, date).length > 0 ? 'OCCUPIED' : roomByInternalId(snapshot, roomId)?.occupancy ?? 'UNKNOWN'; }
export function roomByInternalId(snapshot: DomainSnapshot, roomId: string): Room | undefined { return snapshot.rooms.find((room) => room.internalId === roomId); }
export function operationsForCategory(snapshot: DomainSnapshot, category: Operation['category']): readonly Operation[] { return snapshot.operations.filter((operation) => operation.category === category); }
export function projectCalendarEvents(snapshot: DomainSnapshot): readonly CalendarEvent[] {
  const derived: CalendarEvent[] = [];
  for (const tenancy of snapshot.tenancies) {
    derived.push({ internalId: `tenancy-start-${tenancy.internalId}`, date: tenancy.startDate, type: 'TENANCY_START', sourceId: tenancy.internalId, roomId: tenancy.roomId, title: 'Tenancy starts', source: tenancy.source });
    if (tenancy.endDate) derived.push({ internalId: `tenancy-end-${tenancy.internalId}`, date: tenancy.endDate, type: 'TENANCY_END', sourceId: tenancy.internalId, roomId: tenancy.roomId, title: 'Tenancy ends', source: tenancy.source });
  }
  for (const contract of snapshot.contracts) if (contract.expirationDate) derived.push({ internalId: `contract-expiry-${contract.internalId}`, date: contract.expirationDate, type: 'CONTRACT_EXPIRY', sourceId: contract.internalId, title: 'Contract expires', source: contract.source });
  for (const payment of snapshot.payments) derived.push({ internalId: `payment-due-${payment.internalId}`, date: payment.dueDate, type: 'PAYMENT_DUE', sourceId: payment.internalId, title: 'Payment due', source: payment.source });
  for (const operation of snapshot.operations) if (operation.createdAt) derived.push({ internalId: `operation-${operation.internalId}`, date: operation.createdAt.slice(0, 10) as DateOnly, type: 'OPERATION', sourceId: operation.internalId, roomId: operation.roomId, title: operation.action, source: operation.source });
  return [...derived, ...(snapshot.calendarEvents ?? [])];
}
