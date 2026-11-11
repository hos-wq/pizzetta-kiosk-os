import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import { AdaptiveFieldFlow } from './components/AdaptiveFieldFlow';
import { ApplicationShell, type ShellSection } from './components/ApplicationShell';
import { CalendarCell } from './components/CalendarCell';
import { CalendarDayDetails } from './components/CalendarDayDetails';
import { ContextTabs } from './components/ContextTabs';
import { MiniUniversalFieldC, type MiniCategory } from './components/MiniUniversalFieldC';
import { RoomCard } from './components/RoomCard';
import { SearchField } from './components/SearchField';
import { SelectField } from './components/SelectField';
import { MessageRow, TaskCard } from './components/TaskCard';
import { UniversalField } from './components/UniversalField';
import { UniversalAccordion } from './components/UniversalAccordion';
import { UniversalLightbox } from './components/UniversalLightbox';
import { developmentPeople as people, developmentRooms as rooms, developmentServiceTaxonomy as serviceTaxonomy, developmentServiceTaxonomyRelations as serviceTaxonomyRelations, developmentTasks as tasks } from './domain/development';
import type { PersonFixture, RoomFixture, TaskFixture } from './fixtures';
import { PersonRow } from './components/PersonRow';
import { ThemeShowcase } from './design-system/ThemeShowcase';
import { PagesPage } from './design-system/pages/PagesPage';
import { IntegrationMockupPage } from './design-system/pages/IntegrationMockupPage';
import { DevelopmentDataProvider } from './domain/developmentStore';

type LightboxState = { kind: 'person'; person: PersonFixture } | { kind: 'task'; task: TaskFixture } | null;
const roomCategories: MiniCategory[] = [{ name: 'ROOM', options: ['Ready', 'Occupied', 'Service'] }, { name: 'UTILITIES', options: ['Water', 'Power', 'Internet'] }];
const roomSubmenus: Record<string, string[]> = { ROOM: ['GENERAL', 'AMENITIES', 'BUILDING'], TENANT: ['PERSONAL', 'CONTRACT', 'FINANCE', 'DOCUMENTS'], UTILITIES: ['WATER', 'ELECTRICITY', 'INTERNET'], OPERATIONS: ['MAINTENANCE', 'HOUSEKEEPING'], TERMS: ['RENT', 'PAYMENTS', 'POLICIES'] };
const calendarMonthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function App() {
  const route = window.location.hash;
  const [activeSection, setActiveSection] = useState<ShellSection>('LISTING');
  const [lightbox, setLightbox] = useState<LightboxState>(null);
  const [roomDetail, setRoomDetail] = useState<RoomFixture | null>(null);
  const [taskRecords, setTaskRecords] = useState(tasks);
  const [roomTab, setRoomTab] = useState('ROOM');
  const [roomSubmenu, setRoomSubmenu] = useState('GENERAL');
  const [roomCategoriesState, setRoomCategoriesState] = useState(roomCategories);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [dashboardCategory, setDashboardCategory] = useState<TaskFixture['category']>('MESSAGES');
  const [selectedDate, setSelectedDate] = useState('2026-10-12');
  const [calendarCreateOpen, setCalendarCreateOpen] = useState(false);
  const [calendarMonthOffsets, setCalendarMonthOffsets] = useState([-1, 0, 1]);
  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const [roomId, setRoomId] = useState('');
  const [serviceLevel, setServiceLevel] = useState('');
  const [serviceMacro, setServiceMacro] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [serviceObject, setServiceObject] = useState('');
  const [serviceAction, setServiceAction] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskFixture['priority']>('NORMAL');
  const [taskStatus, setTaskStatus] = useState<TaskFixture['status']>('PENDING');
  const filteredPeople = useMemo(() => people.filter((person) => `${person.name} ${person.role} ${person.room}`.toLowerCase().includes(peopleSearch.toLowerCase())), [peopleSearch]);
  const addRoomCategory = () => setRoomCategoriesState((current) => [...current, { name: `CUSTOM ${current.length - 1}`, options: ['Label', 'Content'] }]);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const getCalendarMonth = (monthOffset: number) => {
    const monthDate = new Date(Date.UTC(2026, 9 + monthOffset, 1));
    const monthStart = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1 - monthDate.getUTCDay()));
    const cells = Array.from({ length: 49 }, (_, index) => {
      const dateValue = new Date(monthStart);
      dateValue.setUTCDate(monthStart.getUTCDate() + index);
      const date = dateValue.toISOString().slice(0, 10);
      const day = dateValue.getUTCDate();
      const dateLabel = `${String(day).padStart(2, '0')} ${calendarMonthNames[dateValue.getUTCMonth()]}`;
      const workload = rooms.filter((room) => room.nextDate === dateLabel).length + taskRecords.filter((task) => rooms.find((room) => room.id === task.room)?.nextDate === dateLabel).length;
      return { date, day, isToday: date === '2026-10-12', isWeekend: dateValue.getUTCDay() === 0 || dateValue.getUTCDay() === 6, workload };
    });
    return { label: `${calendarMonthNames[monthDate.getUTCMonth()]} ${monthDate.getUTCFullYear()}`, cells, maximumWorkload: Math.max(...cells.map((cell) => cell.workload), 1) };
  };
  const handleCalendarScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    if (element.scrollLeft + element.clientWidth > element.scrollWidth - 160) setCalendarMonthOffsets((current) => [...current, current[current.length - 1] + 1]);
  };
  const handleCalendarPointerDown = () => { calendarScrollRef.current?.style.removeProperty('scroll-snap-type'); };
  useEffect(() => {
    const container = calendarScrollRef.current;
    const month = container?.querySelector<HTMLElement>(`.calendar-month[data-calendar-month="${selectedDate.slice(0, 7)}"]`);
    const cell = month?.querySelector<HTMLElement>(`[data-calendar-date="${selectedDate}"]`);
    if (!container || !cell) return;
    const containerRect = container.getBoundingClientRect();
    const cellLeft = cell.getBoundingClientRect().left - containerRect.left + container.scrollLeft;
    const targetLeft = cellLeft - (container.clientWidth - cell.offsetWidth) / 2;
    container.style.scrollSnapType = 'none';
    container.scrollTo({ behavior: 'auto', left: Math.max(0, targetLeft) });
  }, [activeSection, calendarMonthOffsets, selectedDate]);
  const selectedServiceRelations = serviceLevel in serviceTaxonomyRelations ? serviceTaxonomyRelations[serviceLevel as keyof typeof serviceTaxonomyRelations] : undefined;
  const macroOptions = selectedServiceRelations?.macros ?? [];
  const categoryOptions = selectedServiceRelations?.categories[serviceMacro as keyof typeof selectedServiceRelations.categories] ?? [];
  const objectOptions = selectedServiceRelations?.objects[serviceCategory as keyof typeof selectedServiceRelations.objects] ?? [];
  const actionOptions = selectedServiceRelations?.actions[serviceObject as keyof typeof selectedServiceRelations.actions] ?? [];
  const canCreateTask = Boolean(roomId && serviceLevel && serviceMacro && serviceCategory && serviceObject && serviceAction);
  const changeService = (value: string) => { setServiceLevel(value); setServiceMacro(''); setServiceCategory(''); setServiceObject(''); setServiceAction(''); };
  const changeMacro = (value: string) => { setServiceMacro(value); setServiceCategory(''); setServiceObject(''); setServiceAction(''); };
  const changeCategory = (value: string) => { setServiceCategory(value); setServiceObject(''); setServiceAction(''); };
  const changeObject = (value: string) => { setServiceObject(value); setServiceAction(''); };
  const createTask = () => {
    if (!canCreateTask) return;
    const category = serviceLevel.toUpperCase() as TaskFixture['category'];
    if (taskRecords.some((task) => task.room === roomId && task.object === serviceObject && task.action === serviceAction)) return;
    setTaskRecords((current) => [...current, { id: `session-task-${Date.now()}`, category, room: roomId, object: serviceObject, action: serviceAction, status: taskStatus, priority: taskPriority, service: serviceLevel, macro: serviceMacro, taxonomyCategory: serviceCategory }]);
  };
  const selectCalendarDate = (date: string) => { setSelectedDate(date); setCalendarCreateOpen(false); };
  const calendarEventsForDate = (date: string) => {
    const label = new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)).toUpperCase();
    return rooms.filter((room) => room.nextDate === label).map((room) => ({ id: `room-${room.id}`, title: `${room.id} · ${room.maintenance}`, meta: room.unit })).concat(taskRecords.filter((task) => rooms.find((room) => room.id === task.room)?.nextDate === label).map((task) => ({ id: task.id, title: task.action, meta: `${task.room} · ${task.status}` })));
  };

  const handleSectionChange = (section: ShellSection) => { setActiveSection(section); setRoomDetail(null); };
  const changeRoomMenu = (menu: string) => { setRoomTab(menu); setRoomSubmenu(roomSubmenus[menu][0]); };

  if (route === '#theme-showcase') return <ThemeShowcase />;
  if (route === '#integration-mockup') return <IntegrationMockupPage presentation="application" />;
  if (route === '' || route === '#' || route === '#app-preview') return <DevelopmentDataProvider><PagesPage presentation="application" /></DevelopmentDataProvider>;

  return <ApplicationShell activeSection={activeSection} onSectionChange={handleSectionChange}><main className="module-page">
    {activeSection === 'LISTING' && roomDetail && <section aria-label={`${roomDetail.id} room detail`} className="room-detail-page"><div className="room-detail-heading"><button className="room-detail-back" onClick={() => setRoomDetail(null)} type="button">← LISTING</button><div><h1>{roomDetail.id}</h1><span>{roomDetail.unit}</span></div></div><ContextTabs active={roomTab} ariaLabel="Room detail primary menu" labels={['ROOM', 'TENANT', 'UTILITIES', 'OPERATIONS', 'TERMS']} onChange={changeRoomMenu} /><ContextTabs active={roomSubmenu} ariaLabel={`${roomTab} room detail submenu`} labels={roomSubmenus[roomTab]} onChange={setRoomSubmenu} />{roomTab === 'ROOM' && roomSubmenu === 'GENERAL' && <AdaptiveFieldFlow><UniversalField label="ID" name="room-id" readOnly value={roomDetail.id} /><UniversalField label="UNIT" name="room-unit" readOnly value={roomDetail.unit} /><UniversalField label="OCCUPANCY" name="room-occupancy" readOnly value={roomDetail.occupancy} /><UniversalField label="BALCONY" name="room-balcony" readOnly value={roomDetail.balcony ? 'YES' : 'NOT SPECIFIED'} />{roomDetail.balcony && <UniversalField label="BALCONY VIEW" name="room-balcony-view" readOnly value="NO VIEW" />}</AdaptiveFieldFlow>}{roomTab === 'ROOM' && roomSubmenu !== 'GENERAL' && <p className="room-detail-empty">No fixture fields are defined for {roomSubmenu}.</p>}{roomTab === 'TENANT' && <p className="room-detail-empty">No fixture fields are defined for {roomSubmenu}.</p>}{roomTab === 'UTILITIES' && <MiniUniversalFieldC categories={roomCategoriesState} onAddCategory={addRoomCategory} />}{roomTab === 'OPERATIONS' && <div className="operation-groups">{roomSubmenu === 'MAINTENANCE' ? <MiniUniversalFieldC categories={[{ name: 'MAINTENANCE', options: taskRecords.filter((task) => task.category === 'MAINTENANCE' && task.room === roomDetail.id).map((task) => task.action) }]} onAddCategory={() => undefined} /> : <MiniUniversalFieldC categories={[{ name: 'HOUSEKEEPING', options: taskRecords.filter((task) => task.category === 'HOUSEKEEPING' && task.room === roomDetail.id).map((task) => task.action) }]} onAddCategory={() => undefined} />}</div>}{roomTab === 'TERMS' && <p className="room-detail-empty">No fixture fields are defined for {roomSubmenu}.</p>}</section>}
    {activeSection === 'LISTING' && !roomDetail && <section aria-label="Listing room grid" className="module-section"><div className="room-grid">{rooms.map((room) => <RoomCard key={room.id} onOpen={(selected) => { changeRoomMenu('ROOM'); setRoomDetail(selected); }} room={room} />)}</div></section>}
    {activeSection === 'PEOPLE' && <section aria-label="People directory" className="module-section"><SearchField name="people-search" onChange={setPeopleSearch} value={peopleSearch} /><div aria-live="polite" className="person-list">{filteredPeople.map((person) => <PersonRow key={person.id} onOpen={(selected) => setLightbox({ kind: 'person', person: selected })} person={person} />)}</div>{filteredPeople.length === 0 && <p className="empty-state">No synthetic person matches.</p>}</section>}
    {activeSection === 'TODAY' && <section aria-label="Today operational categories" className="module-section"><div className="dashboard-tiles">{(['MESSAGES', 'MAINTENANCE', 'HOUSEKEEPING'] as const).map((category) => <button aria-pressed={dashboardCategory === category} className={`dashboard-tile${dashboardCategory === category ? ' is-active' : ''}`} key={category} onClick={() => setDashboardCategory(category)} type="button"><strong>{category}</strong><span className="notification-badge">{taskRecords.filter((task) => task.category === category && task.status !== 'DONE').length}</span></button>)}</div>{dashboardCategory === 'MESSAGES' ? <div className="message-list">{taskRecords.filter((task) => task.category === 'MESSAGES').map((task) => <MessageRow key={task.id} onOpen={(selected) => setLightbox({ kind: 'task', task: selected })} task={task} />)}</div> : <div className="task-grid">{taskRecords.filter((task) => task.category === dashboardCategory).map((task) => <TaskCard key={task.id} date={rooms.find((room) => room.id === task.room)?.nextDate} onOpen={(selected) => setLightbox({ kind: 'task', task: selected })} task={task} variant="dashboard" />)}</div>}</section>}
    {activeSection === 'CALENDAR' && <section aria-label="Calendar date matrix" className="module-section"><div className="calendar-scroll" onPointerDown={handleCalendarPointerDown} onScroll={handleCalendarScroll} ref={calendarScrollRef}>{calendarMonthOffsets.map((monthOffset) => { const month = getCalendarMonth(monthOffset); const monthDate = new Date(Date.UTC(2026, 9 + monthOffset, 1)); const monthKey = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, '0')}`; return <section aria-label={`${month.label} calendar`} className="calendar-month" data-calendar-month={monthKey} key={monthOffset}><h2 className="calendar-month-heading">{month.label}</h2><div className="calendar-matrix">{Array.from({ length: 7 }, (_, row) => <div className="calendar-row" key={row}>{month.cells.slice(row * 7, row * 7 + 7).map((cell) => <CalendarCell key={cell.date} date={cell.date} day={cell.day} isSelected={cell.date === selectedDate} isToday={cell.isToday} isWeekend={cell.isWeekend} onOpen={selectCalendarDate} workloadIntensity={cell.workload / month.maximumWorkload} />)}</div>)}</div>{month.cells.some((cell) => cell.date === selectedDate) && <CalendarDayDetails createContent={<UniversalField label="EVENT" name="calendar-create-event" onChange={() => undefined} placeholder="EVENT" value="" />} createOpen={calendarCreateOpen} date={selectedDate} events={calendarEventsForDate(selectedDate)} onCreate={() => setCalendarCreateOpen((open) => !open)} />}</section>; })}</div></section>}
    {activeSection === 'SERVICES' && <section aria-label="Services task hierarchy" className="module-section services-cover"><div className="service-form"><div className="service-select-grid"><SelectField label="Room" onChange={setRoomId} options={rooms.map((room) => room.id)} value={roomId} /><SelectField label="Service" onChange={changeService} options={serviceTaxonomy.services} value={serviceLevel} /><SelectField disabled={!serviceLevel} label="Macro" onChange={changeMacro} options={[...macroOptions]} value={serviceMacro} /><SelectField disabled={!serviceMacro} label="Category" onChange={changeCategory} options={[...categoryOptions]} value={serviceCategory} /><SelectField disabled={!serviceCategory} label="Object" onChange={changeObject} options={[...objectOptions]} value={serviceObject} /><SelectField disabled={!serviceObject} label="Action" onChange={setServiceAction} options={[...actionOptions]} value={serviceAction} /><SelectField label="Priority" onChange={(value) => setTaskPriority(value as TaskFixture['priority'])} options={['NORMAL', 'URGENT']} value={taskPriority} /><SelectField label="Status" onChange={(value) => setTaskStatus(value as TaskFixture['status'])} options={['PENDING', 'IN PROGRESS', 'DONE']} value={taskStatus} /></div><button className="action-button action-brass service-create" disabled={!canCreateTask} onClick={createTask} type="button">CREATE TASK</button></div><div className="task-grid">{taskRecords.filter((task) => task.category !== 'MESSAGES').map((task) => <TaskCard key={task.id} onOpen={(selected) => setLightbox({ kind: 'task', task: selected })} task={task} />)}</div></section>}

    <UniversalLightbox contextIcon="people" onClose={closeLightbox} open={lightbox?.kind === 'person'} title={lightbox?.kind === 'person' ? lightbox.person.name : undefined}>{lightbox?.kind === 'person' && <UniversalAccordion ariaLabel="Person dossier sections" defaultOpenId="identity" items={[{ id: 'identity', label: 'IDENTITY', content: <div className="lightbox-fields"><UniversalField label="Role" name="person-role" readOnly value={lightbox.person.role} /><UniversalField label="Fixture association" name="person-room" readOnly value={lightbox.person.room} /></div> }, { id: 'notes', label: 'NOTES', content: <p className="lightbox-copy">{lightbox.person.detail}</p> }]} />}</UniversalLightbox>
    <UniversalLightbox contextIcon={lightbox?.kind === 'task' && lightbox.task.category === 'MAINTENANCE' ? 'maintenance' : 'housekeeping'} onClose={closeLightbox} open={lightbox?.kind === 'task'} recordId={lightbox?.kind === 'task' ? lightbox.task.room : undefined} title={lightbox?.kind === 'task' ? lightbox.task.category + ' TASK' : undefined}>{lightbox?.kind === 'task' && <UniversalAccordion ariaLabel="Task detail sections" defaultOpenId="taxonomy" items={[{ id: 'taxonomy', label: 'TAXONOMY', content: <div className="lightbox-fields"><UniversalField label="Service" name="task-service" readOnly value={lightbox.task.service ?? lightbox.task.category} /><UniversalField label="Macro" name="task-macro" readOnly value={lightbox.task.macro ?? 'Not recorded'} /><UniversalField label="Category" name="task-category" readOnly value={lightbox.task.taxonomyCategory ?? lightbox.task.category} /><UniversalField label="Object" name="task-object" readOnly value={lightbox.task.object} /><UniversalField label="Action" name="task-action" readOnly value={lightbox.task.action} /></div> }, { id: 'state', label: 'STATE', content: <div className="lightbox-fields"><UniversalField label="Priority" name="task-priority" readOnly value={lightbox.task.priority} /><UniversalField label="Status" name="task-status" readOnly value={lightbox.task.status} /></div> }]} />}</UniversalLightbox>
  </main></ApplicationShell>;
}

export default App;
