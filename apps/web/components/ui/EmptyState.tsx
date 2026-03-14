"use client";

import { Inbox } from "lucide-react";
import { motion } from "framer-motion";
import { useMounted } from "@/hooks/useMounted";

interface EmptyStateProps {
  icon?: React.ReactNode;
  message: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, message, action, className = "" }: EmptyStateProps) {
  const mounted = useMounted();

  if (!mounted) return <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`} />;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 scale-150 rounded-full bg-[var(--color-primary-bg)] blur-2xl opacity-50" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-glass-border bg-[var(--color-surface)] text-[var(--color-tertiary)] shadow-xl">
          {icon ?? <Inbox size={36} strokeWidth={1.5} />}
        </div>
      </div>
      <h3 className="mb-2 text-base font-bold tracking-tight text-[var(--color-foreground)]">준비된 정보가 없습니다</h3>
      <p className="max-w-[280px] text-sm leading-relaxed text-[var(--color-muted-foreground)] text-balance">
        {message}
      </p>
      {action && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}
