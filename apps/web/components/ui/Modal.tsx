"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, footer, maxWidth = "max-w-2xl" }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const handleKeydown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeydown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeydown);
      previousFocusRef.current?.focus();
    };
  }, [open, handleKeydown]);

  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`flex max-h-[90vh] w-full ${maxWidth} flex-col rounded-[var(--radius-modal)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl outline-none animate-in zoom-in-95 duration-150`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
            <h2 id={titleId} className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h2>
            <button
              type="button"
              aria-label="닫기"
              className="rounded p-1 text-[var(--color-tertiary)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              onClick={onClose}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
