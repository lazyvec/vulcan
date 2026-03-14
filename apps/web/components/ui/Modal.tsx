"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-[4px]"
          />

          {/* Modal Content */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`relative flex max-h-[92vh] w-full ${maxWidth} flex-col overflow-hidden border-glass-border bg-[var(--color-surface)] shadow-2xl outline-none md:rounded-[var(--radius-modal)] border md:max-h-[85vh] bottom-0 md:bottom-auto fixed md:relative rounded-t-[var(--radius-modal)] md:rounded-b-[var(--radius-modal)]`}
          >
            {/* Mobile Drag Handle */}
            <div className="flex w-full justify-center pt-3 pb-1 md:hidden">
              <div className="h-1.5 w-12 rounded-full bg-[var(--color-border)] opacity-40" />
            </div>

            {title && (
              <div className="flex items-center justify-between border-b border-glass-border px-6 py-4">
                <h2 id={titleId} className="text-lg font-bold tracking-tight text-[var(--color-foreground)]">{title}</h2>
                <button
                  type="button"
                  aria-label="닫기"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-tertiary)] transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  onClick={onClose}
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">{children}</div>

            {footer && (
              <div className="flex flex-col md:flex-row flex-wrap items-center justify-end gap-3 border-t border-glass-border bg-[var(--color-background)]/30 px-6 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
