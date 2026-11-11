export type AssignmentCandidate = {
  id: string
  name: string
  latitude: number
  longitude: number
  wait_minutes: number
  orders_paused: number
}

export type AssignmentInput = {
  latitude?: number
  longitude?: number
  requestedBranchId?: string
}

const toRadians = (value: number) => value * Math.PI / 180

export const distanceKm = (from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) => {
  const earthKm = 6371
  const dLat = toRadians(to.latitude - from.latitude)
  const dLon = toRadians(to.longitude - from.longitude)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLon / 2) ** 2
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function chooseBranch(input: AssignmentInput, candidates: AssignmentCandidate[]) {
  const available = candidates.filter(candidate => !candidate.orders_paused)
  if (!available.length) throw new Error('All Pizzetta branches are temporarily paused')
  const origin = typeof input.latitude === 'number' && typeof input.longitude === 'number' ? { latitude: input.latitude, longitude: input.longitude } : null
  const ranked = available.map(candidate => ({ candidate, distance: origin ? distanceKm(origin, candidate) : Number.POSITIVE_INFINITY }))
  ranked.sort((left, right) => {
    if (origin && left.distance !== right.distance) return left.distance - right.distance
    if (left.candidate.wait_minutes !== right.candidate.wait_minutes) return left.candidate.wait_minutes - right.candidate.wait_minutes
    return left.candidate.id.localeCompare(right.candidate.id)
  })
  return { ...ranked[0].candidate, distance_km: Number.isFinite(ranked[0].distance) ? Number(ranked[0].distance.toFixed(2)) : null, assignment_reason: origin ? 'nearest_open_branch' : 'lowest_wait_open_branch' }
}
