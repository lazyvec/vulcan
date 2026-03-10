import type { AgentStatus } from "@/lib/types";

const statusDotColors: Record<AgentStatus, string> = {
  idle: "bg-[var(--color-tertiary)]",
  writing: "bg-[var(--color-info)]",
  researching: "bg-[var(--color-researching)]",
  executing: "bg-[var(--color-executing)]",
  syncing: "bg-[var(--color-success)]",
  error: "bg-[var(--color-destructive)]",
};

const statusLabels: Record<AgentStatus, string> = {
  idle: "대기",
  writing: "작성 중",
  researching: "조사 중",
  executing: "실행 중",
  syncing: "동기화 중",
  error: "오류",
};

const glowStatuses = new Set<AgentStatus>(["executing", "writing", "researching"]);

interface StatusDotProps {
  status: AgentStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = { sm: "h-1.5 w-1.5", md: "h-2 w-2", lg: "h-2.5 w-2.5" };

export function StatusDot({ status, size = "md", className = "" }: StatusDotProps) {
  const shouldGlow = glowStatuses.has(status);

  return (
    <span
      role="img"
      aria-label={`상태: ${statusLabels[status]}`}
      className={`inline-block rounded-full ${sizeMap[size]} ${statusDotColors[status]} ${
        shouldGlow ? "status-pulse" : ""
      } ${className}`}
    />
  );
}
