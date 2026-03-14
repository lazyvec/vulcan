"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMissionControl } from "@/components/MissionControlProvider";
import { MenuIcon, Search, Pause, Play, Radio } from "lucide-react";
import { Button } from "@/components/ui/Button";

const PAGE_TITLES: Record<string, string> = {
  "/tasks": "태스크",
  "/work-orders": "작업지시",
  "/memory": "메모리",
  "/vault": "볼트",
  "/team": "팀",
  "/activity": "활동",
  "/costs": "비용",
};

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { paused, setPaused } = useMissionControl();
  const [pingText, setPingText] = useState("Ping");
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");

  const pageTitle = PAGE_TITLES[pathname] ?? "Vulcan";
  const nextQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextQuery) {
        params.set("q", nextQuery);
      } else {
        params.delete("q");
      }
      const next = params.toString();
      const current = searchParams.toString();
      if (next !== current) {
        router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
      }
    }, 220);

    return () => clearTimeout(timeout);
  }, [nextQuery, pathname, router, searchParams]);

  async function pingHermes() {
    setPingText("...");

    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "message",
          summary: "Hermes ping 요청 수신",
          source: "vulcan",
          agentId: "hermes",
          payloadJson: JSON.stringify({ action: "ping" }),
        }),
      });
      setPingText("OK");
      setTimeout(() => {
        fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "sync",
            summary: "Hermes ping response acknowledged",
            source: "vulcan",
            agentId: "hermes",
            payloadJson: JSON.stringify({ action: "ping_ack" }),
          }),
        }).catch(() => undefined);
      }, 350);
      setTimeout(() => setPingText("Ping"), 1400);
    } catch {
      setPingText("Fail");
      setTimeout(() => setPingText("Ping"), 1400);
    }
  }

  async function togglePause() {
    const next = !paused;
    setPaused(next);
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "sync",
        summary: next ? "Live updates on hold" : "Live updates active",
        source: "vulcan",
        agentId: "hermes",
        payloadJson: JSON.stringify({ paused: next }),
      }),
    }).catch(() => undefined);
  }

  return (
    <header className="topbar-glass px-4 py-3 sm:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile menu */}
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-tertiary)] transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] lg:hidden"
        >
          <MenuIcon size={20} />
          <span className="sr-only">사이드바 열기</span>
        </button>

        {/* Page title + breadcrumb */}
        <div className="hidden sm:flex min-w-0 items-center gap-2.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-tertiary)] opacity-60">Vulcan</span>
          <span className="h-3 w-[1px] rotate-[25deg] bg-[var(--color-border)] opacity-40"></span>
          <h1 className="truncate text-sm font-bold tracking-tight text-[var(--color-foreground)]">{pageTitle}</h1>
        </div>

        {/* Search */}
        <div className="relative mx-auto flex max-w-md flex-1 group">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-tertiary)] transition-colors group-focus-within:text-[var(--color-primary)]" />
          <input
            className="vulcan-input w-full pl-10 h-10 bg-[var(--color-background)]/50 border-transparent hover:border-glass-border focus:bg-[var(--color-background)]"
            placeholder="Search commands... (Cmd+K)"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <Button
            variant={paused ? "primary" : "ghost"}
            size="sm"
            icon={paused ? <Play size={14} /> : <Pause size={14} />}
            onClick={togglePause}
            className="h-9 px-3"
          >
            <span className="hidden md:inline">{paused ? "재개" : "일시정지"}</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Radio size={14} />}
            onClick={pingHermes}
            className="hidden sm:inline-flex h-9 px-3 status-pulse shadow-sm"
          >
            {pingText}
          </Button>
        </div>
      </div>
    </header>
  );
}
