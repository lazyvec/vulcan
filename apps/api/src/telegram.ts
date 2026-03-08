import { eventCategoryOf, EVENT_CATEGORY_LABELS } from "@vulcan/shared/constants";
import type { EventItem, NotificationPreference } from "@vulcan/shared/types";

const TELEGRAM_API = "https://api.telegram.org";

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN ?? "";
}

function getDefaultChatId(): string {
  return process.env.TELEGRAM_CHAT_ID ?? "";
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: "HTML" | "MarkdownV2" = "HTML",
): Promise<{ ok: boolean; error?: string }> {
  const token = getBotToken();
  if (!token) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN not configured" };
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Telegram API ${res.status}: ${body}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function formatEventMessage(event: EventItem): string {
  const category = eventCategoryOf(event.type);
  const categoryLabel = EVENT_CATEGORY_LABELS[category] ?? category;
  const ts = new Date(event.ts).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  const lines: string[] = [];
  lines.push(`<b>🔔 Vulcan Alert</b>`);
  lines.push(`<b>타입:</b> ${escapeHtml(event.type)} (${escapeHtml(categoryLabel)})`);
  lines.push(`<b>요약:</b> ${escapeHtml(event.summary)}`);
  if (event.agentId) {
    lines.push(`<b>에이전트:</b> ${escapeHtml(event.agentId)}`);
  }
  if (event.source) {
    lines.push(`<b>소스:</b> ${escapeHtml(event.source)}`);
  }
  lines.push(`<b>시각:</b> ${escapeHtml(ts)}`);

  return lines.join("\n");
}

export function shouldNotify(
  event: EventItem,
  prefs: NotificationPreference | null,
): boolean {
  if (!prefs) {
    return true;
  }

  const category = eventCategoryOf(event.type);

  if (prefs.enabledCategories.length > 0 && !prefs.enabledCategories.includes(category as never)) {
    return false;
  }

  if (prefs.enabledTypes.length > 0 && !prefs.enabledTypes.includes(event.type)) {
    return false;
  }

  if (prefs.silentHours) {
    const now = new Date();
    const koreaHour = Number(
      now.toLocaleString("en-US", { timeZone: "Asia/Seoul", hour: "numeric", hour12: false }),
    );
    const { startHour, endHour } = prefs.silentHours;

    if (startHour <= endHour) {
      if (koreaHour >= startHour && koreaHour < endHour) return false;
    } else {
      if (koreaHour >= startHour || koreaHour < endHour) return false;
    }
  }

  return true;
}

export function getDefaultNotificationChatId(): string {
  return getDefaultChatId();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
