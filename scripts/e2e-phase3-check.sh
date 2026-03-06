#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CFG="$HOME/.openclaw/openclaw.json"
OUT="$ROOT/docs/E2E_PHASE3_LAST_RUN.md"
NOW_KST="$(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S KST')"

pass() { echo "PASS|$1|$2"; }
fail() { echo "FAIL|$1|$2"; }

results=()

# 1) Gateway runtime check
if openclaw gateway status 2>/dev/null | grep -q "Runtime: running"; then
  results+=("$(pass gateway_runtime "running")")
else
  results+=("$(fail gateway_runtime "not running")")
fi

# 2) Required config checks
if command -v jq >/dev/null 2>&1 && [ -f "$CFG" ]; then
  vis="$(jq -r '.tools.sessions.visibility // ""' "$CFG")"
  a2a="$(jq -r '.tools.agentToAgent.enabled // false' "$CFG")"
  allow_main="$(jq -r '[.agents.list[]? | select(.id=="main") | .subagents.allowAgents[]?] | @csv' "$CFG")"

  [ "$vis" = "all" ] && results+=("$(pass sessions_visibility "$vis")") || results+=("$(fail sessions_visibility "$vis")")
  [ "$a2a" = "true" ] && results+=("$(pass agent_to_agent "enabled")") || results+=("$(fail agent_to_agent "$a2a")")

  if echo "$allow_main" | grep -q "aegis"; then
    results+=("$(pass subagent_allowlist "main includes aegis")")
  else
    results+=("$(fail subagent_allowlist "main missing aegis")")
  fi
else
  results+=("$(fail config_check "jq missing or config missing")")
fi

# Render markdown report
{
  echo "# Phase 3 E2E Last Run"
  echo
  echo "- Executed at: $NOW_KST"
  echo '- Script: `scripts/e2e-phase3-check.sh`'
  echo
  echo "| Check | Status | Detail |"
  echo "|---|---|---|"

  overall="PASS"
  for row in "${results[@]}"; do
    IFS='|' read -r status check detail <<< "$row"
    [ "$status" = "FAIL" ] && overall="FAIL"
    echo "| $check | $status | $detail |"
  done

  echo
  echo "**Overall:** $overall"
  echo
  echo "> Note: this script validates Phase 3 E2E prerequisites/config + runtime health."
  echo "> Live message round-trip tests (delegate/session_send) are still verified in interactive runs."
} > "$OUT"

echo "[ok] wrote $OUT"
cat "$OUT"
