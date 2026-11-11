import type { RoomFixture } from '../fixtures';
import type { RoomImage } from '../design-system/roomImageCatalog';

type RoomCardProps = { image?: RoomImage; onOpen: (room: RoomFixture) => void; room: RoomFixture; selected?: boolean };

export function RoomCard({ image, onOpen, room, selected = false }: RoomCardProps) {
  const occupancy = room.occupancy === 'READY' ? 'VACANT' : room.occupancy;
  const occupancyClass = occupancy.toLowerCase().replaceAll(' ', '-');
  return <button aria-label={`Open ${room.displayId ?? room.id} room details. Occupancy: ${occupancy}.`} aria-pressed={selected} className={`room-card br-theme-surface br-grid-card br-grid-card-full${selected ? ' is-selected' : ''}`} onClick={() => onOpen(room)} type="button">
    <span className="room-card-grid br-grid-card-full"><span className="room-card-media-grid br-grid-cell"><span className={`room-card-media${image?.background ? ` has-${image.background}-background` : ''}`}>{image?.src ? <img alt={image.alt} className="room-card-image" loading="lazy" referrerPolicy="no-referrer" src={image.src} /> : image?.background ? null : 'IMAGE NOT AVAILABLE'}</span></span><span className="room-card-content-grid br-grid-card-content"><span className="room-card-heading-grid br-grid-card-content"><strong className="room-card-id">{room.displayId ?? room.id}</strong><span aria-hidden="true" className={`occupancy-underline occupancy-${occupancyClass}`} /></span><span className="field-sr-only">Occupancy: {occupancy}</span><span className="room-card-projection">Declared {room.declaredOccupancy ?? 'UNKNOWN'} · Physical {room.physicalOccupancyEvidence ?? 'NOT_RECORDED'} · Allocation {room.allocationAvailability ?? 'UNKNOWN'}</span>{room.tenancySummary && <span className="room-card-tenancy">{room.tenancySummary}</span>}</span></span>
  </button>;
}
