"use client";

import { Wifi, WifiOff } from "lucide-react";

interface OfficeHeaderProps {
  totalAgents: number;
  activeCount: number;
  wsConnected: boolean;
}

export function OfficeHeader({ totalAgents, activeCount, wsConnected }: OfficeHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="mr-auto page-title tracking-tight font-black">에이전트 오피스</h2>
      <div className="flex gap-1.5">
        <span className="vulcan-chip border-glass-border shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-foreground)] opacity-40" />
          TOTAL {totalAgents}
        </span>
        <span className="vulcan-chip border-glass-border shadow-sm bg-[var(--color-primary-bg)] text-[var(--color-primary)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
          ACTIVE {activeCount}
        </span>
      </div>
      <span
        aria-label={`WebSocket 상태: ${wsConnected ? "연결됨" : "폴링 중"}`}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black tracking-widest border border-glass-border ${
          wsConnected
            ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)]"
            : "bg-[var(--color-destructive-bg)] text-[var(--color-destructive-text)]"
        }`}
      >
        {wsConnected ? <Wifi size={12} aria-hidden="true" /> : <WifiOff size={12} aria-hidden="true" />}
        {wsConnected ? "LIVE" : "POLLING"}
      </span>
    </div>
  );
}
