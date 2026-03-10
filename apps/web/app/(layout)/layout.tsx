"use client";

import { MissionControlProvider } from "@/components/MissionControlProvider";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { ToastProvider } from "@/components/ui/Toast";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "vulcan-sidebar-collapsed";

function subscribeToStorage(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function getCollapsedSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function getCollapsedServerSnapshot() {
  return false;
}

export default function MissionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const isCollapsed = useSyncExternalStore(subscribeToStorage, getCollapsedSnapshot, getCollapsedServerSnapshot);

  const toggleSidebar = () => setSidebarOpen((v) => !v);
  const toggleCollapse = useCallback(() => {
    const next = !getCollapsedSnapshot();
    localStorage.setItem(STORAGE_KEY, String(next));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  }, []);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSidebarOpen]);

  return (
    <MissionControlProvider>
      <ToastProvider>
        <div className="vulcan-shell relative" data-collapsed={isCollapsed}>
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={toggleSidebar}
            isCollapsed={isCollapsed}
            onToggleCollapse={toggleCollapse}
          />
          <div className="flex min-h-screen flex-col">
            <Topbar onMenuClick={toggleSidebar} />
            <main className="page-enter mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6">{children}</main>
          </div>
          {isSidebarOpen && (
            <div
              role="button"
              tabIndex={0}
              aria-label="사이드바 닫기"
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={toggleSidebar}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleSidebar(); }}
            />
          )}
        </div>
      </ToastProvider>
    </MissionControlProvider>
  );
}
