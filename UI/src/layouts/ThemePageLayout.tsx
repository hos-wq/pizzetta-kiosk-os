import type { ReactNode } from 'react';
import { IconButton } from '../components/ActionControls';
import { Icon } from '../components/Icon';
import { MessageComposer } from '../components/MessageComposer';

export type ThemePageKey = 'LISTING' | 'PEOPLE' | 'TODAY' | 'CALENDAR' | 'SERVICES' | 'FINANCIAL';

type ThemePageLayoutProps = {
  activePage: ThemePageKey;
  children: ReactNode;
  presentation?: 'showcase' | 'application';
  moniqueMessage?: string;
  moniqueChoices?: readonly { id: string; label: string }[];
  onMoniqueChoice?: (id: string) => void;
  moniqueOpen: boolean;
  moniqueValue: string;
  onMoniqueChange: (value: string) => void;
  onMoniqueClose: () => void;
  onMoniqueOpen: () => void;
  onMoniqueSend: () => void;
  onPageChange: (page: ThemePageKey) => void;
};

const navigation: Array<{ key: ThemePageKey; icon: 'listing' | 'people' | 'dashboard' | 'calendar' | 'services' | 'financial' }> = [
  { key: 'LISTING', icon: 'listing' }, { key: 'PEOPLE', icon: 'people' }, { key: 'TODAY', icon: 'dashboard' }, { key: 'CALENDAR', icon: 'calendar' }, { key: 'SERVICES', icon: 'services' }, { key: 'FINANCIAL', icon: 'financial' },
];

export function ThemePageLayout({ activePage, children, moniqueChoices = [], onMoniqueChoice, moniqueMessage, moniqueOpen, moniqueValue, onMoniqueChange, onMoniqueClose, onMoniqueOpen, onMoniqueSend, onPageChange, presentation = 'showcase' }: ThemePageLayoutProps) {
  const content = <><div className="monique-hanger-wrap"><button aria-expanded={moniqueOpen} aria-label="Open Monique" className="monique-hanger" onClick={onMoniqueOpen} type="button"><span className="monique-hanger-bar" /></button>{moniqueOpen && <section aria-label="Monique command interface" className="monique-panel"><div className="monique-panel-heading"><strong>MONIQUE</strong><IconButton icon="clear" label="Close Monique" onClick={onMoniqueClose} /></div><MessageComposer label="MONIQUE" name="monique-command" onChange={onMoniqueChange} onSend={onMoniqueSend} value={moniqueValue} />{moniqueMessage && <p role="status" className="monique-result">{moniqueMessage}</p>}{moniqueChoices.length > 0 && <div aria-label="Monique choices" className="monique-choices">{moniqueChoices.map((choice) => <button key={choice.id} onClick={() => onMoniqueChoice?.(choice.id)} type="button">{choice.label}</button>)}</div>}</section>}</div>{children}</>;
  const footer = <nav aria-label="Application footer" className="theme-page-footer">{navigation.map(({ key, icon }) => <button aria-current={activePage === key ? 'page' : undefined} aria-label={key} className={activePage === key ? 'is-active' : ''} key={key} onClick={() => onPageChange(key)} type="button"><Icon name={icon} /></button>)}</nav>;
  if (presentation === 'application') return <section aria-label={`${activePage} page`} className="theme-application-shell"><div className="theme-application-content">{content}</div>{footer}</section>;
  return <section aria-label={`${activePage} page`} className="theme-page-stage"><div className="theme-device-frame"><div className="theme-device-statusbar"><span>9:41</span><span>BR OS</span></div><div className="theme-device-content">{content}</div>{footer}</div></section>;
}
