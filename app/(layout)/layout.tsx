import { MissionControlProvider } from "@/components/MissionControlProvider";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export default function MissionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <MissionControlProvider>
      <div className="vulcan-shell">
        <Sidebar />
        <div className="min-h-screen">
          <Topbar />
          <main className="px-6 py-5">{children}</main>
        </div>
      </div>
    </MissionControlProvider>
  );
}
