import { D1Repository } from './repository';

export type RoomOccupancyState = 'VACANT' | 'RESERVED' | 'OCCUPIED';

export type PhysicalOccupancyEvidence = 'CHECKED_IN' | 'CHECKED_OUT' | 'NOT_RECORDED';
export type OccupancyProjection = {
  room_id: string;
  declared_occupancy: 'VACANT' | 'OCCUPIED' | 'UNKNOWN';
  declared_occupancy_as_of: string | null;
  contractual_status: 'NONE' | 'UPCOMING' | 'ACTIVE' | 'ENDED' | 'TERMINATED';
  contractual_tenancy_id: string | null;
  physical_occupancy_evidence: PhysicalOccupancyEvidence;
  allocation_availability: 'AVAILABLE' | 'BLOCKED';
  reconciliation_status: 'CONSISTENT' | 'REVIEW_REQUIRED';
  reconciliation_issues: string[];
};

export const getRoomOccupancy = async (repo: D1Repository, unitId: string) => {
  const tenancy = await repo.first("SELECT t.id,t.person_id,t.unit_id,t.start_at,t.end_at,t.status,c.id AS check_in_id,c.actual_check_in_at FROM tenancies t LEFT JOIN tenancy_check_ins c ON c.tenancy_id=t.id WHERE t.unit_id=? AND t.status IN ('UPCOMING','ACTIVE') ORDER BY t.start_at LIMIT 1", unitId);
  if (!tenancy) return { state: 'VACANT' as RoomOccupancyState, tenancy: null };
  if (tenancy.check_in_id) return { state: 'OCCUPIED' as RoomOccupancyState, tenancy };
  return { state: 'RESERVED' as RoomOccupancyState, tenancy };
};

/** Read-only projection; it never creates or updates operational records. */
export const getOccupancyProjection = async (repo: D1Repository, unitId: string): Promise<OccupancyProjection> => {
  const room = await repo.first('SELECT u.id,u.status,rm.declared_occupancy,rm.occupancy_as_of FROM units u LEFT JOIN room_master_data rm ON rm.unit_id=u.id WHERE u.id=?', unitId);
  if (!room) return {
    room_id: unitId,
    declared_occupancy: 'UNKNOWN',
    declared_occupancy_as_of: null,
    contractual_status: 'NONE',
    contractual_tenancy_id: null,
    physical_occupancy_evidence: 'NOT_RECORDED',
    allocation_availability: 'AVAILABLE',
    reconciliation_status: 'REVIEW_REQUIRED',
    reconciliation_issues: ['DECLARATION_MISSING'],
  };
  const [currentTenancy, latestTenancy, allocationCount] = await Promise.all([
    repo.first("SELECT id,status FROM tenancies WHERE unit_id=? AND status IN ('UPCOMING','ACTIVE') ORDER BY start_at LIMIT 1", unitId),
    repo.first('SELECT id,status FROM tenancies WHERE unit_id=? ORDER BY COALESCE(end_at,start_at) DESC LIMIT 1', unitId),
    repo.first("SELECT COUNT(*) AS count FROM tenancies WHERE unit_id=? AND status IN ('UPCOMING','ACTIVE')", unitId),
  ]);
  const tenancyId = String(currentTenancy?.id ?? latestTenancy?.id ?? '');
  const [checkIn, checkout] = tenancyId ? await Promise.all([
    repo.first('SELECT id,actual_check_in_at FROM tenancy_check_ins WHERE tenancy_id=?', tenancyId),
    repo.first('SELECT id,actual_check_out_at FROM tenancy_checkouts WHERE tenancy_id=?', tenancyId),
  ]) : [null, null];
  const declared = room.declared_occupancy === 'VACANT' || room.declared_occupancy === 'OCCUPIED' ? room.declared_occupancy : 'UNKNOWN';
  const contractualStatus = String(currentTenancy?.status ?? latestTenancy?.status ?? 'NONE') as OccupancyProjection['contractual_status'];
  const physical: PhysicalOccupancyEvidence = checkout ? 'CHECKED_OUT' : checkIn ? 'CHECKED_IN' : 'NOT_RECORDED';
  const issues: string[] = [];
  if (declared === 'UNKNOWN') issues.push('DECLARATION_MISSING');
  if (declared === 'OCCUPIED' && !checkIn) issues.push('DECLARED_OCCUPIED_WITHOUT_CHECK_IN');
  if (Number(allocationCount?.count ?? 0) > 0 && room.status === 'AVAILABLE') issues.push('UNIT_AVAILABLE_WITH_ACTIVE_TENANCY');
  if (currentTenancy?.status === 'ACTIVE' && !checkIn) issues.push('ACTIVE_WITHOUT_CHECK_IN');
  if (checkout && declared === 'OCCUPIED') issues.push('CHECKED_OUT_BUT_DECLARED_OCCUPIED');
  return {
    room_id: unitId,
    declared_occupancy: declared,
    declared_occupancy_as_of: room.occupancy_as_of ? String(room.occupancy_as_of) : null,
    contractual_status: contractualStatus,
    contractual_tenancy_id: currentTenancy?.id ? String(currentTenancy.id) : null,
    physical_occupancy_evidence: physical,
    allocation_availability: room.status === 'OFF_MARKET' || Number(allocationCount?.count ?? 0) > 0 || declared === 'OCCUPIED' ? 'BLOCKED' : 'AVAILABLE',
    reconciliation_status: issues.length ? 'REVIEW_REQUIRED' : 'CONSISTENT',
    reconciliation_issues: issues,
  };
};

export const getTenancyOperationalState = async (repo: D1Repository, tenancyId: string) => {
  const checkIn = await repo.first('SELECT id,actual_check_in_at,performed_by,created_at FROM tenancy_check_ins WHERE tenancy_id=?', tenancyId);
  const checkOut = await repo.first('SELECT id,actual_check_out_at,performed_by,created_at FROM tenancy_checkouts WHERE tenancy_id=?', tenancyId);
  const [contract, tenantId, electricity, water, wifi, documents, readings] = await Promise.all([
    repo.first("SELECT id,reference,label,created_at FROM tenancy_documents WHERE tenancy_id=? AND document_type='CONTRACT' ORDER BY created_at DESC LIMIT 1", tenancyId),
    repo.first("SELECT id,reference,label,created_at FROM tenancy_documents WHERE tenancy_id=? AND document_type='TENANT_ID' ORDER BY created_at DESC LIMIT 1", tenancyId),
    repo.first("SELECT id,reading_value,recorded_at,reading_kind FROM utility_readings WHERE tenancy_id=? AND utility_type='ELECTRICITY' AND reading_kind='OPENING' ORDER BY recorded_at DESC LIMIT 1", tenancyId),
    repo.first("SELECT id,reading_value,recorded_at,reading_kind FROM utility_readings WHERE tenancy_id=? AND utility_type='WATER' AND reading_kind='OPENING' ORDER BY recorded_at DESC LIMIT 1", tenancyId),
    repo.first('SELECT id,provider,plan_name,speed_mbps,monthly_amount_centavos,selected_at,ended_at FROM tenancy_wifi_selections WHERE tenancy_id=? AND ended_at IS NULL ORDER BY selected_at DESC LIMIT 1', tenancyId),
    repo.all('SELECT id,document_type,reference,label,created_at,updated_at FROM tenancy_documents WHERE tenancy_id=? ORDER BY created_at DESC', tenancyId),
    repo.all('SELECT id,utility_type,reading_kind,reading_value,recorded_at FROM utility_readings WHERE tenancy_id=? ORDER BY recorded_at DESC', tenancyId),
  ]);
  const checklist = { check_in: Boolean(checkIn), contract_reference: Boolean(contract), tenant_id_reference: Boolean(tenantId), electricity_opening_reading: Boolean(electricity), water_opening_reading: Boolean(water), wifi_selection: Boolean(wifi) };
  return { check_in: checkIn, check_out: checkOut, contract, tenant_id: tenantId, electricity_opening_reading: electricity, water_opening_reading: water, wifi, documents, readings, checklist, incomplete_items: Object.entries(checklist).filter(([, complete]) => !complete).map(([key]) => key), complete: Object.values(checklist).every(Boolean) };
};
