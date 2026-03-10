import { getVaultNotes } from "@/lib/api-server";
import { VaultPageClient } from "./client";

export const revalidate = 0;

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ note?: string }>;
}) {
  const [notes, params] = await Promise.all([getVaultNotes(), searchParams]);
  return <VaultPageClient initialNotes={notes} initialNotePath={params.note} />;
}
