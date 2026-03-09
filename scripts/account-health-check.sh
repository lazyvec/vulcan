#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/docs/ACCOUNT_STATUS.md"

# Thresholds (override via env)
PRO_MIN_5H="${PRO_MIN_5H:-20}"
PRO_MIN_WEEKLY="${PRO_MIN_WEEKLY:-20}"
MAX_WARN_WEEKLY="${MAX_WARN_WEEKLY:-20}"
MAX_WARN_HOURS="${MAX_WARN_HOURS:-24}"

SUB_CACHE="$HOME/.claude-sub/.usage-cache.json"
MAIN_CACHE="$HOME/.claude-main/.usage-cache.json"
WORK_CACHE="$HOME/.claude-work/.usage-cache.json"

python3 - "$OUT" "$SUB_CACHE" "$MAIN_CACHE" "$WORK_CACHE" "$PRO_MIN_5H" "$PRO_MIN_WEEKLY" "$MAX_WARN_WEEKLY" "$MAX_WARN_HOURS" << 'PY'
import json, sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from pathlib import Path

out, sub_p, main_p, work_p, pro_min_5h, pro_min_w, max_warn_w, max_warn_h = sys.argv[1:]
pro_min_5h = int(pro_min_5h)
pro_min_w = int(pro_min_w)
max_warn_w = int(max_warn_w)
max_warn_h = int(max_warn_h)

kst = ZoneInfo("Asia/Seoul")
now = datetime.now(timezone.utc)

def latest_openclaw_log():
    p = Path('/tmp/openclaw')
    if not p.exists():
        return None
    logs = sorted(p.glob('openclaw-*.log'), key=lambda x: x.stat().st_mtime, reverse=True)
    return logs[0] if logs else None

def provider_signal(provider_name: str):
    log = latest_openclaw_log()
    if not log:
        return {'provider': provider_name, 'status': 'unknown', 'detail': 'log unavailable'}

    txt = log.read_text(errors='ignore')
    lines = txt.splitlines()[-2500:]
    p = provider_name.lower()
    matched = [ln for ln in lines if p in ln.lower()]
    if not matched:
        return {'provider': provider_name, 'status': 'unknown', 'detail': 'no recent provider lines'}

    rate_hits = sum(1 for ln in matched if 'rate limit' in ln.lower() or '429' in ln)
    err_hits = sum(1 for ln in matched if 'error' in ln.lower() or 'failed' in ln.lower())

    if rate_hits > 0:
        st = 'limited'
    elif err_hits > 0:
        st = 'warning'
    else:
        st = 'ok'

    return {
        'provider': provider_name,
        'status': st,
        'detail': f'rate_limit_hits={rate_hits}, error_hits={err_hits} (last 2500 lines)'
    }

def parse_ts(s):
    return datetime.fromisoformat(s.replace('Z', '+00:00'))

def load_usage(path, label, tier):
    p = Path(path)
    if not p.exists():
        return {
            'label': label, 'tier': tier, 'ok': False, 'error': 'missing cache file'
        }
    raw = json.loads(p.read_text())
    d = raw.get('data', {})
    five_used = d.get('fiveHour')
    week_used = d.get('sevenDay')
    if five_used is None or week_used is None:
        return {'label': label, 'tier': tier, 'ok': False, 'error': 'usage fields missing'}

    five_rem = max(0, 100 - int(five_used))
    week_rem = max(0, 100 - int(week_used))
    r5 = parse_ts(d['fiveHourResetAt']) if d.get('fiveHourResetAt') else None
    rw = parse_ts(d['sevenDayResetAt']) if d.get('sevenDayResetAt') else None
    hours_to_week_reset = (rw - now).total_seconds()/3600 if rw else None

    return {
        'label': label,
        'tier': tier,
        'ok': True,
        'plan': d.get('planName', '?'),
        'five_used': int(five_used),
        'week_used': int(week_used),
        'five_rem': five_rem,
        'week_rem': week_rem,
        'r5': r5,
        'rw': rw,
        'hours_to_week_reset': hours_to_week_reset,
    }

def kst_fmt(dt):
    if not dt:
        return '-'
    return dt.astimezone(kst).strftime('%Y-%m-%d %H:%M:%S KST')

def insufficient(ac):
    return (ac['five_rem'] < pro_min_5h) or (ac['week_rem'] < pro_min_w)

sub = load_usage(sub_p, 'claude-sub', 'Pro')
main = load_usage(main_p, 'claude-main', 'Pro')
work = load_usage(work_p, 'claude-work', 'Max')
accounts = [sub, main, work]

gemini_sig = provider_signal('gemini')
codex_sig = provider_signal('codex')

routing = 'UNKNOWN'
reason = 'insufficient data'

if sub.get('ok') and main.get('ok') and work.get('ok'):
    if not insufficient(sub):
        routing, reason = 'claude-sub', 'Pro-first: sub has sufficient 5h/weekly balance'
    elif not insufficient(main):
        routing, reason = 'claude-main', 'Pro-first fallback: sub insufficient, main sufficient'
    else:
        routing, reason = 'claude-work', 'Both Pro accounts insufficient (5h or weekly), route to Max'

max_warn = ''
if work.get('ok'):
    h = work.get('hours_to_week_reset')
    if work['week_rem'] < max_warn_w and h is not None and h >= max_warn_h:
        max_warn = f"⚠️ Max 주간 잔량 낮음: {work['week_rem']}% 남음, 리셋까지 {h:.1f}시간"

lines = []
lines.append('# Account Status (KST)')
lines.append('')
lines.append(f"- Generated at: {datetime.now(kst).strftime('%Y-%m-%d %H:%M:%S KST')}")
lines.append(f"- Thresholds: Pro 5h<{pro_min_5h}% or weekly<{pro_min_w}% => insufficient")
lines.append('')
lines.append('| Account | Tier | Plan | 5h Remain | Weekly Remain | 5h Reset | Weekly Reset | Status |')
lines.append('|---|---|---:|---:|---:|---|---|---|')

for a in accounts:
    if not a.get('ok'):
        lines.append(f"| {a['label']} | {a['tier']} | - | - | - | - | - | ERROR: {a['error']} |")
        continue
    status = 'OK'
    if a['tier'] == 'Pro' and insufficient(a):
        status = 'INSUFFICIENT'
    lines.append(
        f"| {a['label']} | {a['tier']} | {a['plan']} | {a['five_rem']}% | {a['week_rem']}% | {kst_fmt(a['r5'])} | {kst_fmt(a['rw'])} | {status} |"
    )

lines.append('')
lines.append('## Routing Recommendation')
lines.append(f"- Route now: **{routing}**")
lines.append(f"- Reason: {reason}")

if max_warn:
    lines.append('')
    lines.append('## Warning')
    lines.append(f'- {max_warn}')

lines.append('')
lines.append('## Cross-Provider Signals (Heuristic)')
lines.append('| Provider | Signal | Detail |')
lines.append('|---|---|---|')
for sig in [codex_sig, gemini_sig]:
    lines.append(f"| {sig['provider']} | {sig['status']} | {sig['detail']} |")

Path(out).write_text('\n'.join(lines) + '\n')
print(f"[ok] wrote {out}")
print('\n'.join(lines))
PY
