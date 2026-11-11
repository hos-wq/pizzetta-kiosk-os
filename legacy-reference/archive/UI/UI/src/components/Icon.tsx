import { Building2, CalendarDays, Check, ChevronDown, Clock3, LayoutDashboard, MessageCircle, Plus, Send, Sparkles, Users, Wallet, Wrench, X } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

export type IconName = 'add' | 'calendar' | 'check' | 'chevron-down' | 'clear' | 'clock' | 'dashboard' | 'financial' | 'housekeeping' | 'listing' | 'maintenance' | 'messages' | 'people' | 'send' | 'services';

const iconRegistry = { add: Plus, calendar: CalendarDays, check: Check, 'chevron-down': ChevronDown, clear: X, clock: Clock3, dashboard: LayoutDashboard, financial: Wallet, housekeeping: Sparkles, listing: Building2, maintenance: Wrench, messages: MessageCircle, people: Users, send: Send, services: Wrench } as const;

type IconProps = Omit<LucideProps, 'name'> & { name: IconName; label?: string };

export function Icon({ name, label, size = '1.1em', strokeWidth = 1.8, ...props }: IconProps) {
  const Component = iconRegistry[name];
  return <Component aria-hidden={label ? undefined : true} aria-label={label} focusable="false" size={size} strokeWidth={strokeWidth} {...props} />;
}
