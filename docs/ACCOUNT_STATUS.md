# Account Status (KST)

- Generated at: 2026-03-09 23:05:01 KST
- Thresholds: Pro 5h<20% or weekly<20% => insufficient

| Account | Tier | Plan | 5h Remain | Weekly Remain | 5h Reset | Weekly Reset | Status |
|---|---|---:|---:|---:|---|---|---|
| claude-sub | Pro | Pro | 39% | 36% | 2026-03-10 01:00:00 KST | 2026-03-15 00:00:00 KST | OK |
| claude-main | Pro | Pro | 34% | 53% | 2026-03-10 00:00:00 KST | 2026-03-15 01:00:00 KST | OK |
| claude-work | Max | Max | 88% | 65% | 2026-03-09 07:00:00 KST | 2026-03-13 12:00:00 KST | OK |

## Routing Recommendation
- Route now: **claude-sub**
- Reason: Pro-first: sub has sufficient 5h/weekly balance

## Cross-Provider Signals (Heuristic)
| Provider | Signal | Detail |
|---|---|---|
| codex | warning | rate_limit_hits=0, error_hits=2 (last 2500 lines) |
| gemini | ok | rate_limit_hits=0, error_hits=0 (last 2500 lines) |
