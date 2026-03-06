"use client";

import { MissionControlProvider } from "@/components/MissionControlProvider";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { useState } from "react";

export default function MissionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  return (
    <MissionControlProvider>
      <div className="vulcan-shell relative">
        <Sidebar isOpen={isSidebarOpen} onClose={toggleSidebar} />
        <div className="flex min-h-screen flex-col">
          <Topbar onMenuClick={toggleSidebar} />
          <main className="flex-1 px-4 py-5 sm:px-6">{children}</main>
        </div>
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={toggleSidebar}
          />
        )}
      </div>
    </MissionControlProvider>
  );
}

