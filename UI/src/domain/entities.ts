import type { CalendarEventType, ContractStatus, DateOnly, OperationCategory, OperationPriority, OperationStatus, PaymentStatus, RoomOccupancy, TenancyStatus, UtilityCategory } from './enums.ts';

export type DomainSource = 'DEVELOPMENT_FIXTURE' | 'USER_CREATED' | 'PERSISTED';
export type Money = { amountMinor: number; currency: 'PHP' };

export type Room = {
  internalId: string;
  publicId: string;
  unitNumber: string;
  buildingId: string;
  occupancy: RoomOccupancy;
  balcony?: boolean;
  view?: 'NO VIEW' | 'CITY' | 'COURTYARD' | 'UNKNOWN';
  amenities: readonly string[];
  source: DomainSource;
};

export type Person = { internalId: string; name: string; roles: readonly string[]; source: DomainSource; detail?: string };
export type Tenancy = { internalId: string; roomId: string; personIds: readonly string[]; startDate: DateOnly; endDate?: DateOnly; status: TenancyStatus; source: DomainSource };
export type Contract = { internalId: string; tenancyId: string; effectiveDate: DateOnly; expirationDate?: DateOnly; rent?: Money; deposit?: Money; paymentSchedule?: 'MONTHLY' | 'WEEKLY' | 'OTHER'; status: ContractStatus; source: DomainSource };
export type Payment = { internalId: string; contractId: string; amountDue?: Money; amountReceived?: Money; dueDate: DateOnly; paymentDate?: DateOnly; status: PaymentStatus; source: DomainSource };
export type UtilityAccount = { internalId: string; roomId: string; category: UtilityCategory; provider?: string; accountReference?: string; source: DomainSource };
export type UtilityReading = { internalId: string; utilityAccountId: string; readingDate: DateOnly; value: number; unit: string; source: DomainSource };
export type Operation = { internalId: string; roomId: string; category: OperationCategory; object: string; action: string; priority: OperationPriority; status: OperationStatus; createdAt?: string; completedAt?: string; service?: string; macro?: string; taxonomyCategory?: string; source: DomainSource };
export type CalendarEvent = { internalId: string; date: DateOnly; type: CalendarEventType; sourceId: string; roomId?: string; title: string; source: DomainSource };
