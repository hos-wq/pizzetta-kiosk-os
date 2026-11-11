import { useMemo, useState } from 'react';
import { ContextTabs } from '../../components/ContextTabs';
import { CreateAction } from '../../components/CreateAction';
import { CalendarPager } from '../../components/CalendarPager';
import { NestedPathMenu, type NestedPathNode } from '../../components/NestedPathMenu';
import { RoomCard } from '../../components/RoomCard';
import { SearchField } from '../../components/SearchField';
import { TaskCard } from '../../components/TaskCard';
import { UniversalField } from '../../components/UniversalField';
import { roomImageCatalog } from '../roomImageCatalog';
import { useDevelopmentData } from '../../domain/developmentStore';
import { developmentRoomMenu, personMenu, serviceMenu } from '../../domain/developmentNavigation';
import { ThemePageLayout, type ThemePageKey } from '../../layouts/ThemePageLayout';
import { resolveCommand } from '../../monique/navigation';

type PageKey = ThemePageKey;

function asNodes(items: Array<{ id: string; label: string; children?: unknown[] }>): NestedPathNode[] {
  return items.map((item) => ({ id: item.id, label: item.label, children: item.children ? asNodes(item.children as Array<{ id: string; label: string; children?: unknown[] }>) : undefined }));
}

export function PagesPage({ presentation = 'showcase' }: { presentation?: 'showcase' | 'application' } = {}) {
  const { data, eventsForDate, occupancyForDate, reset } = useDevelopmentData();
  const [page, setPage] = useState<PageKey>('LISTING');
  const [openRoom, setOpenRoom] = useState<string | null>(null);
  const [openPerson, setOpenPerson] = useState<string | null>(null);
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [openServiceRoom, setOpenServiceRoom] = useState<string | null>(null);
  const [moniqueOpen, setMoniqueOpen] = useState(false);
  const [moniqueCommand, setMoniqueCommand] = useState('');
  const [moniqueMessage, setMoniqueMessage] = useState('');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [todayCategory, setTodayCategory] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [createContext, setCreateContext] = useState<PageKey | null>(null);
  const [createDraft, setCreateDraft] = useState('');
  const filteredPeople = useMemo(() => data.people.filter((person) => `${person.name} ${person.role} ${person.room}`.toLowerCase().includes(peopleSearch.toLowerCase())), [data.people, peopleSearch]);
  const todayTasks = todayCategory === 'ALL' ? data.tasks : data.tasks.filter((task) => task.category === todayCategory);
  const todayLabel = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', weekday: 'long' }).format(new Date(`${selectedDate}T00:00:00`));
  const roomNodes = asNodes(developmentRoomMenu());
  const personNodes = asNodes(personMenu());
  const serviceNodes = asNodes(serviceMenu());
  const toggleCreate = (context: PageKey) => { setCreateContext((current) => current === context ? null : context); setCreateDraft(''); };
  const resolveMonique = () => {
    const result = resolveCommand(moniqueCommand, { rooms: data.rooms, people: data.people });
    const target = result.instruction?.destination;
    const roomId = target?.entities.roomId;
    const personId = target?.entities.personId;
    if (roomId && target.navigationId.startsWith('listing')) { setPage('LISTING'); setOpenRoom(roomId); setMoniqueMessage(''); setMoniqueOpen(false); return; }
    if (personId && target.navigationId.startsWith('people')) { setPage('PEOPLE'); setOpenPerson(personId); setMoniqueMessage(''); setMoniqueOpen(false); return; }
    if (target) { setPage(target.navigationId.startsWith('today') ? 'TODAY' : target.navigationId.startsWith('calendar') ? 'CALENDAR' : target.navigationId.startsWith('services') ? 'SERVICES' : 'LISTING'); setMoniqueMessage(''); setMoniqueOpen(false); return; }
    setMoniqueMessage(result.message ?? result.state);
  };
  const renderLeaf = (label: string, name: string, value = '') => <UniversalField label={label} name={name} onChange={() => undefined} readOnly={Boolean(value)} value={value} />;

  return <main aria-label="BR OS Design System Pages" className={presentation === 'application' ? 'theme-application-root' : 'module-page pages-showcase-page'}>
    <ThemePageLayout activePage={page} moniqueMessage={moniqueMessage} moniqueOpen={moniqueOpen} moniqueValue={moniqueCommand} onMoniqueChange={setMoniqueCommand} onMoniqueClose={() => setMoniqueOpen(false)} onMoniqueOpen={() => setMoniqueOpen((value) => !value)} onMoniqueSend={resolveMonique} onPageChange={setPage} presentation={presentation}>
      {page === 'LISTING' && <><div className="page-create-row"><CreateAction controls="listing-create" expanded={createContext === 'LISTING'} label="Add room record" onClick={() => toggleCreate('LISTING')} /></div>{createContext === 'LISTING' && <div className="page-inline-create" id="listing-create">{renderLeaf('ROOM', 'listing-create-room', createDraft)}</div>}<div className="page-mockup-grid page-listing-grid">{data.rooms.map((room) => <div className="page-entity-stack" key={room.id}><RoomCard image={roomImageCatalog[room.id]} onOpen={(selected) => setOpenRoom(openRoom === selected.id ? null : selected.id)} room={room} selected={openRoom === room.id} />{openRoom === room.id && <div className="inline-page-detail"><NestedPathMenu ariaLabel={`${room.id} room menu`} nodes={roomNodes} renderLeaf={(node) => renderLeaf(node.label, `room-${room.id}-${node.id}`)} /></div>}</div>)}</div></>}
      {page === 'PEOPLE' && <><div className="page-create-row"><CreateAction controls="people-create" expanded={createContext === 'PEOPLE'} label="Add contact" onClick={() => toggleCreate('PEOPLE')} /></div>{createContext === 'PEOPLE' && <div className="page-inline-create" id="people-create">{renderLeaf('CONTACT', 'people-create-contact', createDraft)}</div>}<SearchField label="SEARCH PEOPLE" name="page-people-search" onChange={setPeopleSearch} value={peopleSearch} /><div className="page-mockup-list">{filteredPeople.map((person) => <div className="page-entity-stack" key={person.id}><button aria-expanded={openPerson === person.id} className="page-person-cover" onClick={() => setOpenPerson(openPerson === person.id ? null : person.id)} type="button"><strong>{person.name}</strong><span>{person.room} · {person.role}</span></button>{openPerson === person.id && <div className="inline-page-detail"><NestedPathMenu ariaLabel={`${person.name} menu`} nodes={personNodes} renderLeaf={(node) => renderLeaf(node.label, `person-${person.id}-${node.id}`, person.detail)} /></div>}</div>)}</div></>}
      {page === 'TODAY' && <><div className="page-date-heading">{todayLabel}</div><ContextTabs active={todayCategory} ariaLabel="Today categories" labels={['ALL', 'MAINTENANCE', 'MEETINGS', 'ALAN']} onChange={setTodayCategory} /><div className="page-mockup-list page-today-list">{todayTasks.map((task) => <div className="page-entity-stack" key={task.id}><TaskCard onOpen={() => setOpenTask(openTask === task.id ? null : task.id)} selected={openTask === task.id} task={task} variant="dashboard" />{openTask === task.id && <div className="nested-page-menu"><NestedPathMenu ariaLabel={`${task.room} task menu`} nodes={[{ id: task.category, label: task.category, children: [{ id: task.id, label: task.action }] }]} renderLeaf={() => renderLeaf('ACTION', `task-${task.id}-action`, task.action)} /></div>}</div>)}</div></>}
      {page === 'CALENDAR' && <CalendarPager anchorDate={selectedDate} eventsForDate={(date) => eventsForDate(date).map((event) => ({ id: event.id, title: event.title, meta: event.meta }))} onSelectDate={setSelectedDate} occupancyForDate={occupancyForDate} selectedDate={selectedDate} todayDate={selectedDate} />}
      {page === 'SERVICES' && <><div className="page-create-row"><CreateAction controls="services-create" expanded={createContext === 'SERVICES'} label="Add service action" onClick={() => toggleCreate('SERVICES')} /></div>{createContext === 'SERVICES' && <div className="page-inline-create" id="services-create">{renderLeaf('SERVICE', 'services-create-service', createDraft)}</div>}<div className="page-mockup-list">{data.rooms.map((room) => <div className="page-entity-stack" key={room.id}><button aria-expanded={openServiceRoom === room.id} className="page-service-cover" onClick={() => setOpenServiceRoom(openServiceRoom === room.id ? null : room.id)} type="button"><strong>{room.id}</strong><span>SERVICE</span></button>{openServiceRoom === room.id && <div className="inline-page-detail"><NestedPathMenu ariaLabel={`${room.id} services menu`} nodes={serviceNodes} renderLeaf={(node) => renderLeaf('ACTION', `service-${room.id}-${node.id}`)} /></div>}</div>)}</div></>}
    </ThemePageLayout>{presentation === 'showcase' && <button className="development-reset" onClick={reset} type="button">RESET DEVELOPMENT DATA</button>}
  </main>;
}
