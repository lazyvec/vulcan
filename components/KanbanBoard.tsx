"use client";

import { useMemo, useState } from "react";
import type { Agent, Task, TaskLane } from "@/lib/types";
import { ChevronRight } from "lucide-react";

const LANES: Array<{ key: TaskLane; label: string }> = [
  { key: "backlog", label: "Backlog" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
];

interface KanbanBoardProps {
  initialTasks: Task[];
  agents: Agent[];
  initialQuery?: string;
}

function Avatar({ agent }: { agent?: Agent }) {
  const initials = agent?.name.slice(0, 2).toUpperCase() ?? "?";
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-muted-foreground)]">
      {initials}
    </div>
  );
}

export function KanbanBoard({ initialTasks, agents, initialQuery = "" }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [query, setQuery] = useState(initialQuery);
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const agentMap = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const queryMatch =
        !normalized ||
        task.title.toLowerCase().includes(normalized) ||
        task.id.toLowerCase().includes(normalized);
      const assigneeMatch =
        assigneeFilter === "all" || task.assigneeAgentId === assigneeFilter;
      return queryMatch && assigneeMatch;
    });
  }, [assigneeFilter, query, tasks]);

  async function moveTask(taskId: string, lane: TaskLane) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, lane } : t))
    );
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lane }),
      });
    } catch {
      setTasks(initialTasks);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Tasks</h2>
        <div className="flex flex-1 items-center gap-2">
          <input
            className="vulcan-input w-full flex-1 sm:max-w-xs"
            placeholder="Search tasks..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            className="vulcan-input w-auto"
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
          >
            <option value="all">All Agents</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-x-auto md:grid-cols-3">
        {LANES.map((lane) => {
          const laneTasks = filtered.filter((task) => task.lane === lane.key);
          return (
            <div
              key={lane.key}
              className="flex flex-col rounded-lg bg-[var(--color-background)] p-1"
            >
              <div className="mb-3 flex items-center justify-between px-2 pt-2">
                <h3 className="font-semibold text-[var(--color-foreground)]">{lane.label}</h3>
                <span className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  {laneTasks.length}
                </span>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-1">
                {laneTasks.map((task) => (
                  <article
                    key={task.id}
                    className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm transition-colors hover:border-[var(--color-border)]"
                  >
                    <div className="flex items-start justify-between">
                      <p className="flex-1 pr-2 text-sm font-medium text-[var(--color-foreground)]">
                        {task.title}
                      </p>
                      <Avatar agent={agentMap.get(task.assigneeAgentId ?? "")} />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-[var(--color-tertiary)]">#{task.id.split("-")[0]}</p>
                      <div className="flex items-center gap-1">
                        {LANES.filter((target) => target.key !== task.lane).map((target) => (
                          <button
                            key={target.key}
                            className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-[var(--color-tertiary)] opacity-0 transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] group-hover:opacity-100"
                            onClick={() => moveTask(task.id, target.key)}
                            title={`Move to ${target.label}`}
                            type="button"
                          >
                            <ChevronRight size={16} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
                {laneTasks.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-[var(--color-tertiary)]">No tasks in this column.</p>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
