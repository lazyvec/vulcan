"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVulcanWebSocket } from "./useWebSocket";
import { statusFromEventType } from "@/lib/statusMap";
import type { Agent, EventItem, WorkOrder } from "@/lib/types";

const POLL_INTERVAL_MS = 15_000;

interface UseAgentStatusOptions {
  initialAgents: Agent[];
  initialWorkOrders?: Record<string, WorkOrder | null>;
  initialTokenUsage?: Record<string, number>;
}

interface UseAgentStatusReturn {
  agents: Agent[];
  agentWorkOrders: Record<string, WorkOrder | null>;
  agentTokenUsage: Record<string, number>;
  wsConnected: boolean;
}

export function useAgentStatus({
  initialAgents,
  initialWorkOrders = {},
  initialTokenUsage = {},
}: UseAgentStatusOptions): UseAgentStatusReturn {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [agentWorkOrders] = useState<Record<string, WorkOrder | null>>(initialWorkOrders);
  const [agentTokenUsage] = useState<Record<string, number>>(initialTokenUsage);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleEvent = useCallback((event: EventItem) => {
    // agent.status_changed 이벤트 처리
    if (event.type === "agent.status_changed" && event.agentId) {
      try {
        const payload = typeof event.payloadJson === "string" ? JSON.parse(event.payloadJson) : null;
        if (payload?.newStatus) {
          setAgents((prev) =>
            prev.map((a) =>
              a.id === event.agentId
                ? { ...a, status: payload.newStatus, statusSince: event.ts, lastSeenAt: event.ts }
                : a,
            ),
          );
          return;
        }
      } catch {
        // fallback
      }
    }

    // 기존 이벤트 기반 상태 추론
    if (event.agentId) {
      const status = statusFromEventType(event.type);
      setAgents((prev) =>
        prev.map((a) =>
          a.id === event.agentId
            ? { ...a, status, statusSince: event.ts, lastSeenAt: event.ts }
            : a,
        ),
      );
    }
  }, []);

  const { connected } = useVulcanWebSocket({ paused: false, onEvent: handleEvent });

  // 폴링 fallback (WebSocket 연결 끊김 대비)
  useEffect(() => {
    if (connected) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/agents");
        if (res.ok) {
          const data = await res.json();
          if (data.agents) setAgents(data.agents);
        }
      } catch {
        // 네트워크 오류 무시
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [connected]);

  return useMemo(
    () => ({ agents, agentWorkOrders, agentTokenUsage, wsConnected: connected }),
    [agents, agentWorkOrders, agentTokenUsage, connected],
  );
}
