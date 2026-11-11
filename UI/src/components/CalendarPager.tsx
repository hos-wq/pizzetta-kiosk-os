import { useState, type PointerEvent } from 'react';
import { CalendarCell } from './CalendarCell';
import { CalendarDayDetails, type CalendarDayEvent } from './CalendarDayDetails';
import { UniversalField } from './UniversalField';

type CalendarPagerProps = { demoMode?: boolean; createEnabled?: boolean; anchorDate?: string; selectedDate: string; todayDate: string; onSelectDate: (date: string) => void; events?: readonly CalendarDayEvent[]; eventsForDate?: (date: string) => readonly CalendarDayEvent[]; occupancyForDate?: (date: string) => number };

function monthValue(offset: number, anchorDate: string) {
  const anchor = new Date(`${anchorDate}T00:00:00Z`);
  const value = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + offset, 1));
  return { month: value.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }), year: value.getUTCFullYear(), monthIndex: value.getUTCMonth() };
}

export function CalendarPager({ demoMode = false, createEnabled = true, anchorDate = todayDateFallback(), selectedDate, todayDate, onSelectDate, events = [], eventsForDate, occupancyForDate }: CalendarPagerProps) {
  const [offset, setOffset] = useState(0);
  const [pointerStart, setPointerStart] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const currentMonth = monthValue(offset, anchorDate);
  const firstDay = new Date(Date.UTC(currentMonth.year, currentMonth.monthIndex, 1));
  const dates = Array.from({ length: 35 }, (_, index) => {
    const date = new Date(Date.UTC(currentMonth.year, currentMonth.monthIndex, index + 1 - firstDay.getUTCDay()));
    return { date: date.toISOString().slice(0, 10), day: date.getUTCDate(), weekday: date.getUTCDay() };
  });
  const shift = (direction: number) => setOffset((current) => current + direction);
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => setPointerStart(event.clientX);
  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStart === null) return;
    const distance = event.clientX - pointerStart;
    if (Math.abs(distance) > 44) shift(distance < 0 ? 1 : -1);
    setPointerStart(null);
  };

  const selectDate = (date: string) => { setCreateOpen(false); onSelectDate(date); };
  return <section aria-label="Calendar month pager" className="calendar-pager" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
    <h2 className="calendar-month-heading">{currentMonth.month}</h2>
    <div className="calendar-matrix page-calendar-grid">{Array.from({ length: 5 }, (_, row) => <div className="calendar-row" key={row}>{dates.slice(row * 7, row * 7 + 7).map((cell) => <CalendarCell date={cell.date} day={cell.day} isSelected={selectedDate === cell.date} isToday={todayDate === cell.date} isWeekend={cell.weekday === 0 || cell.weekday === 6} key={cell.date} onOpen={selectDate} workloadIntensity={occupancyForDate?.(cell.date) ?? (demoMode ? ((cell.day % 5) + 1) / 5 : 0)} />)}</div>)}</div>
    <CalendarDayDetails createContent={<UniversalField label="EVENT" name="calendar-create-event" onChange={() => undefined} placeholder="EVENT" value="" />} createOpen={createOpen} date={selectedDate} events={eventsForDate?.(selectedDate) ?? events} onCreate={createEnabled ? () => setCreateOpen((open) => !open) : undefined} />
  </section>;
}

function todayDateFallback() { return new Date().toISOString().slice(0, 10); }
