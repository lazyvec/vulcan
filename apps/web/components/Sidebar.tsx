"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/tasks", label: "Tasks" },
  { href: "/calendar", label: "Calendar" },
  { href: "/projects", label: "Projects" },
  { href: "/memory", label: "Memory" },
  { href: "/docs", label: "Docs" },
  { href: "/vault", label: "Vault" },
  { href: "/team", label: "Team" },
  { href: "/office", label: "Office" },
  { href: "/skills", label: "Skills" },
  { href: "/activity", label: "Activity" },
  { href: "/approvals", label: "Approvals" },
  { href: "/notifications", label: "Notifications" },
];

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch("/api/approvals/pending-count");
        const data = await res.json();
        if (active && typeof data.count === "number") {
          setPendingCount(data.count);
        }
      } catch { /* ignore */ }
    }
    void poll();
    const timer = setInterval(poll, 30_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-[260px] transform border-r bg-[var(--color-background)] p-4 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{
        borderColor: "var(--color-border)",
        background: "rgba(26,25,23,0.95)",
      }}
    >
      <div className="mb-8 px-2">
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
          Vulcan
        </h1>
        <p className="mt-2 text-sm text-[var(--color-tertiary)]">
          Mission Control for Hermes
        </p>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item, index) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`sidebar-nav-item fade-in-up relative rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition-colors ${
                active ? "sidebar-nav-active" : ""
              }`}
              style={{ animationDelay: `${index * 45}ms` }}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--color-primary)]" />
              )}
              {item.label}
              {item.href === "/approvals" && pendingCount > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-xs font-semibold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] p-3 text-xs text-[var(--color-muted-foreground)]">
        <p className="mb-1 font-semibold text-[var(--color-foreground)]">M0 Scope</p>
        <p>가시성 + 최소 개입 + 실시간 관제</p>
      </div>
    </aside>
  );
}
