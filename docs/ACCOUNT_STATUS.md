# Account Status (KST)

- Generated at: 2026-03-10 11:05:01 KST
- Thresholds: Pro 5h<20% or weekly<20% => insufficient

| Account | Tier | Plan | 5h Remain | Weekly Remain | 5h Reset | Weekly Reset | Status |
|---|---|---:|---:|---:|---|---|---|
| claude-sub | Pro | Pro | 4% | 32% | 2026-03-10 01:00:00 KST | 2026-03-15 00:00:00 KST | INSUFFICIENT |
| claude-main | Pro | Pro | 7% | 41% | 2026-03-10 05:00:00 KST | 2026-03-15 01:00:00 KST | INSUFFICIENT |
| claude-work | Max | Max | 54% | 59% | 2026-03-10 14:00:00 KST | 2026-03-13 11:59:59 KST | OK |

## Routing Recommendation
- Route now: **claude-work**
- Reason: Both Pro accounts insufficient (5h or weekly), route to Max

## Cross-Provider Signals (Heuristic)
| Provider | Signal | Detail |
|---|---|---|
| codex | unknown | no recent provider lines |
| gemini | ok | rate_limit_hits=0, error_hits=0 (last 2500 lines) |
