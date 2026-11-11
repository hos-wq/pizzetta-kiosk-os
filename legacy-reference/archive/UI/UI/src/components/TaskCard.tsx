import type { TaskFixture } from '../fixtures';
import { Icon } from './Icon';
import { StatusBadge } from './StatusBadge';

type TaskCardProps = { date?: string; onOpen?: (task: TaskFixture) => void; selected?: boolean; task: TaskFixture; variant?: 'default' | 'dashboard' };

export function TaskCard({ date, onOpen, selected = false, task, variant = 'default' }: TaskCardProps) {
  const iconName = task.category === 'MAINTENANCE' ? 'maintenance' : task.category === 'HOUSEKEEPING' ? 'housekeeping' : 'calendar';
  const taskKind = task.sourceKind ?? task.category;
  if (variant === 'dashboard' && task.category !== 'MESSAGES') {
    return <button aria-label={`${taskKind} for ${task.room}: ${task.action}`} aria-pressed={selected} className={`task-card br-grid-card br-grid-card-full task-card-operational task-card-${task.category.toLowerCase()}${task.priority === 'URGENT' ? ' is-urgent' : ''}${selected ? ' is-selected' : ''}`} onClick={() => onOpen?.(task)} type="button">
      <div className="task-card-heading"><strong className="task-card-room-id">{task.room}</strong><span className="task-card-date">{date}</span></div>
      <div className="task-card-operational-main"><span aria-hidden="true" className={`task-card-icon task-card-icon-${task.category.toLowerCase()}`}><Icon name={iconName} size="0.9rem" /></span><span className="task-card-main"><strong>{task.action}</strong><span>{task.object}</span></span></div>
      <div className="task-card-meta"><StatusBadge value={task.status} /><span>{task.priority}</span></div>
    </button>;
  }

  return <button aria-label={`${taskKind} for ${task.room}: ${task.action}`} aria-pressed={selected} className={`task-card br-grid-card br-grid-card-full${task.priority === 'URGENT' ? ' is-urgent' : ''}${selected ? ' is-selected' : ''}`} onClick={() => onOpen?.(task)} type="button"><div className="task-card-heading"><strong className="task-card-room-id">{task.room}</strong><span className="task-card-category"><span aria-hidden="true" className={`task-card-icon task-card-icon-${task.category.toLowerCase()}`}><Icon name={iconName} size="0.9rem" /></span>{taskKind}</span></div><div className="task-card-main br-grid-card-content"><strong>{task.action}</strong><span>{task.object}</span></div><div className="task-card-meta"><StatusBadge value={task.status} /><span>{task.priority}</span></div></button>;
}

export function MessageRow({ onOpen, task }: { onOpen?: (task: TaskFixture) => void; task: TaskFixture }) {
  return <button aria-label={`MESSAGES message for ${task.room}: ${task.action}`} className="message-row br-grid-card br-grid-card-full" onClick={() => onOpen?.(task)} type="button"><strong>{task.room}</strong><span>{task.action}</span><StatusBadge value={task.status} /></button>;
}
