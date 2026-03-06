# Vulcan Roadmap

> **현재 상태**: M0 완료 + Phase 0 완료 + Phase 1 완료 → Phase 2 준비
> **실행 체크리스트**: `docs/WORK_PLAN.md`

## 목표 아키텍처

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────┐
│  Next.js (web)  │────▶│   Hono (api)     │────▶│ PostgreSQL │
│  UI + SSR       │     │  REST + WebSocket│     └────────────┘
└─────────────────┘     │  + BullMQ Worker │────▶┌────────────┐
                        └──────┬───────────┘     │   Redis    │
                               │                 └────────────┘
                               │ WebSocket RPC
                               ▼
                        ┌──────────────────┐
                        │ OpenClaw Gateway │
                        │ ws://127.0.0.1:  │
                        │      18789       │
                        │  Hermes · Vesta  │──── Telegram
                        │  Atlas · Lyra    │
                        │  Aegis           │
                        └──────────────────┘
```

## 크리티컬 패스

```
Phase 0 → 1 → 2 → 3 → 4+5 (병렬) → 6 → 8
                           ↘ 7 ↗
              9 (Phase 1부터 점진적)
                              Phase 10 (최종)
```

---

## Phase 0: Foundation — 모노레포 + 공유 패키지 (3-5일)

M0을 깨뜨리지 않고 분리 가능 구조로 준비.

- pnpm 워크스페이스 (`apps/web/`, `apps/api/`, `packages/shared/`)
- 공유 타입/상수/Zod 스키마 추출
- Drizzle Kit 마이그레이션 도입
- Store 인터페이스 추상화

## Phase 1: PostgreSQL + Redis + Hono 백엔드 (7-10일, 완료)

프로덕션급 데이터 인프라 + 독립 백엔드 서비스.

- SQLite → PostgreSQL 전환 (Drizzle pg dialect)
- Redis Pub/Sub (in-memory 교체)
- Hono 백엔드 서비스 (기존 12개 API 포팅)
- Next.js API Routes 제거 → 프론트엔드 전용

## Phase 2: WebSocket + OpenClaw Gateway RPC (5-7일)

양방향 통신 기반 + OpenClaw 직접 연결.

- SSE → WebSocket 전환 (Hono ↔ 프론트엔드)
- OpenClaw Gateway RPC 클라이언트 (`ws://127.0.0.1:18789`)
- 로그 파일 폴링 → Gateway RPC 직접 수신으로 대체
- Redis Pub/Sub 팬아웃

## Phase 3: 에이전트 생명주기 관리 (10-14일)

핵심 패러다임 전환: 관찰 → 양방향 제어.

- 에이전트 CRUD + 제어 API (pause/resume/restart/command)
- 이중 제어 모드: Hermes 경유 위임 + 직접 제어
- Gateway RPC 통합 (agents/chat/sessions/config/cron)
- BullMQ 워커 (커맨드 큐, 헬스체크)
- 에이전트 관리 UI + 감사 로깅

## Phase 4: 태스크 시스템 고도화 (7-10일) ← Phase 5와 병렬

- 태스크 모델 확장 (priority, due_at, tags, dependencies, comments)
- 6-lane 칸반 + 드래그앤드롭 (`@dnd-kit`)
- 에이전트 할당 → Gateway RPC 연동
- 태스크 상세 모달

## Phase 5: 스킬 마켓플레이스 (7-10일) ← Phase 4와 병렬

- 스킬 데이터 모델 + Gateway 동기화
- 에이전트별 스킬 설치/제거
- 마켓플레이스 UI

## Phase 6: Activity/Audit + 메트릭스 (5-7일)

- 이벤트 타입 확장 (4종 → 15종+)
- Activity API (페이지네이션 + 필터링)
- 메트릭스 대시보드 (`recharts`)

## Phase 7: Telegram 알림 연동 (3-5일)

별도 봇 불필요. 기존 Hermes 채널로 알림 전송.

- 알림 서비스 (Bot API 또는 Gateway RPC)
- 이벤트 타입별 구독/해제
- BullMQ 알림 큐

## Phase 8: 승인/거버넌스 (5-7일)

- 승인 정책 + 커맨드 파이프라인 연동
- Telegram 알림 + Vulcan UI 승인
- 자동 승인 타임아웃

## Phase 9: 테스트 + CI/CD (점진적)

- Vitest + Hono test client + Playwright
- GitHub Actions CI
- Husky + lint-staged

## Phase 10: Docker 배포 (4-6일)

- Docker Compose (web + api + worker + postgres + redis)
- PM2 → Docker Compose 전환

---

## Out of Scope (유지)

- 멀티테넌시, 팀, RBAC (단일 사용자 시스템)
- 외부 사용자 인증 (Cloudflare Access로 충분)
- 범용 프로젝트 관리 도구 (Jira/Linear 대체 아님)

## 총 예상

| 전체 | 56-81 작업일 (3-4개월) |
|------|----------------------|
