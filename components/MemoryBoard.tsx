"use client";

import { useMemo, useState } from "react";
import type { MemoryItem } from "@/lib/types";
import { Book, Clock } from "lucide-react";

interface MemoryBoardProps {
  journal: MemoryItem[];
  longterm: MemoryItem[];
  initialQuery?: string;
}

function matches(item: MemoryItem, q: string) {
  const target = `${item.title} ${item.content} ${item.tags.join(" ")}`.toLowerCase();
  return target.includes(q);
}

function MemoryCard({ item }: { item: MemoryItem }) {
  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-border)]">
      <h3 className="font-semibold text-[var(--color-foreground)]">{item.title}</h3>
      <p className="mt-1.5 text-sm text-[var(--color-tertiary)]">{item.content}</p>
      {item.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary/80"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
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
    <div>
      <div className="mb-4">
        <input
          className="vulcan-input max-w-sm"
          placeholder="Search all memories..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Clock size={18} className="text-[var(--color-tertiary)]" />
            <h2 className="text-lg font-semibold">Daily Journal</h2>
          </div>
          <div className="space-y-3">
            {filteredJournal.length > 0 ? (
              filteredJournal.map((item) => <MemoryCard key={item.id} item={item} />)
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-tertiary)]">No journal entries found.</p>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Book size={18} className="text-[var(--color-tertiary)]" />
            <h2 className="text-lg font-semibold">Long-term Memory</h2>
          </div>
          <div className="space-y-3">
            {filteredLongterm.length > 0 ? (
              filteredLongterm.map((item) => <MemoryCard key={item.id} item={item} />)
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-tertiary)]">No LTM items found.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
