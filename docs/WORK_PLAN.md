# Work Plan — Vulcan Mission Control

> 이 파일은 세션 시작 시 자동으로 참조됩니다. 미완료 Phase를 확인하고 이어서 작업하세요.
> 전체 로드맵은 `docs/ROADMAP.md`, 제품 정의는 `docs/Vulcan_PRODUCT_MASTER.md` 참조.

## 현재 Phase: 9 — 테스트 + CI/CD

> M0 + Phase 0~6 완료.

---

## Phase 0: Foundation (3-5일) — 의존성: 없음 (완료: 2026-03-06)

- [x] pnpm 워크스페이스 모노레포 전환 (`pnpm-workspace.yaml`, `apps/web/`, `packages/shared/`)
- [x] 공유 패키지 추출 (`lib/types.ts` → `packages/shared/types.ts`, `lib/statusMap.ts` → `packages/shared/constants.ts`)
- [x] Zod 스키마 추가 (API request/response 유효성 검증)
- [x] Drizzle Kit 마이그레이션 도입 (`CREATE TABLE IF NOT EXISTS` → 정식 마이그레이션)
- [x] Store 인터페이스 추상화 (`lib/store.ts` → 인터페이스 + SQLite 구현체)
- [x] 검증: `pnpm install && pnpm -r build` 성공, 기존 기능 동작 확인

## Phase 1: PostgreSQL + Redis + Hono (7-10일) — 의존성: Phase 0 (완료: 2026-03-06)

- [x] Drizzle 스키마 PostgreSQL 전환 (`sqliteTable` → `pgTable`, UUID, timestamp)
- [x] 외래키 제약조건 추가
- [x] SQLite → PostgreSQL 원타임 데이터 마이그레이션 스크립트
- [x] Redis 설정 (`ioredis` + `bullmq`) — API 패키지 의존성/큐 초기화 코드 도입
- [x] `event-stream.ts` in-memory → Redis Pub/Sub 교체 (REDIS_URL 설정 시 팬아웃)
- [x] Hono 백엔드 서비스 구축 (`apps/api/`) — 기존 12개 API 포팅
- [x] 미들웨어: CORS, 보안 헤더, 에러 핸들링, 로깅
- [x] Health endpoint: PostgreSQL + Redis 연결 상태
- [x] Next.js에서 API Route Handlers 제거 → Hono 백엔드로 연결
- [x] 어댑터 URL 변경
- [x] PM2 ecosystem에 Hono 서버 추가
- [x] 검증: `curl /api/health` → PostgreSQL + Redis 연결, 12개 API 동일 응답

## Phase 2: WebSocket + Gateway RPC (5-7일) — 의존성: Phase 1

- [x] Hono WebSocket 서버 (`/api/ws`) — 프론트엔드 ↔ 백엔드
- [x] 메시지 프로토콜 정의: `{ type: 'event'|'command'|'ack'|'error', payload }`
- [x] OpenClaw Gateway RPC 클라이언트 (`ws://127.0.0.1:18789`)
  - [x] 챌린지 기반 핸드셰이크, 프로토콜 v3
  - [x] RPC 래핑: `agents.*`, `chat.*`, `sessions.*`, `config.*`, `cron.*`
  - [x] 재연결 로직 (지수 백오프)
- [x] 프론트엔드 `useWebSocket` 훅 (자동 재연결)
- [x] `LiveActivityPanel.tsx`, `OfficeView.tsx` SSE → WebSocket 전환
- [x] Redis Pub/Sub 팬아웃 (Gateway 이벤트 → 모든 클라이언트)
- [x] 로그 파일 폴링 어댑터 → Gateway RPC 직접 수신으로 대체
- [x] 검증(배치 2 범위): Gateway mock 통합 테스트(핸드셰이크/재연결/타임아웃) + lint/build/smoke
- [x] 검증(배치 3 범위): Gateway 이벤트 변환 테스트 + lint/build/smoke

## Phase 3: 에이전트 생명주기 관리 (10-14일) — 의존성: Phase 2 (완료: 2026-03-06)

- [x] 에이전트 데이터 모델 확장 (skills, config, is_active, gateway_id, capabilities)
- [x] 신규 테이블: `gateways`, `agent_commands`, `audit_log`
- [x] Gateway RPC 통합
  - [x] `agents.list/create/delete` — 에이전트 CRUD (list/create/update 연동 + delete는 soft-delete 정책)
  - [x] `chat.send` — 메시지/지시 전송
  - [x] `sessions.spawn/send` — 하위 에이전트 위임/통신
    - [x] `/api/gateway/sessions/spawn`, `/api/gateway/sessions/send` 명시 엔드포인트 추가
  - [x] `config.patch` — 설정 변경
  - [x] `cron.*` — 예약 작업
- [x] 이중 제어 모드 API: `/delegate` (Hermes 경유) + `/command` (직접)
- [x] BullMQ 워커: 커맨드 큐, 헬스체크 큐
- [x] 커맨드 이력/운영 API: `/api/agent-commands`, `/api/agent-commands/:id`, `/api/agent-commands/:id/retry`
- [x] 프론트엔드 에이전트 관리 UI (제어 패널, 상세 뷰, 확인 다이얼로그)
  - [x] 오피스 뷰에 선택 에이전트 기준 커맨드 이력/실패 재시도 패널 연결
  - [x] Team 뷰에 에이전트 제어 패널(Direct/Delegate/Session/Deactivate/Reactivate) 연결
  - [x] Team lifecycle 위험 액션 confirm + 입력 스키마 검증(message/taskLabel)
  - [x] Office Zone Board + Selected Agent 중심 정보 위계 재구성
- [x] Mission Control UX 리파인 (레이아웃/가독성)
  - [x] Tasks Kanban 상단 요약/필터/카드 메타/lane 이동 UX 개선
  - [x] Team Agent roster 상태별 섹션화 + active/inactive 가시성 개선
  - [x] Office 오피스 메타포 기반 Zone 보드 + roster 재구성
- [x] Team 운영 UI 고도화 (Batch 8)
  - [x] `/api/agents/:id/pause`, `/api/agents/:id/resume` 추가
  - [x] Team 화면 pause/resume 액션 + 상태 반영
  - [x] Team 화면 Gateway 운영 패널(config.patch, cron.list, cron.status) 추가
- [x] 감사 로깅 (모든 mutation 자동 기록)
- [x] 검증: UI에서 에이전트 일시정지/재시작, Hermes 경유 위임 동작
  - [x] 정적 검증: lint/build/smoke + gateway-rpc/event-adapter 테스트
  - [x] 실환경 검증: Gateway 연결 상태에서 Team pause/resume/delegate/session E2E 확인 (2026-03-06)

## Phase 4: 태스크 시스템 고도화 (완료: 2026-03-08) — 의존성: Phase 3 | 병렬: Phase 5

- [x] 태스크 모델 확장 (description, priority, due_at, tags, parent_task_id)
- [x] lane 확장: 3-lane → 6-lane (backlog/queued/in_progress/review/done/archived)
- [x] 신규 테이블: `task_dependencies`, `task_comments`
- [x] 태스크 API 확장 (CRUD, assign, comment, deps — 8개 엔드포인트)
- [x] 에이전트 할당 → PUT /api/tasks/:id (assigneeAgentId) + 이벤트/감사 로그
- [x] 칸반 UI 재작성 (`@dnd-kit/core` 드래그앤드롭, 6-lane, TaskDetailModal)
- [x] 검증: lint/build 통과

## Phase 5: 스킬 마켓플레이스 (완료: 2026-03-08) — 의존성: Phase 3 | 병렬: Phase 4

- [x] 스킬 데이터 모델 (`skills`, `agent_skills`, `skill_registry`) — 3개 테이블 + 5개 인덱스
- [x] Gateway RPC로 스킬 동기화/설치/제거 — best-effort agents.update 연동
- [x] 스킬 API 8개 엔드포인트 + 마켓플레이스 UI (2패널: Catalog/Per Agent)
- [x] 사이드바에 "Skills" 추가
- [x] 외부 검수 → HIGH/MEDIUM 이슈 수정 완료
- [x] 검증: lint/build 통과

## Phase 6: Activity/Audit + 메트릭스 (완료: 2026-03-08) — 의존성: Phase 3, 4

- [x] 이벤트 타입 확장 (4종 → 28종, 7개 카테고리)
- [x] Activity API (페이지네이션 + 필터링 + 통계)
- [x] 메트릭스 대시보드 (`recharts` — BarChart/PieChart + 요약 카드)
- [x] LiveActivityPanel 강화 (카테고리 필터, 소스 링크, 무한 스크롤, 아이콘/통계)
- [x] 검증: lint/build 통과

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
