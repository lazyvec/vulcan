"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { realtimeServerMessageSchema } from "@vulcan/shared/schemas";
import type { EventItem } from "@/lib/types";

type WebSocketStatus = "idle" | "connecting" | "open" | "closed" | "error";

const RECONNECT_DELAYS_MS = [700, 1_200, 2_000, 4_000, 8_000];

interface UseVulcanWebSocketOptions {
  paused: boolean;
  onEvent: (event: EventItem) => void;
}

function resolveWebSocketUrl() {
  if (process.env.NEXT_PUBLIC_VULCAN_WS_URL) {
    return process.env.NEXT_PUBLIC_VULCAN_WS_URL;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/api/ws`;
}

export function useVulcanWebSocket({ paused, onEvent }: UseVulcanWebSocketOptions) {
  const [status, setStatus] = useState<WebSocketStatus>("idle");
  const onEventRef = useRef(onEvent);
  const wsUrl = useMemo(() => resolveWebSocketUrl(), []);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!wsUrl) {
      return;
    }

    if (paused) {
      return;
    }

    let disposed = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;

    const clearReconnectTimer = () => {
      if (!reconnectTimer) {
        return;
      }
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    };

    const scheduleReconnect = () => {
      if (disposed) {
        return;
      }
      const delay =
        RECONNECT_DELAYS_MS[Math.min(reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    const connect = () => {
      if (disposed) {
        return;
      }

      setStatus("connecting");
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        reconnectAttempt = 0;
        setStatus("open");
        ws?.send(JSON.stringify({ type: "command", payload: { command: "ping" } }));
      };

      ws.onmessage = (message) => {
        let raw: unknown;
        try {
          raw = JSON.parse(String(message.data));
        } catch {
          return;
        }

        const parsed = realtimeServerMessageSchema.safeParse(raw);
        if (!parsed.success) {
          return;
        }

        if (parsed.data.type === "event") {
          onEventRef.current(parsed.data.payload);
        }
      };

      ws.onerror = () => {
        if (disposed) {
          return;
        }
        setStatus("error");
      };

      ws.onclose = () => {
        if (disposed) {
          return;
        }
        setStatus("closed");
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      disposed = true;
      clearReconnectTimer();
      ws?.close();
      ws = null;
      setStatus("idle");
    };
  }, [paused, wsUrl]);

  return {
    status,
    connected: status === "open",
    wsUrl,
  };
}
