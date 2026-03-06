# PROGRESS

<!-- last-session --> **마지막 세션**: 2026-03-06 | 브랜치: `main`

## 2026-03-06: Phase 3 운영 안정화 (PM2 토큰 덮어쓰기 방지 + 재배포 검증)

### 요약
PM2 `startOrReload` 시 `OPENCLAW_GATEWAY_TOKEN=""`이 주입되어 Gateway 연결이 끊길 수 있는 재발 리스크를 제거했다.
`ecosystem.config.js`를 수정해 토큰/패스워드가 실제로 있을 때만 env에 포함되도록 하드닝하고, 재배포 후 연결 상태를 다시 검증했다.

### 완료 항목
- ✅ `ecosystem.config.js`
  - `gatewayAuthEnv` 추가
  - `OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`를 빈 문자열 기본값에서 제거
  - PM2 env/env_production에서 인증 env를 조건부 주입으로 변경
- ✅ 재배포 및 상태 검증
  - `pm2 startOrReload ecosystem.config.js --env production`
  - `vulcan-api`, `vulcan-mc`, `vulcan-adapter` `online` 확인

### 검증 결과
- `node -e "require('./ecosystem.config.js')"` 성공
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)
- `GET /api/health` → `gateway.connected=true`, `protocol=3`
- `GET /api/gateway/status` → `connected=true`
- `GET /api/agents?includeInactive=1` → 에이전트 5개 조회 성공

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- ✅ Phase 3 완료 + 운영 하드닝 반영
- ▶️ 다음: Phase 4 태스크 시스템 고도화

## 2026-03-06: Phase 3 Batch 8 (Gateway Ops + pause/resume 마무리)

### 요약
Phase 3의 마지막 배치로 Gateway 운영 제어와 에이전트 일시정지/재개 흐름을 Team 화면에 통합했다.
`config.patch`, `cron.*`, `pause/resume` 경로를 UI/API 양쪽에서 연결해 에이전트 생명주기 관리 Phase를 닫았다.

### 완료 항목
- ✅ `apps/api/src/server.ts`
  - `POST /api/agents/:id/pause` 추가
  - `POST /api/agents/:id/resume` 추가
  - pause/resume 시 Gateway `sessions.patch` best-effort 호출 + 감사로그 기록
- ✅ `apps/web/components/TeamControlBoard.tsx`
  - lifecycle 액션에 `Pause/Resume` 추가
  - paused 상태 표시(`agent.config.paused`) 반영
  - Gateway Ops 패널 추가
    - `GET /api/gateway/status`
    - `GET /api/gateway/config`, `PATCH /api/gateway/config`
    - `GET /api/gateway/cron`, `GET /api/gateway/cron/status`
  - config patch JSON 입력 검증/오류 처리
- ✅ 문서 동기화
  - `CLAUDE.md`, `docs/WORK_PLAN.md`, `docs/ROADMAP.md`를 Phase 3 완료 기준으로 갱신
- ✅ 배포 안정화
  - 루트 `package.json`의 `start` 스크립트 인자 전달 수정 (`next start --port ...` 형태로 정상화)
  - PM2 `vulcan-mc` / `vulcan-adapter` 프로세스 재생성 후 `online` 상태 확인
- ✅ Gateway 실환경 연동 핫픽스
  - Gateway 인증 토큰 주입 후 `connected=true` 상태 복구
  - `pause/resume` RPC payload를 OpenClaw 스키마에 맞춰 수정 (`sessions.patch` + `sendPolicy`)
  - `direct/delegate/session send/spawn` 경로를 `chat.send(sessionKey)` 스키마로 정렬

### 검증 결과
- `pnpm --filter @vulcan/api lint` 성공
- `pnpm --filter @vulcan/web lint` 성공
- `pnpm --filter @vulcan/api test:gateway-rpc` 성공 (3/3)
- `pnpm --filter @vulcan/api test:gateway-event-adapter` 성공 (4/4)
- `pnpm --filter @vulcan/web build` 성공
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)
- 실환경 E2E 성공
  - `POST /api/agents/hermes/pause` → `gateway.ok=true`
  - `POST /api/agents/hermes/resume` → `gateway.ok=true`
  - `POST /api/agents/hermes/command` / `POST /api/agents/aegis/delegate` → command status `sent`
  - `POST /api/gateway/sessions/send` / `POST /api/gateway/sessions/spawn` → 성공 응답

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- ✅ Phase 3 완료 (Batch 8)
- ▶️ 다음: Phase 4 태스크 시스템 고도화

## 2026-03-06: Phase 3 Batch 7 (Mission Control UX 리파인: Tasks/Team/Office)

### 요약
Phase 3 일곱 번째 배치로 테마는 유지한 채 레이아웃/UX 밀도를 끌어올렸다.
특히 사용자 피드백 기준으로 조악했던 Tasks Kanban, Team(Agents), Office 화면의 정보 위계를 정리하고, Team lifecycle 액션에 confirm 단계를 추가했다.

### 완료 항목
- ✅ `apps/web/components/KanbanBoard.tsx`
  - 상단 요약/필터 바 재구성 (검색 + assignee + 총량)
  - lane 헤더 메타(아이콘/설명/카운트) 강화
  - 카드 메타(업데이트 시간/담당자) 가독성 개선
  - lane 이동 UX를 select 기반으로 정리 + optimistic rollback 보강
- ✅ `apps/web/components/TeamControlBoard.tsx`
  - 좌측 제어 패널/우측 상태별 roster 2패널 구조로 재배치
  - active/inactive 상태 가시성 강화
  - `deactivate/reactivate` confirm 단계 추가
  - `message/taskLabel` 입력 검증 강화 (taskLabel 규칙 검증)
- ✅ `apps/web/components/OfficeView.tsx`
  - Zone Board(상태→오피스 존) 중심 레이아웃 재구성
  - Selected Agent 상세/command history 우선순위 재정렬
  - Agent roster와 demo controls를 보조 패널화해 운영 동선 정리
- ✅ 문서 동기화
  - `CLAUDE.md`, `docs/WORK_PLAN.md`, `docs/ROADMAP.md`를 Batch 7 기준으로 갱신

### 검증 결과
- `pnpm --filter @vulcan/web lint` 성공
- `pnpm --filter @vulcan/web build` 성공
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- 🚧 Phase 3 진행중 (Batch 7 완료)
  - 다음 핵심: Gateway RPC 통합 잔여(`config.patch`, `cron.*`) + 에이전트 pause/resume 검증 UX

## 2026-03-06: Phase 3 Batch 6 (Team 제어 패널 + inactive 포함 조회)

### 요약
Phase 3 여섯 번째 배치로 에이전트 제어 UI를 Team 화면에 본격 연결했다.
inactive 에이전트까지 조회할 수 있도록 API를 확장하고, Team 제어 패널에서 direct/delegate/session/deactivate/reactivate를 실행할 수 있게 했다.

### 완료 항목
- ✅ `apps/api/src/store.ts`
  - `getAgents({ includeInactive })` 옵션 지원
- ✅ `apps/api/src/server.ts`
  - `GET /api/agents?includeInactive=1` 지원
- ✅ `apps/web/lib/api-server.ts`
  - `getAgents({ includeInactive })` 지원
- ✅ `apps/web/components/TeamControlBoard.tsx` 신규 추가
  - 대상 에이전트 선택
  - direct/delegate 호출
  - `sessions.send`/`sessions.spawn` 호출
  - deactivate/reactivate 액션
  - refresh/오류/성공 상태 처리
- ✅ `apps/web/app/(layout)/team/page.tsx`
  - 기존 read-only 카드 뷰 → 제어 패널 컴포넌트 연결

### 검증 결과
- `pnpm --filter @vulcan/web lint` 성공
- `pnpm --filter @vulcan/web build` 성공
- `pnpm --filter @vulcan/api lint` 성공
- `pnpm --filter @vulcan/api test:gateway-rpc` 성공 (3/3)
- `pnpm --filter @vulcan/api test:gateway-event-adapter` 성공 (4/4)
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- 🚧 Phase 3 진행중 (Batch 6 완료)
  - 다음 핵심: Team/Office 제어 패널의 입력 스키마 고도화 + confirm dialog/승인 UX

## 2026-03-06: Phase 3 Batch 5 (`sessions.spawn/send` 명시 API 연동)

### 요약
Phase 3 다섯 번째 배치로 Gateway 세션 계열 메서드를 명시 API로 노출했다.
기존 generic RPC(`/api/gateway/rpc`)와 별개로 `sessions.spawn/send`를 전용 엔드포인트로 제공해 UI/자동화에서 안전하게 호출할 수 있는 경로를 확보했다.

### 완료 항목
- ✅ `apps/api/src/gateway-rpc/client.ts`
  - `sessionsSpawn(params)`
  - `sessionsSend(params)`
- ✅ `apps/api/src/server.ts`
  - `POST /api/gateway/sessions/spawn`
  - `POST /api/gateway/sessions/send`

### 검증 결과
- `pnpm --filter @vulcan/api lint` 성공
- `pnpm --filter @vulcan/api test:gateway-rpc` 성공 (3/3)
- `pnpm --filter @vulcan/api test:gateway-event-adapter` 성공 (4/4)
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- 🚧 Phase 3 진행중 (Batch 5 완료)
  - 다음 핵심: `sessions.spawn/send`를 에이전트 제어 UI/위임 플로우에 직접 연결

## 2026-03-06: Phase 3 Batch 4 (오피스 커맨드 이력/재시도 UI 연결)

### 요약
Phase 3 네 번째 배치로 운영 API를 UI에 연결했다.
`OfficeView`에서 선택한 에이전트의 커맨드 이력을 조회하고, 실패 커맨드를 즉시 재시도할 수 있는 패널을 추가했다.

### 완료 항목
- ✅ `apps/web/components/OfficeView.tsx`
  - 선택 에이전트 변경 시 `/api/agent-commands` 조회
  - 커맨드 상태(queued/sent/failed) 시각화
  - 실패 커맨드 `Retry` 버튼 → `/api/agent-commands/:id/retry` 호출
  - refresh/loading/error 상태 처리
- ✅ `apps/web/lib/types.ts`
  - `AgentCommand`, `AgentCommandStatus` 타입 re-export

### 검증 결과
- `pnpm --filter @vulcan/web lint` 성공
- `pnpm --filter @vulcan/web build` 성공
- `pnpm --filter @vulcan/api lint` 성공
- `pnpm --filter @vulcan/api test:gateway-rpc` 성공 (3/3)
- `pnpm --filter @vulcan/api test:gateway-event-adapter` 성공 (4/4)
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- 🚧 Phase 3 진행중 (Batch 4 완료)
  - 다음 핵심: Team/Office 제어 UI 확장(생성/수정/비활성화/직접 명령) + `sessions.spawn/send` 연동

## 2026-03-06: Phase 3 Batch 3 (커맨드 조회/재시도 API)

### 요약
Phase 3 세 번째 배치로 커맨드 운영 가시성을 추가했다.
`agent_commands`를 조회/단건 조회할 수 있는 API를 추가하고, 실패 커맨드를 새 커맨드로 재큐잉하는 retry API를 도입했다.

### 완료 항목
- ✅ `apps/api/src/store.ts` 확장
  - `getAgentCommands(filters)` 추가
  - `getAgentCommandById(id)` 추가
- ✅ `apps/api/src/server.ts` API 추가
  - `GET /api/agent-commands` (`agentId`, `status`, `limit` 필터)
  - `GET /api/agent-commands/:id`
  - `POST /api/agent-commands/:id/retry` (failed 전용)
- ✅ 재시도 정책 구현
  - 원본 row overwrite 없이 신규 command row 생성
  - Redis 큐 사용 시 `202 queued`
  - Redis 미사용 시 inline 실행 폴백
  - retry 감사 로그(`agent.command.retry*`, `agent.delegate.retry*`) 기록

### 검증 결과
- `pnpm --filter @vulcan/api lint` 성공
- `pnpm --filter @vulcan/api test:gateway-rpc` 성공 (3/3)
- `pnpm --filter @vulcan/api test:gateway-event-adapter` 성공 (4/4)
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- 🚧 Phase 3 진행중 (Batch 3 완료)
  - 다음 핵심: 에이전트 제어 UI 연결 + `sessions.spawn/send` 경로 고도화

## 2026-03-06: Phase 3 Batch 2 (BullMQ 커맨드/헬스체크 워커)

### 요약
Phase 3 두 번째 배치로 비동기 실행 기반을 도입했다.
Redis(`REDIS_URL`)가 설정된 경우 `/delegate`, `/command` 요청은 BullMQ 커맨드 큐로 들어가고 워커가 Gateway RPC를 실행한다. 동시에 헬스체크 큐 워커가 Gateway 상태를 주기적으로 동기화한다.

### 완료 항목
- ✅ `apps/api/src/queue.ts` 확장
  - `vulcan-commands`, `vulcan-healthchecks` 큐 추가
  - command/healthcheck 워커 부트스트랩
  - queue job enqueue 유틸 추가 (`enqueueCommandJob`, `enqueueHealthcheckJob`)
  - 큐/워커 리소스 정리(`closeQueueResources`) 보강
- ✅ `apps/api/src/server.ts` 큐 연동
  - `/api/agents/:id/delegate`, `/api/agents/:id/command`:
    - Redis 사용 시 `202 queued` 비동기 처리
    - Redis 미사용 시 기존 inline 실행 폴백 유지
  - 워커 실행 로직 추가:
    - command job → `chat.send` 실행 + `agent_commands` 상태/감사로그 갱신
    - healthcheck job → `gateways` 상태 스냅샷 갱신
  - `/api/health`의 Redis 상태에 command/healthcheck 큐 및 워커 상태 노출
  - SIGINT/SIGTERM 시 queue/gateway 종료 처리

### 검증 결과
- `pnpm --filter @vulcan/api lint` 성공
- `pnpm --filter @vulcan/api test:gateway-rpc` 성공 (3/3)
- `pnpm --filter @vulcan/api test:gateway-event-adapter` 성공 (4/4)
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- 🚧 Phase 3 진행중 (Batch 2 완료)
  - 다음 핵심: 에이전트 관리 UI + 고급 Gateway 제어(`sessions.spawn/send`, config/cron UX 연결)

## 2026-03-06: Phase 3 Batch 1 (에이전트 생명주기 API 기본형 + 감사 로그)

### 요약
Phase 3의 첫 배치로 에이전트 생명주기 관리의 백엔드 기반을 구축했다.
에이전트 모델/스키마를 확장하고 `gateways`, `agent_commands`, `audit_log` 테이블을 도입했으며, 생명주기 API(`create/update/deactivate/delegate/command`)와 mutation 감사 로깅을 연결했다.

### 완료 항목
- ✅ 공유 타입/스키마 확장 (`@vulcan/shared`)
  - `Agent` 확장 필드: `skills`, `config`, `isActive`, `gatewayId`, `capabilities`
  - 입력 검증 스키마: `createAgent`, `updateAgent`, `delegate`, `command`
- ✅ API DB 스키마 확장 (`sqlite + pg`)
  - `agents` 컬럼 확장
  - 신규 테이블: `gateways`, `agent_commands`, `audit_log`
- ✅ SQLite 레거시 DB 업그레이드 보강
  - 기존 DB에서도 신규 컬럼/테이블이 자동 생성되도록 bootstrap 보강
  - 마이그레이션 저널 존재 시에도 보강 로직이 실행되도록 `ensureSchema` 수정
- ✅ Store 계층 기능 추가
  - agent CRUD(soft deactivate 포함), gateway upsert/list, command 이력, audit append/list
- ✅ Gateway RPC 연동 보강
  - `agentsCreate`, `agentsUpdate`, `agentsDelete` 래퍼 추가
- ✅ 생명주기 API 추가
  - `POST /api/agents`
  - `PUT /api/agents/:id`
  - `DELETE /api/agents/:id` (soft delete)
  - `POST /api/agents/:id/delegate`
  - `POST /api/agents/:id/command`
  - `GET /api/gateways`
  - `GET /api/audit?limit=`
- ✅ mutation 감사 로깅 적용
  - `PATCH /api/tasks/:id`
  - `POST /api/events`
  - `POST /api/adapter/ingest`
  - 신규 생명주기 엔드포인트

### 검증 결과
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm --filter @vulcan/api test:gateway-rpc` 성공 (3/3)
- `pnpm --filter @vulcan/api test:gateway-event-adapter` 성공 (4/4)
- `pnpm test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- 🚧 Phase 3 진행중 (Batch 1 완료)
  - 다음 핵심: BullMQ 워커/제어 UI/고급 Gateway 제어 통합

## 2026-03-06: Phase 2 Batch 3 (Gateway 이벤트 어댑터 전환 + 팬아웃 정합화)

### 요약
Phase 2의 마지막 배치로 이벤트 수집 경로를 로그 파일 폴링에서 Gateway WebSocket 직접 수신으로 전환했다.
Gateway 이벤트를 ingest 이벤트로 변환하는 모듈/테스트를 추가하고, 어댑터 실행 경로(`pnpm adapter`)를 API Gateway 어댑터로 전환해 Redis Pub/Sub 팬아웃 경로를 완성했다.

### 완료 항목
- ✅ `apps/api/src/gateway-rpc/event-adapter.ts` 추가
  - Gateway event → Vulcan ingest event 변환
  - 이벤트 타입/요약/agentId 추론
  - fingerprint 기반 dedupe 유틸
- ✅ `apps/api/scripts/adapter-openclaw-gateway.ts` 추가
  - Gateway WS 이벤트 수신
  - rate-limit + heartbeat + ingest 전송
  - graceful shutdown 처리
- ✅ 실행 경로 전환
  - 루트 `pnpm adapter` → API Gateway 어댑터
  - PM2 `vulcan-adapter` env를 Gateway 기준으로 갱신
- ✅ 테스트 추가
  - `event-adapter` 변환 규칙 테스트 4종

### 검증 결과
- `pnpm --filter @vulcan/api test:gateway-event-adapter` 성공 (4/4)
- `pnpm --filter @vulcan/api test:gateway-rpc` 성공 (3/3)
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- 🔜 **다음 작업: Phase 3 — 에이전트 생명주기 관리**

## 2026-03-06: Phase 2 Batch 2 (Gateway RPC 클라이언트 + v3 핸드셰이크)

### 요약
Phase 2의 두 번째 배치로 OpenClaw Gateway RPC 연결을 API에 내장했다.
챌린지 기반(v3) 인증 핸드셰이크와 지수 백오프 재연결을 구현하고, `agents/chat/sessions/config/cron` 네임스페이스 호출을 위한 래퍼/엔드포인트를 추가했다.

### 완료 항목
- ✅ `apps/api/src/gateway-rpc/*` 신규 모듈 추가
  - `connect.challenge` 기반 v3 서명 핸드셰이크
  - `agents.*`, `chat.*`, `sessions.*`, `config.*`, `cron.*` 래퍼
  - 자동 재연결(지수 백오프), 상태 스냅샷(`getStatus`)
- ✅ Hono API에 Gateway 제어 엔드포인트 추가
  - `/api/gateway/status`
  - `/api/gateway/rpc`
  - `/api/gateway/agents`
  - `/api/gateway/chat/send`, `/api/gateway/chat/abort`
  - `/api/gateway/sessions`, `/api/gateway/sessions/reset`
  - `/api/gateway/config`
  - `/api/gateway/cron`, `/api/gateway/cron/status`
- ✅ `/api/health` 응답에 Gateway 연결 상태 포함
- ✅ 운영 설정 반영
  - `apps/api/.env.example`: Gateway URL/인증/재연결 정책 변수 추가
  - `ecosystem.config.js`: API 프로세스 Gateway env 반영
- ✅ Gateway mock 통합 테스트 추가
  - 정상 핸드셰이크 + `agents.list`
  - 재연결 시나리오
  - challenge timeout 시나리오

### 검증 결과
- `pnpm --filter @vulcan/api test:gateway-rpc` 성공 (3/3)
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)

### 범위 경계 (다음 배치)
- ⏭️ Phase 2 잔여:
  - Redis Pub/Sub 팬아웃 (Gateway 이벤트 → 모든 클라이언트)
  - 로그 파일 폴링 어댑터를 Gateway 이벤트 직접 수신으로 대체

## 2026-03-06: Phase 2 Batch 1 (WebSocket 실시간 경로 전환)

### 요약
Phase 2의 첫 배치로 WebSocket 경로를 도입했다.
`/api/ws` 엔드포인트와 공용 메시지 프로토콜을 추가하고, 프론트엔드 실시간 수신을 SSE에서 WebSocket 기본 경로로 전환했다.

### 완료 항목
- ✅ `@vulcan/shared`에 실시간 프로토콜 타입/스키마 추가
  - `event | command | ack | error` envelope
- ✅ Hono API에 `/api/ws` WebSocket 엔드포인트 추가 (`@hono/node-ws`)
  - seed 이벤트 전송
  - `command: ping` → `ack: pong` 처리
  - heartbeat ack 전송
- ✅ 프론트엔드 `useVulcanWebSocket` 훅 추가 (자동 재연결)
- ✅ `LiveActivityPanel` 실시간 입력 경로를 WebSocket으로 전환
  - WebSocket 단절 시 기존 `/api/events?since=` 폴링 폴백 유지
- ✅ Playwright/PM2 환경에 `NEXT_PUBLIC_VULCAN_WS_URL` 반영

### 검증 결과
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)
- 수동 WebSocket 검증 성공
  - `ws://127.0.0.1:8793/api/ws` 연결
  - `command ping` → `ack pong` 수신
  - `POST /api/events` 후 `type:event` 프레임 수신

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- 🚧 Phase 2 진행중 (Batch 1 완료)
  - 다음 핵심: OpenClaw Gateway RPC 클라이언트/핸드셰이크, Redis 팬아웃 정합화

## 2026-03-06: Phase 1 PostgreSQL 전환 마무리 (완료)

### 요약
Phase 1의 남은 PostgreSQL 전환 항목을 마무리했다.
PostgreSQL 마이그레이션 정합성을 보정하고, SQLite → PostgreSQL 데이터 이관 경로를 임시 DB에서 실증했다.

### 완료 항목
- ✅ PostgreSQL Drizzle 스키마 보정 (`docs.created_at`, `docs.updated_at` 컬럼명 정합성)
- ✅ 초기 PostgreSQL 마이그레이션 SQL 보정 (`pgcrypto` 확장 + 컬럼명 정합성)
- ✅ SQLite → PostgreSQL 이관 스크립트 개선
  - `--dry-run`에서 `DATABASE_URL` 없이 실행 가능
  - SQLite 파일 존재 여부 검증 + 경로 출력
- ✅ SQLite 런타임 마이그레이션 경로 회귀 수정
  - `apps/api/drizzle`(PostgreSQL)와 SQLite 마이그레이션 경로 충돌 분리

### 검증 결과
- `pnpm --filter @vulcan/api exec node --input-type=module ...` (clean DB 생성 후 Drizzle migration 적용) 성공
  - public 테이블 7종 생성 확인 (`agents/projects/tasks/events/memory_items/docs/schedules`)
- `env -u DATABASE_URL pnpm --filter @vulcan/api migrate:sqlite-to-pg -- --dry-run` 성공
- `pnpm --filter @vulcan/api exec node --input-type=module ...` (임시 DB에서 실제 `sqlite-to-postgres` 실행) 성공
  - row count 검증: `agents 5 / projects 3 / tasks 4 / events 106 / memory_items 4 / docs 3 / schedules 3`
- `pnpm build` 성공
- `pnpm lint` 성공
- `pnpm test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- 🔜 **다음 작업: Phase 2 — WebSocket + Gateway RPC**

## 2026-03-06: Phase 1 Kickoff (Hono API + 연결 상태)

### 요약
Phase 1의 첫 배치를 구현했다.
`apps/api`를 신설해 기존 12개 API를 Hono로 포팅하고, PostgreSQL/Redis 연결 상태를 Health에 포함했다.

### 완료 항목
- ✅ `apps/api` 워크스페이스 신설 (`hono`, `@hono/node-server`, `pg`, `ioredis`, `bullmq`)
- ✅ API 포팅: agents/projects/tasks/events/stream/adapter/memory/docs/schedule/health
- ✅ 미들웨어 적용: CORS, 보안 헤더, 로깅, 공통 에러 응답
- ✅ Health 확장: SQLite + PostgreSQL + Redis 상태 리포트
- ✅ 이벤트 스트림 in-memory → Redis Pub/Sub 전환 (REDIS_URL 기반)
- ✅ Next.js API Route 제거 + `/api/*` → Hono rewrite 연결
- ✅ Web 서버 컴포넌트 데이터 로드를 Store 직접 호출 → Hono API fetch로 전환
- ✅ PM2 설정에 `vulcan-api` 프로세스 추가
- ✅ 어댑터 기본 인제스트 URL을 API(8787) 기준으로 전환

### 검증 결과
- `pnpm --filter @vulcan/api build` 성공
- `pnpm --filter @vulcan/api lint` 성공
- `pnpm build` 성공 (shared + api + web)
- `pnpm lint` 성공 (shared + api + web)
- 임시 API 기동 후 검증:
  - `GET /api/health` 응답 확인
  - `GET /api/agents` 응답 확인
  - `POST /api/events`, `PATCH /api/tasks/:id`, `POST /api/adapter/ingest` 동작 확인
- `pnpm test:smoke` 성공 (Playwright webServer로 API+Web 동시 기동, 6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- 🚧 Phase 1 진행중
  - 남은 핵심: PostgreSQL 스키마 전환, 외래키/데이터 마이그레이션, Redis Pub/Sub 이벤트 스트림 전환

## 2026-03-06: Phase 0 Foundation 완료

### 요약
Phase 0 체크리스트를 전부 완료했다.
단일 앱 구조를 `pnpm` 워크스페이스 모노레포로 전환하고, 공유 패키지·검증 스키마·마이그레이션 기반을 도입했다.

### 완료 항목
- ✅ `apps/web` + `packages/shared` 구조로 모노레포 전환
- ✅ `@vulcan/shared`로 타입/상수 추출 (`types`, `constants`)
- ✅ Zod 스키마 추가 및 API 경계 검증 적용 (`adapter/ingest`, `events`, `tasks/[id]`)
- ✅ Drizzle Kit 도입 (`drizzle.config.ts`, 초기 마이그레이션 생성/적용)
- ✅ Store 인터페이스 추상화 (`lib/store` 디렉터리 구조화 + SQLite 구현 분리)

### 검증 결과
- `pnpm install --prod=false` 성공
- `pnpm -r build` 성공
- `pnpm lint` 성공
- `pnpm db:migrate` 성공
- `pnpm seed` 성공
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3215 pnpm --filter @vulcan/web test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- 🔜 **다음 작업: Phase 1 — PostgreSQL + Redis + Hono**

## 2026-03-06: 고도화 로드맵 v2 수립

### 요약
openclaw-mission-control 참조 분석 → Vulcan 고도화 방향 확정.
**관찰 전용 → 완전한 양방향 제어 플랫폼**으로의 패러다임 전환.

### 확정된 설계 결정
| 항목 | 결정 |
|------|------|
| Vulcan ↔ OpenClaw | Gateway WebSocket RPC (`ws://127.0.0.1:18789`) |
| 에이전트 모델 | 단일 Gateway 내 멀티 에이전트 |
| 제어 계층 | Hermes 경유 위임 + 직접 제어 (이중 모드) |
| Telegram | 별도 봇 불필요. 기존 채널로 알림 전송 |
| DB | PostgreSQL + Redis 전환 |
| 백엔드 | Hono (TypeScript) 분리 |
| 철학 | "사용자가 Vulcan으로 제어. Hermes가 오케스트레이션." |

### 현재 상태
- ✅ M0 기능 완료 (관찰, 칸반, 메모리, 문서, PWA)
- ✅ 디자인/UX 오버홀 Pass 1 + Pass 2 완료
- ✅ 고도화 로드맵 v2 수립 완료
- 🔜 **다음 작업: Phase 0 — Foundation (모노레포 + 공유 패키지)**

### 산출물
- `docs/ROADMAP.md` — 전체 로드맵 (Phase 0~10)
- `docs/WORK_PLAN.md` — 실행 체크리스트
- `docs/Vulcan_PRODUCT_MASTER.md` — 제품 정의 개정 (v2)

---

## 2026-03-06: 디자인/UX 오버홀 Pass 1

### 변경 요약
Vulcan Mission Control의 전반적인 디자인/UX를 개선. 기능 변경 없이 시각적 완성도, 모바일 사용성, PWA 기반을 구축.

### 변경 파일 (16개)
| 파일 | 변경 내용 |
|------|----------|
| `styles/tokens.css` | Atrium 중립 팔레트 적용 (배경/서피스/보더/텍스트) |
| `lib/brandTokens.ts` | 토큰 동기화 (`card` → `surface`) |
| `app/globals.css` | `@theme inline`에 전체 디자인 토큰 등록, 스크롤바/overscroll 개선 |
| `app/layout.tsx` | PWA manifest 연결, theme-color, viewport-fit |
| `app/(layout)/layout.tsx` | 모바일 사이드바 토글 + 오버레이 구현 |
| `components/Sidebar.tsx` | `isOpen`/`onClose` props, 슬라이드 애니메이션 |
| `components/Topbar.tsx` | 햄버거 메뉴 버튼 (모바일) |
| `components/KanbanBoard.tsx` | 카드 디자인 개선, moveTask API 연동 |
| `components/LiveActivityPanel.tsx` | lucide-react 아이콘, framer-motion 애니메이션 |
| `components/OfficeView.tsx` | 에이전트 상태 카드 중심 리팩토링 |
| `components/MemoryBoard.tsx` | 일관된 카드 레이아웃 |
| `components/DocsExplorer.tsx` | 일관된 카드 레이아웃, 선택 상태 파생 |
| `public/manifest.json` | PWA 기본 설정 (standalone, theme-color) |
| `package.json` | lucide-react, framer-motion, @tailwindcss/typography 추가 |
| `tailwind.config.ts` | 신규 생성 (typography 플러그인) |

### Pass 2 완료
- ✅ `stone-*` 하드코딩 → 디자인 토큰 변수 통일
- ✅ OfficeView selectedAgentId setter 복원
- ✅ select 요소 aria-label 추가
- ✅ Service Worker 구현
- ✅ PWA 아이콘 정식 마감
- ✅ Sidebar 브랜드 톤 마감
- ✅ README.md 전면 재작성
- ✅ BRAND.md 토큰/상태/아이콘 문서화
