"use client";

import type { FloorZoneConfig } from "./types";

interface FloorZoneProps {
  zone: FloorZoneConfig;
  agentCount: number;
}

export function FloorZone({ zone, agentCount }: FloorZoneProps) {
  return (
    <div
      role="region"
      aria-label={`${zone.label} — 에이전트 ${agentCount}명`}
      className="absolute rounded-xl border border-dashed transition-colors"
      style={{
        left: `${zone.x}%`,
        top: `${zone.y}%`,
        width: `${zone.w}%`,
        height: `${zone.h}%`,
        background: zone.bg,
        borderColor: agentCount > 0
          ? `color-mix(in srgb, ${zone.accent} 40%, transparent)`
          : "var(--glass-border)",
      }}
    >
      {/* 존 라벨 */}
      <div className="absolute left-2 top-1.5 flex items-center gap-1.5">
        <span className="text-base leading-none">{zone.icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
          {zone.label}
        </span>
        {agentCount > 0 && (
          <span
            className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black"
            style={{
              background: `color-mix(in srgb, ${zone.accent} 20%, transparent)`,
              color: zone.accent,
            }}
          >
            {agentCount}
          </span>
        )}
      </div>
    </div>
  );
}
