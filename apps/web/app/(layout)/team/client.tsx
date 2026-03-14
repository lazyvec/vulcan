"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import { TeamControlBoard } from "@/components/TeamControlBoard";
import { OfficeFloorMap } from "@/components/office-v2/OfficeFloorMap";
import { SkillsMarketplace } from "@/components/SkillsMarketplace";
import { Tabs } from "@/components/ui/Tabs";
import type { Agent, Skill, SkillRegistryEntry, WorkOrder } from "@/lib/types";

type SubTab = "office" | "control" | "skills";

interface Props {
  agents: Agent[];
  agentWorkOrders: Record<string, WorkOrder | null>;
  agentTokenUsage: Record<string, number>;
  skills: Skill[];
  registry: SkillRegistryEntry[];
}

export function TeamPageClient({
  agents,
  agentWorkOrders,
  agentTokenUsage,
  skills,
  registry,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = (searchParams.get("tab") as SubTab) || "office";

  const handleTabChange = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key === "office") {
        params.delete("tab");
      } else {
        params.set("tab", key);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const tabItems = [
    { key: "office", label: "오피스" },
    { key: "control", label: "관리" },
    { key: "skills", label: "스킬" },
  ] as const;

  return (
    <div className="space-y-4">
      <Tabs items={[...tabItems]} activeKey={activeTab} onChange={handleTabChange} />
      {activeTab === "office" && (
        <OfficeFloorMap
          initialAgents={agents}
          agentWorkOrders={agentWorkOrders}
          agentTokenUsage={agentTokenUsage}
        />
      )}
      {activeTab === "control" && (
        <TeamControlBoard initialAgents={agents} />
      )}
      {activeTab === "skills" && (
        <SkillsMarketplace
          initialSkills={skills}
          initialAgents={agents}
          initialRegistry={registry}
        />
      )}
    </div>
  );
}
