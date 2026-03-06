"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMissionControl } from "@/components/MissionControlProvider";
import { MenuIcon } from "lucide-react";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { paused, setPaused } = useMissionControl();
  const [pingText, setPingText] = useState("Ping Hermes");
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");

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
    setPingText("Pinging...");

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
      setPingText("Hermes Online");
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
      setTimeout(() => setPingText("Ping Hermes"), 1400);
    } catch {
      setPingText("Ping Failed");
      setTimeout(() => setPingText("Ping Hermes"), 1400);
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
        summary: next ? "Live updates paused" : "Live updates resumed",
        source: "vulcan",
        agentId: "hermes",
        payloadJson: JSON.stringify({ paused: next }),
      }),
    }).catch(() => undefined);
  }

  return (
    <header className="sticky top-0 z-20 border-b bg-[rgba(26,25,23,0.8)] px-4 py-3 backdrop-blur-lg sm:px-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white md:hidden"
        >
          <MenuIcon size={22} />
          <span className="sr-only">Open sidebar</span>
        </button>

        <div className="flex-1">
          <input
            className="vulcan-input max-w-sm"
            placeholder="Search tasks, docs, memory..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button className="vulcan-button" type="button" onClick={togglePause}>
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            className="vulcan-button status-pulse hidden sm:flex"
            type="button"
            onClick={pingHermes}
          >
            {pingText}
          </button>
        </div>
      </div>
    </header>
  );
}
