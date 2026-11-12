import { MapPin, Navigation } from 'lucide-react'
import type { Branch } from './pizzetta-map-types'

type UserLocation = { latitude: number; longitude: number } | null

export function PizzettaBranchMap({ branch, location }: { branch: Branch; location: UserLocation }) {
  const delta = 0.015
  const bbox = `${branch.longitude - delta},${branch.latitude - delta},${branch.longitude + delta},${branch.latitude + delta}`
  const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${branch.latitude},${branch.longitude}`
  const route = location ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${location.latitude},${location.longitude};${branch.latitude},${branch.longitude}` : `https://www.openstreetmap.org/?mlat=${branch.latitude}&mlon=${branch.longitude}#map=16/${branch.latitude}/${branch.longitude}`
  return <section className="placed-map-card" aria-label={`Map to ${branch.name}`}><div className="placed-map-heading"><div><span className="world-kicker">PICKUP MAP</span><strong>{branch.name}</strong><small>{branch.address}</small></div><MapPin size={24} /></div><iframe title={`Map showing ${branch.name}`} src={embed} loading="lazy" referrerPolicy="no-referrer" /><div className="placed-map-actions"><span>{location ? 'Route calculated from your location' : 'Location permission unavailable'}</span><a href={route} target="_blank" rel="noreferrer"><Navigation size={15} /> Open directions</a></div></section>
}
