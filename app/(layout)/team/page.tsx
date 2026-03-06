import { OFFICE_ZONES, STATUS_COLORS, STATUS_LABELS } from "@/lib/statusMap";
import { getAgents } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function TeamPage() {
  const agents = getAgents();

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {agents.map((agent) => (
        <article key={agent.id} className="vulcan-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{agent.name}</h2>
            <span className="vulcan-chip" style={{ color: STATUS_COLORS[agent.status] }}>
              {STATUS_LABELS[agent.status]}
            </span>
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)]">Mission: {agent.mission}</p>
          <p className="mt-2 text-xs text-[var(--color-tertiary)]">Zone: {OFFICE_ZONES[agent.status]}</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {agent.roleTags.map((tag) => (
              <span key={tag} className="vulcan-chip">
                {tag}
              </span>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
