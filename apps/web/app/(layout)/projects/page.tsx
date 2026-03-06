import { getAgents, getProjects } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function ProjectsPage() {
  const agents = getAgents();
  const projects = getProjects();

  function ownerName(ownerId: string | null) {
    if (!ownerId) {
      return "Unassigned";
    }
    return agents.find((item) => item.id === ownerId)?.name ?? ownerId;
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project, index) => (
        <article key={project.id} className="vulcan-card fade-in-up p-4" style={{ animationDelay: `${index * 50}ms` }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{project.name}</h2>
            <span className="vulcan-chip">{project.status}</span>
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)]">Owner: {ownerName(project.ownerAgentId)}</p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">Priority: {project.priority}</p>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-[var(--color-tertiary)]">
              <span>Progress</span>
              <span>{project.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--color-muted)]">
              <div
                className="h-full rounded-full bg-[var(--color-primary)]"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
