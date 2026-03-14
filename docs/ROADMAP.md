# Vulcan Mission Control Roadmap

> **현재 상태**: Phase 0~11+++ 완료 → Phase 12 백로그
> **실행 체크리스트**: `docs/WORK_PLAN.md`
> **갱신일**: 2026-03-14

> **문서 맵**: [PRODUCT_MASTER](PRODUCT_MASTER.md) · [BRAND_MASTER](BRAND_MASTER.md) · [ROADMAP](ROADMAP.md) · [WORK_PLAN](WORK_PLAN.md) · [PROGRESS](PROGRESS.md) · [DECISIONS](DECISIONS.md)

## 목표 아키텍처

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────┐
│  Next.js (web)  │────▶│   Hono (api)     │────▶│ PostgreSQL │
│  UI + SSR       │     │  REST + WebSocket│     │  + pgvector│
└─────────────────┘     │  + BullMQ Worker │────▶└────────────┘
                        └──────┬───────────┘     ┌────────────┐
                               │            ────▶│   Redis    │
                               │                 └────────────┘
                               │ WebSocket RPC
                               ▼
                        ┌──────────────────┐
                        │ OpenClaw Gateway │
                        │ ws://127.0.0.1:  │
                        │      18789       │
                        │                  │
                        │  Hermes (main)   │──── Telegram
                        │  Aegis · Metis   │
                        │  Athena · Themis │
                        │  Iris · Daedalus │
                        │  Nike · Calliope │
                        │  Argus           │
                        └──────────────────┘
```

## 크리티컬 패스

```
Phase 0 → 1 → 2 → 3 → 4+5 (병렬) → 6 → 8
                           ↘ 7 ↗
              9 (Phase 1부터 점진적)
                              Phase 10 (최종)
                                 ↓
                         11 → 11+ → 11++ → 11+++
```

## 마일스톤

| Phase | 이름 | 핵심 목표 | 상태 |
|-------|------|----------|------|
| 0 | Foundation | 모노레포 + 공유 패키지 | ✅ |
| 1 | PostgreSQL + Redis + Hono | 프로덕션 DB + 독립 백엔드 | ✅ |
| 2 | WebSocket + Gateway RPC | 양방향 통신 | ✅ |
| 3 | 에이전트 생명주기 | CRUD + 제어 + 감사 | ✅ |
| 4 | 태스크 고도화 | 6-lane 칸반 + 의존성 | ✅ |
| 5 | 스킬 마켓플레이스 | 스킬 카탈로그 + 설치/제거 | ✅ |
| 6 | Activity/Audit | 28종 이벤트 + 메트릭스 | ✅ |
| 7 | Telegram 알림 | Herald Bot Long Polling | ✅ |
| 8 | 승인/거버넌스 | Telegram 인라인 키보드 | ✅ |
| 9 | 테스트 + CI/CD | Vitest + Playwright + Husky | ✅ |
| 10 | Docker 배포 | Docker Compose + PM2 | ✅ |
| 11 | Observability | Trace + FinOps + Feature Flags | ✅ |
| 11+ | WorkOrder | 구조화된 작업지시 + 검증 루프 | ✅ |
| 11++ | 메트릭스 강화 | Office View + FinOps + Kanban 연동 | ✅ |
| 11+++ | Memory 강화 | pgvector + 시맨틱 검색 + Temporal Decay | ✅ |
| 12 | Agency Agents | 외부 레퍼런스 트랙 | 📋 |

<!-- ✅ 완료, 🔄 진행 중, 📋 백로그 -->

## Out of Scope

- 멀티테넌시, 팀, RBAC (단일 사용자 시스템)
- 외부 사용자 인증 (Cloudflare Access로 충분)
- 범용 프로젝트 관리 도구 (Jira/Linear 대체 아님)
