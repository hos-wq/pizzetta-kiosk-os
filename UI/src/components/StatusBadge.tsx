type StatusBadgeProps = { value: string; className?: string };

export function StatusBadge({ value, className = '' }: StatusBadgeProps) {
  const statusClass = value.toLowerCase().replaceAll(' ', '-');
  return <span className={`semantic-status br-theme-status status-${statusClass} ${className}`.trim()}>{value}</span>;
}
