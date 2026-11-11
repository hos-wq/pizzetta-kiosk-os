import { useState } from 'react';
import { AdaptiveFieldFlow } from '../../components/AdaptiveFieldFlow';
import { DateField, TimeField } from '../../components/DateTimeFields';
import { MiniUniversalFieldC } from '../../components/MiniUniversalFieldC';
import { PersistenceIndicator } from '../../components/PersistenceIndicator';
import { PersonRow } from '../../components/PersonRow';
import { RoomCard } from '../../components/RoomCard';
import { SearchField } from '../../components/SearchField';
import { SelectField } from '../../components/SelectField';
import { StatusBadge } from '../../components/StatusBadge';
import { TaskCard } from '../../components/TaskCard';
import { UniversalAccordion } from '../../components/UniversalAccordion';
import { developmentPeople as people, developmentRooms as rooms, developmentTasks as tasks } from '../../domain/development';

const componentOptions = ['NORMAL', 'URGENT'];

export function ComponentsPage() {
  const [search, setSearch] = useState('');
  const [select, setSelect] = useState(componentOptions[0]);
  const [date, setDate] = useState('2026-10-12');
  const [time, setTime] = useState('10:00');
  const [opened, setOpened] = useState('');
  const [roomCategories, setRoomCategories] = useState([{ name: 'ROOM', options: ['Ready', 'Occupied', 'Service'] }]);

  return <main aria-label="BR OS Design System Components" className="module-page">
    <section className="module-section"><h1>COMPONENTS</h1><p className="intro-copy">Domain-ready compositions assembled from the primitives layer and existing fixtures.</p></section>
    <section aria-label="Form components" className="module-section"><h2>FORM COMPOSITIONS</h2><AdaptiveFieldFlow><SearchField name="components-search" onChange={setSearch} value={search} /><SelectField label="Priority" onChange={setSelect} options={componentOptions} value={select} /><DateField label="Date" onChange={setDate} value={date} /><TimeField label="Time" onChange={setTime} value={time} /></AdaptiveFieldFlow></section>
    <section aria-label="Status component" className="module-section"><h2>STATUS</h2><div className="lightbox-gallery-actions"><StatusBadge value="VACANT" /><StatusBadge value="PENDING" /><StatusBadge value="IN PROGRESS" /><StatusBadge value="DONE" /><StatusBadge value="URGENT" /></div><div className="fixture-results"><PersistenceIndicator status="SAVING" /><PersistenceIndicator status="SAVED" /><PersistenceIndicator status="ERROR" onRetry={() => undefined} /></div></section>
    <section aria-label="Room and task components" className="module-section"><h2>DOMAIN CARDS</h2><div className="room-grid"><RoomCard onOpen={(room) => setOpened(room.id)} room={rooms[0]} /><TaskCard onOpen={(task) => setOpened(task.id)} task={tasks[1]} /><PersonRow onOpen={(person) => setOpened(person.id)} person={people[0]} /></div>{opened && <p aria-live="polite" className="interaction-note">Opened fixture: {opened}</p>}</section>
    <section aria-label="Adaptive and expandable components" className="module-section"><h2>ADAPTIVE COMPOSITIONS</h2><MiniUniversalFieldC categories={roomCategories} onAddCategory={() => setRoomCategories((current) => [...current, { name: `CUSTOM ${current.length}`, options: ['Label', 'Content'] }])} /><UniversalAccordion ariaLabel="Component accordion" defaultOpenId="details" items={[{ id: 'details', label: 'DETAILS', content: <p className="lightbox-copy">Accordion content is composed from the same field and typography tokens.</p> }, { id: 'state', label: 'STATE', content: <p className="lightbox-copy">Only one row remains open at a time.</p> }]} /></section>
  </main>;
}
