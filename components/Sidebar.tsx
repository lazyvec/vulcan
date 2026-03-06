"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/tasks", label: "Tasks" },
  { href: "/calendar", label: "Calendar" },
  { href: "/projects", label: "Projects" },
  { href: "/memory", label: "Memory" },
  { href: "/docs", label: "Docs" },
  { href: "/team", label: "Team" },
  { href: "/office", label: "Office" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="border-r p-4 md:min-h-screen"
      style={{ borderColor: "var(--color-border)", background: "rgba(12,10,9,0.92)" }}
    >
      <div className="mb-8 px-2">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
          Warm Obsidian
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">
          Vulcan
        </h1>
        <p className="mt-2 text-sm text-[var(--color-tertiary)]">Mission Control for Hermes</p>
      </div>

      <nav className="flex gap-2 overflow-auto md:flex-col">
        {NAV_ITEMS.map((item, index) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="fade-in-up rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition"
              style={{
                animationDelay: `${index * 45}ms`,
                color: active ? "var(--color-primary)" : "var(--color-muted-foreground)",
                border: active ? "1px solid var(--color-primary)" : "1px solid transparent",
                background: active ? "var(--color-primary-12)" : "transparent",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-[var(--radius-card)] border p-3 text-xs text-[var(--color-muted-foreground)]">
        <p className="mb-1 font-semibold text-[var(--color-foreground)]">M0 Scope</p>
        <p>가시성 + 최소 개입 + 실시간 관제</p>
      </div>
    </aside>
  );
}
