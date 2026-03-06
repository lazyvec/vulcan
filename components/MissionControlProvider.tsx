"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface MissionControlState {
  paused: boolean;
  setPaused: (value: boolean) => void;
}

const MissionControlContext = createContext<MissionControlState | null>(null);

export function MissionControlProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem("vulcan-paused") === "1";
  });

  useEffect(() => {
    globalThis.localStorage?.setItem("vulcan-paused", paused ? "1" : "0");
  }, [paused]);

  const value = useMemo(() => ({ paused, setPaused }), [paused]);

  return <MissionControlContext.Provider value={value}>{children}</MissionControlContext.Provider>;
}

export function useMissionControl() {
  const context = useContext(MissionControlContext);
  if (!context) {
    throw new Error("useMissionControl must be used within MissionControlProvider");
  }
  return context;
}
