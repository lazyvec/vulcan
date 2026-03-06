# Session Send Stability Runbook (Phase 3)

## Purpose
Stabilize `sessions_send` behavior in daily operations.

## Recommended Rules

1. **Prefer warmed session keys**
   - Use session keys that already replied at least once.
   - Avoid immediate send to a just-spawned run session.

2. **Two-step handshake for new sessions**
   - Step A: spawn/delegate and wait for first completion/ack event
   - Step B: then use `sessions_send`

3. **Timeout handling**
   - On first timeout: retry once to the same warmed key
   - On second timeout: switch to a known-good warmed key
   - If still failing: re-spawn delegate run and re-anchor key

4. **Known constraints (Telegram DM context)**
   - `mode:"session"` + `thread:true` is not available in this channel context
   - Use `run` + `sessions_send` operational pattern instead

## Quick Test Script (manual order)

1) Delegate check
- spawn `aegis` run task, expect ACK

2) Session send check
- send ping to warmed key, expect `pong`

3) Receipt confirmation
- verify inter-session message delivery in main channel

## PASS Criteria

- Delegate: accepted + ACK received
- Session send: 2 consecutive successful replies on warmed key
- Receipt: replies visible in main channel
