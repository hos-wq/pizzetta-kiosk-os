import { Dialog } from '@base-ui/react/dialog'
import { useEffect, useRef, type ReactNode } from 'react'

export function BRLightbox({ open, onOpenChange, children, labelledBy, status }: { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode; labelledBy: string; status?: ReactNode }) {
  const previousFocus = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (open) previousFocus.current = document.activeElement as HTMLElement
    else previousFocus.current?.focus?.()
    document.body.classList.toggle('br-lightbox-open', open)
    return () => document.body.classList.remove('br-lightbox-open')
  }, [open])
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Backdrop className="br-lightbox-backdrop" /><Dialog.Viewport className="br-lightbox-viewport"><Dialog.Popup className="br-lightbox" aria-labelledby={labelledBy}>{status && <div className="br-lightbox-status">{status}</div>}<Dialog.Close className="br-lightbox-close" aria-label="Close"><span aria-hidden="true">×</span></Dialog.Close>{children}</Dialog.Popup></Dialog.Viewport></Dialog.Portal></Dialog.Root>
}

export function BRDialog({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Backdrop className="br-dialog-backdrop" /><Dialog.Viewport className="br-dialog-viewport"><Dialog.Popup className="br-dialog"><Dialog.Title className="br-dialog-title">{title}</Dialog.Title><Dialog.Close className="br-dialog-close" aria-label="Close"><span aria-hidden="true">×</span></Dialog.Close>{children}</Dialog.Popup></Dialog.Viewport></Dialog.Portal></Dialog.Root>
}
