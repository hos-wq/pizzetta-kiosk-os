import { useEffect, useId, useRef, type RefObject, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icon';
import { IconButton } from './ActionControls';

type UniversalLightboxProps = {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title?: string;
  recordId?: string;
  contextIcon?: IconName;
};

type LightboxHeaderProps = { title: string; recordId?: string; contextIcon?: IconName; titleId: string; closeRef: RefObject<HTMLButtonElement | null>; onClose: () => void };

export function LightboxHeader({ title, recordId, contextIcon, titleId, closeRef, onClose }: LightboxHeaderProps) {
  return <header className="lightbox-header">
    <div className="lightbox-heading">
      {contextIcon && <span aria-hidden="true" className="lightbox-context-icon"><Icon name={contextIcon} /></span>}
      <div className="lightbox-heading-copy">
        <h2 className="lightbox-title" id={titleId}>{title}</h2>
        {recordId && <span className="lightbox-record-id">{recordId}</span>}
      </div>
    </div>
    <IconButton aria-label="Close lightbox" buttonRef={closeRef} className="lightbox-close" icon="clear" label="Close lightbox" onClick={onClose} type="button" />
  </header>;
}

export function LightboxBody({ children, labelledBy }: { children: ReactNode; labelledBy: string }) {
  return <div aria-labelledby={labelledBy} className="lightbox-content">{children}</div>;
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.getAttribute('aria-hidden') !== 'true');
}

export function UniversalLightbox({ children, onClose, open, title = 'Universal Lightbox', recordId, contextIcon }: UniversalLightboxProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const invokerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    invokerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const appRoot = document.getElementById('root');
    const previousOverflow = document.body.style.overflow;
    const previousInert = appRoot?.inert ?? false;
    const previousAriaHidden = appRoot?.getAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';
    if (appRoot) {
      appRoot.inert = true;
      appRoot.setAttribute('aria-hidden', 'true');
    }
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0);
    const panel = panelRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const focusable = getFocusableElements(panel);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    panel?.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      panel?.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (appRoot) {
        appRoot.inert = previousInert;
        if (typeof previousAriaHidden === 'string') appRoot.setAttribute('aria-hidden', previousAriaHidden);
        else appRoot.removeAttribute('aria-hidden');
      }
      invokerRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;
  return createPortal(
    <div aria-label={title} className="lightbox-backdrop" data-universal-lightbox="true">
      <div aria-labelledby={titleId} aria-modal="true" className="lightbox-panel" data-lightbox-panel="true" ref={panelRef} role="dialog" tabIndex={-1}>
        <LightboxHeader closeRef={closeRef} contextIcon={contextIcon} onClose={onClose} recordId={recordId} title={title} titleId={titleId} />
        <LightboxBody labelledBy={titleId}>{children}</LightboxBody>
      </div>
    </div>,
    document.body,
  );
}
