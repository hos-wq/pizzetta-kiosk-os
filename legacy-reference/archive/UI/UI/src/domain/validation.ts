import type { Contract, Operation, Payment, Tenancy, UtilityReading } from './entities.ts';
import type { ContractStatus, DateOnly, OperationStatus } from './enums.ts';

export type ValidationError = { code: string; field: string; message: string };
export type Result<T> = { value: T; errors: readonly [] } | { value?: undefined; errors: readonly ValidationError[] };

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
export function compareDateOnly(left: DateOnly, right: DateOnly): number { return left < right ? -1 : left > right ? 1 : 0; }
export function validateDateOnly(value: string, field: string): ValidationError | undefined {
  if (!datePattern.test(value)) return { code: 'INVALID_DATE_ONLY', field, message: `${field} must use YYYY-MM-DD.` };
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? { code: 'INVALID_DATE_ONLY', field, message: `${field} is not a valid calendar date.` } : undefined;
}

export function validateTenancy(tenancy: Pick<Tenancy, 'roomId' | 'personIds' | 'startDate' | 'endDate'>): readonly ValidationError[] {
  const errors = [validateDateOnly(tenancy.startDate, 'startDate'), tenancy.endDate ? validateDateOnly(tenancy.endDate, 'endDate') : undefined].filter((error): error is ValidationError => Boolean(error));
  if (!tenancy.roomId) errors.push({ code: 'ROOM_REQUIRED', field: 'roomId', message: 'A tenancy requires a room.' });
  if (tenancy.personIds.length === 0) errors.push({ code: 'PERSON_REQUIRED', field: 'personIds', message: 'A tenancy requires at least one person.' });
  if (tenancy.endDate && compareDateOnly(tenancy.startDate, tenancy.endDate) > 0) errors.push({ code: 'INVALID_DATE_RANGE', field: 'endDate', message: 'Tenancy end date cannot precede its start date.' });
  return errors;
}

export function findConflictingTenancies(candidate: Pick<Tenancy, 'roomId' | 'startDate' | 'endDate' | 'status'>, existing: readonly Tenancy[]): readonly Tenancy[] {
  if (candidate.status === 'CANCELLED') return [];
  const candidateEnd = candidate.endDate ?? '9999-12-31';
  return existing.filter((item) => item.roomId === candidate.roomId && item.status !== 'CANCELLED' && candidate.startDate <= (item.endDate ?? '9999-12-31') && item.startDate <= candidateEnd);
}

export function operationIdentity(operation: Pick<Operation, 'roomId' | 'object' | 'action'>): string { return `${operation.roomId}|${operation.object.trim().toLowerCase()}|${operation.action.trim().toLowerCase()}`; }
export function hasDuplicateActiveOperation(candidate: Pick<Operation, 'roomId' | 'object' | 'action' | 'status'>, existing: readonly Operation[]): boolean { return existing.some((item) => item.status !== 'DONE' && candidate.status !== 'DONE' && operationIdentity(item) === operationIdentity(candidate)); }
export function derivePaymentStatus(payment: Pick<Payment, 'amountDue' | 'amountReceived' | 'dueDate' | 'paymentDate' | 'status'>, today: DateOnly): Payment['status'] {
  if (payment.status === 'CANCELLED') return 'CANCELLED';
  if (payment.amountDue && payment.amountReceived && payment.amountReceived.amountMinor >= payment.amountDue.amountMinor) return 'PAID';
  return payment.dueDate < today ? 'OVERDUE' : 'DUE';
}
export function deriveContractStatus(contract: Pick<Contract, 'effectiveDate' | 'expirationDate' | 'status'>, today: DateOnly): ContractStatus {
  if (contract.status === 'CANCELLED') return 'CANCELLED';
  if (contract.effectiveDate > today) return 'DRAFT';
  if (contract.expirationDate && contract.expirationDate < today) return 'EXPIRED';
  return 'ACTIVE';
}
const operationTransitions: Record<OperationStatus, readonly OperationStatus[]> = { PENDING: ['PENDING', 'IN PROGRESS', 'DONE'], 'IN PROGRESS': ['IN PROGRESS', 'DONE'], DONE: ['DONE'] };
export function canTransitionOperationStatus(from: OperationStatus, to: OperationStatus): boolean { return operationTransitions[from].includes(to); }
export function validateUtilityReadingChronology(readings: readonly UtilityReading[]): readonly ValidationError[] {
  const errors: ValidationError[] = [];
  for (let index = 1; index < readings.length; index += 1) if (readings[index - 1].utilityAccountId === readings[index].utilityAccountId && readings[index - 1].readingDate >= readings[index].readingDate) errors.push({ code: 'READING_ORDER', field: 'readingDate', message: 'Utility readings must be chronological.' });
  return errors;
}
