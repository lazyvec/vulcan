"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: number;
  type: ToastType;
  text: string;
}

interface ToastContextValue {
  toast: (type: ToastType, text: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} className="shrink-0" aria-hidden="true" />,
  error: <XCircle size={16} className="shrink-0" aria-hidden="true" />,
  info: <Info size={16} className="shrink-0" aria-hidden="true" />,
};

const toastStyles: Record<ToastType, string> = {
  success: "bg-[var(--color-success-bg)] text-[var(--color-success-text)] border-[var(--color-success-border)]",
  error: "bg-[var(--color-destructive-bg)] text-[var(--color-destructive-text)] border-[var(--color-destructive-border)]",
  info: "bg-[var(--color-info-bg)] text-[var(--color-info-text)] border-[var(--color-info-border)]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, text: string) => {
    const id = ++idRef.current;
    setToasts((prev) => {
      const next = [...prev, { id, type, text }];
      return next.length > 5 ? next.slice(-5) : next;
    });
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.length > 0 && (
        <div
          role="region"
          aria-label="알림"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              role={t.type === "error" ? "alert" : "status"}
              className={`flex items-center gap-2 rounded-[var(--radius-card)] border px-4 py-3 text-sm shadow-lg ${toastStyles[t.type]}`}
            >
              {icons[t.type]}
              <span className="flex-1">{t.text}</span>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => removeToast(t.id)}
                className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
