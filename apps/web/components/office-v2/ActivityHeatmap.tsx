"use client";

import { useEffect, useState } from "react";

interface HourCount {
  hour: number;
  count: number;
}

interface DayData {
  dayLabel: string;
  hours: HourCount[];
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const HOUR_LABELS = ["0", "3", "6", "9", "12", "15", "18", "21"];

function getIntensityStyle(count: number, max: number): React.CSSProperties {
  if (count === 0) return { backgroundColor: "var(--color-background)" };
  const ratio = count / Math.max(max, 1);
  let opacity = 0.15;
  if (ratio > 0.75) opacity = 0.9;
  else if (ratio > 0.5) opacity = 0.6;
  else if (ratio > 0.25) opacity = 0.35;
  return { backgroundColor: "var(--color-primary)", opacity };
}

function emptyHours(): HourCount[] {
  return Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
}

export function ActivityHeatmap() {
  const [data, setData] = useState<DayData[]>([]);
  const [maxCount, setMaxCount] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchHeatmap() {
      try {
        const now = Date.now();

        // 7일 병렬 fetch
        const requests = Array.from({ length: 7 }, (_, i) => {
          const d = 6 - i;
          const since = Math.floor((now - (d + 1) * 86400000) / 1000);
          const until = Math.floor((now - d * 86400000) / 1000);
          const dayDate = new Date(now - d * 86400000);
          const dayLabel = DAY_LABELS[dayDate.getDay()];

          return fetch(`/api/activity/stats?since=${since}&until=${until}`, {
            signal: controller.signal,
          })
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
              const byHour: Record<string, number> = json?.stats?.byHour ?? {};
              const hours: HourCount[] = [];
              for (let h = 0; h < 24; h++) {
                hours.push({ hour: h, count: byHour[String(h)] ?? 0 });
              }
              return { dayLabel, hours };
            })
            .catch(() => ({ dayLabel, hours: emptyHours() }));
        });

        const results = await Promise.all(requests);
        if (controller.signal.aborted) return;

        let globalMax = 0;
        for (const day of results) {
          for (const h of day.hours) {
            if (h.count > globalMax) globalMax = h.count;
          }
        }

        setData(results);
        setMaxCount(globalMax);
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    }

    fetchHeatmap();
    return () => controller.abort();
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-glass-border bg-[var(--color-surface)] p-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
          Activity Heatmap (7d)
        </span>
        <p className="mt-2 text-center text-[11px] text-[var(--color-destructive)]">
          데이터를 불러올 수 없습니다.
        </p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-glass-border bg-[var(--color-surface)] p-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
          Activity Heatmap (7d)
        </span>
        <div className="mt-2 flex h-20 items-center justify-center">
          <span className="text-[11px] text-[var(--color-muted-foreground)]">로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-glass-border bg-[var(--color-surface)] p-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
        Activity Heatmap (7d)
      </span>

      <div className="mt-2 overflow-x-auto" role="img" aria-label="7일간 시간대별 활동 히트맵">
        <div className="inline-flex flex-col gap-0.5" style={{ minWidth: "100%" }}>
          {/* 시간 라벨 */}
          <div className="flex items-center gap-0.5">
            <span className="w-5" />
            {Array.from({ length: 24 }, (_, h) => (
              <span
                key={h}
                className="flex-1 text-center text-[8px] font-medium text-[var(--color-muted-foreground)]"
                style={{ minWidth: "12px" }}
              >
                {HOUR_LABELS.includes(String(h)) ? h : ""}
              </span>
            ))}
          </div>

          {/* 일별 행 */}
          {data.map((day, di) => (
            <div key={`${day.dayLabel}-${di}`} className="flex items-center gap-0.5">
              <span className="w-5 text-[9px] font-bold text-[var(--color-muted-foreground)]">
                {day.dayLabel}
              </span>
              {day.hours.map((h) => (
                <div
                  key={h.hour}
                  className="flex-1 rounded-[2px] transition-colors"
                  style={{ minWidth: "12px", aspectRatio: "1", ...getIntensityStyle(h.count, maxCount) }}
                  title={`${day.dayLabel} ${h.hour}시: ${h.count}건`}
                  aria-hidden="true"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
