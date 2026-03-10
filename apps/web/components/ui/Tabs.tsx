"use client";

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
  return (
    <div className={`flex gap-1 border-b border-[var(--color-border)] ${className}`}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={`cursor-pointer rounded-t-[var(--radius-control)] px-4 py-2 text-sm font-medium transition-colors ${
            activeKey === item.key
              ? "border-b-2 border-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-foreground)]"
              : "text-[var(--color-tertiary)] hover:text-[var(--color-foreground)]"
          }`}
        >
          {item.label}
          {item.count !== undefined && item.count > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-xs font-semibold text-white">
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
