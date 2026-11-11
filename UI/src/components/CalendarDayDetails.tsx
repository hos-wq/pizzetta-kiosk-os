import type { ReactNode } from 'react';
import { CreateAction } from './CreateAction';

export type CalendarDayEvent = { id: string; title: string; meta?: string; roomId?: string; onOpen?: () => void };
type CalendarDayDetailsProps = { date: string; events: readonly CalendarDayEvent[]; createOpen?: boolean; onCreate?: () => void; createContent?: ReactNode };

export function CalendarDayDetails({ date, events, createOpen = false, onCreate, createContent }: CalendarDayDetailsProps) {
  const headingId = `calendar-day-${date}`;
  return <section aria-labelledby={headingId} className="calendar-day-details">
    <div className="calendar-day-heading">
      <div><span className="section-kicker">DAY</span><h3 id={headingId}>{date}</h3></div>
      {onCreate && <CreateAction controls={`${headingId}-create`} expanded={createOpen} label={`Add calendar event for ${date}`} onClick={onCreate} />}
    </div>
    {createOpen && <div className="calendar-day-create" id={`${headingId}-create`}>{createContent}</div>}
    <div className="calendar-day-events">{events.length > 0 ? events.map((event) => event.onOpen ? <button className="calendar-day-event" key={event.id} onClick={event.onOpen} type="button"><strong>{event.title}</strong>{event.meta && <span>{event.meta}</span>}</button> : <article className="calendar-day-event" key={event.id}><strong>{event.title}</strong>{event.meta && <span>{event.meta}</span>}</article>) : <div className="calendar-day-empty">NO EVENTS</div>}</div>
  </section>;
}
