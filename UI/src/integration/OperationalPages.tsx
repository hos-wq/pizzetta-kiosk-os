import { useMemo, useState } from 'react';
import { CalendarPager } from '../components/CalendarPager';
import type { CalendarDayEvent } from '../components/CalendarDayDetails';
import { ActionButton } from '../components/ActionControls';
import { ContextTabs } from '../components/ContextTabs';
import { CreateAction } from '../components/CreateAction';
import { NestedPathMenu, type NestedPathNode } from '../components/NestedPathMenu';
import { PersonRow } from '../components/PersonRow';
import { RoomCard } from '../components/RoomCard';
import { SearchField } from '../components/SearchField';
import { SelectField } from '../components/SelectField';
import { TaskCard } from '../components/TaskCard';
import { UniversalField } from '../components/UniversalField';
import type { PersonFixture, RoomFixture, TaskFixture } from '../fixtures';
import { roomImageCatalog } from '../design-system/roomImageCatalog';
import { ThemePageLayout, type ThemePageKey } from '../layouts/ThemePageLayout';
import { destinationForInstruction, resolveCommand, type NavigationInstruction } from '../monique/navigation';

export type OperationalPageData = {
  rooms: readonly RoomFixture[];
  people: readonly PersonFixture[];
  tasks: readonly TaskFixture[];
  events: readonly (CalendarDayEvent & { date?: string })[];
  serviceNodes: Readonly<Record<string, readonly NestedPathNode[]>>;
  onCreatePerson?: (displayName: string) => Promise<void>;
  onCreateServiceTask?: (roomId: string, actionId: string) => Promise<void>;
  loadState?: 'loading' | 'ready' | 'empty' | 'error';
  statusMessage?: string;
  roomDetails?: Readonly<Record<string, OperationalRoomDetailData>>;
  onLoadRoomDetails?: (roomId: string) => Promise<void>;
  onSaveRoomField?: (roomId: string, fieldKey: string, value: string) => Promise<void>;
};

export type OperationalRoomDetailData = { listing?: Record<string, unknown>; tenant?: Record<string, unknown>; utilities?: Record<string, unknown>; room?: Record<string, unknown>; loadState: 'loading' | 'ready' | 'partial' | 'error' };

type Props = { data: OperationalPageData };

export function OperationalPages({ data }: Props) {
  const initialParams = new URLSearchParams(window.location.search);
  const initialNavigation = initialParams.get('nav');
  const initialPage = initialNavigation?.startsWith('people') ? 'PEOPLE' : initialNavigation?.startsWith('today') ? 'TODAY' : initialNavigation?.startsWith('calendar') ? 'CALENDAR' : initialNavigation?.startsWith('services') ? 'SERVICES' : initialNavigation?.startsWith('financial') ? 'FINANCIAL' : 'LISTING';
  const storedPage = window.localStorage.getItem('br-os:last-page') as ThemePageKey | null;
  const [page, setPage] = useState<ThemePageKey>(initialNavigation ? initialPage as ThemePageKey : storedPage ?? initialPage as ThemePageKey);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(initialParams.get('roomId'));
  const initialRoomPanel = initialNavigation?.endsWith('.occupancy') ? ['room', 'occupancy'] : initialNavigation?.endsWith('.operations') ? ['room', 'operations'] : null;
  const storedRoomPanels = JSON.parse(window.localStorage.getItem('br-os:last-room-panels') ?? '{}') as Record<string, string[]>;
  const [selectedRoomPanel, setSelectedRoomPanel] = useState<string[] | null>(initialRoomPanel ?? (initialParams.get('roomId') ? storedRoomPanels[initialParams.get('roomId') ?? ''] ?? null : null));
  const [selectedPerson, setSelectedPerson] = useState<string | null>(initialParams.get('personId'));
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [todayCategory, setTodayCategory] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(initialParams.get('date') ?? new Date().toISOString().slice(0, 10));
  const [moniqueOpen, setMoniqueOpen] = useState(false);
  const [moniqueValue, setMoniqueValue] = useState('');
  const [moniqueMessage, setMoniqueMessage] = useState('');
  const [moniqueChoices, setMoniqueChoices] = useState<readonly { id: string; label: string }[]>([]);
  const [createPersonOpen, setCreatePersonOpen] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [createMessage, setCreateMessage] = useState('');
  const [creatingService, setCreatingService] = useState<string | null>(null);
  const [addFieldContext, setAddFieldContext] = useState<{ roomId: string; nodeId: string } | null>(null);
  const [addFieldKey, setAddFieldKey] = useState('');
  const [addFieldValue, setAddFieldValue] = useState('');
  const [addFieldState, setAddFieldState] = useState<'idle' | 'saving' | 'error'>('idle');

  const rememberPage = (next: ThemePageKey) => { setPage(next); window.localStorage.setItem('br-os:last-page', next); };
  const lastRoomPanel = (roomId: string) => { const current = JSON.parse(window.localStorage.getItem('br-os:last-room-panels') ?? '{}') as Record<string, string[]>; return current[roomId] ?? null; };
  const rememberRoomPanel = (roomId: string, path: string[] | null) => { setSelectedRoomPanel(path); const current = JSON.parse(window.localStorage.getItem('br-os:last-room-panels') ?? '{}') as Record<string, string[]>; if (path) current[roomId] = path; else delete current[roomId]; window.localStorage.setItem('br-os:last-room-panels', JSON.stringify(current)); };
  const openPerson = (personId: string) => { rememberPage('PEOPLE'); setSelectedPerson(personId); const params = new URLSearchParams({ nav: 'people.person.details', personId }); window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`); };
  const openCalendarDate = (value: unknown) => { const date = String(value ?? '').slice(0, 10); if (!date) return; rememberPage('CALENDAR'); setSelectedDate(date); const params = new URLSearchParams({ nav: 'calendar.day', date }); window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`); };
  const openRoomFromCalendar = (roomId: string) => { rememberPage('LISTING'); setSelectedRoom(roomId); rememberRoomPanel(roomId, ['tenant', 'contract']); void data.onLoadRoomDetails?.(roomId); const params = new URLSearchParams({ nav: 'listing.room.contract', roomId }); window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`); };

  const filteredPeople = useMemo(() => data.people.filter((person) => `${person.name} ${person.role} ${person.room}`.toLowerCase().includes(search.toLowerCase())), [data.people, search]);
  const filteredTasks = todayCategory === 'ALL' ? data.tasks : data.tasks.filter((task) => task.category === todayCategory);
  const todayLabel = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', weekday: 'long' }).format(new Date(`${selectedDate}T00:00:00`));

  const applyNavigation = (next: NavigationInstruction) => {
    const target = destinationForInstruction(next);
    if (!target) return;
    const entities = next.destination.entities;
    rememberPage(target.page);
    if (target.entityType === 'room') setSelectedRoom(entities.roomId ?? null);
    if (target.entityType === 'room') rememberRoomPanel(entities.roomId ?? '', target.panel === 'occupancy' || target.panel === 'operations' ? ['room', target.panel] : null);
    if (target.entityType === 'person') setSelectedPerson(entities.personId ?? null);
    if (target.entityType === 'date' && entities.date) setSelectedDate(entities.date);
    const params = new URLSearchParams(); params.set('nav', target.id); Object.entries(entities).forEach(([key, value]) => params.set(key, value));
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    setMoniqueMessage(''); setMoniqueChoices([]); setMoniqueOpen(false);
  };
  const resolveMonique = () => {
    const result = resolveCommand(moniqueValue, { rooms: data.rooms, people: data.people });
    setMoniqueChoices(result.choices?.map(({ id, label }) => ({ id, label })) ?? []);
    if (result.instruction) applyNavigation(result.instruction); else setMoniqueMessage(result.message ?? result.state);
  };
  const selectMoniqueChoice = (id: string) => {
    const room = data.rooms.find((item) => item.id === id);
    if (room) { applyNavigation({ version: 1, operation: 'NAVIGATE', destination: { navigationId: 'listing.room.details', entities: { roomId: room.id } } }); return; }
    const person = data.people.find((item) => item.id === id);
    if (person) applyNavigation({ version: 1, operation: 'NAVIGATE', destination: { navigationId: 'people.person.details', entities: { personId: person.id } } });
  };

  const renderLeaf = (label: string, name: string, value = '') => <UniversalField label={label} name={name} onChange={() => undefined} readOnly={Boolean(value)} value={value} />;
  const renderRoomLeaf = (room: RoomFixture, node: NestedPathNode) => {
    const detail = data.roomDetails?.[room.id];
    const listing = detail?.listing ?? {};
    const roomData = detail?.room ?? {};
    const roomFeatures = Array.isArray(roomData.features) ? roomData.features.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')) : [];
    const fields = Array.isArray(listing.fields) ? listing.fields.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')) : [];
    const values: Array<[string, string, (() => void) | undefined]> = [];
    const add = (label: string, value: unknown, action?: () => void) => { if (value == null || String(value).trim() === '') return; values.push([label, String(value), action]); };
    const addFeature = (feature: Record<string, unknown>) => { const key = String(feature.feature_key ?? ''); const value = feature.feature_value; if (!key || value == null || String(value).trim() === '') return; const display = String(value) === 'true' ? 'YES' : String(value) === 'false' ? 'NO' : String(value); add(key.replaceAll('_', ' ').toUpperCase(), display); };
    const unit = listing.unit && typeof listing.unit === 'object' ? listing.unit as Record<string, unknown> : {};
    if (node.id === 'general') { add('BR IDENTIFIER', room.displayId ?? room.id); add('UNIT', room.unit); add('ROOM TYPE', roomData.room_type ?? unit.type); add('AREA', unit.sqm == null ? null : `${String(unit.sqm)} m²`); add('FLOOR', unit.floor); add('ORIENTATION', roomData.orientation); add('VIEW', roomData.view_description ?? roomData.view_classification); add('OCCUPANCY', room.occupancy === 'READY' ? 'VACANT' : room.occupancy); }
    else if (['amenities', 'building'].includes(node.id)) { const category = node.id === 'amenities' ? 'ROOM_AMENITIES' : 'ROOM_BUILDING'; for (const field of fields.filter(item => String(item.category) === category)) add(String(field.label ?? field.key), field.value); if (node.id === 'amenities') for (const feature of roomFeatures) addFeature(feature); if (node.id === 'building') { add('BUILDING', roomData.building); add('ADDRESS', roomData.address); } }
    else if (['personal', 'contract', 'finance', 'documents'].includes(node.id)) { const workspace = detail?.tenant ?? {}; const person = workspace.person && typeof workspace.person === 'object' ? workspace.person as Record<string, unknown> : {}; const tenancy = workspace.tenancy && typeof workspace.tenancy === 'object' ? workspace.tenancy as Record<string, unknown> : {}; const currentContract = workspace.current_contract && typeof workspace.current_contract === 'object' ? workspace.current_contract as Record<string, unknown> : tenancy; if (!workspace.tenancy) add('TENANCY', 'NO ACTIVE OR UPCOMING TENANCY'); else if (node.id === 'personal') { add('NAME', person.display_name ?? [person.first_name, person.last_name].filter(Boolean).join(' '), person.id ? () => openPerson(String(person.id)) : undefined); add('PERSON ID', person.id, person.id ? () => openPerson(String(person.id)) : undefined); add('PHONE', person.phone); add('EMAIL', person.email); const identities = Array.isArray(workspace.person && typeof workspace.person === 'object' ? (workspace.person as Record<string, unknown>).identities : null) ? (workspace.person as Record<string, unknown>).identities as Array<Record<string, unknown>> : []; for (const identity of identities) add(String(identity.platform ?? 'CONTACT').toUpperCase(), identity.external_id); } else if (node.id === 'contract') { add('STATUS', tenancy.status); add('START DATE', currentContract.start_date ?? tenancy.start_at, () => openCalendarDate(currentContract.start_date ?? tenancy.start_at)); add('LAST OCCUPIED', currentContract.last_occupied_date, () => openCalendarDate(currentContract.last_occupied_date)); add('END DATE', currentContract.end_exclusive ?? tenancy.end_at, () => openCalendarDate(currentContract.end_exclusive ?? tenancy.end_at)); add('CONTRACT VERSION', currentContract.version_number); } else if (node.id === 'finance') { const money = (value: unknown) => value == null ? null : `₱${(Number(value) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`; add('MONTHLY RENT', money(currentContract.monthly_rent_centavos ?? tenancy.monthly_rent_centavos)); add('SECURITY DEPOSIT', money(currentContract.deposit_centavos ?? tenancy.security_deposit_centavos)); add('PAYMENT DUE DAY', currentContract.monthly_due_day ?? tenancy.payment_due_day); add('EXPECTED PAYMENT DAY', currentContract.expected_payment_day); const facts = Array.isArray(workspace.financial_facts) ? workspace.financial_facts : []; for (const fact of facts as Array<Record<string, unknown>>) add(String(fact.fact_type ?? 'FINANCIAL FACT').replaceAll('_', ' '), money(fact.amount_centavos)); } else { const requirements = Array.isArray(workspace.document_requirements) ? workspace.document_requirements : []; if (!requirements.length) add('DOCUMENTS', 'NO DOCUMENT REQUIREMENTS RECORDED'); for (const requirement of requirements as Array<Record<string, unknown>>) add(String(requirement.document_key ?? 'DOCUMENT').replaceAll('_', ' '), requirement.status); } }
    else if (['water', 'electricity', 'internet'].includes(node.id)) { const utilityType = node.id.toUpperCase(); const services = Array.isArray(detail?.utilities?.services) ? detail.utilities.services : []; const service = services.find(item => String((item as Record<string, unknown>).utility_type) === utilityType) as Record<string, unknown> | undefined; add('UTILITY', utilityType); add('SERVICE', service ? `${String(service.provider ?? 'PROVIDER NOT RECORDED')} · ${String(service.billing ?? 'BILLING NOT RECORDED')}` : 'NOT CONFIGURED'); if (service) add('MONTHLY COST', service.monthly_cost_centavos == null ? null : `₱${(Number(service.monthly_cost_centavos) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`); }
    else if (['maintenance', 'housekeeping'].includes(node.id)) { add('STATUS', node.id === 'maintenance' ? room.maintenance : room.housekeeping); add('TENANCY', room.tenancySummary); }
    else if (['rent', 'payments', 'policies'].includes(node.id)) { const category = node.id === 'rent' ? 'TERMS_RENT_DURATION' : node.id === 'payments' ? 'TERMS_PAYMENT_TERMS' : 'TERMS_HOUSE_RULES'; for (const field of fields.filter(item => String(item.category) === category || (node.id === 'policies' && String(item.category) === 'TERMS_CONTRACT_REQUIREMENTS'))) add(String(field.label ?? field.key), field.value); }
    const available = availableRoomFields(room, node.id);
    return <div className="nested-field-panel" aria-label={`${room.id} ${node.label} fields`}><div className="nested-field-panel-heading"><span>{node.label}</span>{available.length && data.onSaveRoomField ? <CreateAction controls={`add-${room.id}-${node.id}`} expanded={addFieldContext?.roomId === room.id && addFieldContext.nodeId === node.id} label={`Add field to ${room.displayId ?? room.id} ${node.label}`} onClick={(event) => { event.stopPropagation(); openAddField(room, node); }} /> : null}</div><div className="br-listing-fields">{values.map(([label, value, action], index) => <UniversalField key={`${label}-${index}`} label={label} name={`room-${room.id}-${node.id}-${index}`} onChange={() => undefined} onValueClick={action} readOnly value={value} />)}</div>{renderAddFieldEditor(room, node)}</div>;
  };
  const roomFieldCategory = (nodeId: string) => nodeId === 'room' || nodeId === 'general' ? 'ROOM_GENERAL' : nodeId === 'amenities' ? 'ROOM_AMENITIES' : nodeId === 'building' ? 'ROOM_BUILDING' : nodeId === 'terms' ? 'TERMS_' : nodeId === 'rent' ? 'TERMS_RENT_DURATION' : nodeId === 'payments' ? 'TERMS_PAYMENT_TERMS' : nodeId === 'policies' ? 'TERMS_' : null;
  const availableRoomFields = (room: RoomFixture, nodeId: string) => { const detail = data.roomDetails?.[room.id]; const listing = detail?.listing ?? {}; const fields = Array.isArray(listing.fields) ? listing.fields.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')) : []; const category = roomFieldCategory(nodeId); return fields.filter(field => { const fieldCategory = String(field.category ?? ''); const missing = field.value == null || String(field.value).trim() === ''; return Boolean(category && missing && (category.endsWith('_') ? fieldCategory.startsWith(category) : fieldCategory === category)); }); };
  const openAddField = (room: RoomFixture, node: NestedPathNode) => { const available = availableRoomFields(room, node.id); if (!available.length) return; setAddFieldContext({ roomId: room.id, nodeId: node.id }); setAddFieldKey(String(available[0].key)); setAddFieldValue(''); setAddFieldState('idle'); };
  const saveAddedField = async () => { if (!addFieldContext || !addFieldKey.trim() || !data.onSaveRoomField) return; setAddFieldState('saving'); try { await data.onSaveRoomField(addFieldContext.roomId, addFieldKey, addFieldValue); setAddFieldContext(null); setAddFieldKey(''); setAddFieldValue(''); setAddFieldState('idle'); } catch { setAddFieldState('error'); } };
  const renderAddFieldEditor = (room: RoomFixture, node: NestedPathNode) => { const available = availableRoomFields(room, node.id); if (!addFieldContext || addFieldContext.roomId !== room.id || addFieldContext.nodeId !== node.id || !available.length) return null; return <div className="page-inline-create nested-field-create" id={`add-${room.id}-${node.id}`}><SelectField label="FIELD" options={available.map(field => String(field.label ?? field.key))} value={String(available.find(field => String(field.key) === addFieldKey)?.label ?? '')} onChange={label => { const field = available.find(item => String(item.label ?? item.key) === label); setAddFieldKey(String(field?.key ?? '')); }} /><UniversalField label="VALUE" name={`add-value-${room.id}-${node.id}`} onChange={setAddFieldValue} value={addFieldValue} /><ActionButton disabled={addFieldState === 'saving' || !addFieldKey || !addFieldValue.trim()} onClick={() => void saveAddedField()}>{addFieldState === 'saving' ? 'SAVING' : 'SAVE'}</ActionButton>{addFieldState === 'error' && <p role="alert">FIELD COULD NOT BE SAVED</p>}</div>; };
  const emptyState = (label: string) => <div className="calendar-day-empty" role="status">{label}</div>;
  const roomState = data.loadState === 'loading' ? 'LOADING OPERATIONAL DATA' : data.loadState === 'error' ? 'ROOM DATA UNAVAILABLE' : 'NO ROOMS';
  const createServiceTask = async (roomId: string, actionId: string) => {
    if (!data.onCreateServiceTask) return;
    setCreatingService(`${roomId}:${actionId}`); setCreateMessage('');
    try { await data.onCreateServiceTask(roomId, actionId); setCreateMessage('SERVICE TASK CREATED'); } catch (error) { setCreateMessage(error instanceof Error ? error.message : 'SERVICE TASK FAILED'); } finally { setCreatingService(null); }
  };
  const serviceNodes = [...(data.serviceNodes.ALL ?? [])];

  return <main aria-label="BR OS operational pages" className="theme-application-root"><ThemePageLayout activePage={page} moniqueMessage={moniqueMessage} moniqueChoices={moniqueChoices} onMoniqueChoice={selectMoniqueChoice} moniqueOpen={moniqueOpen} moniqueValue={moniqueValue} onMoniqueChange={setMoniqueValue} onMoniqueClose={() => setMoniqueOpen(false)} onMoniqueOpen={() => setMoniqueOpen((open) => !open)} onMoniqueSend={resolveMonique} onPageChange={(next) => { rememberPage(next); setMoniqueChoices([]); }} presentation="application">
    {data.loadState === 'loading' && emptyState('LOADING OPERATIONAL DATA')}
    {data.loadState === 'error' && emptyState(data.statusMessage ?? 'ROOM DATA UNAVAILABLE')}
    {page === 'LISTING' && data.loadState !== 'loading' && data.loadState !== 'error' && <div className="page-mockup-grid page-listing-grid">{data.rooms.length ? data.rooms.map((room) => <div className="page-entity-stack" key={room.id}><RoomCard image={roomImageCatalog[room.id]} onOpen={(item) => { if (selectedRoom === item.id) { setSelectedRoom(null); return; } setSelectedRoom(item.id); rememberRoomPanel(item.id, lastRoomPanel(item.id)); void data.onLoadRoomDetails?.(item.id); }} room={room} selected={selectedRoom === room.id} />{selectedRoom === room.id && <div className="inline-page-detail"><NestedPathMenu ariaLabel={`${room.id} room menu`} initialOpenPath={selectedRoomPanel ?? []} onLeafOpen={(_node, path) => rememberRoomPanel(room.id, path)} nodes={[{ id: 'room', label: 'ROOM', children: [{ id: 'general', label: 'GENERAL' }, { id: 'amenities', label: 'AMENITIES' }, { id: 'building', label: 'BUILDING' }] }, { id: 'tenant', label: 'TENANT', children: [{ id: 'personal', label: 'PERSONAL' }, { id: 'contract', label: 'CONTRACT' }, { id: 'finance', label: 'FINANCE' }, { id: 'documents', label: 'DOCUMENTS' }] }, { id: 'utilities', label: 'UTILITIES', children: [{ id: 'water', label: 'WATER' }, { id: 'electricity', label: 'ELECTRICITY' }, { id: 'internet', label: 'INTERNET' }] }, { id: 'operations', label: 'OPERATIONS', children: [{ id: 'maintenance', label: 'MAINTENANCE' }, { id: 'housekeeping', label: 'HOUSEKEEPING' }] }, { id: 'terms', label: 'TERMS', children: [{ id: 'rent', label: 'RENT' }, { id: 'payments', label: 'PAYMENTS' }, { id: 'policies', label: 'POLICIES' }] }]} renderLeaf={(node) => renderRoomLeaf(room, node)} /></div>}</div>) : emptyState(roomState)}</div>}
    {page === 'PEOPLE' && <><div className="page-create-row">{data.onCreatePerson && <CreateAction controls="operational-person-create" expanded={createPersonOpen} label="Add contact" onClick={() => { setCreatePersonOpen((open) => !open); setCreateMessage(''); }} />}</div>{createPersonOpen && data.onCreatePerson && <div className="page-inline-create" id="operational-person-create"><UniversalField label="CONTACT" name="operational-person-name" onChange={setNewPersonName} required value={newPersonName} /><ActionButton disabled={!newPersonName.trim()} onClick={() => void data.onCreatePerson?.(newPersonName.trim()).then(() => { setNewPersonName(''); setCreatePersonOpen(false); setCreateMessage('CONTACT CREATED'); }).catch((error: unknown) => setCreateMessage(error instanceof Error ? error.message : 'CONTACT CREATION FAILED'))}>SAVE</ActionButton></div>}<SearchField label="SEARCH PEOPLE" name="operational-people-search" onChange={setSearch} value={search} /><div className="page-mockup-list">{filteredPeople.length ? filteredPeople.map((person) => <div className="page-entity-stack" key={person.id}><PersonRow onOpen={(item) => setSelectedPerson(selectedPerson === item.id ? null : item.id)} person={person} />{selectedPerson === person.id && <div className="inline-page-detail"><NestedPathMenu ariaLabel={`${person.name} menu`} nodes={[{ id: 'relationship', label: 'RELATIONSHIP', children: [{ id: 'detail', label: 'DETAIL' }] }]} renderLeaf={(node) => renderLeaf(node.label, `person-${person.id}-${node.id}`, person.detail)} /></div>}</div>) : emptyState('NO PEOPLE')}</div>{createMessage && <p role="status">{createMessage}</p>}</>}
    {page === 'TODAY' && <><div className="page-date-heading">{todayLabel}</div><ContextTabs active={todayCategory} ariaLabel="Today categories" labels={['ALL', 'ATTENTION', 'MAINTENANCE', 'MEETINGS', 'ALAN']} onChange={setTodayCategory} /><div className="page-mockup-list page-today-list">{filteredTasks.length ? filteredTasks.map((task) => <div className="page-entity-stack" key={task.id}><TaskCard onOpen={() => setSelectedTask(selectedTask === task.id ? null : task.id)} selected={selectedTask === task.id} task={task} variant="dashboard" />{selectedTask === task.id && <div className="nested-page-menu"><NestedPathMenu ariaLabel={`${task.room} task menu`} nodes={[{ id: task.sourceKind ?? task.category, label: task.sourceKind ?? task.category, children: [{ id: task.id, label: task.action }] }]} renderLeaf={(node) => renderLeaf('ACTION', `task-${task.id}-${node.id}`, task.action)} /></div>}</div>) : emptyState('NO TASKS')}</div></>}
    {page === 'CALENDAR' && <CalendarPager anchorDate={selectedDate} createEnabled={false} events={data.events.map((event) => ({ ...event, onOpen: event.roomId ? () => openRoomFromCalendar(event.roomId as string) : undefined }))} eventsForDate={(date) => data.events.filter((event) => event.date === date).map((event) => ({ ...event, onOpen: event.roomId ? () => openRoomFromCalendar(event.roomId as string) : undefined }))} onSelectDate={setSelectedDate} occupancyForDate={(date) => Math.min(1, data.events.filter((event) => event.date === date).length / Math.max(data.rooms.length, 1))} selectedDate={selectedDate} todayDate={new Date().toISOString().slice(0, 10)} />}
    {page === 'SERVICES' && data.loadState !== 'loading' && data.loadState !== 'error' && <div className="page-mockup-list">{data.rooms.length ? data.rooms.map((room) => <div className="page-entity-stack" key={room.id}><button aria-expanded={selectedRoom === room.id} className="page-service-cover" onClick={() => setSelectedRoom(selectedRoom === room.id ? null : room.id)} type="button"><strong>{room.displayId ?? room.id}</strong><span>ROOM</span></button>{selectedRoom === room.id && <div className="inline-page-detail"><NestedPathMenu ariaLabel={`${room.displayId ?? room.id} services menu`} nodes={serviceNodes} renderLeaf={(node) => <><UniversalField label="ACTION" name={`service-${room.id}-${node.id}`} onChange={() => undefined} readOnly value={`${room.displayId ?? room.id} · ${node.label}`} />{data.onCreateServiceTask && <ActionButton disabled={creatingService !== null} onClick={() => void createServiceTask(room.id, node.id)}>{creatingService === `${room.id}:${node.id}` ? 'SAVING' : 'CREATE TASK'}</ActionButton>}</>} /></div>}</div>) : emptyState(roomState)}</div>}
  </ThemePageLayout></main>;
}
