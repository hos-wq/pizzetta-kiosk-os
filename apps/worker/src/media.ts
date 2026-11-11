import { ApiError, now } from './repository';

export type MediaRepository = { all(sql: string, ...args: unknown[]): Promise<Record<string, unknown>[]>; first(sql: string, ...args: unknown[]): Promise<Record<string, unknown> | null>; run(sql: string, ...args: unknown[]): Promise<unknown>; audit(action: string, entityType: string, entityId: string, payload: unknown): Promise<void> };
export type MediaEnv = { CLOUDINARY_CLOUD_NAME?: string; CLOUDINARY_API_KEY?: string; CLOUDINARY_API_SECRET?: string; CLOUDINARY_UPLOAD_FOLDER?: string };

const entityTables: Record<string, string> = { PERSON: 'persons', TENANCY: 'tenancies', UNIT: 'units', MAINTENANCE: 'maintenance_issues', INVENTORY_ASSET: 'inventory_assets', UTILITY_READING: 'utility_readings', CHECK_IN: 'tenancy_check_ins', CHECK_OUT: 'tenancy_checkouts' };
const sensitivePurposes = new Set(['PERSON_ID_DOCUMENT', 'TENANCY_CONTRACT']);
const accessClasses = new Set(['PUBLIC', 'OPERATIONAL', 'SENSITIVE']);
const presetConfig = { ID_DOCUMENT: { maxDimension: 2400, quality: 0.8 }, METER_EVIDENCE: { maxDimension: 2000, quality: 0.75 }, CONDITION: { maxDimension: 1600, quality: 0.7 }, OPERATIONAL: { maxDimension: 1600, quality: 0.7 } } as const;
export function mediaPreset(name?: string) { return name ? presetConfig[name as keyof typeof presetConfig] ?? presetConfig.OPERATIONAL : presetConfig.OPERATIONAL; }

async function assertOwner(repo: MediaRepository, entityType: string, entityId: string) {
  const table = entityTables[entityType];
  if (!table) throw new ApiError(422, 'INVALID_ENTITY_TYPE', 'Unsupported media owner');
  if (!await repo.first(`SELECT id FROM ${table} WHERE id=?`, entityId)) throw new ApiError(404, 'NOT_FOUND', 'Media owner not found');
}

export async function listMedia(repo: MediaRepository, query: { entity_type?: string; entity_id?: string; purpose?: string; include_archived?: boolean }) {
  const conditions: string[] = []; const args: unknown[] = [];
  if (query.entity_type) { conditions.push('entity_type=?'); args.push(query.entity_type); }
  if (query.entity_id) { conditions.push('entity_id=?'); args.push(query.entity_id); }
  if (query.purpose) { conditions.push('purpose=?'); args.push(query.purpose); }
  if (!query.include_archived) conditions.push("status='ACTIVE'");
  return repo.all(`SELECT * FROM media_records${conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT 100`, ...args);
}

export async function createMedia(repo: MediaRepository, input: Record<string, unknown>, actor: string) {
  const entityType = String(input.entity_type); const entityId = String(input.entity_id); const purpose = String(input.purpose); const provider = String(input.provider ?? 'CLOUDINARY'); await assertOwner(repo, entityType, entityId);
  const accessClass = String(input.access_class ?? (sensitivePurposes.has(purpose) ? 'SENSITIVE' : 'OPERATIONAL')); if (!accessClasses.has(accessClass)) throw new ApiError(422, 'INVALID_ACCESS_CLASS', 'Unsupported media access class');
  if (sensitivePurposes.has(purpose) && provider === 'CLOUDINARY') throw new ApiError(422, 'SENSITIVE_MEDIA_PROVIDER', 'Identity documents and contracts must use an external private document provider');
  if (provider === 'CLOUDINARY' && !input.cloudinary_public_id && !input.cloudinary_asset_id) throw new ApiError(422, 'CLOUDINARY_REFERENCE_REQUIRED', 'A completed Cloudinary upload reference is required');
  const id = crypto.randomUUID(); const timestamp = now();
  await repo.run('INSERT INTO media_records (id,cloudinary_asset_id,cloudinary_public_id,reference_url,mime_type,format,width,height,byte_size,purpose,access_class,entity_type,entity_id,status,uploaded_by,created_at,updated_at,provider,transformation_preset) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', id, input.cloudinary_asset_id ?? null, input.cloudinary_public_id ?? null, input.reference_url ?? null, input.mime_type ?? null, input.format ?? null, input.width ?? null, input.height ?? null, input.byte_size ?? null, purpose, accessClass, entityType, entityId, 'ACTIVE', actor, timestamp, timestamp, provider, input.transformation_preset ?? null);
  await repo.audit('CREATE', 'media_record', id, { purpose, provider, access_class: input.access_class ?? 'OPERATIONAL', entity_type: entityType, entity_id: entityId });
  return repo.first('SELECT * FROM media_records WHERE id=?', id);
}

export async function updateMedia(repo: MediaRepository, id: string, input: Record<string, unknown>, actor: string) {
  const current = await repo.first('SELECT * FROM media_records WHERE id=?', id); if (!current) throw new ApiError(404, 'NOT_FOUND', 'Media record not found');
  const status = input.status ? String(input.status) : undefined; if (status && !['ACTIVE','ARCHIVED','REPLACED'].includes(status)) throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid media status');
  const purpose = input.purpose ? String(input.purpose) : String(current.purpose); const provider = String(current.provider ?? 'CLOUDINARY'); const accessClass = input.access_class ? String(input.access_class) : String(current.access_class); if (!accessClasses.has(accessClass)) throw new ApiError(422, 'INVALID_ACCESS_CLASS', 'Unsupported media access class'); if (sensitivePurposes.has(purpose) && provider === 'CLOUDINARY') throw new ApiError(422, 'SENSITIVE_MEDIA_PROVIDER', 'Identity documents and contracts must use the private document provider');
  if (status === 'REPLACED' && !input.replaced_by && !current.replaced_by) throw new ApiError(422, 'REPLACEMENT_REQUIRED', 'Replacement media must be identified');
  const fields = Object.entries(input).filter(([key]) => ['status','reference_url','cloudinary_public_id','purpose','access_class','replaced_by'].includes(key));
  if (status && !['ACTIVE','ARCHIVED','REPLACED'].includes(status)) throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid media status');
  if (!fields.length) return current;
  const retiredAt = status === 'ARCHIVED' || status === 'REPLACED' ? now() : null;
  await repo.run(`UPDATE media_records SET ${fields.map(([key]) => `${key}=?`).join(',')},retired_at=?,updated_at=? WHERE id=?`, ...fields.map(([, value]) => value), retiredAt, now(), id);
  await repo.audit('UPDATE', 'media_record', id, { fields: fields.map(([key]) => key), actor });
  return repo.first('SELECT * FROM media_records WHERE id=?', id);
}

async function sha1Hex(value: string) {
  const bytes = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createCloudinaryUploadSignature(env: MediaEnv, input: { entity_type: string; entity_id: string; purpose: string; transformation_preset?: string }, repo?: MediaRepository) {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) throw new ApiError(503, 'MEDIA_PROVIDER_UNCONFIGURED', 'Cloudinary is not configured');
  if (sensitivePurposes.has(input.purpose)) throw new ApiError(422, 'SENSITIVE_MEDIA_PROVIDER', 'Sensitive identity documents and contracts use the private document provider');
  if (!entityTables[input.entity_type]) throw new ApiError(422, 'INVALID_ENTITY_TYPE', 'Unsupported media owner');
  if (repo) await assertOwner(repo, input.entity_type, input.entity_id);
  const timestamp = Math.floor(Date.now() / 1000); const folder = env.CLOUDINARY_UPLOAD_FOLDER?.trim() || 'br-os'; const publicId = `${folder}/${input.entity_type.toLowerCase()}/${input.entity_id}/${crypto.randomUUID()}`;
  const params = { folder, public_id: publicId, timestamp: String(timestamp) };
  const toSign = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('&');
  const signature = await sha1Hex(`${toSign}${env.CLOUDINARY_API_SECRET}`);
  return { cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, timestamp, public_id: publicId, signature, upload_url: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/auto/upload`, preset: mediaPreset(input.transformation_preset) };
}
