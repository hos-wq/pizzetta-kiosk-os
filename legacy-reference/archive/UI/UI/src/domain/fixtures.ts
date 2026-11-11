import type { PersonFixture, RoomFixture, TaskFixture } from '../fixtures.ts';
import type { Operation, Person, Room } from './entities.ts';
import type { DomainRepository } from './repositories.ts';
import { hasDuplicateActiveOperation } from './validation.ts';

export function adaptRoomFixture(fixture: RoomFixture): Room {
  return { internalId: `room-${fixture.id}`, publicId: fixture.id, unitNumber: fixture.unit, buildingId: 'UNKNOWN', occupancy: fixture.occupancy === 'OCCUPIED' ? 'OCCUPIED' : fixture.occupancy === 'READY' ? 'READY' : 'UNKNOWN', balcony: Boolean(fixture.balcony), view: fixture.balcony?.includes('NO VIEW') ? 'NO VIEW' : undefined, amenities: [], source: 'DEVELOPMENT_FIXTURE' };
}
export function adaptPersonFixture(fixture: PersonFixture): Person { return { internalId: fixture.id, name: fixture.name, roles: [fixture.role], detail: fixture.detail, source: 'DEVELOPMENT_FIXTURE' }; }
export function adaptTaskFixture(fixture: TaskFixture, rooms: readonly Room[]): Operation | undefined {
  if (fixture.category === 'MESSAGES') return undefined;
  const room = rooms.find((item) => item.publicId === fixture.room);
  if (!room) return undefined;
  return { internalId: fixture.id, roomId: room.internalId, category: fixture.category, object: fixture.object, action: fixture.action, priority: fixture.priority, status: fixture.status, service: fixture.service, macro: fixture.macro, taxonomyCategory: fixture.taxonomyCategory, source: 'DEVELOPMENT_FIXTURE' };
}
export class DevelopmentRepository implements DomainRepository {
  private readonly rooms: readonly Room[];
  private readonly people: readonly Person[];
  private readonly operations: Operation[];
  constructor(roomFixtures: readonly RoomFixture[], personFixtures: readonly PersonFixture[], taskFixtures: readonly TaskFixture[]) {
    this.rooms = roomFixtures.map(adaptRoomFixture);
    this.people = personFixtures.map(adaptPersonFixture);
    this.operations = taskFixtures.map((task) => adaptTaskFixture(task, this.rooms)).filter((operation): operation is Operation => Boolean(operation));
  }
  async listRooms() { return this.rooms; }
  async listPeople() { return this.people; }
  async listTenancies() { return []; }
  async createOperation(operation: Operation) { return hasDuplicateActiveOperation(operation, this.operations) ? { ok: false as const, error: { code: 'CONFLICT' as const, message: 'An active operation with the same room, object and action already exists.' } } : (this.operations.push(operation), { ok: true as const, value: operation }); }
}
