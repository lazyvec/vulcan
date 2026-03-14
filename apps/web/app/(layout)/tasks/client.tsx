"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LiveActivityPanel } from "@/components/LiveActivityPanel";
import { ScheduleView } from "@/components/ScheduleView";
import { ProjectsList } from "@/components/ProjectsList";
import { Tabs } from "@/components/ui/Tabs";
import type { Agent, EventItem, Task } from "@/lib/types";
import type { WorkOrder } from "@vulcan/shared/types";

type SubTab = "kanban" | "schedule" | "projects";

interface Props {
  tasks: Task[];
  agents: Agent[];
  events: EventItem[];
  initialQuery: string;
  workOrdersByTaskId: Record<string, WorkOrder>;
  schedules: unknown[];
  projects: unknown[];
}

const SUB_TABS = [
  { key: "kanban", label: "칸반" },
  { key: "schedule", label: "스케줄" },
  { key: "projects", label: "프로젝트" },
] as const;

export function TasksPageClient({
  tasks,
  agents,
  events,
  initialQuery,
  workOrdersByTaskId,
  schedules,
  projects,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = (searchParams.get("tab") as SubTab) || "kanban";

  const handleTabChange = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key === "kanban") {
        params.delete("tab");
      } else {
        params.set("tab", key);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  return (
    <div className="space-y-4">
      <Tabs items={[...SUB_TABS]} activeKey={activeTab} onChange={handleTabChange} />
      {activeTab === "kanban" && (
        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <KanbanBoard initialTasks={tasks} agents={agents} initialQuery={initialQuery} workOrdersByTaskId={workOrdersByTaskId} />
          <LiveActivityPanel initialEvents={events} title="Task Live Activity" />
        </div>
      )}
      {activeTab === "schedule" && (
        <ScheduleView schedules={schedules as never[]} />
      )}
      {activeTab === "projects" && (
        <ProjectsList projects={projects as never[]} agents={agents} />
      )}
    </div>
  );
}
