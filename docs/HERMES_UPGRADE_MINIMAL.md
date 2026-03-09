# Hermes Upgrade (Minimal, Actionable)

Updated: 2026-03-09

## Goal
Apply high-value pieces from external references without overloading tokens/complexity.

## Source mapping
- pm-skills: workflow structure for discovery/strategy/prd chains
- everything-claude-code (ECC): hook profiles + verification loop discipline

## Minimal modules to adopt now
1. Planning chain normalization
   - `/discover` -> `/strategy` -> `/write-prd` as enforced sequence in mega-plan outputs
2. Verification loop
   - Add explicit "evidence required" section before completion responses
3. Hook profile concept
   - Define operation modes: `minimal` / `standard` / `strict`
4. Security scan checkpoint
   - Add pre-release checklist hook in runbook
5. Cost guardrail
   - Add token budget caps per workflow stage

## Rollout
- Step 1 (now): doc + playbook definitions
- Step 2: wire to Hermes response templates
- Step 3: add automation where safe

## Out of scope (for now)
- Full plugin import
- Large command namespace migration
- Cross-harness parity work
