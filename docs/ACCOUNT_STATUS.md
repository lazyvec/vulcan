# Account Status (KST)

- Generated at: 2026-03-09 14:05:01 KST
- Thresholds: Pro 5h<20% or weekly<20% => insufficient

| Account | Tier | Plan | 5h Remain | Weekly Remain | 5h Reset | Weekly Reset | Status |
|---|---|---:|---:|---:|---|---|---|
| claude-sub | Pro | Pro | 0% | 53% | 2026-03-09 14:00:01 KST | 2026-03-15 00:00:00 KST | INSUFFICIENT |
| claude-main | Pro | Pro | 90% | 70% | 2026-03-09 18:00:00 KST | 2026-03-15 01:00:00 KST | OK |
| claude-work | Max | Max | 88% | 65% | 2026-03-09 07:00:00 KST | 2026-03-13 12:00:00 KST | OK |

## Routing Recommendation
- Route now: **claude-main**
- Reason: Pro-first fallback: sub insufficient, main sufficient

## Cross-Provider Signals (Heuristic)
| Provider | Signal | Detail |
|---|---|---|
| codex | warning | rate_limit_hits=0, error_hits=2 (last 2500 lines) |
| gemini | ok | rate_limit_hits=0, error_hits=0 (last 2500 lines) |
