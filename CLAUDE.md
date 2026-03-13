# Vulcan Mission Control — OpenClaw 에이전트 팀의 개인 전용 Mission Control

> **핵심 원칙**: "The human commands through Vulcan. Hermes orchestrates. Agents execute."
> **현재 Phase**: Phase 0~11+ 완료 (Observability + WorkOrder) → Phase 12 백로그
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

### 현재 (Phase 10 완료)
- **아키텍처**: Next.js 16 (UI, 포트 3001) + Hono (API, 포트 8787) + PostgreSQL + Redis + WebSocket
- **어댑터 패턴**: OpenClaw Gateway → Hono `/api/adapter/ingest` → DB → WebSocket
- **에이전트 생명주기**: CRUD, pause/resume, delegate, command + 감사 로깅
- **비동기 실행**: BullMQ command/healthcheck 큐 + 워커
- **태스크 시스템**: 6-lane 칸반(@dnd-kit), TaskDetailModal, comments, dependencies
- **스킬 마켓플레이스**: skills/agent_skills/skill_registry, Gateway 동기화
- **Activity/Audit**: 28종+ 이벤트, recharts 메트릭스 대시보드
- **Vault**: Obsidian 볼트 웹 탐색기 + 편집기 (트리 뷰, 검색, URL 클리핑/딥링크, CodeMirror 6 에디터+툴바, CRUD, 이미지 업로드/D&D, ==highlight==, callout, 코드 구문강조, 첨부파일 서빙, wikilink 네비게이션)
- **승인/거버넌스**: approval_policies, Telegram 인라인 키보드 승인
- **알림**: notification_preferences, Herald Bot Long Polling
- **Memory**: journal/longterm/profile/lesson, importance, expiresAt
- **실시간**: Hono WebSocket + Redis Pub/Sub + SSE 폴백
- **CI/CD**: Vitest 63개+ Playwright 16개+ Husky + lint-staged
- **인프라**: Docker Compose (PostgreSQL+Redis), PM2 (web+api+adapter)

### Phase 11 완료 (Observability + WorkOrder)
- **Trace/FinOps**: traces 테이블, Circuit Breaker, CostDashboard, Telegram 일별 비용 알림
- **WorkOrder**: work_orders/work_results 테이블, 7개 API, 상태 머신, Executor→Verifier 검증 루프, WorkOrderDashboard

### 목표 (Phase 12+)
- **Phase 12**: 외부 연동 확장 (GitHub, Linear 등 서드파티 통합)

### 일관된 원칙
- **오피스 메타포**: 에이전트 상태를 사무실 위치(Desk, Library, Workbench 등)로 시각화
- **브랜드**: Atrium 중립 팔레트 + Hearth 포인트(`#e07a40`). `styles/tokens.css` + `lib/brandTokens.ts`
- **단일 사용자**: 멀티테넌시/RBAC 없음. 한 사람만을 위한 시스템.

## 시스템 흐름

- **데이터 수집**: gateway-adapter → Hono `POST /api/adapter/ingest` → DB → WebSocket broadcast
- **실시간**: Hono WebSocket (`/api/ws`) + Redis Pub/Sub, SSE (`/api/stream`) 폴백
- **UI**: Next.js는 Hono API fetch 중심 UI 레이어. rewrite `/api/*` → localhost:8787
- **태스크**: 6-lane 칸반 → Hono `PATCH /api/tasks/:id` → 상태 변경 + 의존성/코멘트
- **에이전트 제어**: Team UI에서 pause/resume/delegate/command + confirm 단계 + 감사 로깅
- **큐 처리**: BullMQ command/healthcheck 큐 → Gateway RPC → 에이전트
- **Gateway 제어**: config.patch, cron.list/status, sessions spawn/send/reset
- **Vault**: Obsidian 볼트 파일시스템 직접 접근. NAS WebDAV ↔ rclone bisync (5분 cron)
- **승인**: approval_policies → Telegram 인라인 키보드 → Herald Bot Long Polling → resolve
- **외부 접근**: Cloudflare Tunnel (`vulcan.yomacong.com`) + Tailscale (`vulcan.tail9732fd.ts.net`)

## 도구

- `pnpm dev` — 개발 서버 (localhost:3000)
- `pnpm api:dev` — Hono API 개발 서버 (localhost:8787)
- `pnpm build` — 프로덕션 빌드
- `pnpm lint` — ESLint
- `pnpm test` — Vitest 단위/통합 테스트
- `pnpm test:smoke` — Playwright 스모크 테스트 (16개)
- `pnpm seed` — DB 시드 데이터 생성
- `pnpm adapter` — OpenClaw Gateway 어댑터 실행
- `pnpm infra:up` / `pnpm infra:down` — Docker Compose 인프라 시작/중지

## 고도화 로드맵 (Phase 0~12)

| Phase | 이름 | 상태 |
|-------|------|------|
| 0 | Foundation (모노레포 + 공유 패키지) | 완료 |
| 1 | PostgreSQL + Redis + Hono | 완료 |
| 2 | WebSocket + Gateway RPC | 완료 |
| 3 | 에이전트 생명주기 관리 | 완료 |
| 4 | 태스크 시스템 고도화 | 완료 |
| 5 | 스킬 마켓플레이스 | 완료 |
| 6 | Activity/Audit + 메트릭스 | 완료 |
| 7 | Telegram 알림 (Herald Bot Long Polling) | 완료 |
| 8 | 승인/거버넌스 (Telegram 인라인 키보드) | 완료 |
| 9 | 테스트 + CI/CD (Vitest + Playwright + Husky) | 완료 |
| 10 | Docker 배포 (인프라 Docker, App PM2 유지) | 완료 |
| 11 | Observability + Governance 고도화 | 완료 |
| 11+ | WorkOrder 실전 적용 (마스터 플랜 Phase 3) | 완료 |
| 12 | agency-agents 레퍼런스 트랙 | 백로그 |
