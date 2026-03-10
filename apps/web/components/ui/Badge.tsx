type BadgeStatus = "success" | "warning" | "error" | "info" | "neutral";

interface BadgeProps {
  status?: BadgeStatus;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const statusStyles: Record<BadgeStatus, string> = {
  success: "bg-[var(--color-success-bg)] text-[var(--color-success-text)] border-[var(--color-success-border)]",
  warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border-[var(--color-warning-border)]",
  error: "bg-[var(--color-destructive-bg)] text-[var(--color-destructive-text)] border-[var(--color-destructive-border)]",
  info: "bg-[var(--color-info-bg)] text-[var(--color-info-text)] border-[var(--color-info-border)]",
  neutral: "bg-[color-mix(in_oklab,var(--color-muted)_80%,black_20%)] text-[var(--color-muted-foreground)] border-[var(--color-border)]",
};

const dotColors: Record<BadgeStatus, string> = {
  success: "bg-[var(--color-success)]",
  warning: "bg-[var(--color-warning)]",
  error: "bg-[var(--color-destructive)]",
  info: "bg-[var(--color-info)]",
  neutral: "bg-[var(--color-tertiary)]",
};

export function Badge({ status = "neutral", dot, children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border px-2 py-0.5 text-[11px] font-medium ${statusStyles[status]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[status]}`} />}
      {children}
    </span>
  );
}
