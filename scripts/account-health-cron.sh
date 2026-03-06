#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/linuxuser/projects/vulcan"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

TS="$(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S KST')"
OUT_LOG="$LOG_DIR/account-health-cron.log"
WARN_LOG="$LOG_DIR/account-health-warn.log"

cd "$ROOT"

{
  echo "[$TS] run account-health-check"
  bash scripts/account-health-check.sh >/tmp/account-health-check.out 2>&1 || true
  cat /tmp/account-health-check.out
} >> "$OUT_LOG"

# warning extraction
if grep -q "## Warning" "$ROOT/docs/ACCOUNT_STATUS.md"; then
  {
    echo "[$TS] WARNING DETECTED"
    awk '/## Warning/{flag=1;next}/^$/{if(flag){exit}}flag' "$ROOT/docs/ACCOUNT_STATUS.md"
    echo
  } >> "$WARN_LOG"
fi
