"use client";

import { MissionControlProvider } from "@/components/MissionControlProvider";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { ToastProvider } from "@/components/ui/Toast";
import { useSyncExternalStore, useCallback, useState } from "react";

const STORAGE_KEY = "vulcan-sidebar-collapsed";

function getCollapsedSnapshot() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function getServerSnapshot() {
  return false;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export default function MissionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const isCollapsed = useSyncExternalStore(subscribe, getCollapsedSnapshot, getServerSnapshot);
  const [, forceRender] = useState(0);

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  const toggleCollapse = useCallback(() => {
    const next = !getCollapsedSnapshot();
    localStorage.setItem(STORAGE_KEY, String(next));
    forceRender((c) => c + 1);
  }, []);

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
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={toggleSidebar}
            />
          )}
        </div>
      </ToastProvider>
    </MissionControlProvider>
  );
}
