import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export type ShellSection = 'LISTING' | 'PEOPLE' | 'TODAY' | 'CALENDAR' | 'SERVICES';

type ApplicationShellProps = {
  activeSection: ShellSection;
  children: ReactNode;
  onSectionChange: (section: ShellSection) => void;
};

const navigation: Array<{ icon: IconName; label: ShellSection }> = [
  { icon: 'listing', label: 'LISTING' },
  { icon: 'people', label: 'PEOPLE' },
  { icon: 'dashboard', label: 'TODAY' },
  { icon: 'calendar', label: 'CALENDAR' },
  { icon: 'services', label: 'SERVICES' },
];

export function ApplicationShell({ activeSection, children, onSectionChange }: ApplicationShellProps) {
  return <div className="application-shell br-theme-borderless">
    <div className="shell-content">{children}</div>
    <nav aria-label="Primary sections" className="shell-footer">
      <div className="shell-footer-grid">
        {navigation.map(({ icon, label }) => <button aria-current={activeSection === label ? 'page' : undefined} aria-label={label} className={`shell-footer-tile${activeSection === label ? ' is-active' : ''}`} key={label} onClick={() => onSectionChange(label)} type="button"><Icon name={icon} size="1.35rem" /></button>)}
      </div>
    </nav>
  </div>;
}
