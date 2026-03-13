"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  Users,
  Building2,
  BarChart3,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Brain,
  FileText,
  FolderKanban,
  Bell,
  Calendar,
  ChevronsLeft,
  ChevronsRight,
  Wifi,
  WifiOff,
  DollarSign,
  ClipboardList,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/tasks", label: "태스크", icon: CheckSquare },
  { href: "/calendar", label: "캘린더", icon: Calendar },
  { href: "/projects", label: "프로젝트", icon: FolderKanban },
  { href: "/memory", label: "메모리", icon: Brain },
  { href: "/docs", label: "문서", icon: FileText },
  { href: "/vault", label: "볼트", icon: BookOpen },
  { href: "/team", label: "팀", icon: Users },
  { href: "/office", label: "오피스", icon: Building2 },
  { href: "/skills", label: "스킬", icon: Sparkles },
  { href: "/activity", label: "활동", icon: BarChart3 },
  { href: "/work-orders", label: "작업지시", icon: ClipboardList },
  { href: "/costs", label: "비용", icon: DollarSign },
  { href: "/approvals", label: "승인", icon: ShieldCheck },
  { href: "/notifications", label: "알림", icon: Bell },
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
      aria-hidden={undefined}
      className={`fixed inset-y-0 left-0 z-40 transform border-r transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } ${isCollapsed ? "w-16" : "w-[260px]"}`}
      style={{
        borderColor: "var(--color-border)",
        background: "color-mix(in oklab, var(--color-background) 95%, transparent 5%)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className={`flex items-center border-b border-[var(--color-border)] ${isCollapsed ? "justify-center px-2 py-4" : "justify-between px-4 py-4"}`}>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-semibold text-[var(--color-foreground)]">Vulcan</h1>
              <p className="mt-0.5 text-xs text-[var(--color-tertiary)]">Mission Control</p>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
            aria-expanded={!isCollapsed}
            className="hidden rounded p-1 text-[var(--color-tertiary)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] lg:flex"
          >
            {isCollapsed ? <ChevronsRight size={18} aria-hidden="true" /> : <ChevronsLeft size={18} aria-hidden="true" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item, index) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  title={isCollapsed ? item.label : undefined}
                  className={`sidebar-nav-item fade-in-up relative flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "sidebar-nav-active" : ""
                  } ${isCollapsed ? "justify-center px-2" : ""}`}
                  style={{ animationDelay: `${index * 35}ms` }}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--color-primary)]" />
                  )}
                  <Icon size={18} className="shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                  {item.href === "/approvals" && pendingCount > 0 && (
                    <span
                      aria-label={`승인 대기 ${pendingCount}건`}
                      className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-xs font-semibold text-[var(--color-foreground)] ${isCollapsed ? "absolute -right-1 -top-1 h-4 min-w-[16px] text-[10px]" : "ml-auto"}`}
                    >
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer: Gateway status */}
        <div className={`border-t border-[var(--color-border)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${isCollapsed ? "flex justify-center" : ""}`}>
          <div className={`flex items-center gap-2 ${isCollapsed ? "" : "rounded-[var(--radius-control)] bg-[var(--color-muted)]/50 px-3 py-2"}`} title={gatewayConnected ? "게이트웨이 연결됨" : "게이트웨이 연결 끊김"}>
            {gatewayConnected ? (
              <Wifi size={14} className="text-[var(--color-success)]" aria-hidden="true" />
            ) : (
              <WifiOff size={14} className="text-[var(--color-destructive)]" aria-hidden="true" />
            )}
            <span className="sr-only">{gatewayConnected ? "게이트웨이 연결됨" : "게이트웨이 연결 끊김"}</span>
            {!isCollapsed && (
              <>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  게이트웨이
                </span>
                <span className={`ml-auto h-2 w-2 rounded-full ${gatewayConnected ? "bg-[var(--color-success)]" : "bg-[var(--color-destructive)]"}`} />
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
