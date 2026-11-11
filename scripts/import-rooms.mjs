#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve(import.meta.dirname, '..')
const datasetPath = resolve(root, 'data/seed/br-os-rooms.v1.json')
const data = JSON.parse(readFileSync(datasetPath, 'utf8'))
const args = new Set(process.argv.slice(2))
const value = (name, fallback) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : fallback }
const sqlQuote = (input) => input === null || input === undefined ? 'NULL' : `'${String(input).replaceAll("'", "''")}'`
const jsonQuote = (input) => sqlQuote(JSON.stringify(input))
const now = '2026-10-15T00:00:00.000Z'
const canonicalIds = ['BR•02', 'BR•03', 'BR•04', 'BR•05', 'BR•07', 'BR•08', 'BR•09', 'BR•10', 'BR•27', 'BR•32']
const assert = (condition, message) => { if (!condition) throw new Error(message) }

assert(data.schema_version === 'br-os-rooms.v1', 'Unsupported dataset schema version')
assert(data.rooms.length === 10, 'Dataset must contain exactly ten rooms')
assert(JSON.stringify(data.rooms.map((room) => room.display_id)) === JSON.stringify(canonicalIds), 'Canonical room ordering or identifiers do not match')
assert(data.buildings.length === 2, 'Dataset must contain exactly two buildings')
assert(data.rooms.filter((room) => room.occupancy === 'OCCUPIED').length === 2, 'Dataset must contain exactly two occupied rooms')
assert(data.rooms.filter((room) => room.occupancy === 'VACANT').length === 8, 'Dataset must contain exactly eight vacant rooms')
for (const room of data.rooms) assert(data.buildings.some((building) => building.key === room.building_key), `Unknown building ${room.building_key}`)

const definitions = [
  ['room_type', 'GENERAL', 'Room type', 'TEXT'], ['area_m2', 'GENERAL', 'Area (m²)', 'NUMBER'], ['floor', 'GENERAL', 'Floor', 'INTEGER'], ['orientation', 'GENERAL', 'Orientation', 'TEXT'], ['view', 'GENERAL', 'View', 'TEXT'], ['occupancy', 'GENERAL', 'Declared occupancy', 'ENUM'],
  ['bed_size', 'AMENITY', 'Bed size', 'ENUM'], ['balcony', 'AMENITY', 'Balcony', 'BOOLEAN'], ['dining_table', 'AMENITY', 'Dining table', 'BOOLEAN'], ['dining_set', 'AMENITY', 'Dining set', 'BOOLEAN'], ['dining_seats', 'AMENITY', 'Dining seats', 'INTEGER'], ['dining_work_table', 'AMENITY', 'Dining/work table', 'BOOLEAN'], ['refrigerator_freezer', 'AMENITY', 'Refrigerator/freezer', 'BOOLEAN'], ['microwave', 'AMENITY', 'Microwave oven', 'BOOLEAN'], ['electric_kettle', 'AMENITY', 'Electric kettle', 'BOOLEAN'], ['hot_cold_shower', 'AMENITY', 'Hot and cold shower', 'BOOLEAN'], ['bidet', 'AMENITY', 'Bidet', 'BOOLEAN'], ['in_room_safe', 'AMENITY', 'In-room safe', 'BOOLEAN'], ['smart_tv', 'AMENITY', 'Smart TV', 'BOOLEAN'], ['tv_inches', 'AMENITY', 'TV size (in)', 'INTEGER'], ['air_conditioner', 'AMENITY', 'Air conditioner', 'JSON'], ['ac_hp', 'AMENITY', 'AC horsepower', 'NUMBER'], ['black_curtains', 'AMENITY', 'Black curtains', 'BOOLEAN'], ['wardrobe', 'AMENITY', 'Wardrobe', 'ENUM'], ['universal_sockets', 'AMENITY', 'Universal electrical sockets', 'BOOLEAN'], ['usb_connectivity', 'AMENITY', 'USB connectivity', 'BOOLEAN'], ['sofa_bed', 'AMENITY', 'Sofa bed', 'BOOLEAN'], ['dedicated_work_desk', 'AMENITY', 'Dedicated work desk', 'BOOLEAN'], ['kitchen', 'AMENITY', 'Kitchen', 'ENUM'], ['induction_cooker', 'AMENITY', 'Induction cooker', 'BOOLEAN'], ['quiet_room', 'AMENITY', 'Quiet room', 'BOOLEAN'], ['indoor_veranda', 'AMENITY', 'Indoor veranda', 'BOOLEAN']
]
const attrId = (key) => `room-attribute-${key}`
const unitExpression = (room) => `(SELECT id FROM units WHERE actual_unit_number IN (${sqlQuote(room.physical_unit_number)},${sqlQuote(`U-${room.physical_unit_number}`)}) OR id IN (${sqlQuote(room.display_id)},${sqlQuote(room.display_id.replace('•', '·'))}) ORDER BY CASE WHEN actual_unit_number=${sqlQuote(room.physical_unit_number)} THEN 0 WHEN actual_unit_number=${sqlQuote(`U-${room.physical_unit_number}`)} THEN 1 ELSE 2 END LIMIT 1)`
const add = (lines, sql) => lines.push(`${sql};`)
// Wrangler's D1 file executor rejects explicit BEGIN/COMMIT statements. The generated
// statements remain idempotent; a Worker-side D1 batch can be used when strict atomicity
// is required by a deployment wrapper.
const lines = []

for (const building of data.buildings) add(lines, `INSERT INTO buildings (id,stable_key,name,address,address_verification,created_at,updated_at) VALUES (${sqlQuote(`building-${building.key}`)},${sqlQuote(building.key)},${sqlQuote(building.name)},${sqlQuote(building.address)},${sqlQuote(building.address_verification)},${sqlQuote(now)},${sqlQuote(now)}) ON CONFLICT(stable_key) DO UPDATE SET name=excluded.name,address=excluded.address,address_verification=excluded.address_verification,updated_at=excluded.updated_at`)
for (const [key, category, label, type] of definitions) add(lines, `INSERT INTO room_attribute_definitions (id,attribute_key,category,label,value_type,options_json,created_at,updated_at) VALUES (${sqlQuote(attrId(key))},${sqlQuote(key)},${sqlQuote(category)},${sqlQuote(label)},${sqlQuote(type)},${key === 'occupancy' ? sqlQuote('["VACANT","OCCUPIED"]') : 'NULL'},${sqlQuote(now)},${sqlQuote(now)}) ON CONFLICT(attribute_key) DO UPDATE SET label=excluded.label,value_type=excluded.value_type,updated_at=excluded.updated_at`)

for (const room of data.rooms) {
  const unit = unitExpression(room)
  const legacyId = room.display_id.replace('•', '·')
  add(lines, `INSERT INTO room_import_conflicts (id,import_version,unit_id,canonical_display_id,field_key,existing_value_json,incoming_value_json,resolution,created_at) SELECT lower(hex(randomblob(16))),'br-os-rooms.v1',NULL,${sqlQuote(room.display_id)},'missing_unit',NULL,${jsonQuote({ physical_unit_number: room.physical_unit_number, building_key: room.building_key })},'REVIEW_REQUIRED',${sqlQuote(now)} WHERE NOT EXISTS (SELECT 1 FROM units WHERE actual_unit_number IN (${sqlQuote(room.physical_unit_number)},${sqlQuote(`U-${room.physical_unit_number}`)}) OR id IN (${sqlQuote(room.display_id)},${sqlQuote(legacyId)})) ON CONFLICT(import_version,unit_id,field_key,incoming_value_json) DO NOTHING`)
  add(lines, `INSERT INTO room_import_conflicts (id,import_version,unit_id,canonical_display_id,field_key,existing_value_json,incoming_value_json,resolution,created_at) SELECT lower(hex(randomblob(16))),'br-os-rooms.v1',u.id,${sqlQuote(room.display_id)},'room_type',json_quote(u.type),${jsonQuote(room.room_type)},'PRESERVED_EXISTING',${sqlQuote(now)} FROM units u WHERE u.id=${unit} AND u.type<>${sqlQuote(room.room_type)} ON CONFLICT(import_version,unit_id,field_key,incoming_value_json) DO NOTHING`)
  add(lines, `INSERT INTO room_import_conflicts (id,import_version,unit_id,canonical_display_id,field_key,existing_value_json,incoming_value_json,resolution,created_at) SELECT lower(hex(randomblob(16))),'br-os-rooms.v1',t.unit_id,${sqlQuote(room.display_id)},'declared_occupancy',json_quote(t.status),${jsonQuote(room.occupancy)},'REVIEW_REQUIRED',${sqlQuote(now)} FROM tenancies t WHERE t.unit_id=${unit} AND t.status IN ('UPCOMING','ACTIVE') AND ${sqlQuote(room.occupancy)}='VACANT' ON CONFLICT(import_version,unit_id,field_key,incoming_value_json) DO NOTHING`)
  add(lines, `INSERT INTO room_master_data (unit_id,display_name,building,address,orientation,view_classification,view_description,acoustic_characteristics,sleeping_configuration,standard_max_occupancy,furnished,created_at,updated_at,canonical_display_id,physical_unit_number,room_type,geometry_json,declared_occupancy,occupancy_as_of) SELECT ${unit},${sqlQuote(room.display_id)},${sqlQuote(data.buildings.find((building) => building.key === room.building_key).name)},${sqlQuote(data.buildings.find((building) => building.key === room.building_key).address)},${sqlQuote(room.orientation)},${sqlQuote(room.view.includes('No view') ? 'NO_VIEW' : 'CITY_VIEW')},${sqlQuote(room.view)},${sqlQuote(room.overrides.quiet_room ? 'QUIET_ROOM' : null)},${sqlQuote(room.overrides.sofa_bed ? 'QUEEN_BED_PLUS_SOFA_BED' : 'QUEEN_BED')},NULL,'UNKNOWN',${sqlQuote(now)},${sqlQuote(now)},${sqlQuote(room.display_id)},${sqlQuote(room.physical_unit_number)},${sqlQuote(room.room_type)},${jsonQuote({ area_m2: room.area_m2, balcony: true, veranda: Boolean(room.overrides.indoor_veranda) })},${sqlQuote(room.occupancy)},${sqlQuote(data.effective_date)} WHERE ${unit} IS NOT NULL ON CONFLICT(unit_id) DO UPDATE SET display_name=COALESCE(room_master_data.display_name,excluded.display_name),canonical_display_id=COALESCE(room_master_data.canonical_display_id,excluded.canonical_display_id),physical_unit_number=COALESCE(room_master_data.physical_unit_number,excluded.physical_unit_number),room_type=COALESCE(room_master_data.room_type,excluded.room_type),declared_occupancy=excluded.declared_occupancy,occupancy_as_of=excluded.occupancy_as_of,updated_at=excluded.updated_at`)
  add(lines, `INSERT INTO room_buildings (unit_id,building_id,created_at,updated_at) SELECT ${unit},${sqlQuote(`building-${room.building_key}`)},${sqlQuote(now)},${sqlQuote(now)} WHERE ${unit} IS NOT NULL ON CONFLICT(unit_id) DO UPDATE SET building_id=excluded.building_id,updated_at=excluded.updated_at`)
  const values = { ...data.shared_amenities, ...room.overrides, room_type: room.room_type, area_m2: room.area_m2, floor: room.floor, orientation: room.orientation, view: room.view, occupancy: room.occupancy, tv_inches: room.tv_inches, ac_hp: room.ac_hp, wardrobe: room.wardrobe }
  for (const [key, category, label, type] of definitions) if (values[key] !== undefined) add(lines, `INSERT INTO room_attribute_values (unit_id,definition_id,value_json,source,created_at,updated_at) SELECT ${unit},${sqlQuote(attrId(key))},${jsonQuote(values[key])},'CANONICAL_DATASET',${sqlQuote(now)},${sqlQuote(now)} WHERE ${unit} IS NOT NULL ON CONFLICT(unit_id,definition_id) DO UPDATE SET value_json=excluded.value_json,source=excluded.source,updated_at=excluded.updated_at`)
  add(lines, `INSERT INTO unit_features (unit_id,feature_key,feature_value) SELECT ${unit},'canonical_display_id',${sqlQuote(room.display_id)} WHERE ${unit} IS NOT NULL ON CONFLICT(unit_id,feature_key) DO UPDATE SET feature_value=excluded.feature_value`)
  add(lines, `INSERT INTO unit_features (unit_id,feature_key,feature_value) SELECT ${unit},'declared_occupancy',${sqlQuote(room.occupancy)} WHERE ${unit} IS NOT NULL ON CONFLICT(unit_id,feature_key) DO UPDATE SET feature_value=excluded.feature_value`)
}
const output = resolve(value('--out', resolve(root, 'data/seed/br-os-rooms.v1.generated.sql')))
writeFileSync(output, `${lines.join('\n')}\n`)
console.log(JSON.stringify({ valid: true, dataset: datasetPath, rooms: data.rooms.length, occupied: 2, vacant: 8, output, dry_run: args.has('--dry-run') }, null, 2))
if (!args.has('--apply')) process.exit(0)
const db = value('--database', 'boutique-rooms-os-rc')
const config = value('--config', 'wrangler.rc.toml')
const remote = args.has('--remote')
const wranglerArgs = ['wrangler', 'd1', 'execute', db, '--config', config, '--file', output]
if (remote) wranglerArgs.push('--remote')
const result = spawnSync('npx', wranglerArgs, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
process.exit(result.status ?? 1)
