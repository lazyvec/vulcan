# Vulcan Mission Control Decisions Log

> **문서 목적**: 프로젝트의 기술/설계/비즈니스 결정을 기록하는 ADR(Architecture Decision Record).
> 결정의 맥락, 대안, 근거를 남겨 미래에 "왜 이렇게 했는지" 추적 가능하게 한다.
>
> **최종 갱신**: 2026-03-14

> **문서 맵**: [PRODUCT_MASTER](PRODUCT_MASTER.md) · [BRAND_MASTER](BRAND_MASTER.md) · [ROADMAP](ROADMAP.md) · [WORK_PLAN](WORK_PLAN.md) · [PROGRESS](PROGRESS.md) · [DECISIONS](DECISIONS.md)

## 결정 요약

| # | 날짜 | 결정 | 상태 |
|---|------|------|------|
| 1 | 2026-03-06 | DB를 PostgreSQL 17로 | ✅ 확정 |
| 2 | 2026-03-06 | 백엔드를 Hono 4로 | ✅ 확정 |
| 3 | 2026-03-06 | OpenClaw 통신을 Gateway WebSocket RPC로 | ✅ 확정 |
| 4 | 2026-03-06 | 이중 제어 모드 (Hermes 위임 + 직접) | ✅ 확정 |
| 5 | 2026-03-06 | 인증 없음 — Cloudflare Access로 충분 | ✅ 확정 |
| 6 | 2026-03-10 | Docker Compose(인프라) + PM2(App) | ✅ 확정 |
| 7 | 2026-03-10 | Vault 동기화 rclone bisync | ✅ 확정 |
| 8 | 2026-03-10 | CodeMirror 6 에디터 | ✅ 확정 |
| 9 | 2026-03-10 | Office View를 framer-motion + DOM으로 | ✅ 확정 |
| 10 | 2026-03-13 | 에이전트 체계를 10인 Pantheon으로 확장 | ✅ 확정 |
| 11 | 2026-03-14 | Proactive Memory 기술 선정 | ⏳ 미정 |
| 12 | 2026-03-14 | Calendar 구현 방식 | ⏳ 미정 |
| 13 | 2026-03-14 | 에이전트 아바타 최종 스타일 | ⏳ 미정 |

<!-- ✅ 확정: 실행 중 | ⏳ 미정: 결정 필요 | ❌ 기각: 검토 후 거절 | 🔄 재검토: 상황 변화로 재논의 -->

---

## D-001: DB를 PostgreSQL 17로

- **날짜**: 2026-03-06
- **상태**: ✅ 확정
- **맥락**: Vulcan은 에이전트 이벤트, 태스크, 메모리, 감사 로그 등 관계형 데이터가 핵심이다. 초기에는 SQLite도 고려했지만, 프로덕션급 동시성과 확장성이 필요했다.
- **검토한 대안**:
  1. SQLite — 경량, 설정 불필요. 그러나 동시 쓰기 제한, 외래키 지원 미흡
  2. MySQL 8 — 안정적이지만 JSONB 지원 부족, PostgreSQL 대비 확장 기능 열세
  3. PostgreSQL 17 — 프로덕션급, 외래키, JSONB, pgvector, FTS 등 확장성 우수
- **결정**: PostgreSQL 17 + Drizzle ORM (pg dialect)
- **근거**: JSONB로 유연한 페이로드 저장, 외래키로 데이터 무결성, pgvector로 시맨틱 검색 확장 가능. Docker Compose로 간편 배포.
- **영향**: 인프라에 Docker Compose PostgreSQL 컨테이너 추가. Drizzle ORM으로 스키마 관리. 19개 테이블 운용 중.

---

## D-002: 백엔드를 Hono 4로

- **날짜**: 2026-03-06
- **상태**: ✅ 확정
- **맥락**: Next.js API Routes만으로는 WebSocket, BullMQ 큐, Gateway RPC 연결 등을 처리하기 어려웠다. 독립 백엔드가 필요했다.
- **검토한 대안**:
  1. Next.js API Routes — 간편하지만 WebSocket 지원 제한, 장기 실행 프로세스 부적합
  2. Express.js — 성숙하지만 TypeScript 지원 미흡, 미들웨어 패턴 구식
  3. Fastify — 고성능이지만 WebSocket 통합이 별도 플러그인
  4. Hono 4 — 경량, TypeScript 네이티브, WebSocket 내장, Edge 호환
- **결정**: Hono 4 (REST + WebSocket + BullMQ Worker)
- **근거**: WebSocket 네이티브 지원으로 Gateway RPC 양방향 통신 용이. BullMQ Worker와 같은 프로세스에서 실행 가능. TypeScript 타입 안전성.
- **영향**: 포트 8787에서 독립 실행. Next.js는 UI 전용(포트 3001)으로 분리. 80개+ API 엔드포인트 운용 중.

---

## D-003: OpenClaw 통신을 Gateway WebSocket RPC로

- **날짜**: 2026-03-06
- **상태**: ✅ 확정
- **맥락**: Vulcan이 OpenClaw 에이전트를 관찰하고 제어하려면 Gateway와 안정적인 양방향 통신이 필수다.
- **검토한 대안**:
  1. CLI 호출 (`openclaw` 명령어) — 간단하지만 프로세스 생성 오버헤드, 비동기 응답 처리 어려움, 실시간 스트리밍 불가
  2. REST API (HTTP) — 표준적이지만 단방향, 폴링 필요, 실시간 이벤트 수신 불가
  3. Gateway WebSocket RPC — 양방향, 실시간, `agents.*`/`chat.*`/`sessions.*`/`config.*`/`cron.*` 네임스페이스
- **결정**: Gateway WebSocket RPC (`ws://127.0.0.1:18789`)
- **근거**: CLI 대비 안정성(프로세스 재생성 없음), 양방향 통신(이벤트 스트리밍 + 커맨드 전송), 실시간 상태 동기화 가능.
- **영향**: Hono 백엔드에 Gateway RPC 클라이언트 내장. BullMQ 큐로 커맨드 큐잉 + 재시도. 어댑터 프로세스가 이벤트 수집.

---

## D-004: 이중 제어 모드 (Hermes 위임 + 직접)

- **날짜**: 2026-03-06
- **상태**: ✅ 확정
- **맥락**: 에이전트 제어 시 항상 Hermes를 경유하면 단일 장애점이 된다. 반면 모든 에이전트를 직접 제어하면 Hermes의 오케스트레이션 역할이 무너진다.
- **검토한 대안**:
  1. Hermes 전용 경유 — 안전하지만 Hermes 장애 시 모든 제어 불가
  2. 직접 제어 전용 — 유연하지만 Hermes의 컨텍스트/우선순위 조율 무시
  3. 이중 모드 — 기본은 Hermes 위임, 필요 시 직접 제어
- **결정**: 이중 제어 모드
- **근거**: 유연성 확보. 일반 상황에서는 Hermes가 오케스트레이션하되, 긴급 시 또는 특정 에이전트에 직접 명령 가능.
- **영향**: Team UI에서 위임/직접 제어 선택 가능. `agent_commands` 테이블에 경로(delegate/direct) 기록. 감사 로깅.

---

## D-005: 인증 없음 — Cloudflare Access로 충분

- **날짜**: 2026-03-06
- **상태**: ✅ 확정
- **맥락**: Vulcan은 단일 사용자 시스템이다. 자체 인증/세션 관리를 구현하면 복잡성만 늘어난다.
- **검토한 대안**:
  1. 자체 인증 (JWT/세션) — 유연하지만 단일 사용자에게 과잉
  2. OAuth (Google/GitHub) — 표준적이지만 역시 과잉
  3. Cloudflare Access — 제로트러스트 네트워크 인증, 앱 수준 변경 불필요
- **결정**: 자체 인증 없음. Cloudflare Access로 네트워크 레벨 보호.
- **근거**: 단일 사용자이므로 Cloudflare Access + Tailscale로 접근 제어 충분. 앱 코드에 인증 로직 불필요.
- **영향**: RBAC, 세션, 토큰 관리 코드 없음. CORS 설정과 X-Frame-Options만 적용.

---

## D-006: Docker Compose(인프라) + PM2(App)

- **날짜**: 2026-03-10
- **상태**: ✅ 확정
- **맥락**: PostgreSQL과 Redis는 컨테이너로 관리하는 것이 편리하지만, 앱(Next.js, Hono, Adapter)은 개발 사이클이 빠르므로 가벼운 프로세스 매니저가 적합하다.
- **검토한 대안**:
  1. 전체 Docker Compose — 통일적이지만 앱 재배포 시 이미지 빌드 오버헤드
  2. 전체 PM2 — 간편하지만 PostgreSQL/Redis 관리가 수동적
  3. Docker Compose(인프라) + PM2(앱) — 인프라는 컨테이너, 앱은 네이티브
- **결정**: Docker Compose(PostgreSQL+Redis) + PM2(web+api+adapter)
- **근거**: 점진적 전환 가능. 인프라는 Docker로 격리하고, 앱은 PM2로 빠른 재시작/로그 관리. 필요 시 전체 Docker화 가능.
- **영향**: `pnpm infra:up/down`으로 인프라 관리. PM2 ecosystem 파일로 앱 3개 프로세스 관리.

---

## D-007: Vault 동기화 rclone bisync

- **날짜**: 2026-03-10
- **상태**: ✅ 확정
- **맥락**: Obsidian 볼트를 iPhone, NAS, 서버 간 동기화해야 한다. 단방향 sync로는 충돌 관리가 안 된다.
- **검토한 대안**:
  1. rsync (단방향) — 단순하지만 양방향 동기화 불가, 충돌 시 데이터 손실 위험
  2. Syncthing — 양방향이지만 NAS WebDAV와 직접 연동 어려움
  3. rclone bisync — 양방향 동기화, WebDAV 지원, cron으로 스케줄링
- **결정**: rclone bisync (NAS WebDAV ↔ 서버 로컬, 5분 cron)
- **근거**: Obsidian 볼트의 양방향 동기화 필수. rclone이 WebDAV를 네이티브 지원하며, bisync로 충돌 감지 가능.
- **영향**: 흐름: iPhone(Obsidian) → NAS(Remotely Sync) → 서버(rclone bisync) → Vulcan API. 5분 cron으로 자동 동기화.

---

## D-008: CodeMirror 6 에디터

- **날짜**: 2026-03-10
- **상태**: ✅ 확정
- **맥락**: Vault의 마크다운 파일을 웹에서 편집해야 한다. 단순 textarea로는 마크다운 구문 강조, 단축키, 툴바 등이 불가능하다.
- **검토한 대안**:
  1. textarea + 미리보기 — 구현 간단하지만 편집 경험 열악
  2. Monaco Editor — 강력하지만 마크다운 특화 아님, 번들 크기 큼
  3. TipTap/ProseMirror — WYSIWYG 에디터, 마크다운 소스 편집과 방향 다름
  4. CodeMirror 6 — 모듈러, 경량, 마크다운 구문 강조, 확장성 우수
- **결정**: CodeMirror 6 + 마크다운 전용 확장 (툴바, 단축키, highlight, callout, 코드 구문 강조)
- **근거**: Obsidian 자체가 CodeMirror 기반이므로 편집 경험이 유사. 모듈러 아키텍처로 필요한 기능만 탑재 가능.
- **영향**: Vault 페이지에 CodeMirror 6 에디터 + 커스텀 툴바 + 이미지 업로드/D&D 통합.

---

## D-009: Office View를 framer-motion + DOM으로

- **날짜**: 2026-03-10
- **상태**: ✅ 확정
- **맥락**: 에이전트 상태를 오피스 메타포로 시각화하는 Office View에서 Canvas(PixiJS) vs DOM 기반 렌더링을 선택해야 했다.
- **검토한 대안**:
  1. PixiJS (WebGL/Canvas) — 고성능 렌더링, 수백 개 오브젝트에 적합. 그러나 SSR 불가, 접근성 취약, React 통합 복잡
  2. framer-motion + DOM — CSS Grid/Flexbox 기반, SSR 호환, React 네이티브, 접근성 우수
- **결정**: framer-motion + DOM (CSS Grid + 상태 애니메이션 + 팝오버)
- **근거**: 에이전트 10명 수준에서 Canvas가 불필요. DOM 기반이 SSR 호환, 접근성, 개발 생산성 면에서 모두 우수. framer-motion으로 부드러운 애니메이션 가능.
- **영향**: AgentOfficeView 컴포넌트가 6존 CSS Grid 레이아웃 + framer-motion 애니메이션으로 구현됨.

---

## D-010: 에이전트 체계를 10인 Pantheon으로 확장

- **날짜**: 2026-03-13
- **상태**: ✅ 확정
- **맥락**: 초기 5개 에이전트(Hermes, Vesta, Atlas, Lyra, Aegis)로는 리서치, 전략, 디자인, 그로스, 콘텐츠 등 전문 영역을 커버하기 어려웠다. 1인 기업의 스타트업 운영에 필요한 역할을 모두 커버하려면 확장이 필요했다.
- **검토한 대안**:
  1. 기존 5개 유지 — 간단하지만 역할 과부하, 전문성 부족
  2. 7~8개로 점진 확장 — 중간 단계이지만 여전히 빈 역할 존재
  3. 10인 Pantheon 체계 — Hermes(오케스트레이터) + 9 Tier 2 전문 에이전트
- **결정**: 10인 Pantheon 체계 (Hermes + Aegis, Metis, Athena, Themis, Iris, Daedalus, Nike, Calliope, Argus)
- **근거**: 전문화된 역할 분담으로 품질 향상. 라우팅 규칙과 워크플로우 표준으로 체계적 운영 가능. 각 에이전트가 명확한 책임 영역을 가짐.
- **영향**: OpenClaw 설정에 10개 에이전트 등록. PANTHEON.md 문서로 라우팅 규칙/워크플로우 표준화. Vulcan UI에서 10개 에이전트 모니터링 및 제어.

---

## D-011: Proactive Memory 기술 선정

- **날짜**: 2026-03-14
- **상태**: ⏳ 미정
- **맥락**: 현재 메모리 시스템(journal/longterm + FTS5 + pgvector)은 검색 기반이다. 에이전트가 능동적으로 관련 기억을 제안하는 Proactive Memory가 필요할 수 있다.
- **검토한 대안**:
  1. mem0 — 전용 메모리 레이어, 자동 추출/연관
  2. supermemory — 벡터 + 그래프 하이브리드
  3. memU — 경량 메모리 유틸리티
- **결정**: 미정. 추가 조사 필요.
- **근거**: 현재 pgvector + RRF 시맨틱 검색으로 기본 요구 충족 중. Proactive 기능의 실질적 필요성과 통합 비용을 평가 후 결정.
- **영향**: 결정 시 memories 테이블 확장 또는 외부 서비스 연동 필요.

---

## D-012: Calendar 구현 방식

- **날짜**: 2026-03-14
- **상태**: ⏳ 미정
- **맥락**: `/calendar` 화면에서 에이전트 스케줄(cron/interval)을 시각화해야 한다. 현재는 기본 목록 뷰만 존재.
- **검토한 대안**:
  1. 자체 구현 (커스텀 캘린더 컴포넌트) — 완전 제어 가능하지만 개발 비용
  2. 외부 라이브러리 연동 (react-big-calendar, FullCalendar 등) — 빠른 구현, 기능 풍부
  3. Google Calendar API 연동 — 외부 서비스 의존
- **결정**: 미정.
- **근거**: 스케줄 현황 조회는 목록 뷰로 충분히 동작 중. 캘린더 뷰의 실질적 가치 대비 구현 비용 평가 필요.
- **영향**: 결정 시 `/calendar` 페이지 리팩토링 및 UI 라이브러리 추가 가능성.

---

## D-013: 에이전트 아바타 최종 스타일

- **날짜**: 2026-03-14
- **상태**: ⏳ 미정
- **맥락**: 에이전트를 시각적으로 구분하기 위해 아바타가 필요하다. 현재 픽셀아트 스타일을 사용 중이나 최종 결정은 아니다.
- **검토한 대안**:
  1. 픽셀아트 — 레트로 감성, 작은 크기에서도 식별 용이. 현재 사용 중
  2. SVG 아이콘 — 벡터 기반, 확대/축소 자유, 일관된 스타일 유지 용이
  3. AI 생성 (이미지 모델) — 유니크한 캐릭터성, 그러나 브랜드 톤 일관성 유지 어려움
- **결정**: 미정. 현재 픽셀아트로 운영 중이나 최종 확정 아님.
- **근거**: Brand Master의 Anti-keywords("Cute/귀여운")와 Anti-patterns("에이전트 캐릭터 일러스트")를 고려해야 함. 에이전트는 캐릭터가 아니라 존재로 표현해야 한다는 원칙과의 정합성 검토 필요.
- **영향**: 결정 시 Office View, Team 페이지, Sidebar 아이콘 등 전체 에이전트 표시 영역에 적용.

---

*이 문서는 Vulcan Mission Control 프로젝트의 결정 기록(ADR)입니다. 새로운 기술/설계/비즈니스 결정 시 이 문서에 추가합니다.*
