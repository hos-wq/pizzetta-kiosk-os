import { Plus } from 'lucide-react'

type CreateActionProps = { label: string; controls?: string; expanded?: boolean; disabled?: boolean; onClick: () => void }

/** DS-067: reusable contextual, icon-only create affordance. */
export function CreateAction({ label, controls, expanded, disabled, onClick }: CreateActionProps) {
  return <button type="button" className="br-create-action" aria-label={label} aria-controls={controls} aria-expanded={controls ? expanded : undefined} disabled={disabled} onClick={onClick}><Plus aria-hidden="true" size={22} strokeWidth={1.8} /></button>
}
