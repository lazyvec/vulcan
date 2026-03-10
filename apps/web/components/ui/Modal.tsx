"use client";

import { useCallback, useEffect, useRef } from "react";
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

  const handleKeydown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [open, handleKeydown]);

  // Focus trap: focus dialog on open
  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`flex max-h-[90vh] w-full ${maxWidth} flex-col rounded-[var(--radius-modal)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl outline-none animate-in zoom-in-95 duration-150`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h2>
            <button
              type="button"
              className="rounded p-1 text-[var(--color-tertiary)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              onClick={onClose}
            >
              <X size={18} />
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
