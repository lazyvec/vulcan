import { eventCategoryOf, EVENT_CATEGORY_LABELS } from "@vulcan/shared/constants";
import type { EventItem, NotificationPreference } from "@vulcan/shared/types";

const TELEGRAM_API = "https://api.telegram.org";

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN ?? "";
}

function getDefaultChatId(): string {
  return process.env.TELEGRAM_CHAT_ID ?? "";
}

// ── Telegram API 기본 함수 ────────────────────────────────────────────────

export interface TelegramInlineKeyboard {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: "HTML" | "MarkdownV2" = "HTML",
  replyMarkup?: TelegramInlineKeyboard,
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const token = getBotToken();
  if (!token) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN not configured" };
  }

  try {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Telegram API ${res.status}: ${body}` };
    }

    const data = (await res.json()) as { ok: boolean; result?: { message_id: number } };
    return { ok: true, messageId: data.result?.message_id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function editTelegramMessage(
  chatId: string,
  messageId: number,
  text: string,
  replyMarkup?: TelegramInlineKeyboard,
): Promise<{ ok: boolean; error?: string }> {
  const token = getBotToken();
  if (!token) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN not configured" };
  }

  try {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(`${TELEGRAM_API}/bot${token}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<{ ok: boolean; error?: string }> {
  const token = getBotToken();
  if (!token) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN not configured" };
  }

  try {
    const payload: Record<string, unknown> = { callback_query_id: callbackQueryId };
    if (text) payload.text = text;

    const res = await fetch(`${TELEGRAM_API}/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

// ── Long Polling ────────────────────────────────────────────────────────────

export interface TelegramCallbackQuery {
  id: string;
  data?: string;
  message?: { chat: { id: number }; message_id: number };
}

export interface TelegramUpdate {
  update_id: number;
  callback_query?: TelegramCallbackQuery;
}

export type CallbackHandler = (cbq: TelegramCallbackQuery) => Promise<void>;

let pollingTimer: ReturnType<typeof setTimeout> | null = null;
let lastUpdateId = 0;

async function pollUpdates(onCallback: CallbackHandler, intervalMs: number): Promise<void> {
  const token = getBotToken();
  if (!token) return;

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/getUpdates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offset: lastUpdateId + 1,
        timeout: 2,
        allowed_updates: ["callback_query"],
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { ok: boolean; result?: TelegramUpdate[] };
      if (data.ok && data.result) {
        for (const update of data.result) {
          lastUpdateId = Math.max(lastUpdateId, update.update_id);
          if (update.callback_query) {
            await onCallback(update.callback_query);
          }
        }
      }
    }
  } catch (err) {
    console.error("[vulcan-herald] polling error:", err);
  }

  pollingTimer = setTimeout(() => void pollUpdates(onCallback, intervalMs), intervalMs);
}

export async function startTelegramPolling(
  onCallback: CallbackHandler,
  intervalMs = 2000,
): Promise<void> {
  const token = getBotToken();
  if (!token) {
    console.warn("[vulcan-herald] TELEGRAM_BOT_TOKEN not set, polling disabled");
    return;
  }

  // webhook 해제 (polling과 충돌 방지)
  try {
    await fetch(`${TELEGRAM_API}/bot${token}/deleteWebhook`, { method: "POST" });
  } catch { /* ignore */ }

  console.log(`[vulcan-herald] Telegram polling started (interval: ${intervalMs}ms)`);
  void pollUpdates(onCallback, intervalMs);
}

export function stopTelegramPolling(): void {
  if (pollingTimer) {
    clearTimeout(pollingTimer);
    pollingTimer = null;
    console.log("[vulcan-herald] Telegram polling stopped");
  }
}

// ── 이벤트 알림 포맷 ──────────────────────────────────────────────────────

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

// 기본 제외 카테고리: 운영성 이벤트 (heartbeat, health check, sync 등)
const DEFAULT_EXCLUDED_CATEGORIES = new Set(["system", "legacy"]);
const DEFAULT_EXCLUDED_TYPES = new Set(["sync", "ping", "system.sync", "system.health"]);

export function shouldNotify(
  event: EventItem,
  prefs: NotificationPreference | null,
): boolean {
  const category = eventCategoryOf(event.type);

  // 운영성 이벤트는 항상 제외 (prefs 유무 무관)
  if (DEFAULT_EXCLUDED_CATEGORIES.has(category)) return false;
  if (DEFAULT_EXCLUDED_TYPES.has(event.type)) return false;

  if (!prefs) {
    return true;
  }

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

// ── Approval Notification (Phase 8) ─────────────────────────────────────────

export function formatApprovalRequestMessage(input: {
  approvalId: string;
  agentId: string;
  mode: string;
  policyName: string;
  messagePreview: string;
}): string {
  const lines: string[] = [];
  lines.push(`<b>🔐 승인 요청</b>`);
  lines.push(`<b>에이전트:</b> ${escapeHtml(input.agentId)}`);
  lines.push(`<b>모드:</b> ${escapeHtml(input.mode)}`);
  lines.push(`<b>정책:</b> ${escapeHtml(input.policyName)}`);
  lines.push(`<b>내용:</b> ${escapeHtml(input.messagePreview)}`);

  return lines.join("\n");
}

export function getApprovalInlineKeyboard(approvalId: string): TelegramInlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: "✅ 승인", callback_data: `approval:approve:${approvalId}` },
        { text: "❌ 거절", callback_data: `approval:reject:${approvalId}` },
      ],
    ],
  };
}

export function formatApprovalResultMessage(
  originalText: string,
  action: "approve" | "reject" | "auto_approve",
  resolvedBy?: string,
): string {
  const statusLabel =
    action === "approve"
      ? "✅ 승인됨"
      : action === "reject"
        ? "❌ 거절됨"
        : "⏰ 자동 승인됨";
  const by = resolvedBy ? ` (${escapeHtml(resolvedBy)})` : "";

  return `${originalText}\n\n<b>${statusLabel}</b>${by}`;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
