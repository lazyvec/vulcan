# Account Status (KST)

- Generated at: 2026-03-10 01:05:02 KST
- Thresholds: Pro 5h<20% or weekly<20% => insufficient

| Account | Tier | Plan | 5h Remain | Weekly Remain | 5h Reset | Weekly Reset | Status |
|---|---|---:|---:|---:|---|---|---|
| claude-sub | Pro | Pro | 4% | 32% | 2026-03-10 01:00:00 KST | 2026-03-15 00:00:00 KST | INSUFFICIENT |
| claude-main | Pro | Pro | 25% | 43% | 2026-03-10 05:00:01 KST | 2026-03-15 01:00:00 KST | OK |
| claude-work | Max | Max | 87% | 63% | 2026-03-10 05:00:00 KST | 2026-03-13 11:59:59 KST | OK |

## Routing Recommendation
- Route now: **claude-main**
- Reason: Pro-first fallback: sub insufficient, main sufficient

## Cross-Provider Signals (Heuristic)
| Provider | Signal | Detail |
|---|---|---|
| codex | unknown | no recent provider lines |
| gemini | ok | rate_limit_hits=0, error_hits=0 (last 2500 lines) |
