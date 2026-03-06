# Vulcan Mission Control — OpenClaw 에이전트 팀의 개인 전용 Mission Control

> **핵심 원칙**: "The human commands through Vulcan. Hermes orchestrates. Agents execute."
> **현재 Phase**: M0 완료 + Phase 0 완료 → Phase 1 대기
> **SSOT**: `docs/Vulcan_PRODUCT_MASTER.md` (제품 정의) · `docs/Vulcan_BRAND_MASTER.md` (브랜드 정체성)
> **실행 체크리스트**: `docs/WORK_PLAN.md` | **로드맵**: `docs/ROADMAP.md`

## 세션 시작 시 반드시 확인

1. `docs/PROGRESS.md` — 마지막 세션에서 무엇을 했는지
2. `docs/WORK_PLAN.md` — 현재 Phase와 다음 할 일
3. 이 파일 — 절대 규칙과 설계 방향

## 절대 하지 말 것

- 프로덕션 DB 직접 삭제·초기화 금지 → seed 스크립트 또는 마이그레이션으로만
- PM2/Docker 프로세스 재시작·중단은 사용자 확인 후에만 실행
- Drizzle 스키마 변경 시 마이그레이션 계획 먼저 제시
- OpenClaw Gateway RPC 프로토콜 변경 시 호환성 확인
- `.env` 코드 하드코딩 금지 (환경변수만)
- 외부 서버로 정보 전송 금지 (IP, 유저명, 경로, 토큰)

## 설계 나침반

### 현재 (M0)
- **단일 서버**: Next.js App Router (풀스택) + SQLite + SSE
- **어댑터 패턴**: OpenClaw 로그 → `/api/adapter/ingest` → DB → SSE

### 목표 (Phase 1~)
- **분리 아키텍처**: Next.js (UI) + Hono (API + WebSocket + Worker) + PostgreSQL + Redis
- **양방향 제어**: OpenClaw Gateway WebSocket RPC (`ws://127.0.0.1:18789`)
- **이중 제어 모드**: Hermes 경유 위임 + 직접 제어
- **커맨드 큐**: BullMQ (비동기 실행, 재시도, 감사 로깅)

### 일관된 원칙
- **오피스 메타포**: 에이전트 상태를 사무실 위치(Desk, Library, Workbench 등)로 시각화
- **브랜드**: Atrium 중립 팔레트 + Hearth 포인트(`#e07a40`). `styles/tokens.css` + `lib/brandTokens.ts`
- **단일 사용자**: 멀티테넌시/RBAC 없음. 한 사람만을 위한 시스템.

## 시스템 흐름

### 현재 (M0)
- **데이터 수집**: adapter-openclaw → `POST /api/adapter/ingest` → DB + SSE
- **실시간**: `GET /api/stream` (SSE) | `GET /api/events?since=` (폴링)
- **UI**: Sidebar → 페이지별 뷰 (Team, Tasks, Projects, Docs, Memory, Calendar, Office)
- **태스크**: Kanban 3-lane → `PATCH /api/tasks` → 상태 변경

### 목표 (Phase 2~)
- **양방향**: Hono API ↔ Gateway RPC ↔ OpenClaw 에이전트
- **실시간**: WebSocket (Hono ↔ 프론트엔드) + Redis Pub/Sub
- **제어**: BullMQ 커맨드 큐 → Gateway RPC → 에이전트
- **추가 UI**: Skills, Analytics, Approvals

## 도구

- `pnpm dev` — 개발 서버 (localhost:3000)
- `pnpm build` — 프로덕션 빌드
- `pnpm lint` — ESLint
- `pnpm seed` — DB 시드 데이터 생성
- `pnpm adapter` — OpenClaw 어댑터 실행
- `pnpm test:smoke` — Playwright 스모크 테스트

## 고도화 로드맵 (Phase 0~10)

| Phase | 이름 | 의존성 | 상태 |
|-------|------|--------|------|
| 0 | Foundation (모노레포 + 공유 패키지) | — | 완료 |
| 1 | PostgreSQL + Redis + Hono | 0 | 대기 |
| 2 | WebSocket + Gateway RPC | 1 | 대기 |
| 3 | 에이전트 생명주기 관리 | 2 | 대기 |
| 4 | 태스크 시스템 고도화 | 3 | 대기 |
| 5 | 스킬 마켓플레이스 | 3 | 대기 |
| 6 | Activity/Audit + 메트릭스 | 3, 4 | 대기 |
| 7 | Telegram 알림 | 3 | 대기 |
| 8 | 승인/거버넌스 | 3, 7 | 대기 |
| 9 | 테스트 + CI/CD | 1~ | 점진적 |
| 10 | Docker 배포 | 전체 | 대기 |
