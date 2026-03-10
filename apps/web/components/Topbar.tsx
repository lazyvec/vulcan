"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMissionControl } from "@/components/MissionControlProvider";
import { MenuIcon, Search, Pause, Play, Radio } from "lucide-react";
import { Button } from "@/components/ui/Button";

const PAGE_TITLES: Record<string, string> = {
  "/tasks": "태스크",
  "/calendar": "캘린더",
  "/projects": "프로젝트",
  "/memory": "메모리",
  "/docs": "문서",
  "/vault": "볼트",
  "/team": "팀",
  "/office": "오피스",
  "/skills": "스킬",
  "/activity": "활동",
  "/approvals": "승인",
  "/notifications": "알림",
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
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-background)_80%,transparent)] px-4 py-3 backdrop-blur-lg sm:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile menu */}
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded p-1.5 text-[var(--color-tertiary)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] md:hidden"
        >
          <MenuIcon size={22} />
          <span className="sr-only">사이드바 열기</span>
        </button>

        {/* Page title + breadcrumb */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-tertiary)]">Vulcan</span>
          <span className="text-xs text-[var(--color-tertiary)]">/</span>
          <h1 className="text-sm font-semibold text-[var(--color-foreground)]">{pageTitle}</h1>
        </div>

        {/* Search */}
        <div className="relative mx-auto hidden max-w-md flex-1 sm:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-tertiary)]" />
          <input
            className="vulcan-input pl-9 text-sm"
            placeholder="검색... (Cmd+K)"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant={paused ? "primary" : "ghost"}
            size="sm"
            icon={paused ? <Play size={14} /> : <Pause size={14} />}
            onClick={togglePause}
          >
            <span className="hidden sm:inline">{paused ? "재개" : "일시정지"}</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Radio size={14} />}
            onClick={pingHermes}
            className="hidden sm:inline-flex status-pulse"
          >
            {pingText}
          </Button>
        </div>
      </div>
    </header>
  );
}
