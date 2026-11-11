import type { PersistenceStatus } from './Persistence';

export function PersistenceIndicator({ status, onRetry }: { status: PersistenceStatus; onRetry?: () => void }) {
  if (status === 'IDLE') return null;
  return <span aria-live="polite" className={'persistence-indicator persistence-' + status.toLowerCase()}>
    {status === 'ERROR' ? <><span>Not saved</span>{onRetry && <button onClick={onRetry} type="button">Retry</button>}</> : status}
  </span>;
}
