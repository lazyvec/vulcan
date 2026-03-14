"use client";

import { motion } from "framer-motion";

interface SpeechBubbleProps {
  summary: string;
  maxLength?: number;
  /** 말풍선 방향: 위(기본) 또는 아래 */
  placement?: "above" | "below";
}

export function SpeechBubble({ summary, maxLength = 40, placement = "above" }: SpeechBubbleProps) {
  const text = summary.length > maxLength
    ? `${summary.slice(0, maxLength)}...`
    : summary;

  const isAbove = placement === "above";

  return (
    <motion.div
      initial={{ opacity: 0, y: isAbove ? 5 : -5, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: isAbove ? 5 : -5, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`absolute left-1/2 z-20 -translate-x-1/2 pointer-events-none ${
        isAbove ? "bottom-full mb-2" : "top-full mt-2"
      }`}
    >
      <div className="relative max-w-[200px] rounded-lg border border-glass-border bg-[var(--color-surface)] px-2.5 py-1.5 shadow-lg backdrop-blur-sm">
        <p className="text-[9px] font-medium leading-snug text-[var(--color-foreground)] whitespace-nowrap">
          {text}
        </p>
        {/* 꼬리 (삼각형) */}
        <div className={`absolute left-1/2 -translate-x-1/2 ${isAbove ? "top-full" : "bottom-full"}`}>
          <div
            className="h-0 w-0"
            style={{
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              ...(isAbove
                ? { borderTop: "4px solid var(--color-surface)" }
                : { borderBottom: "4px solid var(--color-surface)" }),
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
