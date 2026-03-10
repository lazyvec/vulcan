# Vulcan Product Master Document (SSOT)

> **문서 목적**: Vulcan Mission Control 제품의 유일한 정의 문서(Single Source of Truth).
> 이 문서 하나로 제품 철학, 시스템 구조, 규칙, 운영 원칙을 완전히 이해할 수 있어야 한다.
>
> **최종 갱신**: 2026-03-10 (v3 — Phase 0~10 완료 반영)

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
- **Vault**: Obsidian 볼트 웹 탐색기 + 에디터 (트리 뷰, 검색, URL 클리핑/딥링크, CodeMirror 6 에디터+툴바, CRUD, 이미지 업로드/D&D, ==highlight==, callout, 코드 구문강조, 첨부파일 서빙, wikilink 네비게이션)

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

**현재 스택 (Phase 10 완료)**:

| 레이어 | 기술 | 비고 |
|--------|------|------|
| 프론트엔드 | Next.js 16 (App Router, React 19) | UI 전용, 포트 3001 |
| 백엔드 | Hono 4 (TypeScript) | REST + WebSocket + BullMQ Worker, 포트 8787 |
| DB | PostgreSQL 17 + Drizzle ORM (pg dialect) | Docker Compose |
| 캐시/큐 | Redis 7 + ioredis + BullMQ | Docker Compose |
| 실시간 | WebSocket (Hono ↔ 프론트엔드) + Redis Pub/Sub | SSE 폴백 |
| OpenClaw 통신 | Gateway WebSocket RPC (ws://127.0.0.1:18789) | 양방향 |
| 스타일 | Tailwind CSS v4 + CSS 변수 디자인 토큰 | |
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

**Vault**:
```
Obsidian 볼트 ↔ NAS WebDAV ↔ rclone bisync (5분 cron) ↔ 서버 로컬 → Hono API
```

### 4.3 데이터 모델 (19개 테이블)

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
| **audit_log** | id, action, entityType, entityId, userId, ts | 모든 mutation 감사 로그 | P3 |

### 4.4 API 엔드포인트 (80개+)

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
| **실시간** | WebSocket /api/ws, SSE /api/stream | 실시간 업데이트 |
| **시스템** | GET /api/health | DB/Redis/Gateway/uptime |

---

## 5. 기능 목록

### 5.1 완료된 기능 (Phase 0~10)

| 기능 | Phase | 설명 |
|------|-------|------|
| **Live Activity Panel** | M0→P6 | WebSocket 실시간 이벤트 피드, 카테고리 필터, 무한 스크롤, 소스 링크 |
| **Office View** | M0 | 에이전트 상태 카드 + 오피스 존 매핑 |
| **Kanban Board** | M0→P4 | 6-lane 태스크 관리 (@dnd-kit), 의존성, 우선순위, 코멘트 |
| **TaskDetailModal** | P4 | 태스크 상세 뷰 (코멘트, 의존성, 태그, 할당) |
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
| **Sidebar Navigation** | M0 | 13개 화면 |
| **PWA** | M0 | manifest, Service Worker |
| **보안** | M0 | Cloudflare Access, CORS, X-Frame-Options |

### 5.2 백로그 (Phase 11~12)

| Phase | 기능 | 설명 |
|-------|------|------|
| 11 | Observability 고도화 | LLM 트래픽 계측, PII 플래그, 감사 추적, 운영 가드레일 |
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
| Office | `/office` | OfficeView + Live Feed | M0 |
| Tasks | `/tasks` | KanbanBoard (6-lane @dnd-kit) + TaskDetailModal | M0→P4 |
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

## 10. 로드맵 요약

> 상세: `docs/ROADMAP.md` | 실행 체크리스트: `docs/WORK_PLAN.md`

| Phase | 핵심 | 상태 |
|-------|------|------|
| **0** | Foundation (모노레포 + 공유 패키지) | ✅ 완료 |
| **1** | PostgreSQL + Redis + Hono 백엔드 | ✅ 완료 |
| **2** | WebSocket + Gateway RPC | ✅ 완료 |
| **3** | 에이전트 생명주기 관리 | ✅ 완료 |
| **4** | 태스크 시스템 고도화 | ✅ 완료 |
| **5** | 스킬 마켓플레이스 | ✅ 완료 |
| **6** | Activity/Audit + 메트릭스 | ✅ 완료 |
| **7** | Telegram 알림 (Herald Bot Long Polling) | ✅ 완료 |
| **8** | 승인/거버넌스 (Telegram 인라인 키보드) | ✅ 완료 |
| **9** | 테스트 + CI/CD | ✅ 완료 |
| **10** | Docker 배포 (인프라 Docker, App PM2) | ✅ 완료 |
| **11** | Observability + Governance 고도화 | 백로그 |
| **12** | agency-agents 레퍼런스 트랙 | 백로그 |

---

## 11. 결정 매트릭스

### 11.1 확정된 결정

| 항목 | 결정 | 근거 |
|------|------|------|
| DB | PostgreSQL 17 (Drizzle ORM pg dialect) | 프로덕션급, 외래키, JSONB, 확장성 |
| 백엔드 | Hono 4 (REST + WebSocket + BullMQ) | WebSocket, 큐, Gateway 연결에 필수 |
| OpenClaw 통신 | Gateway WebSocket RPC | CLI 호출 대비 안정성, 양방향, 실시간 |
| 에이전트 모델 | 단일 Gateway 내 멀티 에이전트 | OpenClaw 아키텍처 |
| 제어 모드 | 이중 (Hermes 위임 + 직접) | 유연성 |
| Telegram | 별도 봇 불필요, 기존 채널 활용 | Hermes 봇이 이미 존재 |
| 실시간 | WebSocket + Redis Pub/Sub (SSE 폴백) | 양방향 통신 필수 |
| 인증 | 없음 (단일 사용자) | Cloudflare Access로 충분 |
| CSS | Tailwind v4 + 디자인 토큰 | 유지 |
| 프로세스 관리 | Docker Compose (PostgreSQL+Redis) + PM2 (App) | 점진적 전환 |
| Vault 동기화 | rclone bisync (NAS WebDAV ↔ 로컬, 5분 cron) | Obsidian 볼트 동기화 |
| 에디터 | CodeMirror 6 (마크다운 에디터 + 툴바 + 단축키) | Vault 편집기 |

### 11.2 미정/결정 필요

| 항목 | 현황 | 옵션 |
|------|------|------|
| Proactive Memory 기술 | 조사 중 | mem0 / supermemory / memU |
| Calendar 구현 방식 | 미정 | 자체 구현 vs 외부 연동 |
| 에이전트 아바타 | placeholder | 픽셀 아트 vs SVG vs AI 생성 |

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

**A:** 아니요. 기존 Hermes의 Telegram 채널을 활용합니다. Herald Bot(Long Polling)이 중요 이벤트를 Telegram 채널로 알림 전송 + 인라인 키보드 승인을 처리합니다.

---

## 13. 변경 로그

| 날짜 | 버전 | 내용 |
|------|------|------|
| 2026-03-10 | 3.0 | Phase 0~10 완료 반영. 기술 스택·데이터 모델·API·기능·운영 전면 현행화. Vault 추가. |
| 2026-03-06 | 2.0 | 양방향 제어 패러다임 전환. Hono 백엔드, PostgreSQL, Gateway RPC, 스킬, 승인 체계 추가 |
| 2026-03-06 | 1.0 | 최초 Product Master 문서 작성 (관찰 전용) |

---

*이 문서는 Vulcan Mission Control 프로젝트의 단일 진실 공급원(Single Source of Truth)입니다. 모든 제품 관련 의사결정은 이 문서를 기준으로 하며, 변경 시 이 문서를 먼저 업데이트합니다.*
