import { useCallback, useEffect, useRef, useState } from 'react';

export type PersistenceStatus = 'IDLE' | 'SAVING' | 'SAVED' | 'ERROR';
export type PersistenceAdapter<T> = { save: (value: T) => Promise<void> };

export function useAutosave<T>(value: T, adapter: PersistenceAdapter<T> | undefined, delayMs = 250) {
  const [status, setStatus] = useState<PersistenceStatus>('IDLE');
  const [error, setError] = useState<unknown>(null);
  const sequenceRef = useRef(0);
  const mountedRef = useRef(true);
  const latestValueRef = useRef(value);
  const timerRef = useRef<number | undefined>(undefined);
  useEffect(() => () => {
    mountedRef.current = false;
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!adapter) return undefined;
    const sequence = ++sequenceRef.current;
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setStatus('SAVING');
      setError(null);
      void adapter.save(latestValueRef.current).then(() => {
        if (mountedRef.current && sequence === sequenceRef.current) setStatus('SAVED');
      }).catch((reason: unknown) => {
        if (mountedRef.current && sequence === sequenceRef.current) {
          setError(reason);
          setStatus('ERROR');
        }
      });
    }, delayMs);
    return () => { if (timerRef.current !== undefined) window.clearTimeout(timerRef.current); };
  }, [adapter, delayMs, value]);

  const retry = useCallback(() => {
    if (!adapter) return;
    setStatus('SAVING');
    setError(null);
    const sequence = ++sequenceRef.current;
    void adapter.save(latestValueRef.current).then(() => {
      if (mountedRef.current && sequence === sequenceRef.current) setStatus('SAVED');
    }).catch((reason: unknown) => {
      if (mountedRef.current && sequence === sequenceRef.current) {
        setError(reason);
        setStatus('ERROR');
      }
    });
  }, [adapter]);

  return { status, error, retry };
}
