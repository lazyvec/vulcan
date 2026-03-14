"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import dynamic from "next/dynamic";
import type { VaultNoteSummary } from "@vulcan/shared/types";
import type { DocItem } from "@/lib/types";
import { DocsExplorer } from "@/components/DocsExplorer";
import { Tabs } from "@/components/ui/Tabs";

const VaultExplorer = dynamic(
  () => import("@/components/VaultExplorer").then((m) => m.VaultExplorer),
  { ssr: false },
);

type SubTab = "vault" | "docs";

interface Props {
  initialNotes: VaultNoteSummary[];
  initialNotePath?: string;
  docs: DocItem[];
  docsQuery: string;
}

const SUB_TABS = [
  { key: "vault", label: "볼트" },
  { key: "docs", label: "문서" },
] as const;

export function VaultPageClient({ initialNotes, initialNotePath, docs, docsQuery }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = (searchParams.get("tab") as SubTab) || "vault";

  const handleTabChange = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key === "vault") {
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
      {activeTab === "vault" && (
        <VaultExplorer initialNotes={initialNotes} initialNotePath={initialNotePath} />
      )}
      {activeTab === "docs" && (
        <DocsExplorer docs={docs} initialQuery={docsQuery} />
      )}
    </div>
  );
}
