export type RoomFixture = {
  id: string;
  displayId?: string;
  unit: string;
  occupancy: string;
  maintenance: string;
  housekeeping: string;
  nextDate: string;
  balcony?: string;
  declaredOccupancy?: string;
  physicalOccupancyEvidence?: string;
  allocationAvailability?: string;
  tenancySummary?: string;
};

export type PersonFixture = { id: string; name: string; role: string; room: string; detail: string };
export type TaskFixture = { id: string; category: 'MESSAGES' | 'MAINTENANCE' | 'HOUSEKEEPING' | 'ATTENTION'; room: string; object: string; action: string; status: string; priority: 'NORMAL' | 'URGENT'; sourceKind?: string; sourceId?: string; sourceStatus?: string; dueAt?: string; service?: string; macro?: string; taxonomyCategory?: string };

export const rooms: RoomFixture[] = [
  { id: 'BR·02', unit: 'U-1002', occupancy: 'READY', maintenance: 'NORMAL', housekeeping: 'READY', nextDate: '12 OCT' },
  { id: 'BR·03', unit: 'U-1003', occupancy: 'OCCUPIED', maintenance: 'NORMAL', housekeeping: 'IN PROGRESS', nextDate: '13 OCT' },
  { id: 'BR·04', unit: 'U-1004', occupancy: 'READY', maintenance: 'PENDING', housekeeping: 'READY', nextDate: '14 OCT' },
  { id: 'BR·05', unit: 'U-1005', occupancy: 'OCCUPIED', maintenance: 'NORMAL', housekeeping: 'DONE', nextDate: '15 OCT' },
  { id: 'BR·07', unit: 'U-1007', occupancy: 'READY', maintenance: 'NORMAL', housekeeping: 'READY', nextDate: '16 OCT', balcony: 'BALCONY · NO VIEW' },
  { id: 'BR·08', unit: 'U-1008', occupancy: 'OCCUPIED', maintenance: 'URGENT', housekeeping: 'PENDING', nextDate: '17 OCT' },
  { id: 'BR·09', unit: 'U-1009', occupancy: 'READY', maintenance: 'NORMAL', housekeeping: 'READY', nextDate: '18 OCT' },
  { id: 'BR·10', unit: 'U-1010', occupancy: 'OCCUPIED', maintenance: 'NORMAL', housekeeping: 'IN PROGRESS', nextDate: '19 OCT' },
  { id: 'BR·27', unit: 'U-2704B', occupancy: 'READY', maintenance: 'PENDING', housekeeping: 'READY', nextDate: '20 OCT' },
  { id: 'BR·32', unit: 'U-3208', occupancy: 'OCCUPIED', maintenance: 'NORMAL', housekeeping: 'DONE', nextDate: '21 OCT' },
];

export const people: PersonFixture[] = [
  { id: 'person-amelia', name: 'Amelia Tan', role: 'Housekeeping', room: 'BR·07', detail: 'Next inspection · 10:00' },
  { id: 'person-noah', name: 'Noah Reyes', role: 'Maintenance', room: 'BR·12', detail: 'Open task · fixture' },
  { id: 'person-mina', name: 'Mina Santos', role: 'Guest services', room: 'BR·18', detail: 'Arrival support · 14:30' },
  { id: 'person-elena', name: 'Elena Villanueva', role: 'Operations', room: 'BR·03', detail: 'Shift lead · today' },
];

export const tasks: TaskFixture[] = [
  { id: 'task-01', category: 'MESSAGES', room: 'BR·07', object: 'Guest note', action: 'Review arrival message', status: 'PENDING', priority: 'NORMAL' },
  { id: 'task-02', category: 'MAINTENANCE', room: 'BR·08', object: 'Air conditioning', action: 'Inspect unit', status: 'IN PROGRESS', priority: 'URGENT', service: 'Maintenance', macro: 'Room care', taxonomyCategory: 'Fixture' },
  { id: 'task-03', category: 'HOUSEKEEPING', room: 'BR·03', object: 'Linen set', action: 'Prepare replacement', status: 'PENDING', priority: 'NORMAL', service: 'Housekeeping', macro: 'Room care', taxonomyCategory: 'Supply' },
  { id: 'task-04', category: 'MAINTENANCE', room: 'BR·04', object: 'Bathroom light', action: 'Replace lamp', status: 'DONE', priority: 'NORMAL', service: 'Maintenance', macro: 'Repair', taxonomyCategory: 'Fixture' },
  { id: 'task-05', category: 'HOUSEKEEPING', room: 'BR·10', object: 'Room reset', action: 'Complete inspection', status: 'IN PROGRESS', priority: 'NORMAL', service: 'Housekeeping', macro: 'Preparation', taxonomyCategory: 'Surface' },
];

export const serviceTaxonomy = { services: ['Maintenance', 'Housekeeping'], macros: ['Room care', 'Repair', 'Preparation'], categories: ['Fixture', 'Surface', 'Supply'], objects: ['Air conditioning', 'Bathroom light', 'Linen set'], actions: ['Inspect', 'Replace', 'Prepare'] };

// Development-only relationships for the cascading Services prototype. No canonical production taxonomy is present yet.
export const serviceTaxonomyRelations = {
  Maintenance: { macros: ['Room care', 'Repair'], categories: { 'Room care': ['Fixture', 'Supply'], Repair: ['Fixture'] }, objects: { Fixture: ['Air conditioning', 'Bathroom light'], Supply: ['Linen set'] }, actions: { 'Air conditioning': ['Inspect'], 'Bathroom light': ['Inspect', 'Replace'], 'Linen set': ['Inspect'] } },
  Housekeeping: { macros: ['Room care', 'Preparation'], categories: { 'Room care': ['Supply'], Preparation: ['Surface', 'Supply'] }, objects: { Surface: ['Bathroom light'], Supply: ['Linen set'] }, actions: { 'Linen set': ['Prepare'], 'Bathroom light': ['Inspect'] } },
} as const;
