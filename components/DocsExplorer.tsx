"use client";

import { useMemo, useState } from "react";
import type { DocItem } from "@/lib/types";

interface DocsExplorerProps {
  docs: DocItem[];
  initialQuery?: string;
}

export function DocsExplorer({ docs, initialQuery = "" }: DocsExplorerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState(docs[0]?.id ?? "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return docs;
    }

    return docs.filter((doc) => {
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.tags.join(" ").toLowerCase().includes(q) ||
        doc.content.toLowerCase().includes(q)
      );
    });
  }, [docs, query]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
      <section className="vulcan-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Docs List</h2>
        <input
          className="vulcan-input mb-3"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="docs / tags 검색"
        />
        <div className="space-y-2">
          {filtered.map((doc) => (
            <button
              type="button"
              key={doc.id}
              onClick={() => setSelectedId(doc.id)}
              className="w-full rounded-[var(--radius-control)] border px-3 py-2 text-left"
              style={{
                borderColor: doc.id === selected?.id ? "var(--color-primary)" : "var(--color-border)",
                background: doc.id === selected?.id ? "var(--color-primary-12)" : "rgba(41,37,36,0.35)",
              }}
            >
              <p className="text-sm font-medium">{doc.title}</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">{doc.tags.join(" · ")}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="vulcan-card p-4">
        {selected ? (
          <>
            <h2 className="text-lg font-semibold">{selected.title}</h2>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {selected.tags.map((tag) => `#${tag}`).join(" ")}
            </p>
            <pre className="mt-4 overflow-auto whitespace-pre-wrap rounded-[var(--radius-card)] border p-4 text-sm font-[var(--font-geist-mono)] text-[var(--color-foreground)]">
              {selected.content}
            </pre>
          </>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">문서를 선택해주세요.</p>
        )}
      </section>
    </div>
  );
}
