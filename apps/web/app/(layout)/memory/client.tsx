"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import { MemoryBoard } from "@/components/MemoryBoard";
import { KnowledgeSearch } from "@/components/KnowledgeSearch";
import { Tabs } from "@/components/ui/Tabs";
import type { MemoryItem, MemoryStats } from "@/lib/types";

type SubTab = "board" | "knowledge";

interface Props {
  journal: MemoryItem[];
  longterm: MemoryItem[];
  profile: MemoryItem[];
  lesson: MemoryItem[];
  initialQuery: string;
  knowledgeStats: MemoryStats;
}

const SUB_TABS = [
  { key: "board", label: "보드" },
  { key: "knowledge", label: "검색" },
] as const;

export function MemoryPageClient({
  journal,
  longterm,
  profile,
  lesson,
  initialQuery,
  knowledgeStats,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = (searchParams.get("tab") as SubTab) || "board";

  const handleTabChange = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key === "board") {
        params.delete("tab");
      } else {
        params.set("tab", key);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  return (
    <div className="space-y-4">
      <Tabs items={[...SUB_TABS]} activeKey={activeTab} onChange={handleTabChange} />
      {activeTab === "board" && (
        <MemoryBoard
          journal={journal}
          longterm={longterm}
          profile={profile}
          lesson={lesson}
          initialQuery={initialQuery}
        />
      )}
      {activeTab === "knowledge" && (
        <KnowledgeSearch initialStats={knowledgeStats} />
      )}
    </div>
  );
}
