import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

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
    "border-[color-mix(in_oklab,var(--color-primary)_50%,var(--color-border)_50%)] bg-[var(--color-primary-bg)] text-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-primary)_20%,transparent_80%)] hover:text-[var(--color-primary-hover)] hover:border-[var(--color-primary)]",
  secondary:
    "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
  ghost:
    "border-transparent bg-transparent text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
  destructive:
    "border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] text-[var(--color-destructive-text)] hover:bg-[var(--color-destructive-hover)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-xs gap-1 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:px-2 md:py-1",
  md: "px-4 py-2 text-xs gap-1.5 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:px-3 md:py-2",
  lg: "px-5 py-3 text-sm gap-2 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:px-4 md:py-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "secondary", size = "md", loading, icon, children, className = "", disabled, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-[var(--radius-control)] border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        disabled={disabled || loading}
        {...rest}
      >
        {loading ? <Loader2 size={size === "sm" ? 12 : 14} className="animate-spin" /> : icon}
        {children}
      </button>
    );
  },
);
