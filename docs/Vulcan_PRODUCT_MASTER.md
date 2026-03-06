# Vulcan Product Master Document (SSOT)

> **문서 목적**: Vulcan Mission Control 제품의 유일한 정의 문서(Single Source of Truth).
> 이 문서 하나로 제품 철학, 시스템 구조, 규칙, 운영 원칙을 완전히 이해할 수 있어야 한다.
>
> **최종 갱신**: 2026-03-06 (v2 — 양방향 제어 패러다임 전환)

---

## 1. 제품 정의

### 1.1 한 줄 정의

**OpenClaw 에이전트 팀을 관찰하고 제어하며, 한 사람의 일상·작업·기억을 한눈에 조망하고 오케스트레이션하는 개인 전용 Mission Control.**

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
- 에이전트 상태를 오피스 메타포로 시각화 (Desk, Library, Workbench 등)
- **에이전트 생명주기 관리** (생성, 삭제, 일시정지, 재시작, 설정 변경)
- **이중 제어 모드**: Hermes 경유 위임 + 각 에이전트 직접 제어
- **스킬 관리** (에이전트에 스킬 설치/제거/조회)
- 태스크 관리 (Kanban 보드, 의존성, 우선순위, 에이전트 할당)
- 프로젝트 진행률 추적
- 메모리(Journal + Long-term) 열람
- 문서(Docs) 열람 및 검색
- 스케줄(cron/interval) 현황 조회
- **승인/거버넌스** (민감한 에이전트 작업에 human-in-the-loop 승인)
- **Telegram 알림** (중요 이벤트를 기존 Hermes 채널로 통보)
- **메트릭스/분석** (에이전트 처리량, 태스크 사이클 타임 등)
- OpenClaw Gateway RPC를 통한 양방향 통신

**Vulcan이 하지 않는 것:**
- RBAC, 멀티테넌시, 팀 기능 (단일 사용자)
- 외부 사용자 인증 (Cloudflare Access로 충분)
- 범용 프로젝트 관리 도구 (Jira/Linear 대체가 아님)
- 별도 Telegram 봇 구축 (기존 Hermes 봇 활용)

### 1.5 관계도: OpenClaw ↔ Vulcan

```
┌─────────────────────────────────────────────────────────┐
│                  OpenClaw Gateway                       │
│              ws://127.0.0.1:18789                       │
│                                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐ │
│  │ Hermes  │  │  Vesta  │  │  Atlas  │  │Lyra/Aegis│ │
│  │(오케스트│  │(계획/   │  │(인프라) │  │(기억/QA) │ │
│  │ 레이터) │  │ 문서)   │  │         │  │          │ │
│  └────┬────┘  └─────────┘  └─────────┘  └──────────┘ │
│       │                                                 │
│  sessions_spawn / sessions_send (에이전트 간 통신)      │
│                                                         │
│  ── WebSocket RPC API ──                                │
│  agents.* | chat.* | sessions.* | config.* | cron.*     │
└────────────────────┬────────────────────────────────────┘
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

### 2.2 에이전트

에이전트는 Vulcan을 통해 관찰하고 제어하는 대상이다. 단일 OpenClaw Gateway 내에서 격리된 컨텍스트로 실행된다.

| 에이전트 | 역할 | 미션 | 계층 |
|----------|------|------|------|
| **Hermes** | executor, chat, ops, orchestrator | 사용자의 분신. 대화·실행·하위 에이전트 위임 | **주 에이전트** |
| **Vesta** | planner, docs | 작업 분해 및 문서 정합성 유지 | Hermes 하위 |
| **Atlas** | infra, deploy | 런타임/인프라 상태 안정화 | Hermes 하위 |
| **Lyra** | memory, search | 기억 레이어 관리 및 검색 보조 | Hermes 하위 |
| **Aegis** | qa, verification | 검증 루프 유지 및 실패 분석 | Hermes 하위 |

**제어 흐름**:
- 기본: 사용자 → Vulcan → Hermes → `sessions_spawn` → 하위 에이전트
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
| **Hermes** | OpenClaw의 주 에이전트이자 오케스트레이터. 그리스 신화의 전령신. 사용자의 분신 | 사용자의 지시를 받아 하위 에이전트를 조율 |
| **Vesta** | 작업 분해·문서 관리 에이전트. 로마 신화의 화로의 여신 | |
| **Atlas** | 인프라·배포 에이전트. 그리스 신화의 거인 | |
| **Lyra** | 기억·검색 에이전트. 그리스 신화의 수금자리 | |
| **Aegis** | QA·검증 에이전트. 그리스 신화의 방패 | |
| **OpenClaw** | 자율 AI 에이전트 런타임 시스템 | Vulcan과 별개의 독립 시스템 |
| **Gateway** | OpenClaw의 중앙 제어 플레인. 단일 Node.js 프로세스 내에 모든 에이전트를 호스팅 | `ws://127.0.0.1:18789` |
| **Gateway RPC** | Gateway의 WebSocket RPC API. `agents.*`, `chat.*`, `sessions.*` 등 네임스페이스 | Vulcan ↔ OpenClaw 양방향 통신 경로 |
| **sessions_spawn** | 에이전트가 다른 에이전트에게 태스크를 위임하는 RPC 호출 | Hermes → 하위 에이전트 위임에 사용 |
| **sessions_send** | 에이전트 간 직접 메시지 교환 (동기 핑퐁) | 최대 5턴 |
| **Hearth** | Vulcan의 시그니처 액센트 컬러(`#e07a40`). 대장간의 화로에서 유래 | UI 포인트, CTA, active 상태에만 사용 |
| **Warm Obsidian** | Vulcan의 디자인 톤. 어둡지만 차갑지 않은 | 네온/사이버펑크와 구별 |
| **Office Metaphor** | 에이전트 상태를 사무실 공간으로 시각화하는 패턴 | |
| **Lane** | 칸반 보드의 열 | `backlog/queued/in_progress/review/done/archived` |
| **Journal** | 단기 메모리. 세션별 기록 | |
| **Long-term Memory** | 장기 메모리. 누적 컨텍스트, 학습된 패턴 | |
| **Signal** | 에이전트 활동의 최소 단위. 이벤트 한 건 | |

---

## 4. 시스템 구조

### 4.1 기술 스택

**현재 (M0)**:

| 레이어 | 기술 | 선택 이유 |
|--------|------|----------|
| 프레임워크 | Next.js 16 (App Router) | 풀스택 단일 서버 |
| 런타임 | React 19 | 서버 컴포넌트 |
| 언어 | TypeScript 5.9 (strict) | 타입 안전성 |
| DB | SQLite (better-sqlite3) + Drizzle ORM | 초기 단순성 |
| 스타일 | Tailwind CSS v4 + CSS 변수 | 디자인 토큰 기반 |
| 실시간 | SSE (Server-Sent Events) | 초기 단순성 |
| 프로세스 | PM2 | 자동 재시작 |

**목표 (Phase 1~):**

| 레이어 | 기술 | 전환 Phase |
|--------|------|-----------|
| 프론트엔드 | Next.js 16 (UI 전용) | Phase 1 |
| 백엔드 | **Hono** (TypeScript) | Phase 1 |
| DB | **PostgreSQL** + Drizzle ORM (pg dialect) | Phase 1 |
| 캐시/큐 | **Redis** + ioredis + **BullMQ** | Phase 1 |
| 실시간 | **WebSocket** (Hono ↔ 프론트엔드) | Phase 2 |
| OpenClaw 통신 | **Gateway WebSocket RPC** | Phase 2 |
| 테스트 | Vitest + Playwright | Phase 9 |
| 배포 | **Docker Compose** | Phase 10 |

### 4.2 데이터 플로우

**현재 (M0) — 단방향 관찰:**
```
OpenClaw (Hermes 실행)
  ↓ 로그 파일 (/tmp/openclaw/*.log)
  ↓
adapter-openclaw (2초 폴링)
  ↓
POST /api/adapter/ingest → SQLite → SSE → UI
```

**목표 (Phase 2~) — 양방향 제어:**
```
사용자
  ↓ Vulcan GUI (Next.js)
  ↓ WebSocket
  ↓
Hono API (백엔드)
  ├── PostgreSQL (영속 저장)
  ├── Redis Pub/Sub (실시간 팬아웃)
  ├── BullMQ (비동기 커맨드 큐)
  └── Gateway RPC Client ←WebSocket→ OpenClaw Gateway
                                         │
                                    ┌────┼────┐
                                    ▼    ▼    ▼
                                 Hermes Vesta Atlas ...
```

### 4.3 데이터 모델

**현재 (M0) — 7개 테이블:**

| 테이블 | 핵심 필드 | 역할 |
|--------|----------|------|
| **agents** | id, name, roleTags[], status, statusSince, lastSeenAt | 에이전트 프로필 + 실시간 상태 |
| **projects** | id, name, status, progress, priority, ownerAgentId | 프로젝트 추적 |
| **tasks** | id, projectId, title, assigneeAgentId, lane | 칸반 태스크 |
| **events** | id, ts, source, agentId, type, summary, payloadJson | 이벤트 로그 |
| **memory_items** | id, container, title, content, tags[] | 기억 저장소 |
| **docs** | id, title, tags[], format, content | 문서 저장소 |
| **schedules** | id, name, cronOrInterval, status, ownerAgentId | 스케줄 |

**목표 — 추가 테이블 (Phase 3~):**

| 테이블 | Phase | 역할 |
|--------|-------|------|
| **gateways** | 3 | OpenClaw Gateway 연결 정보 |
| **agent_commands** | 3 | 에이전트 커맨드 이력 (큐잉, 결과) |
| **audit_log** | 3 | 모든 mutation 감사 로그 |
| **task_dependencies** | 4 | 태스크 간 의존성 |
| **task_comments** | 4 | 태스크 코멘트 |
| **boards** | 4 | 태스크 그룹핑 |
| **skills** | 5 | 스킬 메타데이터 |
| **agent_skills** | 5 | 에이전트-스킬 매핑 |
| **notification_preferences** | 7 | 알림 설정 |
| **approvals** | 8 | 승인 요청 |
| **approval_policies** | 8 | 승인 정책 |

### 4.4 API 엔드포인트

**현재 (M0):**

| Method | Path | 역할 |
|--------|------|------|
| GET | `/api/agents` | 에이전트 목록 |
| GET | `/api/projects` | 프로젝트 목록 |
| GET | `/api/tasks` | 태스크 목록 (lane/q 필터) |
| PATCH | `/api/tasks/:id` | 태스크 lane 변경 |
| GET | `/api/events` | 이벤트 목록 (since 필터) |
| POST | `/api/events` | 이벤트 추가 |
| GET | `/api/stream` | SSE 실시간 스트림 |
| POST | `/api/adapter/ingest` | 어댑터 이벤트 수집 |
| GET | `/api/memory` | 메모리 항목 |
| GET | `/api/docs` | 문서 검색 |
| GET | `/api/schedule` | 스케줄 목록 |
| GET | `/api/health` | 시스템 상태 |

**목표 — 추가 엔드포인트 (Phase 3~):**

| Method | Path | Phase | 역할 |
|--------|------|-------|------|
| POST | `/api/agents` | 3 | 에이전트 생성 |
| PUT | `/api/agents/:id` | 3 | 설정 수정 |
| DELETE | `/api/agents/:id` | 3 | 비활성화 |
| POST | `/api/agents/:id/delegate` | 3 | Hermes 경유 위임 |
| POST | `/api/agents/:id/command` | 3 | 직접 제어 |
| POST | `/api/agents/:id/pause` | 3 | 일시정지 |
| POST | `/api/agents/:id/resume` | 3 | 재개 |
| POST | `/api/tasks/:id/assign` | 4 | 에이전트 할당 |
| POST | `/api/tasks/:id/comment` | 4 | 코멘트 |
| POST | `/api/tasks/:id/deps` | 4 | 의존성 |
| GET | `/api/skills` | 5 | 스킬 목록 |
| POST | `/api/agents/:id/skills` | 5 | 스킬 설치 |
| GET | `/api/activity` | 6 | Activity 피드 |
| GET | `/api/approvals` | 8 | 승인 목록 |
| POST | `/api/approvals/:id/approve` | 8 | 승인 |

---

## 5. 기능 목록

### 5.1 M0 (완료)

| 기능 | 상태 | 설명 |
|------|------|------|
| **Live Activity Panel** | ✅ | SSE 기반 실시간 이벤트 피드 |
| **Office View** | ✅ | 에이전트 상태 카드 + 오피스 존 매핑 |
| **Kanban Board** | ✅ | 3-lane 태스크 관리 |
| **Memory Board** | ✅ | Journal + Long-term 메모리 열람 |
| **Docs Explorer** | ✅ | 문서 목록 + 뷰어 |
| **Sidebar Navigation** | ✅ | 7개 화면 |
| **OpenClaw Adapter** | ✅ | 로그 폴링, 이벤트 분류, 중복 제거 |
| **PWA** | ✅ | manifest, Service Worker, 오프라인 캐시 |
| **보안 헤더** | ✅ | CORS, X-Frame-Options 등 |
| **Health Endpoint** | ✅ | DB, SSE, uptime, git SHA |

### 5.2 Phase 0~3: 인프라 + 양방향 제어 (계획)

| Phase | 기능 | 설명 |
|-------|------|------|
| 0 | 모노레포 + 공유 패키지 | pnpm 워크스페이스, 타입 공유, Drizzle 마이그레이션 |
| 1 | PostgreSQL + Redis + Hono | DB 전환, 백엔드 분리, Redis Pub/Sub |
| 2 | WebSocket + Gateway RPC | SSE → WebSocket, OpenClaw 직접 연결 |
| 3 | 에이전트 생명주기 관리 | CRUD, 이중 제어, 커맨드 큐, 감사 로깅 |

### 5.3 Phase 4~8: 기능 고도화 (계획)

| Phase | 기능 | 설명 |
|-------|------|------|
| 4 | 태스크 고도화 | 의존성, 우선순위, 6-lane, DnD, 코멘트 |
| 5 | 스킬 마켓플레이스 | 스킬 조회/설치/제거, Gateway 동기화 |
| 6 | Activity/Audit + 메트릭스 | 이벤트 15종+, 대시보드, 차트 |
| 7 | Telegram 알림 | 기존 채널로 중요 이벤트 알림 |
| 8 | 승인/거버넌스 | human-in-the-loop, 자동 승인 타임아웃 |

### 5.4 Phase 9~10: 품질 + 배포 (계획)

| Phase | 기능 | 설명 |
|-------|------|------|
| 9 | 테스트 + CI/CD | Vitest, Playwright, GitHub Actions |
| 10 | Docker 배포 | Docker Compose, PM2 대체 |

### 5.5 Out of Scope (유지)

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

### 6.3 시스템 보호

| 규칙 | 설명 |
|------|------|
| PM2/Docker 프로세스 조작은 사용자 확인 필수 | restart, stop, delete |
| Drizzle 스키마 변경 시 마이그레이션 계획 먼저 | 스키마 수정 전 계획 제시 |
| Gateway RPC 연결 변경 시 호환성 확인 | 프로토콜 버전, 핸드셰이크 |

### 6.4 OpenClaw 통신 규칙

| 규칙 | 설명 |
|------|------|
| Gateway RPC가 주 통신 경로 | CLI 호출이 아닌 WebSocket RPC 사용 |
| 커맨드는 항상 큐잉 | 동기 실행 아닌 BullMQ 큐 경유 (재시도, 감사, 타임아웃) |
| 모든 mutation 감사 로깅 | 에이전트 제어, 태스크 변경 등 기록 |
| OpenClaw 독립성 존중 | Vulcan이 꺼져도 OpenClaw은 정상 동작해야 함 |

---

## 7. UI 구조

### 7.1 화면 구성

| 화면 | 경로 | 핵심 컴포넌트 | Phase |
|------|------|--------------|-------|
| Tasks | `/tasks` | KanbanBoard + LiveActivityPanel | M0 |
| Calendar | `/calendar` | 스케줄 뷰 | M0 |
| Projects | `/projects` | 프로젝트 목록 | M0 |
| Memory | `/memory` | MemoryBoard | M0 |
| Docs | `/docs` | DocsExplorer | M0 |
| Team | `/team` | 에이전트 프로필 + **제어 패널** | M0 → Phase 3 확장 |
| Office | `/office` | OfficeView + Live Feed | M0 |
| **Skills** | `/skills` | 스킬 마켓플레이스 | Phase 5 |
| **Analytics** | `/analytics` | 메트릭스 대시보드 | Phase 6 |
| **Approvals** | `/approvals` | 승인 대기 목록 | Phase 8 |

### 7.2 레이아웃

- **Shell**: 260px 고정 Sidebar + 1fr 콘텐츠 영역
- **모바일**: Sidebar 슬라이드 인/아웃 + 오버레이
- **반응형 분기**: 980px (2-col → 1-col)

---

## 8. KPI 및 메트릭스

| 지표 | 측정 방법 | 의미 |
|------|----------|------|
| **WebSocket 연결 수** | Health endpoint | 실시간 연결 상태 |
| **DB 레코드 수** | Health endpoint | 데이터 축적량 |
| **Gateway RPC 상태** | Health endpoint | OpenClaw 연결 건전성 |
| **에이전트 처리량** | 일/주 단위 태스크 완료 수 | 팀 생산성 (Phase 6) |
| **태스크 사이클 타임** | backlog → done 평균 시간 | 효율성 (Phase 6) |
| **커맨드 성공률** | 성공/실패 비율 | 제어 안정성 (Phase 6) |
| **Uptime** | Health endpoint | 서비스 안정성 |

---

## 9. 운영

### 9.1 프로세스 (현재)

| 프로세스 | PM2 이름 | 역할 |
|----------|----------|------|
| Next.js 서버 | `vulcan-mc` | 웹 UI + API (포트 3001) |
| 어댑터 | `vulcan-adapter` | OpenClaw 로그 폴링 |

### 9.2 프로세스 (목표, Phase 1+)

| 프로세스 | 역할 |
|----------|------|
| Next.js (web) | UI 전용 |
| Hono (api) | REST + WebSocket + Gateway RPC |
| BullMQ Worker | 커맨드 큐, 알림, 헬스체크 |
| PostgreSQL | 데이터 저장 |
| Redis | Pub/Sub, 큐 |

### 9.3 도메인

- 프로덕션: `https://vulcan.yomacong.com`
- 로컬: `http://127.0.0.1:3001`
- Cloudflared 터널 경유

---

## 10. 로드맵 요약

> 상세: `docs/ROADMAP.md` | 실행 체크리스트: `docs/WORK_PLAN.md`

| Phase | 핵심 | 복잡도 | 상태 |
|-------|------|--------|------|
| **M0** | 관찰 대시보드, SSE, 칸반, 메모리, 문서, PWA | - | ✅ 완료 |
| **0** | Foundation (모노레포 + 공유 패키지) | M | 대기 |
| **1** | PostgreSQL + Redis + Hono 백엔드 | L | 대기 |
| **2** | WebSocket + Gateway RPC | M | 대기 |
| **3** | 에이전트 생명주기 관리 | XL | 대기 |
| **4** | 태스크 시스템 고도화 | L | 대기 |
| **5** | 스킬 마켓플레이스 | L | 대기 |
| **6** | Activity/Audit + 메트릭스 | M | 대기 |
| **7** | Telegram 알림 | S | 대기 |
| **8** | 승인/거버넌스 | M | 대기 |
| **9** | 테스트 + CI/CD | M | 대기 |
| **10** | Docker 배포 | M | 대기 |

---

## 11. 결정 매트릭스

### 11.1 확정된 결정

| 항목 | 결정 | 근거 |
|------|------|------|
| DB | PostgreSQL (Phase 1 전환) | 프로덕션급, 외래키, JSONB, 확장성 |
| 백엔드 | Hono (TypeScript, 분리) | WebSocket, 큐, Gateway 연결에 필수 |
| OpenClaw 통신 | Gateway WebSocket RPC | CLI 호출 대비 안정성, 양방향, 실시간 |
| 에이전트 모델 | 단일 Gateway 내 멀티 에이전트 | OpenClaw 아키텍처 |
| 제어 모드 | 이중 (Hermes 위임 + 직접) | 유연성 |
| Telegram | 별도 봇 불필요, 기존 채널 활용 | Hermes 봇이 이미 존재 |
| 실시간 | WebSocket (Phase 2 전환) | 양방향 통신 필수 |
| 인증 | 없음 (단일 사용자) | Cloudflare Access로 충분 |
| CSS | Tailwind v4 + 디자인 토큰 | 유지 |
| 프로세스 관리 | PM2 → Docker Compose (Phase 10) | 점진적 전환 |

### 11.2 미정/결정 필요

| 항목 | 현황 | 옵션 |
|------|------|------|
| Proactive Memory 기술 | 조사 중 | mem0 / supermemory / memU |
| Calendar 구현 방식 | 미정 | 자체 구현 vs 외부 연동 |
| 에이전트 아바타 | placeholder | 픽셀 아트 vs SVG vs AI 생성 |
| 승인 정책 세부 | Phase 8 | 어떤 작업에 승인 필요한지 |
| 스킬 레지스트리 소스 | Phase 5 | Git URL vs OpenClaw 공식 |

---

## 12. 오해 방지 FAQ

### Q1. Vulcan은 에이전트를 컨트롤하나요?

**A:** 네. Vulcan v2부터 완전한 양방향 제어를 지원합니다. 에이전트 생성/삭제/일시정지/재시작, 태스크 할당, 스킬 관리 등이 가능합니다. 기본적으로 Hermes를 통해 위임하며, 필요시 직접 제어도 가능합니다.

### Q2. 여러 명이 사용할 수 있나요?

**A:** 아니요. Vulcan은 한 사람만을 위한 시스템입니다. 하지만 그 한 사람이 여러 AI 에이전트를 팀처럼 운영합니다.

### Q3. OpenClaw이 꺼지면 Vulcan도 꺼지나요?

**A:** 아니요. 독립적입니다. OpenClaw이 꺼지면 Gateway RPC 연결이 끊어지지만, Vulcan UI는 정상 동작합니다. 기존 데이터 열람, 태스크 관리 모두 가능합니다.

### Q4. Vulcan이 꺼지면 Hermes도 멈추나요?

**A:** 아니요. OpenClaw(Hermes)은 Vulcan과 무관하게 독립 실행됩니다.

### Q5. 이건 프로젝트 관리 도구인가요?

**A:** 아니요. Kanban 보드가 있지만 Jira/Linear 대체가 아닙니다. AI 에이전트 팀의 활동을 관찰/제어하고, 에이전트가 수행하는 태스크를 추적하기 위한 도구입니다.

### Q6. 별도 Telegram 봇이 필요한가요?

**A:** 아니요. 기존 Hermes의 Telegram 채널을 활용합니다. Vulcan은 중요 이벤트를 해당 채널로 알림만 전송합니다.

---

## 13. 변경 로그

| 날짜 | 버전 | 내용 |
|------|------|------|
| 2026-03-06 | 2.0 | 양방향 제어 패러다임 전환. Hono 백엔드, PostgreSQL, Gateway RPC, 스킬, 승인 체계 추가 |
| 2026-03-06 | 1.0 | 최초 Product Master 문서 작성 (관찰 전용) |

---

*이 문서는 Vulcan Mission Control 프로젝트의 단일 진실 공급원(Single Source of Truth)입니다. 모든 제품 관련 의사결정은 이 문서를 기준으로 하며, 변경 시 이 문서를 먼저 업데이트합니다.*
