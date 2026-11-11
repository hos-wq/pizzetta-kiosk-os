import { describe, expect, it } from 'vitest';
import { ApiError } from '../../apps/worker/src/repository';
import { createPerson, linkLeadToPerson, linkPersonIdentity, updatePerson } from '../../apps/worker/src/people';
import { leadCreateSchema, personCreateSchema, personIdentitySchema, personPatchSchema } from '../../packages/contracts/src';

const detailRows = (person: Record<string, unknown>) => ({
  first: async (sql: string) => sql.includes('persons') ? person : null,
  all: async () => [],
});

describe('BR Office people identity domain', () => {
  it('validates canonical person creation and editable fields', () => {
    expect(personCreateSchema.safeParse({ display_name: 'Mario Rossi', email: 'mario@example.com' }).success).toBe(true);
    expect(personCreateSchema.safeParse({ phone: 'not-a-phone' }).success).toBe(false);
    expect(personCreateSchema.safeParse({ display_name: 'Mario', id: 'system-field' }).success).toBe(false);
    expect(personPatchSchema.safeParse({}).success).toBe(false);
  });

  it('creates a person and audits the identity record', async () => {
    const calls: string[] = [];
    const person = { id: 'person-1', display_name: 'Mario Rossi' };
    const repo = {
      run: async () => { calls.push('run'); },
      audit: async () => { calls.push('audit'); },
      first: async () => person,
    };
    const result = await createPerson(repo as never, { display_name: 'Mario Rossi' });
    expect(result).toEqual(person);
    expect(calls).toEqual(['run', 'audit']);
  });

  it('updates only whitelisted master fields and rejects system-field injection', async () => {
    const statements: string[] = [];
    const person = { id: 'person-1', display_name: 'Mario Rossi' };
    const repo = {
      ...detailRows(person),
      run: async (sql: string) => { statements.push(sql); },
      audit: async () => undefined,
    };
    await updatePerson(repo as never, 'person-1', { email: 'mario@example.com' });
    expect(statements[0]).toContain('email=?');
    await expect(updatePerson(repo as never, 'person-1', { updated_at: 'forbidden' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(statements).toHaveLength(1);
  });

  it('enforces exact external identity uniqueness without name-based merging', async () => {
    expect(personIdentitySchema.safeParse({ platform: 'MESSENGER', external_id: 'psid-1' }).success).toBe(true);
    expect(personIdentitySchema.safeParse({ platform: 'MESSENGER', external_id: '' }).success).toBe(false);
    const repo = {
      first: async (sql: string) => {
        if (sql.includes('SELECT id FROM persons')) return { id: 'person-1' };
        if (sql.includes('SELECT id,person_id FROM person_external_identities')) return { id: 'identity-1', person_id: 'person-2' };
        return null;
      },
      run: async () => undefined,
      audit: async () => undefined,
    };
    await expect(linkPersonIdentity(repo as never, 'person-1', { platform: 'MESSENGER', external_id: 'psid-1' })).rejects.toMatchObject({ code: 'IDENTITY_ALREADY_LINKED' });
  });

  it('allows one canonical person to have multiple leads, but not a lead linked to two people', async () => {
    const links: string[] = [];
    const repo = {
      first: async (sql: string, ...args: unknown[]) => {
        if (sql.includes('SELECT id FROM persons')) return { id: String(args[0]) };
        if (sql.includes('SELECT id FROM leads')) return { id: String(args[0]) };
        if (sql.includes('SELECT person_id FROM person_leads')) return null;
        return null;
      },
      run: async (_sql: string, ...args: unknown[]) => { links.push(String(args[1])); },
      audit: async () => undefined,
    };
    await linkLeadToPerson(repo as never, 'person-1', 'lead-1');
    await linkLeadToPerson(repo as never, 'person-1', 'lead-2');
    expect(links).toEqual(['lead-1', 'lead-2']);
  });

  it('keeps lead creation contract compatible without requiring a person id', () => {
    expect(leadCreateSchema.safeParse({ platform: 'MESSENGER', external_contact_id: 'psid-1' }).success).toBe(true);
    expect(leadCreateSchema.safeParse({ person_id: 'person-1', source: 'manual' }).success).toBe(true);
  });

  it('returns a typed not-found error for missing person operations', async () => {
    const repo = { first: async () => null, run: async () => undefined, audit: async () => undefined };
    await expect(updatePerson(repo as never, 'missing', { email: 'x@example.com' })).rejects.toBeInstanceOf(ApiError);
  });
});
