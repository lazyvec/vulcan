import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  redirect("/activity?tab=notifications");
}
