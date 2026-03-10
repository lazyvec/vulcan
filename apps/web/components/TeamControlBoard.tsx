"use client";

import { useEffect, useMemo, useState } from "react";
import type { Agent, AgentStatus } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { AgentCommandPanel } from "@/components/team/AgentCommandPanel";
import { AgentLifecyclePanel } from "@/components/team/AgentLifecyclePanel";
import { AgentRoster } from "@/components/team/AgentRoster";
import { GatewayOpsPanel } from "@/components/team/GatewayOpsPanel";

interface TeamControlBoardProps {
  initialAgents: Agent[];
}

const STATUS_ORDER: AgentStatus[] = ["executing", "writing", "researching", "syncing", "idle", "error"];

function isPaused(agent: Agent | null) {
  const config = agent?.config as Record<string, unknown> | null;
  return config?.paused === true;
}

export function TeamControlBoard({ initialAgents }: TeamControlBoardProps) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(initialAgents[0]?.id ?? "");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const { toast } = useToast();

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  );

  const selectedAgentInactive = selectedAgent?.isActive === false;
  const selectedAgentPaused = isPaused(selectedAgent);

  useEffect(() => {
    if (!agents.length) { setSelectedAgentId(""); return; }
    if (!agents.some((a) => a.id === selectedAgentId)) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  async function refreshAgents() {
    const res = await fetch("/api/agents?includeInactive=1");
    if (!res.ok) throw new Error(`${res.status}`);
    const data = (await res.json()) as { agents?: Agent[] };
    setAgents(Array.isArray(data.agents) ? data.agents : []);
  }

  async function performAction(label: string, action: () => Promise<void>) {
    setBusyAction(label);
    try {
      await action();
      await refreshAgents();
      toast("success", `${label} 완료`);
    } catch (e) {
      toast("error", `${label} 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.4fr)]">
      <div className="space-y-4">
        <AgentCommandPanel
          agents={agents}
          selectedAgent={selectedAgent}
          selectedAgentId={selectedAgentId}
          onSelectAgent={setSelectedAgentId}
          onAction={performAction}
          busyAction={busyAction}
          isInactive={selectedAgentInactive}
          isPaused={selectedAgentPaused}
        />

        <div className="vulcan-card p-4">
          <AgentLifecyclePanel
            selectedAgent={selectedAgent}
            isInactive={selectedAgentInactive}
            isPaused={selectedAgentPaused}
            busyAction={busyAction}
            onAction={performAction}
          />
        </div>

        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void performAction("Refresh", refreshAgents)}
            disabled={Boolean(busyAction)}
            loading={busyAction === "Refresh"}
          >
            에이전트 갱신
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <GatewayOpsPanel />
        <AgentRoster
          agents={agents}
          selectedAgentId={selectedAgentId}
          onSelectAgent={setSelectedAgentId}
          statusOrder={STATUS_ORDER}
        />
      </div>
    </section>
  );
}
