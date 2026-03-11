"use client";

import { useCallback, useState } from "react";
import type { NotificationCategory, NotificationLog, NotificationPreference } from "@/lib/types";

const ALL_CATEGORIES: { key: NotificationCategory; label: string }[] = [
  { key: "agent", label: "에이전트" },
  { key: "task", label: "태스크" },
  { key: "command", label: "커맨드" },
  { key: "skill", label: "스킬" },
  { key: "system", label: "시스템" },
  { key: "gateway", label: "게이트웨이" },
  { key: "legacy", label: "레거시" },
];

interface Props {
  initialPreferences: NotificationPreference | null;
  initialLogs: NotificationLog[];
}

export function NotificationSettings({ initialPreferences, initialLogs }: Props) {
  const [prefs, setPrefs] = useState(initialPreferences);
  const [logs, setLogs] = useState(initialLogs);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const enabledCategories = prefs?.enabledCategories ?? ALL_CATEGORIES.map((c) => c.key);
  const silentHours = prefs?.silentHours ?? null;

  const toggleCategory = useCallback(
    (cat: NotificationCategory) => {
      const current = new Set(enabledCategories);
      if (current.has(cat)) {
        current.delete(cat);
      } else {
        current.add(cat);
      }
      savePrefs({ enabledCategories: Array.from(current) });
    },
    [enabledCategories],
  );

  async function savePrefs(update: Record<string, unknown>) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const data = await res.json();
      if (res.ok && data.preferences) {
        setPrefs(data.preferences);
        setMessage({ type: "ok", text: "설정 저장됨" });
      } else {
        setMessage({ type: "error", text: data.error?.toString() ?? "저장 실패" });
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "저장 실패" });
    } finally {
      setSaving(false);
    }
  }

  async function sendTestNotification() {
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/notifications/test", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: "ok", text: "테스트 알림 발송 완료!" });
        refreshLogs();
      } else {
        setMessage({ type: "error", text: data.error ?? "발송 실패" });
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "발송 실패" });
    } finally {
      setTesting(false);
    }
  }

  async function refreshLogs() {
    try {
      const res = await fetch("/api/notifications/logs?limit=30");
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch {
      // ignore
    }
  }

  async function toggleSilentHours() {
    if (silentHours) {
      await savePrefs({ silentHours: null });
    } else {
      await savePrefs({ silentHours: { startHour: 23, endHour: 7 } });
    }
  }

  async function updateSilentHour(field: "startHour" | "endHour", value: number) {
    if (!silentHours) return;
    await savePrefs({
      silentHours: { ...silentHours, [field]: value },
    });
  }

  return (
    <div className="space-y-6">
      {/* 상태 메시지 */}
      {message && (
        <div
          className={`rounded-[var(--radius-card)] border p-3 text-sm ${
            message.type === "ok"
              ? "border-[var(--color-success)] text-[var(--color-success)]"
              : "border-[var(--color-destructive)] text-[var(--color-destructive)]"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 카테고리 토글 */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-foreground)]">
          알림 카테고리
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ALL_CATEGORIES.map((cat) => {
            const enabled = enabledCategories.includes(cat.key);
            return (
              <button
                key={cat.key}
                type="button"
                disabled={saving}
                onClick={() => toggleCategory(cat.key)}
                className={`rounded-[var(--radius-control)] border px-3 py-2 text-sm font-medium transition-colors ${
                  enabled
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)]"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 조용한 시간 */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
            조용한 시간 (KST)
          </h3>
          <button
            type="button"
            disabled={saving}
            onClick={toggleSilentHours}
            className={`rounded-[var(--radius-control)] px-3 py-1 text-xs font-medium transition-colors ${
              silentHours
                ? "bg-[var(--color-primary)] text-white"
                : "border border-[var(--color-border)] text-[var(--color-muted-foreground)]"
            }`}
          >
            {silentHours ? "ON" : "OFF"}
          </button>
        </div>
        {silentHours && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--color-foreground)]">
            <select
              value={silentHours.startHour}
              onChange={(e) => updateSilentHour("startHour", Number(e.target.value))}
              className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, "0")}:00
                </option>
              ))}
            </select>
            <span>~</span>
            <select
              value={silentHours.endHour}
              onChange={(e) => updateSilentHour("endHour", Number(e.target.value))}
              className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, "0")}:00
                </option>
              ))}
            </select>
            <span className="text-xs text-[var(--color-tertiary)]">알림 무음</span>
          </div>
        )}
      </div>

      {/* 테스트 발송 */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={testing}
          onClick={sendTestNotification}
          className="min-h-[44px] rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {testing ? "발송 중..." : "테스트 알림 발송"}
        </button>
        <button
          type="button"
          onClick={refreshLogs}
          className="min-h-[44px] rounded-[var(--radius-control)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition-opacity hover:opacity-80"
        >
          로그 새로고침
        </button>
      </div>

      {/* 발송 이력 */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)]">
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
            최근 발송 이력
          </h3>
        </div>
        {logs.length === 0 ? (
          <p className="p-4 text-sm text-[var(--color-tertiary)]">발송 이력이 없습니다.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                <span
                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                    log.status === "sent" ? "bg-[var(--color-success)]" : "bg-[var(--color-destructive)]"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--color-foreground)]">
                      {log.eventType}
                    </span>
                    <span className="text-xs text-[var(--color-tertiary)]">
                      {new Date(log.sentAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                    </span>
                  </div>
                  {log.error && (
                    <p className="mt-1 text-xs text-[var(--color-destructive)]">{log.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
