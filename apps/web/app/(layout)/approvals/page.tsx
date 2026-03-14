import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; id?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams({ tab: "approvals" });
  if (params.action) qs.set("action", params.action);
  if (params.id) qs.set("id", params.id);
  redirect(`/activity?${qs.toString()}`);
}
