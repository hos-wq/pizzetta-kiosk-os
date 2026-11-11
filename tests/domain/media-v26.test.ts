import { describe, expect, it } from 'vitest';
import { createCloudinaryUploadSignature, createMedia, listMedia, updateMedia } from '../../apps/worker/src/media';

function repoFactory() {
  const rows: Record<string, unknown>[] = []; const audits: unknown[][] = [];
  return {
    rows, audits,
    async first(sql: string, ...args: unknown[]) { if (sql.includes('FROM persons')) return { id: args[0] }; if (sql.includes('FROM media_records')) return rows.find(row => row.id === args[0]) ?? null; return null; },
    async all(sql: string) { return sql.includes("status='ACTIVE'") ? rows.filter(row => row.status === 'ACTIVE') : rows; },
    async run(sql: string, ...args: unknown[]) { if (sql.includes('INSERT INTO media_records')) rows.push({ id: args[0], purpose: args[9], access_class: args[10], entity_type: args[11], entity_id: args[12], status: args[13] }); },
    async audit(...args: unknown[]) { audits.push(args); },
  };
}

describe('V2.6 canonical media records', () => {
  it('creates a media reference with sensitive classification and audits it', async () => {
    const repo = repoFactory();
    const result = await createMedia(repo as never, { entity_type: 'PERSON', entity_id: 'person-1', purpose: 'PERSON_ID_DOCUMENT', provider: 'EXTERNAL', access_class: 'SENSITIVE', reference_url: 'https://private.example/id-1' }, 'owner');
    expect(result).toMatchObject({ purpose: 'PERSON_ID_DOCUMENT', access_class: 'SENSITIVE' });
    expect(repo.audits[0][0]).toBe('CREATE');
  });

  it('lists active media and archives without deleting history', async () => {
    const repo = repoFactory();
    await createMedia(repo as never, { entity_type: 'PERSON', entity_id: 'person-1', purpose: 'OTHER', cloudinary_public_id: 'operational/photo-1' }, 'owner');
    const media = repo.rows[0];
    await updateMedia(repo as never, String(media.id), { status: 'ARCHIVED' }, 'owner');
    expect(await listMedia(repo as never, { include_archived: false })).toHaveLength(1);
    expect(repo.rows).toHaveLength(1);
  });

  it('signs a Cloudinary upload without returning the API secret', async () => {
    const result = await createCloudinaryUploadSignature({ CLOUDINARY_CLOUD_NAME: 'demo', CLOUDINARY_API_KEY: 'key', CLOUDINARY_API_SECRET: 'secret' }, { entity_type: 'PERSON', entity_id: 'person-1', purpose: 'OTHER' });
    expect(result.upload_url).toContain('/demo/');
    expect(result.api_key).toBe('key');
    expect(result).not.toHaveProperty('api_secret');
  });

  it('rejects sensitive identity media on Cloudinary', async () => {
    const repo = repoFactory();
    await expect(createMedia(repo as never, { entity_type: 'PERSON', entity_id: 'person-1', purpose: 'PERSON_ID_DOCUMENT', cloudinary_public_id: 'id' }, 'owner')).rejects.toMatchObject({ code: 'SENSITIVE_MEDIA_PROVIDER' });
  });
  it('rejects reclassifying Cloudinary media as sensitive', async () => {
    const repo = repoFactory(); await createMedia(repo as never, { entity_type: 'PERSON', entity_id: 'person-1', purpose: 'ROOM_OPERATIONAL', cloudinary_public_id: 'asset', provider: 'CLOUDINARY' }, 'owner'); const media = repo.rows[0]; await expect(updateMedia(repo as never, String(media.id), { purpose: 'PERSON_ID_DOCUMENT' }, 'owner')).rejects.toMatchObject({ code: 'SENSITIVE_MEDIA_PROVIDER' });
  });
});
