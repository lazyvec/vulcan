# Phase 2 Batch 1 Work Plan — WebSocket + Gateway RPC 기반 준비

## Context
- 현재 API는 Hono + SSE(`GET /api/stream`) 기반 실시간 전송을 사용 중.
- 프론트엔드 `LiveActivityPanel`은 `EventSource` + `/api/events?since=` 폴링 폴백을 병행.
- 이번 배치는 **Gateway RPC 전체 통합 전의 1차 전환**으로, WebSocket 경로/프로토콜/클라이언트 훅/UI 연결/검증/문서 갱신까지를 목표로 함.

## Work Objectives
1. Hono API에 `GET /api/ws` WebSocket 엔드포인트를 추가한다.
2. 메시지 프로토콜을 `{ type: 'event'|'command'|'ack'|'error', payload }`로 표준화한다.
3. 프론트엔드에 자동 재연결 `useWebSocket` 훅을 도입한다.
4. `LiveActivityPanel`/`OfficeView` 실시간 경로를 SSE에서 WebSocket으로 전환한다.
5. 최소 침습으로 기존 동작 회귀 없이 빌드/lint/smoke를 통과한다.
6. `docs/WORK_PLAN.md`, `docs/PROGRESS.md`를 이번 배치 기준으로 갱신한다.

## Guardrails
### Must Have
- Node 런타임(`@hono/node-server`) 유지.
- 기존 `GET /api/stream` 및 `/api/events` 폴백 경로는 유지(회귀 방지).
- PM2(`ecosystem.config.js`)와 Playwright smoke 환경에서 동작 가능한 경로를 유지.
- WebSocket 실패 시 자동 재연결 + 폴링 폴백으로 UX 단절 방지.

### Must NOT Have
- Gateway RPC 핸드셰이크(v3), `agents.*`/`chat.*` 등 본격 RPC 구현 착수 금지.
- Redis/BullMQ 구조 변경 금지.
- 대규모 UI 리디자인/컴포넌트 구조 개편 금지.
- PM2 프로세스 재시작/중단 자동 실행 금지(사용자 확인 전 실행 안 함).

## Task Flow (파일 단위, 순서 고정)

### 1) 프로토콜 계약 추가 (공유 패키지)
**대상 파일**
- `packages/shared/src/types.ts`
- `packages/shared/src/schemas.ts`
- `packages/shared/src/index.ts`

**작업**
- `WsMessageType = 'event' | 'command' | 'ack' | 'error'` 타입 정의.
- 공통 envelope 타입(`WsEnvelope`)과 최소 payload 스키마(zod) 추가.
- 기존 `EventItem`은 재사용하고 WebSocket event payload에서 참조.

**Acceptance Criteria**
- API/Web 양쪽에서 동일 타입/스키마를 import 가능.
- `pnpm --filter @vulcan/shared build` 및 타입 검사 통과.

### 2) API WebSocket 엔드포인트 도입 (SSE 공존)
**대상 파일**
- `apps/api/package.json` (필요 시 WS 어댑터 의존성 추가)
- `apps/api/src/server.ts`
- `apps/api/src/event-stream.ts` (필요 시 subscriber 재사용 보강)
- `apps/api/src/ws-protocol.ts` (신규, 권장)

**작업**
- `GET /api/ws` 업그레이드 라우트 추가.
- 연결 직후 seed 이벤트(기존 SSE seed와 동일 의도) 전송.
- `subscribeEvents()` 기반 실시간 이벤트를 `type:'event'` envelope로 push.
- 클라이언트 발신 `type:'command'` 수신 시 이번 배치에서는 실행 대신 `ack`/`error`만 표준 응답.
- 기존 `/api/stream` 동작은 그대로 유지.

**Acceptance Criteria**
- `ws://127.0.0.1:<api-port>/api/ws` 접속 시 정상 handshake.
- 신규 이벤트 발생 시 WebSocket으로 `type:'event'` 메시지 수신.
- 잘못된 frame은 `type:'error'` 응답 후 서버가 비정상 종료되지 않음.
- `/api/stream` 회귀 없음.

### 3) 프론트 실시간 클라이언트 훅 추가
**대상 파일**
- `apps/web/hooks/useWebSocket.ts` (신규)
- `apps/web/lib/types.ts` (필요 시 shared ws 타입 재수출)
- `apps/web/lib/runtimeInfo.ts` 또는 `apps/web/lib/realtime.ts` (신규, URL 계산 유틸 권장)

**작업**
- 연결 상태(`connecting/open/closed/error`)와 마지막 수신 시각 관리.
- 지수 백오프 기반 자동 재연결(최대 간격 상한 포함).
- 브라우저/SSR 경계 안전 처리(`window` 접근 가드).
- 메시지 파서에서 protocol type guard 적용.

**Acceptance Criteria**
- 일시 네트워크 단절 후 자동 재연결 확인.
- 잘못된 payload 수신 시 UI 크래시 없이 무시/에러 콜백 처리.
- 컴포넌트 언마운트 시 소켓/타이머 누수 없음.

### 4) LiveActivityPanel/OfficeView 경로 전환 + 폴링 폴백 유지
**대상 파일**
- `apps/web/components/LiveActivityPanel.tsx`
- `apps/web/components/OfficeView.tsx` (onEvent 체인 유지 확인)

**작업**
- `EventSource('/api/stream')` 경로를 `useWebSocket` 기반으로 전환.
- 수신 `type:'event'`를 기존 `EventItem` 처리 흐름으로 매핑.
- WebSocket 미연결/에러 상태에서 기존 `/api/events?since=` 폴링을 fallback으로 유지.
- 하이라이트/그룹핑/Office 상태 반영 로직은 변경 최소화.

**Acceptance Criteria**
- Tasks/Office 화면에서 기존 실시간 카드 갱신 UX 유지.
- WebSocket 정상 시 폴링 빈도 최소화 또는 중단.
- WebSocket 비정상 시 폴링만으로도 이벤트 갱신 유지.

### 5) 검증 (build/lint/smoke + 경로 점검)
**대상 파일**
- 테스트 코드 변경이 필요하면 `apps/web/tests/smoke/vulcan.smoke.spec.ts` 최소 수정

**작업**
- `pnpm build`
- `pnpm lint`
- `pnpm test:smoke`
- 수동 스모크: `/tasks`, `/office`에서 이벤트 유입/상태 변화 확인.

**Acceptance Criteria**
- 위 3개 명령 모두 성공.
- Playwright 6/6 유지.
- 런타임 에러(콘솔/서버) 신규 치명 오류 없음.

### 6) 문서 반영 (이번 배치 기준)
**대상 파일**
- `docs/WORK_PLAN.md`
- `docs/PROGRESS.md`

**작업**
- WORK_PLAN: Phase 2 체크리스트 중 Batch 1 완료 항목 체크 및 잔여 항목 명시.
- PROGRESS: 날짜/요약/변경 파일/검증 결과/현재 상태 기록.

**Acceptance Criteria**
- 문서만 읽어도 “무엇이 완료됐고 다음이 무엇인지” 즉시 파악 가능.
- 실제 실행한 검증 명령/결과가 PROGRESS에 누락 없이 기록됨.

## 주요 리스크와 완화책
1. **Next rewrite에서 WebSocket 프록시가 환경별로 불안정할 리스크**
- 완화: `useWebSocket` URL 계산 시 상대경로 우선 + 실패 시 폴링 폴백 강제 유지.
- 완화: Playwright(smoke) + 로컬 API 직접 접속 케이스로 이중 확인.

2. **메시지 타입 계약 불일치(API/Web) 리스크**
- 완화: `@vulcan/shared`에 타입/스키마를 단일 소스로 정의.
- 완화: 서버 송신/클라이언트 수신 모두 schema-safe 파싱 적용.

3. **실시간 경로 전환 중 기존 UX 회귀 리스크**
- 완화: LiveActivityPanel 내부 렌더/그룹핑 로직은 유지하고 입력 소스만 교체.
- 완화: SSE 엔드포인트 제거 금지(롤백/비교 기준점 유지).

4. **연결 재시도 폭주 리스크**
- 완화: 지수 백오프 + 재시도 상한 + 탭 비활성 시 재시도 빈도 제한.

## 이번 배치에서 지금 하지 말아야 할 것
- OpenClaw Gateway RPC 실연결/챌린지 핸드셰이크(v3) 구현.
- `command` 실제 실행 파이프라인(BullMQ enqueue/worker 처리).
- Redis Pub/Sub 토폴로지 개편 및 이벤트 저장소 스키마 변경.
- LiveActivityPanel 기능 확장(필터/무한스크롤/상세 링크) 같은 Phase 6 범위 작업.
- PM2 운영 명령 실행(재시작/중단) 및 인프라 변경.

## Success Criteria
- WebSocket 경로가 추가되어도 기존 SSE/폴링 기능 회귀가 없다.
- Office/Tasks 실시간 갱신이 WebSocket 기본 경로로 동작한다.
- 빌드/lint/smoke가 모두 green이며 문서가 최신화된다.
