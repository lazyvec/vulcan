"use client";

import { useMemo, useState } from "react";
import type { MemoryItem } from "@/lib/types";

interface MemoryBoardProps {
  journal: MemoryItem[];
  longterm: MemoryItem[];
  initialQuery?: string;
}

function matches(item: MemoryItem, q: string) {
  const target = `${item.title} ${item.content} ${item.tags.join(" ")}`.toLowerCase();
  return target.includes(q);
}

export function MemoryBoard({ journal, longterm, initialQuery = "" }: MemoryBoardProps) {
  const [query, setQuery] = useState(initialQuery);

  const normalized = query.trim().toLowerCase();

  const filteredJournal = useMemo(
    () => (normalized ? journal.filter((item) => matches(item, normalized)) : journal),
    [journal, normalized],
  );

  const filteredLongterm = useMemo(
    () => (normalized ? longterm.filter((item) => matches(item, normalized)) : longterm),
    [longterm, normalized],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="vulcan-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="mr-auto text-sm font-semibold">Daily Journal</h2>
          <input
            className="vulcan-input w-48"
            placeholder="memory 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          {filteredJournal.length ? (
            filteredJournal.map((item) => (
              <article
                key={item.id}
                className="rounded-[var(--radius-control)] border p-3"
                style={{ borderColor: "var(--color-border)", background: "rgba(41,37,36,0.45)" }}
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{item.content}</p>
              </article>
            ))
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">No recent activity</p>
          )}
        </div>
      </section>

      <section className="vulcan-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Long-term Memory</h2>
        <div className="space-y-2">
          {filteredLongterm.length ? (
            filteredLongterm.map((item) => (
              <article
                key={item.id}
                className="rounded-[var(--radius-control)] border p-3"
                style={{ borderColor: "var(--color-border)", background: "rgba(41,37,36,0.45)" }}
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{item.content}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <span key={tag} className="vulcan-chip">
                      #{tag}
                    </span>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">No recent activity</p>
          )}
        </div>
      </section>
    </div>
  );
}
