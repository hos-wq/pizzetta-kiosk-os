import { useState } from 'react';
import { AdaptiveFieldFlow } from '../../components/AdaptiveFieldFlow';
import { CalendarCell } from '../../components/CalendarCell';
import { RoomCard } from '../../components/RoomCard';
import { TaskCard } from '../../components/TaskCard';
import { UniversalAccordion } from '../../components/UniversalAccordion';
import { UniversalField } from '../../components/UniversalField';
import { developmentRooms as rooms, developmentTasks as tasks } from '../../domain/development';

const layoutDates = Array.from({ length: 35 }, (_, index) => {
  const dateValue = new Date(Date.UTC(2026, 9, index + 1));
  return { date: dateValue.toISOString().slice(0, 10), day: dateValue.getUTCDate() };
});

export function LayoutsPage() {
  const [selectedDate, setSelectedDate] = useState(layoutDates[11].date);
  return <main aria-label="BR OS Design System Layouts" className="module-page">
    <section className="module-section"><h1>LAYOUTS</h1><p className="intro-copy">Responsive compositions that assemble components while preserving context, hierarchy, spacing and the shared shell contract.</p></section>
    <section aria-label="Adaptive field layout" className="module-section"><h2>ADAPTIVE FIELD FLOW</h2><AdaptiveFieldFlow><UniversalField label="Long content" name="layout-long-content" readOnly value="Responsive content-aware width" /><UniversalField label="Short content" name="layout-short-content" readOnly value="BR·02" /><UniversalField label="Date" name="layout-date" readOnly value="12 OCT 2026" /></AdaptiveFieldFlow></section>
    <section aria-label="Entity grid layout" className="module-section"><h2>ENTITY GRID</h2><div className="room-grid"><RoomCard onOpen={() => undefined} room={rooms[0]} /><RoomCard onOpen={() => undefined} room={rooms[1]} /><TaskCard onOpen={() => undefined} task={tasks[0]} /><TaskCard onOpen={() => undefined} task={tasks[1]} /></div></section>
    <section aria-label="Seven by five calendar layout" className="module-section"><h2>SEVEN BY FIVE CALENDAR</h2><div className="calendar-matrix">{Array.from({ length: 5 }, (_, row) => <div className="calendar-row" key={row}>{layoutDates.slice(row * 7, row * 7 + 7).map((cell) => <CalendarCell date={cell.date} day={cell.day} isSelected={cell.date === selectedDate} isToday={cell.date === layoutDates[11].date} isWeekend={cell.day % 7 === 0 || cell.day % 7 === 1} key={cell.date} onOpen={setSelectedDate} workloadIntensity={cell.day % 4 / 4} />)}</div>)}</div><p aria-live="polite" className="interaction-note">Selected date: {selectedDate}</p></section>
    <section aria-label="Inline disclosure layout" className="module-section"><h2>INLINE DISCLOSURE</h2><UniversalAccordion ariaLabel="Layout disclosure specimen" defaultOpenId="parent" items={[{ id: 'parent', label: 'PARENT CONTEXT', content: <UniversalAccordion ariaLabel="Nested layout disclosure" defaultOpenId="child" items={[{ id: 'child', label: 'DIRECT CHILD', content: <p className="lightbox-copy">Leaf content remains directly below its parent in the same scroll context.</p> }]} /> }, { id: 'sibling', label: 'SIBLING CONTEXT', content: <p className="lightbox-copy">Selecting a sibling resets the previous descendant path.</p> }]} /></section>
  </main>;
}
