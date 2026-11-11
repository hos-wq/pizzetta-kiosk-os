import type { PersonFixture, RoomFixture } from '../fixtures';
export type ThemePageKey = 'LISTING' | 'PEOPLE' | 'TODAY' | 'CALENDAR' | 'SERVICES';

export type NavigationState = 'RESOLVED' | 'AMBIGUOUS' | 'NOT_FOUND' | 'UNKNOWN_ENTITY' | 'UNSUPPORTED' | 'UNAUTHORIZED' | 'ERROR';
export type NavigationEntity = 'room' | 'person' | 'date';

export type NavigationDestination = {
  id: string;
  parentId?: string;
  label: string;
  aliases: readonly string[];
  entityType?: NavigationEntity;
  requiredParams: readonly string[];
  page: ThemePageKey;
  panel?: 'details' | 'occupancy' | 'operations' | 'relationship' | 'services' | 'events';
};

export type NavigationInstruction = {
  version: 1;
  operation: 'NAVIGATE';
  destination: { navigationId: string; entities: Record<string, string> };
};

export type NavigationResult = {
  state: NavigationState;
  instruction?: NavigationInstruction;
  message?: string;
  choices?: readonly { id: string; label: string; instruction: NavigationInstruction }[];
};

export type OfficeNavigationInstruction = {
  version: 1;
  operation: 'NAVIGATE';
  destination: { navigationId: string; entities: Record<string, string> };
};

export type OfficeNavigationResult = {
  state: NavigationState;
  instruction?: OfficeNavigationInstruction;
  message?: string;
};

export const officeNavigationRegistry = [
  ['office.attention', 'Overview', 'attention'], ['office.rooms', 'Rooms', 'rooms'], ['office.rooms.inventory', 'Room inventory', 'inventory'], ['office.rooms.maintenance', 'Room maintenance', 'maintenance'],
  ['office.tenancies', 'Tenancies', 'tenancies'], ['office.tenancies.people', 'Tenancy people', 'people'], ['office.tenancies.leads', 'Tenancy leads', 'leads'],
  ['office.maintenance', 'Maintenance', 'maintenance'], ['office.maintenance.rooms', 'Maintenance rooms', 'rooms'], ['office.maintenance.assets', 'Maintenance assets', 'inventory'],
  ['office.leads', 'Leads', 'leads'], ['office.leads.people', 'Lead people', 'people'], ['office.calendar', 'Calendar', 'calendar'], ['office.calendar.tenancies', 'Calendar tenancies', 'tenancies'], ['office.calendar.rooms', 'Calendar rooms', 'rooms'],
  ['office.documents', 'Documents', 'documents'], ['office.documents.people', 'People documents', 'people'], ['office.documents.tenancies', 'Tenancy documents', 'tenancies'],
  ['office.utilities', 'Utilities', 'utilities'], ['office.utilities.rooms', 'Room utilities', 'rooms'], ['office.utilities.tenancies', 'Tenancy utilities', 'tenancies'],
  ['office.money', 'Money', 'money'], ['office.money.tenancies', 'Tenancy money', 'tenancies'], ['office.money.utilities', 'Utility money', 'utilities'], ['office.content', 'Content', 'content'], ['office.content.documents', 'Content documents', 'documents'],
  ['office.messages', 'Messaging', 'messages'], ['office.messages.normalization', 'Messaging normalization', 'normalization-lab'], ['office.analytics', 'Analytics', 'analytics'], ['office.settings', 'Settings', 'settings'],
] as const;

export const navigationRegistry: readonly NavigationDestination[] = [
  { id: 'listing', label: 'Listing', aliases: ['listing', 'rooms', 'room', 'stanze', 'camera'], requiredParams: [], page: 'LISTING' },
  { id: 'listing.room.details', parentId: 'listing', label: 'Room details', aliases: ['room details', 'room', 'details', 'dettagli', 'camera'], entityType: 'room', requiredParams: ['roomId'], page: 'LISTING', panel: 'details' },
  { id: 'listing.room.occupancy', parentId: 'listing.room.details', label: 'Room occupancy', aliases: ['occupancy', 'status', 'occupazione', 'stato'], entityType: 'room', requiredParams: ['roomId'], page: 'LISTING', panel: 'occupancy' },
  { id: 'listing.room.operations', parentId: 'listing.room.details', label: 'Room operations', aliases: ['operations', 'operazioni', 'maintenance', 'housekeeping'], entityType: 'room', requiredParams: ['roomId'], page: 'LISTING', panel: 'operations' },
  { id: 'people', label: 'People', aliases: ['people', 'person', 'persons', 'contacts', 'persone', 'contatti'], requiredParams: [], page: 'PEOPLE' },
  { id: 'people.person.details', parentId: 'people', label: 'Person details', aliases: ['profile', 'person details', 'dossier', 'profilo', 'dettagli'], entityType: 'person', requiredParams: ['personId'], page: 'PEOPLE', panel: 'relationship' },
  { id: 'today', label: 'Today', aliases: ['today', 'dashboard', 'attention', 'oggi', 'attività'], requiredParams: [], page: 'TODAY' },
  { id: 'calendar', label: 'Calendar', aliases: ['calendar', 'events', 'date', 'calendario', 'eventi'], requiredParams: [], page: 'CALENDAR' },
  { id: 'calendar.events', parentId: 'calendar', label: 'Calendar events', aliases: ['events', 'event', 'appointments', 'appuntamenti', 'eventi'], entityType: 'date', requiredParams: ['date'], page: 'CALENDAR', panel: 'events' },
  { id: 'services', label: 'Services', aliases: ['services', 'service', 'operations', 'servizi', 'operazioni'], requiredParams: [], page: 'SERVICES' },
  { id: 'services.room', parentId: 'services', label: 'Room services', aliases: ['room services', 'services for room', 'servizi camera'], entityType: 'room', requiredParams: ['roomId'], page: 'SERVICES', panel: 'services' },
];

const normalize = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[·•–—_/-]+/g, ' ').replace(/[^a-z0-9\s:]/g, ' ').replace(/\s+/g, ' ').trim();
const compact = (value: string) => normalize(value).replace(/\s/g, '');

export function normalizeCommand(value: string): string { return normalize(value); }

function roomMatches(query: string, room: RoomFixture): boolean {
  const candidates = [room.id, room.displayId ?? '', room.unit, room.unit.replace(/^U-/i, '')].filter(Boolean).map(compact);
  const compactQuery = compact(query);
  return candidates.some((candidate) => candidate.length > 0 && (compactQuery.includes(candidate) || candidate.includes(compactQuery)));
}

function personMatches(query: string, person: PersonFixture): boolean {
  const normalizedQuery = normalize(query);
  const name = normalize(person.name);
  if (normalizedQuery.includes(name)) return true;
  const words = name.split(' ').filter((word) => word.length >= 4);
  return words.some((word) => new RegExp(`\\b${word}\\b`, 'u').test(normalizedQuery));
}

const destination = (id: string) => navigationRegistry.find((item) => item.id === id);
const instruction = (id: string, entities: Record<string, string> = {}): NavigationInstruction => ({ version: 1, operation: 'NAVIGATE', destination: { navigationId: id, entities } });

function hasAny(query: string, aliases: readonly string[]) { return aliases.some((alias) => query.includes(normalize(alias))); }

const mutationVerbPattern = /\b(?:change|edit|modify|create|delete|send|pay|save|schedule|record|register|add|update|remove|archive|post|refund|settle|submit|assign|mark|complete|close|cambia|modifica|crea|elimina|invia|paga|salva|prenota|registra|aggiungi|aggiorna|rimuovi|archivia|segna|completa|chiudi)\b/u;
const mutationIntent = (query: string) => mutationVerbPattern.test(query);
const roomReference = (query: string) => hasAny(query, ['room', 'rooms', 'listing', 'stanze', 'stanza', 'camera']) && /\b(?:br\s*\d{1,3}|(?:u\s*)?\d{3,4}[a-z]?)\b/u.test(query);
const genericPeopleRequest = (query: string) => /^(?:(?:open|show|view|go to|take me to|apri|mostrami|vai a|portami a)\s+)?(?:people|persons?|contacts?|persone|contatti|persona)$/u.test(query);
const personReference = (query: string) => hasAny(query, ['people', 'person', 'persons', 'contact', 'contacts', 'persone', 'persona', 'contatti']) && !genericPeopleRequest(query);

export function validateNavigationInstruction(value: unknown): NavigationResult {
  if (!value || typeof value !== 'object') return { state: 'ERROR', message: 'Invalid navigation instruction.' };
  const candidate = value as Partial<NavigationInstruction>;
  if (candidate.version !== 1 || candidate.operation !== 'NAVIGATE' || !candidate.destination || typeof candidate.destination.navigationId !== 'string') return { state: 'ERROR', message: 'Invalid navigation instruction.' };
  const found = destination(candidate.destination.navigationId);
  if (!found) return { state: 'NOT_FOUND', message: 'Destination not found.' };
  const entities = candidate.destination.entities;
  if (!entities || typeof entities !== 'object' || found.requiredParams.some((key) => typeof entities[key] !== 'string' || !entities[key])) return { state: 'ERROR', message: 'Required navigation context is missing.' };
  return { state: 'RESOLVED', instruction: instruction(found.id, entities as Record<string, string>) };
}

export function resolveCommand(value: string, data: { rooms: readonly RoomFixture[]; people: readonly PersonFixture[] }): NavigationResult {
  const query = normalize(value);
  if (!query) return { state: 'NOT_FOUND', message: 'Enter a destination.' };
  if (mutationIntent(query)) return { state: 'UNSUPPORTED', message: 'Monique only navigates. No changes were made.' };

  const matchedRooms = data.rooms.filter((room) => roomMatches(query, room));
  const matchedPeople = data.people.filter((person) => personMatches(query, person));
  const room = matchedRooms.length === 1 ? matchedRooms[0] : undefined;
  const person = matchedPeople.length === 1 ? matchedPeople[0] : undefined;
  if (matchedRooms.length > 1 || matchedPeople.length > 1) {
    const choices = [...matchedRooms.map((item) => ({ id: item.id, label: item.displayId ?? item.id, instruction: instruction('listing.room.details', { roomId: item.id }) })), ...matchedPeople.map((item) => ({ id: item.id, label: item.name, instruction: instruction('people.person.details', { personId: item.id }) }))];
    return { state: 'AMBIGUOUS', message: 'Choose a destination.', choices };
  }

  if (room) {
    if (hasAny(query, ['operations', 'operazione', 'operazioni'])) return { state: 'RESOLVED', instruction: instruction('listing.room.operations', { roomId: room.id }) };
    if (hasAny(query, ['service', 'services', 'maintenance', 'housekeeping', 'servizi'])) return { state: 'RESOLVED', instruction: instruction('services.room', { roomId: room.id }) };
    if (hasAny(query, ['dues', 'rent', 'finance', 'financial', 'utilities', 'internet', 'contract', 'contracts', 'document', 'documents', 'affitto', 'finanze', 'utenze', 'contratto'])) return { state: 'UNSUPPORTED', message: 'That room subsection is not a verified destination in the current mobile navigation.' };
    const target = hasAny(query, ['occupancy', 'status', 'occupazione', 'stato']) ? 'listing.room.occupancy' : hasAny(query, ['operations', 'operazioni']) ? 'listing.room.operations' : 'listing.room.details';
    return { state: 'RESOLVED', instruction: instruction(target, { roomId: room.id }) };
  }
  if (person) {
    if (hasAny(query, ['contract', 'contracts', 'finance', 'financial', 'document', 'documents', 'contratto', 'finanze'])) return { state: 'UNSUPPORTED', message: 'That person subsection is not a verified destination in the current mobile navigation.' };
    return { state: 'RESOLVED', instruction: instruction('people.person.details', { personId: person.id }) };
  }

  if (roomReference(query)) return { state: 'UNKNOWN_ENTITY', message: 'Unknown room or unit.' };
  if (personReference(query)) return { state: 'UNKNOWN_ENTITY', message: 'Unknown person.' };

  const dateMatch = query.match(/\b(20\d{2}-\d{2}-\d{2})\b/u);
  if (dateMatch && hasAny(query, ['calendar', 'event', 'events', 'calendario', 'evento', 'eventi'])) return { state: 'RESOLVED', instruction: instruction('calendar.events', { date: dateMatch[1] }) };
  if (hasAny(query, ['calendar', 'event', 'events', 'calendario', 'evento', 'eventi', 'date'])) return { state: 'RESOLVED', instruction: instruction('calendar') };
  if (hasAny(query, ['today', 'dashboard', 'attention', 'oggi'])) return { state: 'RESOLVED', instruction: instruction('today') };
  if (hasAny(query, ['people', 'person', 'contacts', 'persone', 'contatti'])) return { state: 'RESOLVED', instruction: instruction('people') };
  if (hasAny(query, ['services', 'service', 'servizi'])) return { state: 'RESOLVED', instruction: instruction('services') };
  if (hasAny(query, ['listing', 'rooms', 'room', 'stanze', 'camera'])) return { state: 'RESOLVED', instruction: instruction('listing') };
  if (hasAny(query, ['dues', 'rent', 'finance', 'financial', 'utilities', 'internet', 'contract', 'contracts', 'document', 'documents', 'affitto', 'finanze', 'utenze', 'internet', 'contratto'])) return { state: 'UNSUPPORTED', message: 'That section is not a verified destination in the current mobile navigation.' };
  return { state: 'NOT_FOUND', message: 'Destination not found.' };
}

export function destinationForInstruction(value: NavigationInstruction): NavigationDestination | undefined { return destination(value.destination.navigationId); }

export function resolveOfficeCommand(value: string, data: { rooms: readonly RoomFixture[]; people: readonly PersonFixture[] }): OfficeNavigationResult {
  const query = normalize(value);
  if (!query) return { state: 'NOT_FOUND', message: 'Enter a destination.' };
  if (mutationIntent(query)) return { state: 'UNSUPPORTED', message: 'Monique only navigates. No changes were made.' };
  const matchedRooms = data.rooms.filter((room) => roomMatches(query, room));
  const matchedPeople = data.people.filter((person) => personMatches(query, person));
  if (matchedRooms.length > 1 || matchedPeople.length > 1) return { state: 'AMBIGUOUS', message: 'Choose a unique entity.' };
  const room = matchedRooms[0]; const person = matchedPeople[0];
  const officeInstruction = (id: string, entities: Record<string, string> = {}): OfficeNavigationResult => ({ state: 'RESOLVED', instruction: { version: 1, operation: 'NAVIGATE', destination: { navigationId: id, entities } } });
  if (room) {
    if (hasAny(query, ['internet'])) return officeInstruction('office.utilities', { unitId: room.id, panel: 'INTERNET' });
    if (hasAny(query, ['utilities', 'utility', 'utenze'])) return officeInstruction('office.utilities', { unitId: room.id });
    if (hasAny(query, ['dues', 'rent', 'finance', 'financial', 'money', 'affitto', 'finanze'])) return { state: 'UNSUPPORTED', message: 'The current Money screen has no verified room-specific selection.' };
    if (hasAny(query, ['contract', 'contracts', 'tenancy', 'lease', 'contratto', 'contratti'])) return officeInstruction('office.tenancies', { unitId: room.id, panel: 'TERMS' });
    if (hasAny(query, ['document', 'documents', 'documenti'])) return { state: 'UNSUPPORTED', message: 'The current Documents screen has no verified room-specific selection.' };
    if (hasAny(query, ['housekeeping'])) return officeInstruction('office.maintenance', { unitId: room.id, panel: 'HOUSEKEEPING' });
    if (hasAny(query, ['service', 'services', 'maintenance', 'servizi', 'operazioni'])) return officeInstruction('office.maintenance', { unitId: room.id, panel: 'MAINTENANCE' });
    return officeInstruction('office.rooms', { unitId: room.id });
  }
  if (person) {
    if (hasAny(query, ['contract', 'contracts', 'tenancy', 'lease', 'contratto', 'contratti'])) return officeInstruction('office.tenancies', { personId: person.id, panel: 'TERMS' });
    if (hasAny(query, ['document', 'documents', 'documenti'])) return { state: 'UNSUPPORTED', message: 'The current Documents screen has no verified person-specific selection.' };
    return officeInstruction('office.tenancies.people', { personId: person.id });
  }
  if (roomReference(query)) return { state: 'UNKNOWN_ENTITY', message: 'Unknown room or unit.' };
  if (personReference(query)) return { state: 'UNKNOWN_ENTITY', message: 'Unknown person.' };
  if (hasAny(query, ['calendar', 'event', 'events', 'calendario', 'evento', 'eventi'])) return officeInstruction('office.calendar');
  if (hasAny(query, ['utilities', 'utility', 'internet', 'utenze'])) return officeInstruction('office.utilities');
  if (hasAny(query, ['finance', 'financial', 'money', 'dues', 'rent', 'finanze', 'affitto'])) return officeInstruction('office.money');
  if (hasAny(query, ['document', 'documents', 'documenti'])) return officeInstruction('office.documents');
  if (hasAny(query, ['service', 'services', 'maintenance', 'housekeeping', 'servizi'])) return officeInstruction('office.maintenance');
  if (hasAny(query, ['people', 'person', 'contacts', 'persone', 'contatti'])) return officeInstruction('office.tenancies.people');
  if (hasAny(query, ['today', 'dashboard', 'attention', 'overview', 'oggi'])) return officeInstruction('office.attention');
  if (hasAny(query, ['rooms', 'room', 'listing', 'stanze', 'camera'])) return officeInstruction('office.rooms');
  if (hasAny(query, ['messages', 'messaging', 'normalization', 'messaggi'])) return officeInstruction('office.messages');
  if (hasAny(query, ['analytics', 'analisi'])) return officeInstruction('office.analytics');
  if (hasAny(query, ['settings', 'impostazioni'])) return officeInstruction('office.settings');
  return { state: 'NOT_FOUND', message: 'Destination not found.' };
}
