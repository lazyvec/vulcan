# Work Plan — Vulcan Mission Control

> 이 파일은 세션 시작 시 자동으로 참조됩니다. 미완료 Phase를 확인하고 이어서 작업하세요.
> 전체 로드맵은 `docs/ROADMAP.md`, 제품 정의는 `docs/Vulcan_PRODUCT_MASTER.md` 참조.

## 현재 Phase: 1 — PostgreSQL + Redis + Hono

> M0 + Phase 0 완료. Phase 1 작업부터 이어서 진행.

---

## Phase 0: Foundation (3-5일) — 의존성: 없음 (완료: 2026-03-06)

- [x] pnpm 워크스페이스 모노레포 전환 (`pnpm-workspace.yaml`, `apps/web/`, `packages/shared/`)
- [x] 공유 패키지 추출 (`lib/types.ts` → `packages/shared/types.ts`, `lib/statusMap.ts` → `packages/shared/constants.ts`)
- [x] Zod 스키마 추가 (API request/response 유효성 검증)
- [x] Drizzle Kit 마이그레이션 도입 (`CREATE TABLE IF NOT EXISTS` → 정식 마이그레이션)
- [x] Store 인터페이스 추상화 (`lib/store.ts` → 인터페이스 + SQLite 구현체)
- [x] 검증: `pnpm install && pnpm -r build` 성공, 기존 기능 동작 확인

## Phase 1: PostgreSQL + Redis + Hono (7-10일) — 의존성: Phase 0

- [ ] Drizzle 스키마 PostgreSQL 전환 (`sqliteTable` → `pgTable`, UUID, timestamp)
- [ ] 외래키 제약조건 추가
- [ ] SQLite → PostgreSQL 원타임 데이터 마이그레이션 스크립트
- [ ] Redis 설정 (`ioredis` + `bullmq`)
- [ ] `event-stream.ts` in-memory → Redis Pub/Sub 교체
- [ ] Hono 백엔드 서비스 구축 (`apps/api/`) — 기존 12개 API 포팅
- [ ] 미들웨어: CORS, 보안 헤더, 에러 핸들링, 로깅
- [ ] Health endpoint: PostgreSQL + Redis 연결 상태
- [ ] Next.js에서 API Route Handlers 제거 → Hono 백엔드로 연결
- [ ] 어댑터 URL 변경
- [ ] PM2 ecosystem에 Hono 서버 추가
- [ ] 검증: `curl /api/health` → PostgreSQL + Redis 연결, 12개 API 동일 응답

## Phase 2: WebSocket + Gateway RPC (5-7일) — 의존성: Phase 1

- [ ] Hono WebSocket 서버 (`hono/ws`) — 프론트엔드 ↔ 백엔드
- [ ] 메시지 프로토콜 정의: `{ type: 'event'|'command'|'ack'|'error', payload }`
- [ ] OpenClaw Gateway RPC 클라이언트 (`ws://127.0.0.1:18789`)
  - [ ] 챌린지 기반 핸드셰이크, 프로토콜 v3
  - [ ] RPC 래핑: `agents.*`, `chat.*`, `sessions.*`, `config.*`, `cron.*`
  - [ ] 재연결 로직 (지수 백오프)
- [ ] 프론트엔드 `useWebSocket` 훅 (자동 재연결)
- [ ] `LiveActivityPanel.tsx`, `OfficeView.tsx` SSE → WebSocket 전환
- [ ] Redis Pub/Sub 팬아웃 (Gateway 이벤트 → 모든 클라이언트)
- [ ] 로그 파일 폴링 어댑터 → Gateway RPC 직접 수신으로 대체
- [ ] 검증: WebSocket 연결, Gateway 핸드셰이크, 에이전트 목록 실시간 수신

## Phase 3: 에이전트 생명주기 관리 (10-14일) — 의존성: Phase 2

- [ ] 에이전트 데이터 모델 확장 (skills, config, is_active, gateway_id, capabilities)
- [ ] 신규 테이블: `gateways`, `agent_commands`, `audit_log`
- [ ] Gateway RPC 통합
  - [ ] `agents.list/create/delete` — 에이전트 CRUD
  - [ ] `chat.send` — 메시지/지시 전송
  - [ ] `sessions.spawn/send` — 하위 에이전트 위임/통신
  - [ ] `config.patch` — 설정 변경
  - [ ] `cron.*` — 예약 작업
- [ ] 이중 제어 모드 API: `/delegate` (Hermes 경유) + `/command` (직접)
- [ ] BullMQ 워커: 커맨드 큐, 헬스체크 큐
- [ ] 프론트엔드 에이전트 관리 UI (제어 패널, 상세 뷰, 확인 다이얼로그)
- [ ] 감사 로깅 (모든 mutation 자동 기록)
- [ ] 검증: UI에서 에이전트 일시정지/재시작, Hermes 경유 위임 동작

## Phase 4: 태스크 시스템 고도화 (7-10일) — 의존성: Phase 3 | 병렬: Phase 5

- [ ] 태스크 모델 확장 (description, priority, due_at, tags, custom_fields, parent_task_id)
- [ ] lane 확장: 3-lane → 6-lane (backlog/queued/in_progress/review/done/archived)
- [ ] 신규 테이블: `task_dependencies`, `task_comments`, `boards`
- [ ] 태스크 API 확장 (assign, comment, deps)
- [ ] 에이전트 할당 → Gateway RPC 커맨드 연동
- [ ] 칸반 UI 재작성 (`@dnd-kit/core` 드래그앤드롭, 상세 모달)
- [ ] 검증: 드래그앤드롭, 의존성, 코멘트, 에이전트 할당 → 실제 전달

## Phase 5: 스킬 마켓플레이스 (7-10일) — 의존성: Phase 3 | 병렬: Phase 4

- [ ] 스킬 데이터 모델 (`skills`, `agent_skills`, `skill_registry`)
- [ ] Gateway RPC로 스킬 동기화/설치/제거
- [ ] 스킬 API + 마켓플레이스 UI (카탈로그, 상세, 에이전트별 관리)
- [ ] 사이드바에 "Skills" 추가
- [ ] 검증: 스킬 목록 동기화, 에이전트에 설치/제거

## Phase 6: Activity/Audit + 메트릭스 (5-7일) — 의존성: Phase 3, 4

- [ ] 이벤트 타입 확장 (4종 → 15종+)
- [ ] Activity API (페이지네이션 + 필터링 + 통계)
- [ ] 메트릭스 대시보드 (`recharts`)
- [ ] LiveActivityPanel 강화 (타입 필터, 소스 링크, 무한 스크롤)
- [ ] 검증: 메트릭스 차트, 활동 필터링

## Phase 7: Telegram 알림 연동 (3-5일) — 의존성: Phase 3

- [ ] 알림 서비스 (Telegram Bot API 또는 Gateway RPC `chat.send`)
- [ ] 알림 설정 (이벤트 타입별 구독/해제, `notification_preferences` 테이블)
- [ ] BullMQ 알림 큐
- [ ] 검증: Telegram 알림 수신 (에러, 태스크 완료)

## Phase 8: 승인/거버넌스 (5-7일) — 의존성: Phase 3, 7

- [ ] 승인 모델 (`approvals`, `approval_policies`)
- [ ] 커맨드 파이프라인 연동 (정책 매칭 → 승인 대기)
- [ ] Telegram 승인 (딥링크 → Vulcan UI 처리)
- [ ] 자동 승인 타임아웃
- [ ] UI 승인 패널 (대기 목록 + 배지)
- [ ] 검증: 승인 요청 → 알림 → 승인 → 커맨드 실행

## Phase 9: 테스트 + CI/CD (점진적, Phase 1~) — 의존성: Phase 1+

- [ ] Vitest 유닛 테스트
- [ ] Hono test client 통합 테스트
- [ ] Playwright 확장 (주요 플로우 커버)
- [ ] GitHub Actions CI (`lint → typecheck → unit → build → integration → e2e`)
- [ ] Husky + lint-staged 프리커밋 훅
- [ ] 검증: CI green

## Phase 10: Docker 배포 (4-6일) — 의존성: 전체

- [ ] Dockerfile (web, api 멀티스테이지 빌드)
- [ ] docker-compose.yml (web + api + worker + postgres + redis)
- [ ] PM2 → Docker Compose 전환
- [ ] 검증: `docker compose up -d` 원커맨드 구동

---

## 완료된 작업

- [x] M0 기능 전체 (SSE, 칸반, 오피스, 메모리, 문서, PWA) — 2026-03-06
- [x] 디자인/UX 오버홀 Pass 1 + Pass 2 — 2026-03-06
- [x] 고도화 로드맵 v2 수립 — 2026-03-06
- [x] Phase 0 Foundation 완료 (모노레포/공유패키지/Zod/Drizzle 마이그레이션/Store 추상화) — 2026-03-06
