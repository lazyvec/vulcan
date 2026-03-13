import { KanbanBoard } from "@/components/KanbanBoard";
import { LiveActivityPanel } from "@/components/LiveActivityPanel";
import { getAgents, getLatestEvents, getTasks, getWorkOrders } from "@/lib/api-server";
import type { WorkOrder } from "@vulcan/shared/types";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const [agents, tasks, events, workOrdersData] = await Promise.all([
    getAgents(),
    getTasks({ q: query }),
    getLatestEvents(60),
    getWorkOrders({ limit: 200 }),
  ]);

  // linkedTaskId로 WorkOrder 매핑
  const workOrdersByTaskId: Record<string, WorkOrder> = {};
  for (const wo of workOrdersData.workOrders) {
    if (wo.linkedTaskId) {
      workOrdersByTaskId[wo.linkedTaskId] = wo;
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
      <KanbanBoard initialTasks={tasks} agents={agents} initialQuery={query} workOrdersByTaskId={workOrdersByTaskId} />
      <LiveActivityPanel initialEvents={events} title="Task Live Activity" />
    </div>
  );
}
