import type { AgentStatus } from "@/lib/types";

const statusDotColors: Record<AgentStatus, string> = {
  idle: "bg-[var(--color-tertiary)]",
  writing: "bg-[var(--color-info)]",
  researching: "bg-purple-400",
  executing: "bg-cyan-400",
  syncing: "bg-[var(--color-success)]",
  error: "bg-[var(--color-destructive)]",
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
      className={`inline-block rounded-full ${sizeMap[size]} ${statusDotColors[status]} ${
        shouldGlow ? "status-pulse" : ""
      } ${className}`}
    />
  );
}
