#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/linuxuser/projects/vulcan-mc"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

TS="$(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S KST')"
TS_EPOCH="$(date +%s)"
OUT_LOG="$LOG_DIR/account-health-cron.log"
WARN_LOG="$LOG_DIR/account-health-warn.log"
STATE_FILE="$LOG_DIR/account-health-alert-state.json"
ALERT_COOLDOWN_HOURS="${ALERT_COOLDOWN_HOURS:-6}"

cd "$ROOT"

{
  echo "[$TS] run account-health-check"
  bash scripts/account-health-check.sh >/tmp/account-health-check.out 2>&1 || true
  cat /tmp/account-health-check.out
} >> "$OUT_LOG"

# warning extraction + telegram push
if grep -q "## Warning" "$ROOT/docs/ACCOUNT_STATUS.md"; then
  WARN_TEXT="$(awk '/## Warning/{flag=1;next}/^$/{if(flag){exit}}flag' "$ROOT/docs/ACCOUNT_STATUS.md" | sed '/^$/d')"
  WARN_HASH="$(printf '%s' "$WARN_TEXT" | sha256sum | awk '{print $1}')"

  {
    echo "[$TS] WARNING DETECTED"
    echo "$WARN_TEXT"
    echo
  } >> "$WARN_LOG"

  # dedupe state load
  LAST_HASH=""
  LAST_SENT_EPOCH=0
  if [ -f "$STATE_FILE" ] && command -v jq >/dev/null 2>&1; then
    LAST_HASH="$(jq -r '.lastHash // empty' "$STATE_FILE" 2>/dev/null || true)"
    LAST_SENT_EPOCH="$(jq -r '.lastSentEpoch // 0' "$STATE_FILE" 2>/dev/null || echo 0)"
  fi

  COOLDOWN_SEC=$((ALERT_COOLDOWN_HOURS * 3600))
  ELAPSED=$((TS_EPOCH - LAST_SENT_EPOCH))

  SHOULD_SEND=1
  if [ "$WARN_HASH" = "$LAST_HASH" ] && [ "$ELAPSED" -lt "$COOLDOWN_SEC" ]; then
    SHOULD_SEND=0
    echo "[$TS] telegram alert skipped (dedupe: same warning within ${ALERT_COOLDOWN_HOURS}h)" >> "$OUT_LOG"
  fi

  # Telegram push (best-effort)
  if [ "$SHOULD_SEND" -eq 1 ]; then
    if command -v jq >/dev/null 2>&1 && command -v curl >/dev/null 2>&1; then
      OC_CFG="$HOME/.openclaw/openclaw.json"
      BOT_TOKEN=""
      if [ -f "$OC_CFG" ]; then
        BOT_TOKEN="$(jq -r '.channels.telegram.botToken // empty' "$OC_CFG" 2>/dev/null || true)"
      fi

      CHAT_ID="${TELEGRAM_CHAT_ID:-8231099345}"

      if [ -n "$BOT_TOKEN" ] && [ -n "$CHAT_ID" ]; then
        MSG="🚨 [불칸 계정 경고]\n시간: $TS\n\n$WARN_TEXT\n\n기준: account-health-cron 자동 감시"
        HTTP_CODE=$(curl -s -o /tmp/vulcan-account-alert.out -w "%{http_code}" \
          "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
          -d "chat_id=${CHAT_ID}" \
          --data-urlencode "text=${MSG}" || true)

        if [ "$HTTP_CODE" = "200" ]; then
          echo "[$TS] telegram alert sent" >> "$OUT_LOG"
          if command -v jq >/dev/null 2>&1; then
            jq -n \
              --arg hash "$WARN_HASH" \
              --arg ts "$TS" \
              --argjson epoch "$TS_EPOCH" \
              '{lastHash:$hash,lastSentAt:$ts,lastSentEpoch:$epoch}' > "$STATE_FILE"
          fi
        else
          echo "[$TS] telegram alert failed (HTTP ${HTTP_CODE})" >> "$OUT_LOG"
        fi
      else
        echo "[$TS] telegram alert skipped (missing token/chat_id)" >> "$OUT_LOG"
      fi
    else
      echo "[$TS] telegram alert skipped (jq/curl unavailable)" >> "$OUT_LOG"
    fi
  fi
fi
