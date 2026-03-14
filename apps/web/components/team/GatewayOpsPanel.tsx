"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toPrettyJson(value: unknown) {
  try { return JSON.stringify(value ?? {}, null, 2); }
  catch { return "{}"; }
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function GatewayOpsPanel() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [gatewayStatus, setGatewayStatus] = useState<unknown>(null);
  const [cronList, setCronList] = useState<unknown>(null);
  const [cronStatus, setCronStatus] = useState<unknown>(null);
  const [configText, setConfigText] = useState("{}");
  const fieldId = useId();

  const statusRecord = useMemo(() => asRecord(gatewayStatus), [gatewayStatus]);
  const connected = statusRecord?.connected === true;
  const connecting = statusRecord?.connecting === true;
  const url = typeof statusRecord?.url === "string" ? statusRecord.url : "unknown";

  async function refresh() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const [statusRes, configRes, cronRes, cronStatusRes] = await Promise.all([
        fetch("/api/gateway/status"),
        fetch("/api/gateway/config"),
        fetch("/api/gateway/cron"),
        fetch("/api/gateway/cron/status"),
      ]);
      for (const r of [statusRes, configRes, cronRes, cronStatusRes]) {
        if (!r.ok) throw new Error(`${r.status}: ${r.statusText}`);
      }
      const [statusData, configData, cronData, cronStatusData] = await Promise.all([
        statusRes.json(), configRes.json(), cronRes.json(), cronStatusRes.json(),
      ]);
      setGatewayStatus((statusData as { gateway?: unknown }).gateway ?? null);
      setCronList((cronData as { cron?: unknown }).cron ?? null);
      setCronStatus((cronStatusData as { status?: unknown }).status ?? null);
      setConfigText(toPrettyJson((configData as { config?: unknown }).config ?? {}));
      setNotice("Gateway 정보를 갱신했어요.");
    } catch (e) {
      setError(`Gateway 조회 실패: ${toErrorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function patchConfig() {
    let parsed: unknown;
    try { parsed = JSON.parse(configText); }
    catch { setError("JSON 형식이 올바르지 않아요."); return; }
    if (!asRecord(parsed)) { setError("JSON object 형태여야 해요."); return; }

    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/gateway/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      await refresh();
      setNotice("Gateway config.patch 요청을 보냈어요.");
    } catch (e) {
      setError(`config.patch 실패: ${toErrorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="vulcan-card p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="section-title">게이트웨이 운영</h3>
        <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={busy} loading={busy}>
          갱신
        </Button>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <Badge status={connected ? "success" : connecting ? "warning" : "error"} dot>
          {connected ? "연결됨" : connecting ? "연결 중" : "연결 끊김"}
        </Badge>
        <Badge status="neutral">{url}</Badge>
      </div>

      <div>
        <label htmlFor={`${fieldId}-config`} className="mb-1 block caption-text">config.patch 페이로드</label>
        <textarea
          id={`${fieldId}-config`}
          value={configText}
          onChange={(e) => setConfigText(e.target.value)}
          className="vulcan-input min-h-[120px] w-full resize-y font-mono text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        />
      </div>

      <Button variant="secondary" size="sm" className="mt-2" onClick={() => void patchConfig()} disabled={busy}>
        config.patch 적용
      </Button>

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <div>
          <p className="mb-1 caption-text">cron.list</p>
          <pre className="max-h-36 overflow-auto rounded border border-[var(--color-border)] bg-[var(--color-background)] p-2 text-[10px] text-[var(--color-muted-foreground)]">
            {toPrettyJson(cronList)}
          </pre>
        </div>
        <div>
          <p className="mb-1 caption-text">cron.status</p>
          <pre className="max-h-36 overflow-auto rounded border border-[var(--color-border)] bg-[var(--color-background)] p-2 text-[10px] text-[var(--color-muted-foreground)]">
            {toPrettyJson(cronStatus)}
          </pre>
        </div>
      </div>

      {notice && <p className="mt-2 text-xs text-[var(--color-success-text)]">{notice}</p>}
      {error && <p className="mt-2 text-xs text-[var(--color-destructive-text)]">{error}</p>}
    </article>
  );
}
