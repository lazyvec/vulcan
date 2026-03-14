import { getAgents, getLatestEvents, getTasks, getWorkOrders, getSchedules, getProjects } from "@/lib/api-server";
import { TasksPageClient } from "./client";
import type { WorkOrder } from "@vulcan/shared/types";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const [agents, tasks, events, workOrdersData, schedules, projects] = await Promise.all([
    getAgents(),
    getTasks({ q: query }),
    getLatestEvents(60),
    getWorkOrders({ limit: 200 }),
    getSchedules(),
    getProjects(),
  ]);

  // linkedTaskId로 WorkOrder 매핑
  const workOrdersByTaskId: Record<string, WorkOrder> = {};
  for (const wo of workOrdersData.workOrders) {
    if (wo.linkedTaskId) {
      workOrdersByTaskId[wo.linkedTaskId] = wo;
    }
  }

  return (
    <TasksPageClient
      tasks={tasks}
      agents={agents}
      events={events}
      initialQuery={query}
      workOrdersByTaskId={workOrdersByTaskId}
      schedules={schedules}
      projects={projects}
    />
  );
}
