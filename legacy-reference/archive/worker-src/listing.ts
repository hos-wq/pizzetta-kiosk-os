import { ApiError, D1Repository, now } from './repository';

type ValueType = 'TEXT' | 'INTEGER' | 'BOOLEAN' | 'ENUM';
type Definition = { key: string; category: string; label: string; type: ValueType; options?: string[] };
type ListingInput = { expected_updated_at?: string; unit_fields?: Record<string, unknown>; fields?: Record<string, unknown> };

export const LISTING_DEFINITIONS: Definition[] = [
  { key: 'city', category: 'ROOM_GENERAL', label: 'CITY', type: 'TEXT' },
  { key: 'neighborhood', category: 'ROOM_GENERAL', label: 'NEIGHBORHOOD', type: 'TEXT' },
  { key: 'street', category: 'ROOM_GENERAL', label: 'STREET', type: 'TEXT' },
  { key: 'building', category: 'ROOM_GENERAL', label: 'BUILDING', type: 'TEXT' },
  { key: 'max_occupants', category: 'ROOM_GENERAL', label: 'MAX OCCUPANTS', type: 'INTEGER' },
  { key: 'balcony', category: 'ROOM_GENERAL', label: 'BALCONY', type: 'ENUM', options: ['TRUE', 'FALSE', 'UNKNOWN'] },
  { key: 'balcony_view', category: 'ROOM_GENERAL', label: 'BALCONY VIEW', type: 'TEXT' },
  { key: 'veranda', category: 'ROOM_GENERAL', label: 'VERANDA', type: 'ENUM', options: ['TRUE', 'FALSE', 'UNKNOWN'] },
  { key: 'quiet_room', category: 'ROOM_GENERAL', label: 'QUIET ROOM', type: 'ENUM', options: ['TRUE', 'FALSE', 'UNKNOWN'] },
  { key: 'furnishing', category: 'ROOM_AMENITIES', label: 'FURNISHING', type: 'ENUM', options: ['FURNISHED', 'PARTLY FURNISHED', 'UNFURNISHED', 'UNKNOWN'] },
  { key: 'bed_size', category: 'ROOM_AMENITIES', label: 'BED SIZE', type: 'ENUM', options: ['SINGLE', 'DOUBLE', 'QUEEN', 'KING', 'UNKNOWN'] },
  { key: 'wardrobe', category: 'ROOM_AMENITIES', label: 'WARDROBE', type: 'ENUM', options: ['TRUE', 'FALSE', 'UNKNOWN'] },
  { key: 'sofa', category: 'ROOM_AMENITIES', label: 'SOFA', type: 'ENUM', options: ['TRUE', 'FALSE', 'UNKNOWN'] },
  { key: 'dining_table', category: 'ROOM_AMENITIES', label: 'DINING TABLE', type: 'ENUM', options: ['TRUE', 'FALSE', 'UNKNOWN'] },
  { key: 'dining_seats', category: 'ROOM_AMENITIES', label: 'DINING SEATS', type: 'INTEGER' },
  { key: 'dining_set', category: 'ROOM_AMENITIES', label: 'DINING SET', type: 'ENUM', options: ['TRUE', 'FALSE', 'UNKNOWN'] },
  { key: 'workstation', category: 'ROOM_AMENITIES', label: 'WORKSTATION', type: 'ENUM', options: ['TRUE', 'FALSE', 'UNKNOWN'] },
  { key: 'kitchen_type', category: 'ROOM_AMENITIES', label: 'KITCHEN TYPE', type: 'ENUM', options: ['NONE', 'KITCHENETTE', 'FULL', 'UNKNOWN'] },
  ...['microwave', 'fridge', 'kettle', 'cooker', 'shower', 'bidet', 'vanity_mirror', 'water_heater', 'smart_tv', 'universal_socket', 'usb_socket', 'room_safe'].map(key => ({ key, category: 'ROOM_AMENITIES', label: key.replaceAll('_', ' ').toUpperCase(), type: 'ENUM' as ValueType, options: ['TRUE', 'FALSE', 'UNKNOWN'] })),
  { key: 'aircon_type', category: 'ROOM_AMENITIES', label: 'AIRCON TYPE', type: 'ENUM', options: ['WINDOW', 'SPLIT', 'UNKNOWN'] },
  { key: 'aircon_hp', category: 'ROOM_AMENITIES', label: 'AIRCON HP', type: 'INTEGER' },
  { key: 'aircon_inverter', category: 'ROOM_AMENITIES', label: 'AIRCON INVERTER', type: 'ENUM', options: ['TRUE', 'FALSE', 'UNKNOWN'] },
  { key: 'smart_tv_size', category: 'ROOM_AMENITIES', label: 'SMART TV SIZE', type: 'INTEGER' },
  { key: 'security', category: 'ROOM_BUILDING', label: 'SECURITY', type: 'ENUM', options: ['TRUE', 'FALSE', 'UNKNOWN'] },
  { key: 'elevators', category: 'ROOM_BUILDING', label: 'ELEVATORS', type: 'INTEGER' },
  ...['gym', 'laundry', 'parking', 'convenience_store'].map(key => ({ key, category: 'ROOM_BUILDING', label: key.replaceAll('_', ' ').toUpperCase(), type: 'ENUM' as ValueType, options: ['TRUE', 'FALSE', 'UNKNOWN'] })),
  { key: 'monthly_rent', category: 'TERMS_RENT_DURATION', label: 'MONTHLY RENT', type: 'INTEGER' },
  { key: 'minimum_stay', category: 'TERMS_RENT_DURATION', label: 'MINIMUM STAY', type: 'INTEGER' },
  { key: 'condo_dues', category: 'TERMS_RENT_DURATION', label: 'CONDO DUES', type: 'TEXT' },
  { key: 'deposit_months', category: 'TERMS_PAYMENT_TERMS', label: 'DEPOSIT', type: 'INTEGER' },
  { key: 'pdc', category: 'TERMS_PAYMENT_TERMS', label: 'PDC', type: 'ENUM', options: ['TRUE', 'FALSE', 'UNKNOWN'] },
  ...['pets', 'smoking', 'vaping'].map(key => ({ key, category: 'TERMS_HOUSE_RULES', label: key.toUpperCase(), type: 'ENUM' as ValueType, options: ['ALLOWED', 'NOT ALLOWED', 'BY APPROVAL', 'UNKNOWN'] })),
  { key: 'signed_contract', category: 'TERMS_CONTRACT_REQUIREMENTS', label: 'SIGNED CONTRACT', type: 'ENUM', options: ['REQUIRED', 'NOT REQUIRED', 'UNKNOWN'] },
  { key: 'valid_id', category: 'TERMS_CONTRACT_REQUIREMENTS', label: 'VALID ID', type: 'ENUM', options: ['REQUIRED', 'NOT REQUIRED', 'UNKNOWN'] },
];

const byKey = new Map(LISTING_DEFINITIONS.map(definition => [definition.key, definition]));
const masterMap: Record<string, string> = { building: 'building', max_occupants: 'standard_max_occupancy', minimum_stay: 'standard_minimum_months', advance_months: 'advance_months', deposit_months: 'security_deposit_months', condo_dues: 'association_dues_treatment' };
const unitKeys = new Set(['type', 'floor', 'sqm', 'monthly_rent']);
const unitMap: Record<string, string> = { monthly_rent: 'monthly_rent_centavos' };

function validateValue(definition: Definition, value: unknown) {
  if (value === null) return;
  if (definition.type === 'TEXT' && (typeof value !== 'string' || value.length > 500)) throw new ApiError(422, 'INVALID_LISTING_VALUE', `${definition.label} must be text`);
  if (definition.type === 'INTEGER' && (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 100000)) throw new ApiError(422, 'INVALID_LISTING_VALUE', `${definition.label} must be a non-negative integer`);
  if (definition.type === 'BOOLEAN' && typeof value !== 'boolean') throw new ApiError(422, 'INVALID_LISTING_VALUE', `${definition.label} must be boolean`);
  if (definition.type === 'ENUM' && (!definition.options?.includes(String(value)))) throw new ApiError(422, 'INVALID_LISTING_VALUE', `${definition.label} has an invalid value`);
}

function jsonValue(value: unknown) { return value === undefined ? null : JSON.stringify(value); }

export async function getListing(repo: D1Repository, unitId: string) {
  const unit = await repo.first('SELECT id,actual_unit_number,type,floor,sqm,status,updated_at,monthly_rent_centavos FROM units WHERE id=?', unitId);
  if (!unit) throw new ApiError(404, 'NOT_FOUND', 'Room not found');
  const master = await repo.first('SELECT * FROM room_master_data WHERE unit_id=?', unitId);
  const stored = await repo.all('SELECT field_key,category,label,value_type,value_json,options_json,system_defined,updated_at FROM room_listing_fields WHERE unit_id=? ORDER BY category,label,field_key', unitId);
  const storedByKey = new Map(stored.map(row => [String(row.field_key), row]));
  const fields = LISTING_DEFINITIONS.map(definition => {
    const row = storedByKey.get(definition.key);
    const masterKey = masterMap[definition.key];
    const value = row?.value_json !== undefined && row?.value_json !== null ? JSON.parse(String(row.value_json)) : unitMap[definition.key] ? unit?.[unitMap[definition.key]] ?? null : masterKey ? master?.[masterKey] ?? null : null;
    return { ...definition, value, system_defined: true, persisted: Boolean(row || masterKey) };
  });
  for (const row of stored) if (!byKey.has(String(row.field_key))) fields.push({ key: String(row.field_key), category: String(row.category), label: String(row.label), type: String(row.value_type) as ValueType, options: row.options_json ? JSON.parse(String(row.options_json)) : undefined, value: row.value_json == null ? null : JSON.parse(String(row.value_json)), system_defined: Number(row.system_defined) === 1, persisted: true });
  return { unit, fields };
}

export async function updateListing(repo: D1Repository, unitId: string, input: ListingInput, actor: string) {
  const current = await repo.first('SELECT id,updated_at FROM units WHERE id=?', unitId); if (!current) throw new ApiError(404, 'NOT_FOUND', 'Room not found');
  if (input.expected_updated_at && String(input.expected_updated_at) !== String(current.updated_at)) throw new ApiError(409, 'STALE_LISTING_UPDATE', 'The Room changed since it was loaded. Reload before saving.');
  const fieldEntries = Object.entries(input.fields ?? {}); const unitFields = [...Object.entries(input.unit_fields ?? {}), ...fieldEntries.filter(([key]) => unitMap[key])]; for (const [key, value] of unitFields) { if (!unitKeys.has(key)) throw new ApiError(422, 'INVALID_LISTING_FIELD', `Unsupported room field: ${key}`); if ((key === 'type' && (typeof value !== 'string' || !value.trim())) || ((key === 'floor' || key === 'sqm' || key === 'monthly_rent') && (!Number.isInteger(value) || Number(value) < 1))) throw new ApiError(422, 'INVALID_LISTING_VALUE', `${key} has an invalid value`); }
  const rows = await repo.all('SELECT field_key,category,label,value_type,options_json,system_defined FROM room_listing_fields WHERE unit_id=?', unitId); const existing = new Map(rows.map(row => [String(row.field_key), row]));
  for (const [key, value] of fieldEntries) { const definition = byKey.get(key); const row = existing.get(key); if (!definition && !row) throw new ApiError(422, 'INVALID_LISTING_FIELD', `Unknown listing field: ${key}`); const effective = definition ?? (row ? { key, category: String(row.category), label: String(row.label), type: String(row.value_type) as ValueType, options: row.options_json ? JSON.parse(String(row.options_json)) : undefined } : null); if (!effective) throw new ApiError(422, 'INVALID_LISTING_FIELD', `Unknown listing field: ${key}`); validateValue(effective, value); }
  const timestamp = now(); const statements: Array<{ sql: string; args: unknown[] }> = [];
  if (unitFields.length) statements.push({ sql: `UPDATE units SET ${unitFields.map(([key]) => `${unitMap[key] ?? key}=?`).join(',')},updated_at=? WHERE id=? AND updated_at=?`, args: [...unitFields.map(([, value]) => value), timestamp, unitId, current.updated_at] });
  const masterEntries = fieldEntries.filter(([key]) => masterMap[key]); if (masterEntries.length) { const masterCurrent = await repo.first('SELECT unit_id FROM room_master_data WHERE unit_id=?', unitId); if (!masterCurrent) statements.push({ sql: 'INSERT INTO room_master_data (unit_id,created_at,updated_at) VALUES (?,?,?)', args: [unitId, timestamp, timestamp] }); for (const [key, value] of masterEntries) statements.push({ sql: `UPDATE room_master_data SET ${masterMap[key]}=?,updated_at=? WHERE unit_id=?`, args: [value, timestamp, unitId] }); }
  for (const [key, value] of fieldEntries.filter(([key]) => !masterMap[key] && !unitMap[key])) { const definition = byKey.get(key) ?? existing.get(key)!; statements.push({ sql: 'INSERT INTO room_listing_fields (unit_id,field_key,category,label,value_type,value_json,options_json,system_defined,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(unit_id,field_key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at', args: [unitId, key, definition.category, definition.label, definition.type, jsonValue(value), definition.options ? JSON.stringify(definition.options) : null, byKey.has(key) ? 1 : Number(existing.get(key)?.system_defined ?? 0), timestamp, timestamp] }); }
  if (!statements.length) throw new ApiError(422, 'EMPTY_LISTING_UPDATE', 'At least one listing field is required');
  await repo.batch(statements); repo.setActor(actor); await repo.audit('UPDATE', 'room_listing', unitId, { fields: [...unitFields.map(([key]) => key), ...fieldEntries.map(([key]) => key)] }); return getListing(repo, unitId);
}

export async function createCustomListingField(repo: D1Repository, unitId: string, input: { category: string; label: string; value: unknown }, actor: string) {
  const unit = await repo.first('SELECT id FROM units WHERE id=?', unitId); if (!unit) throw new ApiError(404, 'NOT_FOUND', 'Room not found');
  const key = `custom_${crypto.randomUUID().replaceAll('-', '')}`; const timestamp = now(); const value = String(input.value ?? '');
  await repo.run('INSERT INTO room_listing_fields (unit_id,field_key,category,label,value_type,value_json,system_defined,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)', unitId, key, input.category, input.label.trim(), 'TEXT', JSON.stringify(value), 0, timestamp, timestamp); repo.setActor(actor); await repo.audit('CREATE', 'room_listing_field', key, { unit_id: unitId, category: input.category }); return getListing(repo, unitId);
}

export async function deleteCustomListingField(repo: D1Repository, unitId: string, fieldKey: string, actor: string) { const row = await repo.first('SELECT system_defined FROM room_listing_fields WHERE unit_id=? AND field_key=?', unitId, fieldKey); if (!row) throw new ApiError(404, 'NOT_FOUND', 'Listing field not found'); if (Number(row.system_defined) === 1) throw new ApiError(409, 'SYSTEM_FIELD_PROTECTED', 'System-defined fields cannot be deleted'); await repo.run('DELETE FROM room_listing_fields WHERE unit_id=? AND field_key=?', unitId, fieldKey); repo.setActor(actor); await repo.audit('DELETE', 'room_listing_field', fieldKey, { unit_id: unitId }); return getListing(repo, unitId); }
