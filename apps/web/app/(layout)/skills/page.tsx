import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SkillsPage() {
  redirect("/team?tab=skills");
}
