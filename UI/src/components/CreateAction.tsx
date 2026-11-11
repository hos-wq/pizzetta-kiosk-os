import type { ButtonHTMLAttributes } from 'react';
import { Icon } from './Icon';

type CreateActionProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  label: string;
  controls?: string;
  expanded?: boolean;
};

export function CreateAction({ label, controls, expanded, className = '', ...props }: CreateActionProps) {
  return <button aria-controls={controls} aria-expanded={controls ? expanded : undefined} aria-label={label} className={`create-action${className ? ` ${className}` : ''}`} type="button" {...props}><Icon name="add" size="1.35rem" /></button>;
}
