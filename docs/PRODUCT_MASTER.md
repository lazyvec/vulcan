# Vulcan Mission Control Product Master Document (SSOT)

> **문서 목적**: Vulcan Mission Control 제품의 유일한 정의 문서(Single Source of Truth).
> 이 문서 하나로 제품 철학, 시스템 구조, 규칙, 운영 원칙을 완전히 이해할 수 있어야 한다.
>
> **최종 갱신**: 2026-03-14 (v4 — Pantheon 10인 에이전트 반영, Phase 0~11+++ 완료)

> **문서 맵**: [PRODUCT_MASTER](PRODUCT_MASTER.md) · [BRAND_MASTER](BRAND_MASTER.md) · [ROADMAP](ROADMAP.md) · [WORK_PLAN](WORK_PLAN.md) · [PROGRESS](PROGRESS.md) · [DECISIONS](DECISIONS.md)

---

## 1. 제품 정의

### 1.1 한 줄 정의

**OpenClaw 에이전트 팀(Pantheon 10인)을 관찰하고 제어하며, 한 사람의 일상·작업·기억을 한눈에 조망하고 오케스트레이션하는 개인 전용 Mission Control.**

### 1.2 핵심 철학

1. **관찰과 제어의 통합** — Vulcan은 관측소이자 지휘소다. 에이전트의 활동을 보고, 필요할 때 지시를 내린다.
2. **사용자 주권** — "The human commands through Vulcan. Hermes orchestrates. Agents execute." 모든 중요 결정은 사용자가 내린다.
3. **한 사람을 위한 시스템** — 멀티테넌시, 팀, 조직이 없다. 오직 한 사람(나)만을 위해 최적화한다. 나보다 더 나를 잘 아는 시스템이 목표다.
4. **투명한 가시성** — 에이전트가 무엇을 하고 있는지, 무엇을 했는지, 무엇이 쌓이고 있는지를 언제든 볼 수 있어야 한다.
5. **최소 마찰** — 앱을 열면 이미 정리되어 있다. 설정하거나 입력할 것이 거의 없다.
6. **점진적 고도화** — 단순하게 시작하되, 지속적으로 발전한다. 복잡성은 필요할 때 추가한다.

### 1.3 미션

OpenClaw라는 자율 AI 에이전트 시스템에 투명한 가시성과 양방향 제어를 부여하여, 인간이 에이전트 팀을 신뢰하고 효과적으로 지휘할 수 있게 한다.

### 1.4 범위

**Vulcan이 하는 것:**
- OpenClaw 에이전트의 실시간 활동 관찰 (WebSocket / SSE)
- 에이전트 상태를 오피스 메타포로 시각화 (2D 픽셀아트 인터랙티브 오피스)
- **에이전트 생명주기 관리** (생성, 삭제, 일시정지, 재시작, 설정 변경)
- **이중 제어 모드**: Hermes 경유 위임 + 각 에이전트 직접 제어
- **스킬 관리** (에이전트에 스킬 설치/제거/조회)
- 태스크 관리 (Kanban 보드, 의존성, 우선순위, 에이전트 할당)
- 프로젝트 진행률 추적
- 메모리(Journal + Long-term) 열람 및 시맨틱 검색 (pgvector + Temporal Decay)
- 문서(Docs) 열람 및 검색
- 스케줄(cron/interval) 현황 조회
- **승인/거버넌스** (민감한 에이전트 작업에 human-in-the-loop 승인)
- **Telegram 알림** (중요 이벤트를 기존 Hermes 채널로 통보)
- **메트릭스/분석** (에이전트 처리량, 태스크 사이클 타임, FinOps 비용 대시보드)
- **Trace/FinOps** (LLM 호출 비용·토큰·레이턴시 추적, Circuit Breaker)
- **WorkOrder** (에이전트 간 구조화된 작업지시·검증 루프)
- **Feature Flags** (기능 단위 롤아웃 제어)
- **감사 로그 Hash Chain** (SHA-256 선형 해시 체인 무결성 검증)
- **PM Skills 워크플로우** (Discover→Strategy→Write-PRD 자동 체인)
- **Hermes 지식 검색** (memories 테이블, FTS5, pgvector 시맨틱 검색, Temporal Decay)
- OpenClaw Gateway RPC를 통한 양방향 통신
- **Vault**: Obsidian 볼트 웹 탐색기 + 에디터 (트리 뷰, 검색, URL 클리핑/딥링크, CodeMirror 6 에디터+툴바, CRUD, 이미지 업로드/D&D, ==highlight==, callout, 코드 구문강조, 첨부파일 서빙, wikilink 네비게이션)

**Vulcan이 하지 않는 것:**
- RBAC, 멀티테넌시, 팀 기능 (단일 사용자)
- 외부 사용자 인증 (Cloudflare Access로 충분)
- 범용 프로젝트 관리 도구 (Jira/Linear 대체가 아님)
- 별도 Telegram 봇 구축 (기존 Hermes 봇 활용)

### 1.5 관계도: OpenClaw ↔ Vulcan

```
┌──────────────────────────────────────────────────────────────────┐
│                     OpenClaw Gateway                              │
│                 ws://127.0.0.1:18789                              │
│                                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Hermes   │  │  Aegis   │  │  Metis   │  │ Athena   │         │
│  │(오케스트 │  │ (보안)   │  │(리서치)  │  │ (전략)   │         │
│  │ 레이터)  │  │ Gemini   │  │ GPT-5.4  │  │ GPT-5.4  │         │
│  │ GPT-5.4  │  │ 3 Flash  │  │          │  │          │         │
│  └────┬─────┘  └──────────┘  └──────────┘  └──────────┘         │
│       │                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Themis   │  │  Iris    │  │ Daedalus │  │  Nike    │         │
│  │(프로덕트)│  │ (디자인) │  │ (개발)   │  │ (그로스) │         │
│  │ GPT-5.4  │  │ Gemini   │  │ GPT-5.4  │  │ GPT-5.4  │         │
│  │          │  │ 3.1 Pro  │  │          │  │          │         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
│                                                                    │
│  ┌──────────┐  ┌──────────┐                                      │
│  │ Calliope │  │  Argus   │                                      │
│  │(콘텐츠)  │  │(평가/QA) │                                      │
│  │ Gemini   │  │ Gemini   │                                      │
│  │ 3.1 Pro  │  │ 3 Flash  │                                      │
│  └──────────┘  └──────────┘                                      │
│                                                                    │
│  sessions_spawn / sessions_send (에이전트 간 통신)                │
│                                                                    │
│  ── WebSocket RPC API ──                                          │
│  agents.* | chat.* | sessions.* | config.* | cron.*               │
└────────────────────┬─────────────────────────────────────────────┘
                     │ WebSocket RPC (양방향)
                     ▼
┌────────────────────────────────────────────────────────┐
│              Vulcan Mission Control                    │
│                                                        │
│  ┌──────────────┐    ┌──────────────────┐             │
│  │  Hono API    │───▶│   PostgreSQL     │             │
│  │  + WebSocket │    └──────────────────┘             │
│  │  + BullMQ    │───▶┌──────────────────┐             │
│  └──────┬───────┘    │     Redis        │             │
│         │            └──────────────────┘             │
│         ▼                                              │
│  ┌──────────────┐                                     │
│  │  Next.js UI  │ ← 사용자가 여기서 제어한다          │
│  └──────────────┘                                     │
└────────────────────────────────────────────────────────┘
         │
    Telegram 알림 (기존 Hermes 채널 활용)
```

**원칙**: OpenClaw은 독립적으로 돌아간다. Vulcan이 꺼져 있어도 Hermes는 일한다. Vulcan은 제어와 가시성을 부여하지만, OpenClaw의 자율 실행을 전제로 한다.

---

## 2. 사용자 모델

### 2.1 유일한 사용자

| 역할 | 설명 |
|------|------|
| **Human (나)** | Vulcan의 유일한 사용자. 에이전트를 관찰하고, 지시하고, 결정을 내린다. |

다른 사용자, 역할, 권한 체계가 없다. 앞으로도 없다.

### 2.2 에이전트 (Pantheon 10인)

에이전트는 Vulcan을 통해 관찰하고 제어하는 대상이다. 단일 OpenClaw Gateway 내에서 격리된 컨텍스트로 실행된다.

| 에이전트 | 역할 | 미션 | 모델 | 계층 |
|----------|------|------|------|------|
| **Hermes** | 오케스트레이터 | 사용자의 분신. 대화·실행·하위 에이전트 위임·조율 | GPT-5.4 | **주 에이전트** |
| **Aegis** | 보안 | 보안 정책·인증·인가·위협 분석 | Gemini 3 Flash | Tier 2 워커 |
| **Metis** | 리서치 | 조사·분석·데이터 수집 | GPT-5.4 | Tier 2 워커 |
| **Athena** | 전략 | 전략 수립·의사결정 지원·로드맵 | GPT-5.4 | Tier 2 워커 |
| **Themis** | 프로덕트 | 제품 기획·PRD 작성·요구사항 정의 | GPT-5.4 | Tier 2 워커 |
| **Iris** | 디자인 | UI/UX 설계·비주얼 디자인·프로토타이핑 | Gemini 3.1 Pro | Tier 2 워커 |
| **Daedalus** | 개발 | 코드 구현·아키텍처·기술 설계 | GPT-5.4 | Tier 2 워커 |
| **Nike** | 그로스 | 성장 전략·마케팅·사용자 획득 | GPT-5.4 | Tier 2 워커 |
| **Calliope** | 콘텐츠 | 콘텐츠 제작·문서화·커뮤니케이션 | Gemini 3.1 Pro | Tier 2 워커 |
| **Argus** | 평가/QA | 품질 검증·테스트·WorkOrder 검증 루프 | Gemini 3 Flash | Tier 2 워커 |

**제어 흐름**:
- 기본: 사용자 → Vulcan → Hermes → `sessions_spawn` → Tier 2 워커
- 직접: 사용자 → Vulcan → Gateway RPC → 특정 에이전트 직접 제어

### 2.3 에이전트 상태 모델

6개 상태, 각각 오피스 공간에 매핑:

| 상태 | 라벨 | 오피스 존 | 의미 |
|------|------|----------|------|
| `idle` | Idle | Watercooler | 대기 중, 다음 지시 기다림 |
| `writing` | Writing | Desk | 코드·문서 작성 중 |
| `researching` | Researching | Library | 분석·탐색 중 |
| `executing` | Executing | Workbench | 도구 실행·테스트 중 |
| `syncing` | Syncing | Hallway | 외부 시스템과 동기화 |
| `error` | Error | Red Corner | 오류 발생, 확인 필요 |

---

## 3. 용어집

| 용어 | 정의 | 경계/주의 |
|------|------|----------|
| **Vulcan** | OpenClaw의 Mission Control. 로마 신화의 대장장이 신에서 유래. "전령이 가져온 것을 벼리는 자" | 에이전트 이름이 아니라 시스템 이름 |
| **Hermes** | OpenClaw의 주 에이전트이자 오케스트레이터. 그리스 신화의 전령신. 사용자의 분신 | 사용자의 지시를 받아 Tier 2 에이전트를 조율 |
| **Pantheon** | Hermes + 9명의 Tier 2 워커로 구성된 에이전트 팀 전체 | 그리스 신화의 판테온(신전)에서 유래 |
| **Aegis** | 보안 에이전트. 그리스 신화의 방패 | |
| **Metis** | 리서치 에이전트. 그리스 신화의 지혜의 여신 | |
| **Athena** | 전략 에이전트. 그리스 신화의 전략의 여신 | |
| **Themis** | 프로덕트 에이전트. 그리스 신화의 법과 질서의 여신 | |
| **Iris** | 디자인 에이전트. 그리스 신화의 무지개의 여신 | |
| **Daedalus** | 개발 에이전트. 그리스 신화의 장인 | |
| **Nike** | 그로스 에이전트. 그리스 신화의 승리의 여신 | |
| **Calliope** | 콘텐츠 에이전트. 그리스 신화의 서사시의 뮤즈 | |
| **Argus** | 평가/QA 에이전트. 그리스 신화의 백 개의 눈을 가진 거인 | WorkOrder 검증 루프의 Verifier 역할 |
| **OpenClaw** | 자율 AI 에이전트 런타임 시스템 | Vulcan과 별개의 독립 시스템 |
| **Gateway** | OpenClaw의 중앙 제어 플레인. 단일 Node.js 프로세스 내에 모든 에이전트를 호스팅 | `ws://127.0.0.1:18789` |
| **Gateway RPC** | Gateway의 WebSocket RPC API. `agents.*`, `chat.*`, `sessions.*` 등 네임스페이스 | Vulcan ↔ OpenClaw 양방향 통신 경로 |
| **sessions_spawn** | 에이전트가 다른 에이전트에게 태스크를 위임하는 RPC 호출 | Hermes → Tier 2 에이전트 위임에 사용 |
| **sessions_send** | 에이전트 간 직접 메시지 교환 (동기 핑퐁) | 최대 5턴 |
| **WorkOrder** | 에이전트 간 구조화된 작업지시 단위 | Executor가 실행, Verifier(Argus)가 검증 |
| **WorkResult** | WorkOrder에 대한 실행 결과 | 검증 실패 시 1회 재시도 후 CEO 에스컬레이션 |
| **Trace** | LLM 호출 한 건의 비용·토큰·레이턴시 기록 | FinOps 대시보드에 집계 |
| **Circuit Breaker** | 에이전트별 일일 비용 상한 초과 시 자동 차단 | |
| **Feature Flag** | JSON 파일 기반 기능 토글. `isFeatureEnabled()` 헬퍼로 접근 | |
| **Hearth** | Vulcan의 시그니처 액센트 컬러(`#e07a40`). 대장간의 화로에서 유래 | UI 포인트, CTA, active 상태에만 사용 |
| **Warm Obsidian** | Vulcan의 디자인 톤. 어둡지만 차갑지 않은 | 네온/사이버펑크와 구별 |
| **Office Metaphor** | 에이전트 상태를 사무실 공간으로 시각화하는 패턴 | Phase 11+++에서 2D 픽셀아트 인터랙티브 오피스로 업그레이드 |
| **Lane** | 칸반 보드의 열 | `backlog/queued/in_progress/review/done/archived` |
| **Journal** | 단기 메모리. 세션별 기록 | |
| **Long-term Memory** | 장기 메모리. 누적 컨텍스트, 학습된 패턴 | |
| **Signal** | 에이전트 활동의 최소 단위. 이벤트 한 건 | |
| **Temporal Decay** | 시간 경과에 따라 메모리 중요도가 감소하는 알고리즘 | Memory 검색 랭킹에 적용 |

---

## 4. 시스템 구조

### 4.1 기술 스택

**현재 스택 (Phase 11+++ 완료)**:

| 레이어 | 기술 | 비고 |
|--------|------|------|
| 프론트엔드 | Next.js 16 (App Router, React 19) | UI 전용, 포트 3001 |
| 백엔드 | Hono 4 (TypeScript) | REST + WebSocket + BullMQ Worker, 포트 8787 |
| DB | PostgreSQL 17 + Drizzle ORM (pg dialect) | Docker Compose |
| 벡터 검색 | pgvector (OpenAI embedding + RRF) | Memory 시맨틱 검색 |
| 캐시/큐 | Redis 7 + ioredis + BullMQ | Docker Compose |
| 실시간 | WebSocket (Hono ↔ 프론트엔드) + Redis Pub/Sub | SSE 폴백 |
| OpenClaw 통신 | Gateway WebSocket RPC (ws://127.0.0.1:18789) | 양방향 |
| 스타일 | Tailwind CSS v4 + CSS 변수 디자인 토큰 | |
| 애니메이션 | Framer Motion (스프링 물리) | |
| 에디터 | CodeMirror 6 (Vault 마크다운 에디터) | |
| 테스트 | Vitest 63개+ · Playwright 16개+ | Husky + lint-staged |
| 인프라 | Docker Compose (PostgreSQL+Redis), PM2 (web+api+adapter) | |
| 외부 접근 | Cloudflare Tunnel + Tailscale | |

### 4.2 데이터 플로우

**수집 경로**:
```
OpenClaw Gateway → Hono POST /api/adapter/ingest → PostgreSQL → WebSocket broadcast
```

**실시간**:
```
Hono WebSocket (/api/ws) + Redis Pub/Sub, SSE (/api/stream) 폴백
```

**제어 경로**:
```
사용자 → Next.js UI → Hono API → BullMQ 큐 → Gateway RPC → 에이전트
```

**Trace 수집**:
```
Gateway completion 이벤트 → Gateway-to-Trace 브릿지 → traces 테이블 → CostDashboard
```

**WorkOrder 흐름**:
```
사용자/Hermes → WorkOrder 생성 → Executor 실행 → WorkResult 제출 → Argus 검증 → 완료/재시도/에스컬레이션
```

**Vault**:
```
Obsidian 볼트 ↔ NAS WebDAV ↔ rclone bisync (5분 cron) ↔ 서버 로컬 → Hono API
```

**Memory 검색**:
```
쿼리 → pgvector 시맨틱 검색 (OpenAI embedding) + FTS5 → RRF 랭킹 + Temporal Decay → 결과
```

### 4.3 데이터 모델

| 테이블 | 핵심 필드 | 역할 | Phase |
|--------|----------|------|-------|
| **agents** | id, name, roleTags[], status, statusSince, lastSeenAt | 에이전트 프로필 + 실시간 상태 | M0 |
| **projects** | id, name, status, progress, priority, ownerAgentId | 프로젝트 추적 | M0 |
| **tasks** | id, projectId, title, assigneeAgentId, lane, priority, due_at, tags | 칸반 태스크 | M0→P4 |
| **task_dependencies** | id, taskId, dependsOnTaskId | 태스크 간 의존성 | P4 |
| **task_comments** | id, taskId, authorType, authorId, content | 태스크 코멘트 | P4 |
| **events** | id, ts, source, agentId, type, summary, payloadJson | 이벤트 로그 (28종+) | M0→P6 |
| **memory_items** | id, container, title, content, tags[], importance, expiresAt | 기억 저장소 | M0→P6 |
| **docs** | id, title, tags[], format, content | 문서 저장소 | M0 |
| **schedules** | id, name, cronOrInterval, status, ownerAgentId | 스케줄 | M0 |
| **gateways** | id, url, status | OpenClaw Gateway 연결 정보 | P3 |
| **agent_commands** | id, agentId, type, status, result | 에이전트 커맨드 이력 | P3 |
| **skills** | id, name, description, category | 스킬 메타데이터 | P5 |
| **agent_skills** | agentId, skillId | 에이전트-스킬 매핑 | P5 |
| **skill_registry** | id, name, source, metadata | 스킬 레지스트리 | P5 |
| **notification_preferences** | id, eventType, channel, enabled | 알림 설정 | P7 |
| **notification_logs** | id, eventType, channel, status, sentAt | 알림 발송 이력 | P7 |
| **approval_policies** | id, eventPattern, requiredApprovers, timeout | 승인 정책 | P8 |
| **approvals** | id, policyId, status, requestedAt, resolvedAt | 승인 요청 | P8 |
| **audit_log** | id, action, entityType, entityId, userId, ts, hash | 모든 mutation 감사 로그 (SHA-256 Hash Chain) | P3→P11 |
| **traces** | id, agentId, model, inputTokens, outputTokens, cost, latencyMs, ts | LLM 호출 비용·토큰·레이턴시 추적 | P11 |
| **circuit_breaker_config** | id, agentId, dailyLimit, enabled | 에이전트별 일일 비용 상한 | P11 |
| **work_orders** | id, title, assigneeAgentId, status, deadline, spec | 에이전트 간 구조화된 작업지시 | P11+ |
| **work_results** | id, workOrderId, agentId, status, output | WorkOrder 실행 결과 | P11+ |
| **memories** | id, agentId, content, embedding, tags[], importance, createdAt | Hermes 지식 (pgvector 시맨틱 검색) | P11+++ |

### 4.4 API 개요

| 카테고리 | 주요 엔드포인트 | 설명 |
|----------|----------------|------|
| **에이전트** | GET/POST/PUT/DELETE /api/agents, POST /:id/pause,resume,command,delegate | CRUD + 생명주기 제어 |
| **태스크** | GET/POST/PATCH /api/tasks, /:id/comment, /:id/deps | 6-lane 칸반 + 의존성 + 코멘트 |
| **이벤트** | GET /api/events, POST /api/adapter/ingest | 28종+ 이벤트 수집·조회 |
| **Activity** | GET /api/activity, /api/activity/stats | 필터링 + 페이지네이션 + 통계 |
| **프로젝트** | GET/POST/PATCH /api/projects | 프로젝트 CRUD |
| **메모리** | GET/POST/PATCH/DELETE /api/memory | journal/longterm/profile/lesson |
| **문서** | GET/POST /api/docs | 문서 CRUD + 검색 |
| **스킬** | GET /api/skills, POST /api/agents/:id/skills | 마켓플레이스 + 설치/제거 |
| **승인** | GET/POST /api/approvals, /api/approval-policies | 승인 요청 + 정책 관리 |
| **알림** | GET/PATCH /api/notification-preferences | 이벤트별 채널 구독 |
| **Vault** | GET/POST/PUT/DELETE /api/vault/notes, /search, /clip, /upload | Obsidian 볼트 CRUD + 검색 + 클리핑 |
| **Gateway** | GET/POST /api/gateway/*, /api/cron/* | Gateway RPC 프록시 (config/sessions/cron) |
| **Traces** | POST /api/traces/ingest, GET /api/traces, GET /api/traces/daily-cost | Trace 수집 + 일별 비용 조회 |
| **Circuit Breaker** | GET/PUT /api/circuit-breaker | 에이전트별 비용 상한 조회·수정 |
| **Feature Flags** | (JSON 파일 기반, `isFeatureEnabled()` 헬퍼) | 기능 토글 제어 |
| **WorkOrder** | POST/GET /api/work-orders, /:id, /:id/result, /:id/checkpoint, /:id/verify | 작업지시 CRUD + 결과 제출 + 검증 |
| **Knowledge** | GET /api/knowledge, /api/knowledge/search | Hermes 지식 검색 (FTS + 시맨틱) |
| **감사 무결성** | GET /api/audit-log/integrity | SHA-256 Hash Chain 검증 |
| **Workflows** | POST /api/workflows/pm-skills | PM Skills 워크플로우 (Discover→Strategy→Write-PRD) |
| **실시간** | WebSocket /api/ws, SSE /api/stream | 실시간 업데이트 |
| **시스템** | GET /api/health | DB/Redis/Gateway/uptime |

---

## 5. 기능 목록

### 5.1 완료된 기능 (Phase 0~11+++)

| 기능 | Phase | 설명 |
|------|-------|------|
| **Live Activity Panel** | M0→P6 | WebSocket 실시간 이벤트 피드, 카테고리 필터, 무한 스크롤, 소스 링크 |
| **Office View v2** | M0→P11+++ | 2D 탑다운 바닥맵, 픽셀아트 스프라이트, framer-motion 이동 애니메이션, 말풍선, 히트맵, XP 랭킹, 토큰 바, 이벤트 트레일, 메모리 타임라인 |
| **Kanban Board** | M0→P4 | 6-lane 태스크 관리 (@dnd-kit), 의존성, 우선순위, 코멘트, WorkOrder 뱃지 |
| **TaskDetailModal** | P4 | 태스크 상세 뷰 (코멘트, 의존성, 태그, 할당, 에이전트 활동 탭) |
| **Memory Board** | M0→P6 | journal/longterm/profile/lesson, importance, expiresAt |
| **Docs Explorer** | M0 | 문서 목록 + 뷰어 + 검색 |
| **Vault** | P10 | Obsidian 볼트 웹 탐색기 + CodeMirror 6 에디터 + 검색 + 클리핑/딥링크 + 이미지 업로드 + wikilink + highlight/callout/코드 구문강조 |
| **에이전트 생명주기** | P3 | CRUD, pause/resume, delegate, command + 확인 단계 + 감사 로깅 |
| **스킬 마켓플레이스** | P5 | 스킬 카탈로그 + 에이전트별 설치/제거 + Gateway 동기화 |
| **Activity/Audit** | P6 | 28종+ 이벤트, recharts 메트릭스 대시보드 |
| **Telegram 알림** | P7 | Herald Bot Long Polling, notification_preferences |
| **승인/거버넌스** | P8 | approval_policies, Telegram 인라인 키보드 승인, 자동 타임아웃 |
| **테스트/CI** | P9 | Vitest 63개+ · Playwright 16개+ · Husky + lint-staged |
| **인프라** | P10 | Docker Compose (PostgreSQL+Redis), PM2 (web+api+adapter) |
| **Trace/FinOps** | P11 | traces 테이블, CostDashboard (일별 BarChart + PieChart + CB 테이블), Telegram 일별 비용 알림 |
| **Circuit Breaker** | P11 | 에이전트별 일일 비용 상한, 자동 차단, CB 발동 이력 |
| **Feature Flags** | P11 | JSON 파일 기반, `isFeatureEnabled()` 헬퍼, 3개 플래그 |
| **Gateway-to-Trace 브릿지** | P11 | Gateway completion 이벤트 → trace 자동 변환, 모델별 비용 계산 |
| **감사 로그 Hash Chain** | P11 | SHA-256 선형 해시 체인, `verifyAuditChain()`, 무결성 검증 API |
| **WorkOrder** | P11+ | work_orders/work_results, 7개 API, 상태 머신, Executor→Verifier(Argus) 검증 루프, WorkOrderDashboard |
| **PM Skills 워크플로우** | P11+ | Discover(Metis) → Strategy(Athena) → Write-PRD(Themis) 자동 체인, 완료 시 Telegram 알림 |
| **FinOps 강화** | P11++ | 기간 선택기 (7/14/30일), 트렌드 지표, CB 발동 이력 테이블 |
| **에이전트 오피스 뷰** | P11++ | AgentOfficeView (6존 CSS Grid + 상태 애니메이션 + 팝오버), useAgentStatus 훅 |
| **Memory 검색 강화** | P11+++ | memories 테이블, FTS5 인덱싱, 파일→DB 동기화, Auto-Flush, 규칙 기반 분류(25개 태그 규칙), pgvector 시맨틱 검색(OpenAI embedding+RRF), Temporal Decay, /knowledge UI |
| **UI/UX 전면 리뉴얼** | P11+++ | Claude 스타일 Soft Minimalism, Glassmorphism, 스프링 물리 애니메이션, 모바일 바텀 시트, 감성적 마이크로카피 |
| **Sidebar Navigation** | M0 | 15개+ 화면 |
| **PWA** | M0 | manifest, Service Worker |
| **보안** | M0 | Cloudflare Access, CORS, X-Frame-Options |

### 5.2 백로그

| Phase | 기능 | 설명 |
|-------|------|------|
| 12 | agency-agents 레퍼런스 | 자율 학습/피드백 루프, 협업 프로토콜, 멀티모달 |

### 5.3 Out of Scope (유지)

- RBAC, 멀티테넌시, 팀 기능 (단일 사용자 시스템)
- 외부 사용자 인증 (Cloudflare Access로 충분)
- 별도 Telegram 봇 (기존 Hermes 봇 활용)
- 범용 프로젝트 관리 (Jira/Linear 대체 아님)

---

## 6. 핵심 규칙 및 정책

### 6.1 사용자 주권 원칙

| 규칙 | 설명 |
|------|------|
| 사용자가 최종 결정권자 | 에이전트의 자율 실행은 존중하되, 사용자는 언제든 개입할 수 있다 |
| 이중 제어 모드 | Hermes 경유 위임 (기본) + 직접 제어 (필요시) |
| 파괴적 작업은 확인 필수 | 에이전트 삭제, 재시작 등 파괴적 작업은 UI에서 확인 다이얼로그 |
| 승인 가능 | 민감한 작업에 대해 human-in-the-loop 승인 정책 적용 가능 |

### 6.2 데이터 보호

| 규칙 | 설명 |
|------|------|
| 프로덕션 DB 직접 조작 금지 | 초기화는 seed 스크립트 또는 마이그레이션으로만 |
| `.env` 코드 노출 금지 | 환경변수에만 보관 |
| 외부 서버로 정보 전송 금지 | IP, 유저명, 경로, 토큰 일체 유출 금지 |
| 감사 로그 무결성 | SHA-256 Hash Chain으로 감사 로그 변조 방지 |

### 6.3 시스템 보호

| 규칙 | 설명 |
|------|------|
| PM2/Docker 프로세스 조작은 사용자 확인 필수 | restart, stop, delete |
| Drizzle 스키마 변경 시 마이그레이션 계획 먼저 | 스키마 수정 전 계획 제시 |
| Gateway RPC 연결 변경 시 호환성 확인 | 프로토콜 버전, 핸드셰이크 |
| Circuit Breaker | 에이전트별 일일 비용 상한 초과 시 자동 차단 |

### 6.4 OpenClaw 통신 규칙

| 규칙 | 설명 |
|------|------|
| Gateway RPC가 주 통신 경로 | CLI 호출이 아닌 WebSocket RPC 사용 |
| 커맨드는 항상 큐잉 | 동기 실행 아닌 BullMQ 큐 경유 (재시도, 감사, 타임아웃) |
| 모든 mutation 감사 로깅 | 에이전트 제어, 태스크 변경 등 기록 |
| OpenClaw 독립성 존중 | Vulcan이 꺼져도 OpenClaw은 정상 동작해야 함 |
| Feature Flags로 기능 제어 | 새 기능은 플래그로 단계적 롤아웃 |

---

## 7. UI 구조

### 7.1 화면 구성

| 화면 | 경로 | 핵심 컴포넌트 | Phase |
|------|------|--------------|-------|
| Office | `/office` | OfficeFloorMap (2D 픽셀아트 인터랙티브) + Live Feed | M0→P11+++ |
| Tasks | `/tasks` | KanbanBoard (6-lane @dnd-kit) + TaskDetailModal + WorkOrder 뱃지 | M0→P4→P11++ |
| Team | `/team` | 에이전트 프로필 + 제어 패널 (pause/resume/command) | M0→P3 |
| Projects | `/projects` | 프로젝트 목록 + 진행률 | M0 |
| Calendar | `/calendar` | 스케줄 뷰 | M0 |
| Memory | `/memory` | MemoryBoard (journal/longterm/profile/lesson) | M0 |
| Docs | `/docs` | DocsExplorer | M0 |
| Vault | `/vault` | VaultExplorer + MarkdownEditor (CodeMirror 6) | P10 |
| Activity | `/activity` | Activity 피드 + 메트릭스 대시보드 (recharts) | P6 |
| Skills | `/skills` | 스킬 마켓플레이스 (Catalog + Per Agent) | P5 |
| Approvals | `/approvals` | 승인 대기 목록 + 정책 관리 | P8 |
| Notifications | `/notifications` | 알림 설정 (이벤트별 채널 구독) | P7 |
| Costs | `/costs` | CostDashboard (일별 비용 + 에이전트별 + CB 테이블) | P11 |
| Work Orders | `/work-orders` | WorkOrderDashboard (작업지시 목록 + 상태 머신) | P11+ |
| Knowledge | `/knowledge` | Hermes 지식 검색 (FTS + 시맨틱) | P11+++ |

### 7.2 레이아웃

- **Shell**: 260px 고정 Sidebar + 1fr 콘텐츠 영역
- **모바일**: Sidebar 슬라이드 인/아웃 + 오버레이, 모달 → 바텀 시트 자동 전환
- **반응형 분기**: 980px (2-col → 1-col), 1024px (사이드 패널 분리)
- **디자인**: Claude 스타일 Soft Minimalism + Glassmorphism + 스프링 물리 애니메이션

---

## 8. KPI 및 메트릭스

### 8.1 핵심 성공 지표

| 지표 | 측정 방법 | 의미 |
|------|----------|------|
| **WebSocket 연결 수** | Health endpoint | 실시간 연결 상태 |
| **DB 레코드 수** | Health endpoint | 데이터 축적량 |
| **Gateway RPC 상태** | Health endpoint | OpenClaw 연결 건전성 |
| **에이전트 처리량** | 일/주 단위 태스크 완료 수 | 팀 생산성 |
| **태스크 사이클 타임** | backlog → done 평균 시간 | 효율성 |
| **커맨드 성공률** | 성공/실패 비율 | 제어 안정성 |
| **Uptime** | Health endpoint | 서비스 안정성 |

### 8.2 FinOps 지표

| 지표 | 측정 방법 | 의미 |
|------|----------|------|
| **일별 LLM 비용** | traces 집계 | 비용 추세 |
| **에이전트별 비용** | traces 에이전트 그룹 | 비용 분배 |
| **모델별 토큰 사용량** | traces 모델 그룹 | 모델 효율성 |
| **Circuit Breaker 발동 횟수** | CB 이력 | 비용 이상 징후 |

---

## 9. 운영

### 9.1 프로세스

| 프로세스 | PM2 이름 | 역할 | 포트 |
|----------|----------|------|------|
| Next.js (web) | `vulcan-mc` | UI 전용 | 3001 |
| Hono (api) | `vulcan-api` | REST + WebSocket + BullMQ Worker | 8787 |
| 어댑터 | `vulcan-adapter` | OpenClaw Gateway 어댑터 | - |
| PostgreSQL | (Docker) | 데이터 저장 | 5432 |
| Redis | (Docker) | Pub/Sub + 큐 | 6379 |

### 9.2 도메인

- 프로덕션: `https://vulcan.yomacong.com` (Cloudflare Tunnel)
- Tailscale: `https://vulcan.tail9732fd.ts.net`
- 로컬: `http://127.0.0.1:3001` (web) / `http://127.0.0.1:8787` (api)

### 9.3 Vault 동기화

- NAS: Synology (Tailscale `lazyvec-nas`), WebDAV `http://lazyvec-nas:5005/Obsidian/`
- 로컬 경로: `~/ObsidianVault/lazyvec/`
- 동기화: rclone bisync (5분 cron)
- 흐름: iPhone(Obsidian) → NAS(Remotely Sync) → 서버(rclone bisync) → Vulcan API

---

## 10. FAQ

### Q1. Vulcan은 에이전트를 컨트롤하나요?

**A:** 네. Vulcan v2부터 완전한 양방향 제어를 지원합니다. 에이전트 생성/삭제/일시정지/재시작, 태스크 할당, 스킬 관리, WorkOrder 지시 등이 가능합니다. 기본적으로 Hermes를 통해 위임하며, 필요시 직접 제어도 가능합니다.

### Q2. 여러 명이 사용할 수 있나요?

**A:** 아니요. Vulcan은 한 사람만을 위한 시스템입니다. 하지만 그 한 사람이 10명의 AI 에이전트(Pantheon)를 팀처럼 운영합니다.

### Q3. OpenClaw이 꺼지면 Vulcan도 꺼지나요?

**A:** 아니요. 독립적입니다. OpenClaw이 꺼지면 Gateway RPC 연결이 끊어지지만, Vulcan UI는 정상 동작합니다. 기존 데이터 열람, 태스크 관리 모두 가능합니다.

### Q4. Vulcan이 꺼지면 Hermes도 멈추나요?

**A:** 아니요. OpenClaw(Hermes)은 Vulcan과 무관하게 독립 실행됩니다.

### Q5. 이건 프로젝트 관리 도구인가요?

**A:** 아니요. Kanban 보드가 있지만 Jira/Linear 대체가 아닙니다. AI 에이전트 팀의 활동을 관찰/제어하고, 에이전트가 수행하는 태스크를 추적하기 위한 도구입니다.

### Q6. 별도 Telegram 봇이 필요한가요?

**A:** 아니요. 기존 Hermes의 Telegram 채널을 활용합니다. Herald Bot(Long Polling)이 중요 이벤트를 Telegram 채널로 알림 전송 + 인라인 키보드 승인을 처리합니다.

### Q7. 에이전트는 몇 명인가요?

**A:** 10명(Pantheon). Hermes(오케스트레이터) 1명 + Tier 2 워커 9명(Aegis, Metis, Athena, Themis, Iris, Daedalus, Nike, Calliope, Argus). 모두 그리스/로마 신화에서 이름을 빌렸습니다.

> 기술/설계 결정 이력은 [DECISIONS.md](DECISIONS.md) 참조

---

## 11. 변경 로그

| 날짜 | 버전 | 내용 |
|------|------|------|
| 2026-03-14 | 4.0 | Pantheon 10인 에이전트 반영. Phase 11+++ 완료. Trace/FinOps, WorkOrder, Feature Flags, Hash Chain, PM Skills, Memory 검색 강화, Office View v2, UI/UX 리뉴얼. 새 템플릿 마이그레이션. |
| 2026-03-10 | 3.0 | Phase 0~10 완료 반영. 기술 스택·데이터 모델·API·기능·운영 전면 현행화. Vault 추가. |
| 2026-03-06 | 2.0 | 양방향 제어 패러다임 전환. Hono 백엔드, PostgreSQL, Gateway RPC, 스킬, 승인 체계 추가 |
| 2026-03-06 | 1.0 | 최초 Product Master 문서 작성 (관찰 전용) |

---

*이 문서는 Vulcan Mission Control 프로젝트의 단일 진실 공급원(Single Source of Truth)입니다. 모든 제품 관련 의사결정은 이 문서를 기준으로 하며, 변경 시 이 문서를 먼저 업데이트합니다.*
