"use client";

import dynamic from "next/dynamic";
import type { VaultNoteSummary } from "@vulcan/shared/types";

const VaultExplorer = dynamic(
  () => import("@/components/VaultExplorer").then((m) => m.VaultExplorer),
  { ssr: false },
);

export function VaultPageClient({
  initialNotes,
  initialNotePath,
}: {
  initialNotes: VaultNoteSummary[];
  initialNotePath?: string;
}) {
  return <VaultExplorer initialNotes={initialNotes} initialNotePath={initialNotePath} />;
}
