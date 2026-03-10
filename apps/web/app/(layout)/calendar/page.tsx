import { getSchedules } from "@/lib/api-server";

export const dynamic = "force-dynamic";

function formatDate(ts: number | null) {
  if (!ts) {
    return "-";
  }
  return new Date(ts).toLocaleString("ko-KR");
}

export default async function CalendarPage() {
  const schedules = await getSchedules();
  const running = schedules.filter((item) => item.status === "running");
  const weekly = schedules.filter((item) => item.status !== "running");

  return (
    <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
      <section className="vulcan-card p-4">
        <h2 className="mb-4 text-sm font-semibold">Scheduled Tasks (Week)</h2>
        <div className="space-y-2">
          {weekly.map((item) => (
            <article
              key={item.id}
              className="rounded-[var(--radius-control)] border p-3"
              style={{ borderColor: "var(--color-border)", background: "rgba(41,37,36,0.4)" }}
            >
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">{item.cronOrInterval}</p>
              <p className="mt-1 text-xs text-[var(--color-tertiary)]">
                last {formatDate(item.lastRunAt)} · next {formatDate(item.nextRunAt)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="vulcan-card p-4">
        <h2 className="mb-4 text-sm font-semibold">Always Running</h2>
        <div className="space-y-2">
          {running.map((item) => (
            <article
              key={item.id}
              className="rounded-[var(--radius-control)] border p-3"
              style={{ borderColor: "var(--color-primary)", background: "var(--color-primary-bg)" }}
            >
              <p className="text-sm font-medium text-[var(--color-primary)]">{item.name}</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">{item.cronOrInterval}</p>
            </article>
          ))}
          {running.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">현재 상시 실행 작업이 없습니다.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
