import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Ref } from 'react';
import { Icon, type IconName } from './Icon';

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; tone?: 'brass' | 'neutral' | 'quiet' };
type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; tone?: 'brass' | 'neutral'; buttonRef?: Ref<HTMLButtonElement> };

export function ActionButton({ children, tone = 'brass', className = '', ...props }: ActionButtonProps) { return <button className={`action-button action-${tone} ${className}`} {...props}>{children}</button>; }
export function IconButton({ buttonRef, icon, label, tone = 'neutral', className = '', ...props }: IconButtonProps) { return <button aria-label={label} className={`icon-button icon-${tone} ${className}`} ref={buttonRef} {...props}><Icon name={icon} /></button>; }
