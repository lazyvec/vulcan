"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useMounted } from "@/hooks/useMounted";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "border-glass-border bg-[var(--color-primary-bg)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white shadow-sm",
  secondary:
    "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)] shadow-inner",
  ghost:
    "border-transparent bg-transparent text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
  destructive:
    "border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] text-[var(--color-destructive-text)] hover:bg-[var(--color-destructive)] hover:text-white shadow-sm",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3.5 py-2 text-xs gap-1.5 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:px-2.5 md:py-1.5",
  md: "px-5 py-2.5 text-sm gap-2 min-h-[48px] min-w-[48px] md:min-h-0 md:min-w-0 md:px-4 md:py-2",
  lg: "px-6 py-3 text-base gap-2.5 min-h-[52px] min-w-[52px] md:min-h-0 md:min-w-0 md:px-5 md:py-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "secondary", size = "md", loading, icon, children, className = "", disabled, type = "button", ...rest },
    ref,
  ) {
    const mounted = useMounted();

    if (!mounted) {
      return (
        <button
          ref={ref}
          type={type}
          className={`inline-flex items-center justify-center rounded-[var(--radius-control)] border font-semibold tracking-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
          disabled={disabled || loading}
          {...rest}
        >
          {loading ? <Loader2 size={size === "sm" ? 14 : 16} className="animate-spin opacity-80" /> : icon}
          <span className="truncate">{children}</span>
        </button>
      );
    }

    return (
      <motion.button
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        ref={ref as any}
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        type={type as any}
        whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`inline-flex items-center justify-center rounded-[var(--radius-control)] border font-semibold tracking-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        disabled={disabled || loading}
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        {...(rest as any)}
      >
        {loading ? (
          <Loader2 size={size === "sm" ? 14 : 16} className="animate-spin opacity-80" />
        ) : (
          icon && <span className="shrink-0 opacity-90 transition-transform group-hover:scale-110">{icon}</span>
        )}
        <span className="truncate">{children}</span>
      </motion.button>
    );
  },
);
