"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Agent, WorkOrder } from "@/lib/types";
import { AgentSprite } from "./AgentSprite";
import { SpeechBubble } from "./SpeechBubble";
import { AgentPopoverV2 } from "./AgentPopoverV2";

interface MovingAgentProps {
  agent: Agent;
  position: { left: number; top: number };
  workOrder: WorkOrder | null;
  tokenUsage: number;
  isSelected: boolean;
  onSelect: () => void;
  onClose: () => void;
}

/** 에이전트 위치에 따라 팝오버/말풍선 방향 결정 */
function getPopoverPlacement(pos: { left: number; top: number }): "above" | "below" {
  // 하단 40% 이하에 있으면 위로 표시
  return pos.top > 60 ? "above" : "below";
}

/** 말풍선은 팝오버 반대 방향 (겹침 방지) */
function getBubblePlacement(pos: { left: number; top: number }): "above" | "below" {
  return pos.top > 60 ? "below" : "above";
}

export function MovingAgent({
  agent,
  position,
  workOrder,
  tokenUsage,
  isSelected,
  onSelect,
  onClose,
}: MovingAgentProps) {
  const handleClick = () => {
    if (isSelected) {
      onClose();
    } else {
      onSelect();
    }
  };

  const popoverPlacement = getPopoverPlacement(position);
  const bubblePlacement = getBubblePlacement(position);

  return (
    <motion.div
      className="absolute z-10"
      style={{ translateX: "-50%", translateY: "-50%" }}
      animate={{
        left: `${position.left}%`,
        top: `${position.top}%`,
      }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 26,
      }}
    >
      <AgentSprite
        agent={agent}
        isSelected={isSelected}
        onClick={handleClick}
      />

      {/* 말풍선 (in_progress 작업이 있고 팝오버가 닫혀있을 때만) */}
      <AnimatePresence>
        {workOrder && workOrder.status === "in_progress" && !isSelected && (
          <SpeechBubble summary={workOrder.summary} placement={bubblePlacement} />
        )}
      </AnimatePresence>

      {/* 팝오버 (선택 시) */}
      <AnimatePresence>
        {isSelected && (
          <AgentPopoverV2
            agent={agent}
            workOrder={workOrder}
            tokenUsage={tokenUsage}
            onClose={onClose}
            placement={popoverPlacement}
            horizontalPct={position.left}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
