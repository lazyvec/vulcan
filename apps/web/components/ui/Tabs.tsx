"use client";

import { useCallback } from "react";

interface TabItem {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ items, activeKey, onChange, className = "" }: TabsProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let nextIndex = index;
      if (e.key === "ArrowRight") nextIndex = (index + 1) % items.length;
      else if (e.key === "ArrowLeft") nextIndex = (index - 1 + items.length) % items.length;
      else return;
      e.preventDefault();
      onChange(items[nextIndex].key);
      (e.currentTarget.parentElement?.children[nextIndex] as HTMLElement)?.focus();
    },
    [items, onChange],
  );

  return (
    <div role="tablist" className={`flex gap-1 overflow-x-auto border-b border-[var(--color-border)] ${className}`}>
      {items.map((item, i) => (
        <button
          key={item.key}
          role="tab"
          type="button"
          aria-selected={activeKey === item.key}
          tabIndex={activeKey === item.key ? 0 : -1}
          onClick={() => onChange(item.key)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          className={`min-h-[44px] shrink-0 cursor-pointer whitespace-nowrap rounded-t-[var(--radius-control)] px-4 py-2 text-sm font-medium transition-colors ${
            activeKey === item.key
              ? "border-b-2 border-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-foreground)]"
              : "text-[var(--color-tertiary)] hover:text-[var(--color-foreground)]"
          }`}
        >
          {item.label}
          {item.count !== undefined && item.count > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-xs font-semibold text-[var(--color-foreground)]">
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
