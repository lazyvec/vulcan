import { KanbanBoard } from "@/components/KanbanBoard";
import { LiveActivityPanel } from "@/components/LiveActivityPanel";
import { getAgents, getLatestEvents, getTasks } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const [agents, tasks, events] = await Promise.all([
    getAgents(),
    getTasks({ q: query }),
    getLatestEvents(60),
  ]);

  return (
    <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
      <KanbanBoard initialTasks={tasks} agents={agents} initialQuery={query} />
      <LiveActivityPanel initialEvents={events} title="Task Live Activity" />
    </div>
  );
}
