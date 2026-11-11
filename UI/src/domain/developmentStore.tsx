import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { mockDatabase } from '../design-system/mockDatabase';
import type { MockCalendarEvent } from '../design-system/mockDatabase';
import type { PersonFixture, RoomFixture, TaskFixture } from '../fixtures';

export type DevelopmentData = {
  rooms: RoomFixture[];
  people: PersonFixture[];
  tasks: TaskFixture[];
  events: MockCalendarEvent[];
};

type DevelopmentDataContextValue = {
  data: DevelopmentData;
  reset: () => void;
  addTask: (task: TaskFixture) => void;
  eventsForDate: (date: string) => readonly MockCalendarEvent[];
  occupancyForDate: (date: string) => number;
};

const STORAGE_KEY = 'br-os-development-data-v1';
const seed: DevelopmentData = {
  rooms: [...mockDatabase.rooms],
  people: [...mockDatabase.people],
  tasks: [...mockDatabase.tasks],
  events: [...mockDatabase.events],
};

function cloneSeed(): DevelopmentData {
  return { rooms: [...seed.rooms], people: [...seed.people], tasks: [...seed.tasks], events: [...seed.events] };
}

function loadData(): DevelopmentData {
  if (typeof window === 'undefined') return cloneSeed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneSeed();
    const value = JSON.parse(raw) as Partial<DevelopmentData>;
    return { rooms: value.rooms?.length ? value.rooms : seed.rooms, people: value.people?.length ? value.people : seed.people, tasks: value.tasks ?? seed.tasks, events: value.events ?? seed.events };
  } catch {
    return cloneSeed();
  }
}

const DevelopmentDataContext = createContext<DevelopmentDataContextValue | null>(null);

export function DevelopmentDataProvider({ children, storageKey = STORAGE_KEY }: { children: ReactNode; storageKey?: string }) {
  const [data, setData] = useState<DevelopmentData>(() => storageKey === STORAGE_KEY ? loadData() : cloneSeed());
  useEffect(() => { window.localStorage.setItem(storageKey, JSON.stringify(data)); }, [data, storageKey]);
  const value = useMemo<DevelopmentDataContextValue>(() => ({
    data,
    reset: () => setData(cloneSeed()),
    addTask: (task) => setData((current) => ({ ...current, tasks: [...current.tasks, task] })),
    eventsForDate: (date) => data.events.filter((event) => event.date === date),
    occupancyForDate: (date) => {
      const eventCount = data.events.filter((event) => event.date === date).length;
      const taskCount = data.tasks.filter((task) => data.rooms.find((room) => room.id === task.room)?.nextDate === new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)).toUpperCase()).length;
      return Math.min(1, (eventCount + taskCount) / 4);
    },
  }), [data]);
  return <DevelopmentDataContext.Provider value={value}>{children}</DevelopmentDataContext.Provider>;
}

// The provider and its hook intentionally share one module-level context.
// eslint-disable-next-line react-refresh/only-export-components
export function useDevelopmentData() {
  const value = useContext(DevelopmentDataContext);
  if (!value) throw new Error('useDevelopmentData must be used within DevelopmentDataProvider');
  return value;
}
