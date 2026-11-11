import type { Operation, Person, Room, Tenancy } from './entities.ts';

export type RepositoryError = { code: 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' | 'ADAPTER_ERROR'; message: string };
export type RepositoryResult<T> = { ok: true; value: T } | { ok: false; error: RepositoryError };
export interface DomainRepository {
  listRooms(): Promise<readonly Room[]>;
  listPeople(): Promise<readonly Person[]>;
  listTenancies(): Promise<readonly Tenancy[]>;
  createOperation(operation: Operation): Promise<RepositoryResult<Operation>>;
}
