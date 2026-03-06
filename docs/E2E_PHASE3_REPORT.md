# Phase 3 E2E Report (Direct / Delegate / Session Send)

- Date: 2026-03-06 (UTC)
- Scope: `direct`, `delegate(aegis)`, `session_send`, response receipt
- Environment: OpenClaw gateway (local), Telegram DM channel

## 1) Result Summary

| Segment | Result | Notes |
|---|---|---|
| direct | PASS | Main channel response path normal |
| delegate (`sessions_spawn` to `aegis`) | PASS | Accepted + ACK received |
| session_send | PARTIAL PASS | Works on warmed/active session keys; can timeout on newly spawned session |
| response receipt | PASS (warmed session) | `pong2 ✅`, `pong3 ✅` received |

## 2) Timeline (UTC)

| Time | Event | Outcome |
|---|---|---|
| 13:39:56 | Delegate check spawn (`aegis`) | accepted (`runId: 5422ef76-060f-4244-9f0c-20a8629e2e2a`) |
| 13:40:00 | Delegate response received | `DELEGATE_ACK` |
| 13:40:03 | `session_send` to existing key (`92fc...`) | timeout |
| 13:40:40 | `session_send` to newly spawned key (`152a...`) | timeout |
| 13:42:07 | `session_send` to fresh key (`a6c6...`) | timeout |
| 13:42:38 | `session_send` to warmed key (`92fc...`) | success (`pong2 ✅`) |
| 13:42:47 | `session_send` to warmed key (`92fc...`) | success (`pong3 ✅`) |

## 3) Config Changes Applied During E2E

- Added subagent allowlist for `main` and `aegis`
- Set `tools.sessions.visibility = "all"`
- Set `tools.agentToAgent.enabled = true`
- Gateway restart(s) performed and runtime recovered to `running`

## 4) Conclusion

- Delegate path is stable.
- Session-to-session messaging is available, but reliability depends on session readiness.
- Operationally, use known active/warmed session keys for stable `session_send` behavior.
