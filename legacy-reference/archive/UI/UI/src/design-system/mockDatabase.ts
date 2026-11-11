import type { PersonFixture, RoomFixture, TaskFixture } from '../fixtures';

export type MockCalendarEvent = { id: string; date: string; title: string; meta: string; kind: 'ARRIVAL' | 'DEPARTURE' | 'MAINTENANCE' | 'PAYMENT' | 'INSPECTION' };
export type MockMessage = TaskFixture & { sender: string; time: string };

const roomSeeds: RoomFixture[] = [
  { id: 'BR·02', unit: 'U-1002', occupancy: 'READY', maintenance: 'NORMAL', housekeeping: 'READY', nextDate: '12 OCT', balcony: 'BALCONY · CITY' },
  { id: 'BR·03', unit: 'U-1003', occupancy: 'OCCUPIED', maintenance: 'NORMAL', housekeeping: 'IN PROGRESS', nextDate: '13 OCT' },
  { id: 'BR·04', unit: 'U-1004', occupancy: 'READY', maintenance: 'PENDING', housekeeping: 'READY', nextDate: '14 OCT' },
  { id: 'BR·05', unit: 'U-1005', occupancy: 'OCCUPIED', maintenance: 'NORMAL', housekeeping: 'DONE', nextDate: '15 OCT', balcony: 'BALCONY · NO VIEW' },
  { id: 'BR·07', unit: 'U-1007', occupancy: 'READY', maintenance: 'NORMAL', housekeeping: 'READY', nextDate: '16 OCT' },
  { id: 'BR·08', unit: 'U-1008', occupancy: 'OCCUPIED', maintenance: 'URGENT', housekeeping: 'PENDING', nextDate: '17 OCT' },
  { id: 'BR·09', unit: 'U-1009', occupancy: 'READY', maintenance: 'NORMAL', housekeeping: 'READY', nextDate: '18 OCT' },
  { id: 'BR·10', unit: 'U-1010', occupancy: 'OCCUPIED', maintenance: 'NORMAL', housekeeping: 'IN PROGRESS', nextDate: '19 OCT' },
  { id: 'BR·27', unit: 'U-2704B', occupancy: 'READY', maintenance: 'PENDING', housekeeping: 'READY', nextDate: '20 OCT', balcony: 'BALCONY · COURTYARD' },
  { id: 'BR·32', unit: 'U-3208', occupancy: 'OCCUPIED', maintenance: 'NORMAL', housekeeping: 'DONE', nextDate: '21 OCT' },
];

const peopleSeeds: PersonFixture[] = [
  { id: 'person-amelia', name: 'Amelia Tan', role: 'Housekeeping', room: 'BR·07', detail: 'Next inspection · 10:00' },
  { id: 'person-noah', name: 'Noah Reyes', role: 'Maintenance', room: 'BR·08', detail: 'Open task · air conditioning' },
  { id: 'person-mina', name: 'Mina Santos', role: 'Guest services', room: 'BR·18', detail: 'Arrival support · 14:30' },
  { id: 'person-elena', name: 'Elena Villanueva', role: 'Operations', room: 'BR·03', detail: 'Shift lead · today' },
  { id: 'person-luca', name: 'Luca Romano', role: 'Leasing', room: 'BR·12', detail: 'Contract review · 11:15' },
  { id: 'person-sora', name: 'Sora Kim', role: 'Finance', room: 'BR·27', detail: 'Payment follow-up · 13:00' },
  { id: 'person-jonas', name: 'Jonas Cruz', role: 'Security', room: 'BR·05', detail: 'Access audit · 16:00' },
  { id: 'person-ines', name: 'Ines Garcia', role: 'Guest services', room: 'BR·10', detail: 'Check-in support · 15:30' },
  { id: 'person-mateo', name: 'Mateo Silva', role: 'Maintenance', room: 'BR·32', detail: 'Preventive round · 09:30' },
  { id: 'person-rina', name: 'Rina Patel', role: 'Operations', room: 'BR·04', detail: 'Room readiness · 17:00' },
];

const taskSeeds: TaskFixture[] = [
  { id: 'mock-task-01', category: 'MAINTENANCE', room: 'BR·08', object: 'Air conditioning', action: 'Inspect unit', status: 'IN PROGRESS', priority: 'URGENT', service: 'Maintenance', macro: 'Room care', taxonomyCategory: 'Fixture' },
  { id: 'mock-task-02', category: 'HOUSEKEEPING', room: 'BR·03', object: 'Linen set', action: 'Prepare replacement', status: 'PENDING', priority: 'NORMAL', service: 'Housekeeping', macro: 'Room care', taxonomyCategory: 'Supply' },
  { id: 'mock-task-03', category: 'MAINTENANCE', room: 'BR·04', object: 'Bathroom light', action: 'Replace lamp', status: 'DONE', priority: 'NORMAL', service: 'Maintenance', macro: 'Repair', taxonomyCategory: 'Fixture' },
  { id: 'mock-task-04', category: 'HOUSEKEEPING', room: 'BR·10', object: 'Room reset', action: 'Complete inspection', status: 'IN PROGRESS', priority: 'NORMAL', service: 'Housekeeping', macro: 'Preparation', taxonomyCategory: 'Surface' },
  { id: 'mock-task-05', category: 'MAINTENANCE', room: 'BR·27', object: 'Water pressure', action: 'Check valve', status: 'PENDING', priority: 'NORMAL', service: 'Maintenance', macro: 'Room care', taxonomyCategory: 'Fixture' },
  { id: 'mock-task-06', category: 'HOUSEKEEPING', room: 'BR·02', object: 'Welcome set', action: 'Stage arrival kit', status: 'PENDING', priority: 'NORMAL', service: 'Housekeeping', macro: 'Preparation', taxonomyCategory: 'Supply' },
  { id: 'mock-task-07', category: 'MAINTENANCE', room: 'BR·32', object: 'Smoke detector', action: 'Test battery', status: 'DONE', priority: 'NORMAL', service: 'Maintenance', macro: 'Inspection', taxonomyCategory: 'Safety' },
  { id: 'mock-task-08', category: 'HOUSEKEEPING', room: 'BR·05', object: 'Curtains', action: 'Steam fabric', status: 'IN PROGRESS', priority: 'NORMAL', service: 'Housekeeping', macro: 'Preparation', taxonomyCategory: 'Surface' },
  { id: 'mock-task-09', category: 'MAINTENANCE', room: 'BR·09', object: 'Door lock', action: 'Calibrate latch', status: 'PENDING', priority: 'URGENT', service: 'Maintenance', macro: 'Repair', taxonomyCategory: 'Security' },
  { id: 'mock-task-10', category: 'HOUSEKEEPING', room: 'BR·07', object: 'Bathroom supply', action: 'Restock amenities', status: 'DONE', priority: 'NORMAL', service: 'Housekeeping', macro: 'Room care', taxonomyCategory: 'Supply' },
];

const calendarSeeds: MockCalendarEvent[] = [
  { id: 'mock-event-01', date: '2026-10-12', title: 'Amelia arrival inspection', meta: 'BR·07 · 10:00', kind: 'INSPECTION' },
  { id: 'mock-event-02', date: '2026-10-13', title: 'Noah maintenance round', meta: 'BR·08 · 11:30', kind: 'MAINTENANCE' },
  { id: 'mock-event-03', date: '2026-10-14', title: 'Room readiness review', meta: 'BR·04 · 09:00', kind: 'INSPECTION' },
  { id: 'mock-event-04', date: '2026-10-15', title: 'Tenant departure', meta: 'BR·05 · 12:00', kind: 'DEPARTURE' },
  { id: 'mock-event-05', date: '2026-10-16', title: 'New tenant arrival', meta: 'BR·07 · 15:00', kind: 'ARRIVAL' },
  { id: 'mock-event-06', date: '2026-10-17', title: 'Payment due', meta: 'BR·08 · 17:00', kind: 'PAYMENT' },
  { id: 'mock-event-07', date: '2026-10-18', title: 'Preventive inspection', meta: 'BR·09 · 09:30', kind: 'INSPECTION' },
  { id: 'mock-event-08', date: '2026-10-19', title: 'Housekeeping turnover', meta: 'BR·10 · 13:00', kind: 'MAINTENANCE' },
  { id: 'mock-event-09', date: '2026-10-20', title: 'Lease signing', meta: 'BR·27 · 14:00', kind: 'ARRIVAL' },
  { id: 'mock-event-10', date: '2026-10-21', title: 'Rent payment review', meta: 'BR·32 · 16:00', kind: 'PAYMENT' },
];

const messageSeeds: MockMessage[] = taskSeeds.map((task, index) => ({ ...task, category: 'MESSAGES', sender: peopleSeeds[index].name, time: `${9 + index}:30` }));

export const mockDatabase = { rooms: roomSeeds, people: peopleSeeds, tasks: taskSeeds, events: calendarSeeds, messages: messageSeeds } as const;

export function mockEventsForDate(date: string) { return mockDatabase.events.filter((event) => event.date === date); }
