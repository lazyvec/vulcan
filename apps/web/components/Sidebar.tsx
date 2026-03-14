"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  Users,
  BarChart3,
  BookOpen,
  Brain,
  ChevronsLeft,
  ChevronsRight,
  DollarSign,
  ClipboardList,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/tasks", label: "태스크", icon: CheckSquare },
  { href: "/work-orders", label: "작업지시", icon: ClipboardList },
  { href: "/memory", label: "메모리", icon: Brain },
  { href: "/vault", label: "볼트", icon: BookOpen },
  { href: "/team", label: "팀", icon: Users },
  { href: "/activity", label: "활동", icon: BarChart3 },
  { href: "/costs", label: "비용", icon: DollarSign },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [gatewayConnected, setGatewayConnected] = useState(false);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const [approvalRes, gatewayRes] = await Promise.all([
          fetch("/api/approvals/pending-count"),
          fetch("/api/gateway/status"),
        ]);
        const approvalData = await approvalRes.json();
        if (active && typeof approvalData.count === "number") {
          setPendingCount(approvalData.count);
        }
        const gatewayData = await gatewayRes.json();
        if (active) {
          setGatewayConnected(gatewayData?.gateway?.connected === true);
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
      aria-label="기본 내비게이션"
      className={`fixed inset-y-0 left-0 z-40 transform sidebar-glass transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)] lg:relative lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } ${isCollapsed ? "w-20" : "w-[260px]"}`}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className={`flex items-center border-b border-glass-border ${isCollapsed ? "justify-center px-2 py-6" : "justify-between px-5 py-6"}`}>
          {!isCollapsed && (
            <div className="fade-in-up">
              <h1 className="text-lg font-bold tracking-tight text-[var(--color-foreground)]">Vulcan</h1>
              <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-tertiary)] opacity-80">Mission Control</p>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
            className="hidden h-8 w-8 items-center justify-center rounded-full text-[var(--color-tertiary)] transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-foreground)] lg:flex"
          >
            {isCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item, index) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  title={isCollapsed ? item.label : undefined}
                  className={`sidebar-nav-item relative flex min-h-[44px] items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                    active 
                      ? "sidebar-nav-active shadow-sm" 
                      : "text-[var(--color-muted-foreground)] hover:translate-x-1"
                  } ${isCollapsed ? "justify-center px-2" : ""}`}
                  style={{ animationDelay: `${index * 25}ms` }}
                >
                  <Icon size={18} className={`shrink-0 transition-transform ${active ? "scale-110" : "opacity-70 group-hover:opacity-100"}`} />
                  {!isCollapsed && <span className="tracking-tight">{item.label}</span>}
                  
                  {item.href === "/activity" && pendingCount > 0 && (
                    <Link
                      href="/activity?tab=approvals"
                      onClick={(e) => e.stopPropagation()}
                      className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 text-[10px] font-bold text-white hover:opacity-90 ${isCollapsed ? "absolute -right-1 -top-1 shadow-md" : "ml-auto"}`}
                    >
                      {pendingCount}
                    </Link>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer: Gateway status */}
        <div className={`border-t border-glass-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${isCollapsed ? "flex justify-center" : ""}`}>
          <div className={`flex items-center gap-3 ${isCollapsed ? "" : "rounded-xl bg-white/5 px-3 py-2.5 shadow-inner"}`} title={gatewayConnected ? "게이트웨이 연결됨" : "게이트웨이 연결 끊김"}>
            <div className={`flex h-2 w-2 rounded-full ${gatewayConnected ? "bg-[var(--color-success)] shadow-[0_0_8px_var(--color-success)]" : "bg-[var(--color-destructive)] shadow-[0_0_8px_var(--color-destructive)]"}`} />
            {!isCollapsed && (
              <>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-tertiary)]">
                  Gateway
                </span>
                <span className="ml-auto text-[10px] font-bold text-[var(--color-muted-foreground)]">
                  {gatewayConnected ? "ONLINE" : "OFFLINE"}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
