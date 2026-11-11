import { describe, expect, it } from 'vitest';
import { navigationRegistry, officeNavigationRegistry, resolveCommand, resolveOfficeCommand, validateNavigationInstruction } from '../UI/src/monique/navigation';
import type { PersonFixture, RoomFixture } from '../UI/src/fixtures';

const rooms: RoomFixture[] = [{ id: 'BR·08', displayId: 'BR•08', unit: 'U-1008', occupancy: 'READY', maintenance: 'NORMAL', housekeeping: 'READY', nextDate: '17 OCT' }, { id: 'BR·27', displayId: 'BR•27', unit: 'U-2704B', occupancy: 'READY', maintenance: 'NORMAL', housekeeping: 'READY', nextDate: '20 OCT' }];
const people: PersonFixture[] = [{ id: 'bianca-1', name: 'Bianca Dema-ala Liwanag', role: 'Tenant', room: 'BR·03', detail: '' }, { id: 'bianca-2', name: 'Bianca Santos', role: 'Contact', room: 'BR·09', detail: '' }];

describe('Monique deterministic navigation', () => {
  it('covers the verified mobile navigation registry', () => {
    expect(navigationRegistry).toHaveLength(11);
    expect(navigationRegistry.map((item) => item.id)).toEqual(expect.arrayContaining(['listing', 'listing.room.details', 'people', 'people.person.details', 'today', 'calendar', 'calendar.events', 'services', 'services.room']));
    expect(navigationRegistry.every((item) => item.id.split('.').slice(0, -1).every((_, index, parents) => index === parents.length - 1 || parents[index] !== parents[index + 1]))).toBe(true);
  });

  it.each(['Open BR08', 'Apri BR-08', 'Show room 1008', 'Apri BR·08'])('resolves room aliases: %s', (command) => {
    const result = resolveCommand(command, { rooms, people: [] });
    expect(result.state).toBe('RESOLVED');
    expect(result.instruction?.destination.entities.roomId).toBe('BR·08');
  });

  it('resolves services in room context without writing', () => {
    const result = resolveCommand('Open services for 2704B', { rooms, people: [] });
    expect(result.instruction).toEqual({ version: 1, operation: 'NAVIGATE', destination: { navigationId: 'services.room', entities: { roomId: 'BR·27' } } });
  });

  it.each(['Show room operations BR08', 'Mostrami operazioni BR08', 'Open operations for room 1008', 'Apri operazioni stanza 1008', 'Go to BR08 operations'])('prioritizes room operations over Services: %s', (command) => {
    const result = resolveCommand(command, { rooms, people: [] });
    expect(result.instruction).toEqual({ version: 1, operation: 'NAVIGATE', destination: { navigationId: 'listing.room.operations', entities: { roomId: 'BR·08' } } });
  });

  it.each(['Open people', 'Apri persone', 'Open person'])('keeps generic People navigation: %s', (command) => {
    expect(resolveCommand(command, { rooms: [], people: [] }).instruction?.destination.navigationId).toBe('people');
  });

  it.each(['Open nonexistent person', 'Apri persona inesistente', 'Show person UnknownName'])('reports unknown person without fallback: %s', (command) => {
    expect(resolveCommand(command, { rooms: [], people: [] })).toMatchObject({ state: 'UNKNOWN_ENTITY', message: 'Unknown person.' });
  });

  it('returns ambiguity instead of guessing people', () => {
    const result = resolveCommand('Open Bianca', { rooms: [], people });
    expect(result.state).toBe('AMBIGUOUS');
    expect(result.choices).toHaveLength(2);
  });

  it('rejects mutations and unavailable subsections', () => {
    expect(resolveCommand('Change the rent of 1008', { rooms, people: [] }).state).toBe('UNSUPPORTED');
    expect(resolveCommand('Record payment for BR27', { rooms, people: [] }).state).toBe('UNSUPPORTED');
    expect(resolveCommand('Registra pagamento per BR27', { rooms, people: [] }).state).toBe('UNSUPPORTED');
    expect(resolveCommand('Open dues for 1008', { rooms, people: [] }).state).toBe('UNSUPPORTED');
  });

  it('does not fall back to listing for an unknown room', () => {
    expect(resolveCommand('Open unknown room 9999', { rooms, people: [] })).toMatchObject({ state: 'UNKNOWN_ENTITY' });
    expect(resolveOfficeCommand('Take me to room 9999', { rooms, people: [] })).toMatchObject({ state: 'UNKNOWN_ENTITY' });
  });

  it('validates the versioned read-only contract', () => {
    const valid = validateNavigationInstruction({ version: 1, operation: 'NAVIGATE', destination: { navigationId: 'listing.room.details', entities: { roomId: 'BR·08' } } });
    expect(valid.state).toBe('RESOLVED');
    expect(validateNavigationInstruction({ version: 1, operation: 'WRITE', destination: { navigationId: 'listing' } }).state).toBe('ERROR');
    expect(validateNavigationInstruction({ version: 1, operation: 'NAVIGATE', destination: { navigationId: 'listing.room.details', entities: {} } }).state).toBe('ERROR');
  });

  it('routes existing Office destinations without inventing writes', () => {
    expect(officeNavigationRegistry).toHaveLength(30);
    expect(resolveOfficeCommand('Take me to room 1008 internet', { rooms, people: [] }).instruction).toMatchObject({ destination: { navigationId: 'office.utilities', entities: { unitId: 'BR·08' } } });
    expect(resolveOfficeCommand('Show the financial section for BR08', { rooms, people: [] }).state).toBe('UNSUPPORTED');
    expect(resolveOfficeCommand('Open Bianca contract', { rooms: [], people: [people[0]] }).instruction).toMatchObject({ destination: { navigationId: 'office.tenancies', entities: { personId: 'bianca-1' } } });
  });

  it('preserves the requested Office subsection alongside the entity context', () => {
    expect(resolveOfficeCommand('Take me to room 1008 internet', { rooms, people: [] }).instruction?.destination.entities).toEqual({ unitId: 'BR·08', panel: 'INTERNET' });
    expect(resolveOfficeCommand('Show housekeeping for BR08', { rooms, people: [] }).instruction?.destination.entities).toEqual({ unitId: 'BR·08', panel: 'HOUSEKEEPING' });
  });

  it.each(['Open people', 'Apri persone'])('keeps generic Office People navigation: %s', (command) => {
    expect(resolveOfficeCommand(command, { rooms: [], people: [] }).instruction?.destination.navigationId).toBe('office.tenancies.people');
  });

  it.each(['Open nonexistent person', 'Apri persona inesistente', 'Show person UnknownName'])('reports unknown Office person without fallback: %s', (command) => {
    expect(resolveOfficeCommand(command, { rooms: [], people: [] })).toMatchObject({ state: 'UNKNOWN_ENTITY', message: 'Unknown person.' });
  });
});
