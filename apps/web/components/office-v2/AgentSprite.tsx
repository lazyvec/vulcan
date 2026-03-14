"use client";

import type { Agent, AgentStatus } from "@/lib/types";
import { STATUS_COLORS } from "@/lib/statusMap";
import { PixelAvatar } from "./PixelAvatar";
import { getSpriteConfig } from "./sprite-map";

interface AgentSpriteProps {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
}

function getAuraGlow(status: AgentStatus): string | undefined {
  switch (status) {
    case "researching": return "0 0 12px 2px rgba(245, 158, 11, 0.3)";
    case "executing": return "0 0 12px 2px rgba(224, 122, 64, 0.3)";
    case "writing": return "0 0 12px 2px rgba(59, 130, 246, 0.3)";
    case "error": return "0 0 12px 2px rgba(239, 68, 68, 0.3)";
    case "syncing": return "0 0 12px 2px rgba(16, 185, 129, 0.3)";
    default: return undefined;
  }
}

export function AgentSprite({ agent, isSelected, onClick }: AgentSpriteProps) {
  const sprite = getSpriteConfig(agent);
  const isActive = agent.status !== "idle" && agent.status !== "error";
  const aura = getAuraGlow(agent.status);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-lg p-0.5 transition-transform hover:scale-110 active:scale-95 ${
        isSelected ? "scale-110" : ""
      }`}
      aria-label={`${agent.name} - ${agent.status}`}
      title={`${agent.name} (${agent.status})`}
    >
      {/* 아바타 */}
      <div
        className={`relative rounded-lg transition-shadow ${isActive ? "agent-alive-pulse" : ""}`}
        style={{ boxShadow: aura }}
      >
        <PixelAvatar
          name={sprite.name}
          primaryColor={sprite.primaryColor}
          secondaryColor={sprite.secondaryColor}
          size={36}
        />

        {/* 상태 인디케이터 dot */}
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--color-surface)]"
          style={{ background: STATUS_COLORS[agent.status] }}
        />
      </div>

      {/* 이름 라벨 */}
      <span className="max-w-[60px] truncate text-[8px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)] transition-colors">
        {agent.name}
      </span>
    </button>
  );
}
