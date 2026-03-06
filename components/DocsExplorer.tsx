"use client";

import { useMemo, useState } from "react";
import type { DocItem } from "@/lib/types";
import { Tag } from "lucide-react";

interface DocsExplorerProps {
  docs: DocItem[];
  initialQuery?: string;
}

export function DocsExplorer({ docs, initialQuery = "" }: DocsExplorerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState(docs[0]?.id ?? "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(
      (doc) =>
        doc.title.toLowerCase().includes(q) ||
        doc.tags.join(" ").toLowerCase().includes(q) ||
        doc.content.toLowerCase().includes(q)
    );
  }, [docs, query]);

  // Derive effective selection: if current selectedId is not in filtered, fall back to first
  const effectiveSelectedId = useMemo(() => {
    if (filtered.length === 0) return "";
    if (filtered.find((d) => d.id === selectedId)) return selectedId;
    return filtered[0].id;
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => filtered.find((item) => item.id === effectiveSelectedId) ?? filtered[0],
    [filtered, effectiveSelectedId]
  );

  return (
    <div>
      <div className="mb-4">
        <input
          className="vulcan-input max-w-sm"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search docs..."
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <section className="flex flex-col gap-3">
          {filtered.map((doc) => (
            <button
              type="button"
              key={doc.id}
              onClick={() => setSelectedId(doc.id)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                doc.id === selected?.id
                  ? "border-primary/80 bg-primary/10"
                  : "border-stone-800 bg-stone-900/50 hover:border-stone-700"
              }`}
            >
              <h3
                className={`font-semibold ${
                  doc.id === selected?.id ? "text-primary" : "text-stone-200"
                }`}
              >
                {doc.title}
              </h3>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-stone-500">
                <Tag size={14} />
                <span>{doc.tags.join(" · ")}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-stone-800">
              <p className="text-sm text-stone-500">No documents found.</p>
            </div>
          )}
        </section>

        <section className="vulcan-card min-h-[400px] p-5">
          {selected ? (
            <>
              <h2 className="text-xl font-bold text-stone-100">{selected.title}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {selected.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block rounded-full bg-stone-700/50 px-3 py-1 text-xs font-medium text-stone-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="prose prose-invert mt-6 max-w-none text-stone-300">
                <pre className="mt-4 overflow-auto whitespace-pre-wrap rounded-lg border border-stone-800 bg-stone-900/70 p-4 font-mono text-sm text-stone-300">
                  {selected.content}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-stone-500">Select a document to view its content.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
