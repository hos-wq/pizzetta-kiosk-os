import type { ReactNode } from 'react';

type AdaptiveFieldFlowProps = { children: ReactNode; className?: string };

export function AdaptiveFieldFlow({ children, className = '' }: AdaptiveFieldFlowProps) {
  return <div className={`br-adaptive-field-flow adaptive-field-flow ${className}`.trim()}>{children}</div>;
}
