import type { CSSProperties } from 'react';

type CalendarCellProps = { date: string; day: number; isToday: boolean; isWeekend: boolean; isSelected: boolean; workloadIntensity: number; onOpen: (date: string) => void };

export function CalendarCell({ date, day, isToday, isWeekend, isSelected, workloadIntensity, onOpen }: CalendarCellProps) {
  return <button aria-label={`Open ${date} events`} className={`calendar-cell br-grid-cell${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}${isWeekend ? ' is-weekend' : ''}${workloadIntensity > 0 ? ' has-events' : ''}`} data-calendar-date={date} onClick={() => onOpen(date)} type="button"><span className="calendar-cell-inner br-grid-cell" style={{ '--calendar-workload-intensity': workloadIntensity } as CSSProperties}><span>{day}</span></span></button>;
}
