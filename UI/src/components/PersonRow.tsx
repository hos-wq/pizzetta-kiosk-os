import type { PersonFixture } from '../fixtures';

type PersonRowProps = { person: PersonFixture; onOpen: (person: PersonFixture) => void };

export function PersonRow({ onOpen, person }: PersonRowProps) {
  return <button aria-label={`Open dossier for ${person.name}`} className="person-row br-theme-surface br-grid-card br-grid-card-full" onClick={() => onOpen(person)} type="button"><span className="person-main br-grid-card-content"><strong>{person.name}</strong><span>{person.role} · {person.room}</span></span><span className="person-detail">{person.detail}</span></button>;
}
