import { getNotificationPreferences, getNotificationLogs } from "@/lib/api-server";
import { NotificationSettings } from "@/components/NotificationSettings";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const [preferences, logs] = await Promise.all([
    getNotificationPreferences().catch(() => null),
    getNotificationLogs(30).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
          Notifications
        </h2>
        <p className="mt-1 text-sm text-[var(--color-tertiary)]">
          Telegram 알림 설정 및 발송 이력
        </p>
      </div>
      <NotificationSettings initialPreferences={preferences} initialLogs={logs} />
    </div>
  );
}
