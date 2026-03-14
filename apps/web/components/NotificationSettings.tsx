"use client";

import { useCallback, useState } from "react";
import type { NotificationCategory, NotificationPreference } from "@/lib/types";

const CORE_CATEGORIES: { key: NotificationCategory; label: string }[] = [
  { key: "agent", label: "에이전트" },
  { key: "task", label: "태스크" },
  { key: "system", label: "시스템" },
];

interface Props {
  initialPreferences: NotificationPreference | null;
}

export function NotificationSettings({ initialPreferences }: Props) {
  const [prefs, setPrefs] = useState(initialPreferences);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const enabledCategories = prefs?.enabledCategories ?? CORE_CATEGORIES.map((c) => c.key);
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
        <div className="grid grid-cols-3 gap-2">
          {CORE_CATEGORIES.map((cat) => {
            const enabled = enabledCategories.includes(cat.key);
            return (
              <button
                key={cat.key}
                type="button"
                disabled={saving}
                onClick={() => toggleCategory(cat.key)}
                className={`rounded-[var(--radius-control)] border px-3 py-2 min-h-[44px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
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
            className={`rounded-[var(--radius-control)] px-3 py-1 min-h-[44px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
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
              className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
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
              className="rounded border border-[var(--color-border)] bg-transparent px-2 py-1 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
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
    </div>
  );
}
