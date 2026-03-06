import { KanbanBoard } from "@/components/KanbanBoard";
import { LiveActivityPanel } from "@/components/LiveActivityPanel";
import { getAgents, getLatestEvents, getTasks } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const agents = getAgents();
  const tasks = getTasks({ q: query });
  const events = getLatestEvents(60);

  return (
    <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
      <KanbanBoard initialTasks={tasks} agents={agents} initialQuery={query} />
      <LiveActivityPanel initialEvents={events} title="Task Live Activity" />
    </div>
  );
}
