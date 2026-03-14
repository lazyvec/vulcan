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
          <SpeechBubble summary={workOrder.summary} />
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
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
