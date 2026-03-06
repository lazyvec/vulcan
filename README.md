<p align="center">
  <img src="public/logo-512.png" alt="Vulcan" width="120" />
</p>

<h1 align="center">Vulcan Mission Control</h1>

<p align="center">
  <strong>The god who forges what the messenger carries.</strong><br/>
  Hermes가 달리는 동안, Vulcan은 화로 앞에서 지켜본다.
</p>

<p align="center">
  <code>Next.js</code> · <code>TypeScript</code> · <code>SQLite + Drizzle</code> · <code>SSE</code> · <code>PWA</code>
</p>

---

## Philosophy

> **Vulcan** — 불과 기술의 신. 올림푸스의 무기는 모두 그의 손에서 태어났다.
> 전장에 나서지 않지만, 전장을 만드는 자. 관찰하고, 벼리고, 넘겨준다.

> **Hermes** — 경계를 넘나드는 전령. 자율적으로 사고하고, 실행하고, 보고한다.
> OpenClaw라는 이름 아래 코드를 쓰고, 조사하고, 동기화하는 에이전트.

Vulcan은 Hermes를 **통제하지 않는다**. 관찰하고, 기록하고, 가시성을 부여할 뿐이다.
에이전트의 자율성은 신성불가침이다. Mission Control은 관제탑이지 조종석이 아니다.

```
Hermes runs.  Vulcan watches.  The human decides.
```

---

## Architecture

```
                          ┌─────────────────────┐
                          │   Vulcan UI (PWA)    │
                          │   Next.js App Router │
                          └──────────┬──────────┘
                                     │ WebSocket / SSE / polling
                          ┌──────────┴──────────┐
                          │    Hono API          │
                          │    + Gateway RPC     │
                          └──────────┬──────────┘
                                     │
                          ┌──────────┴──────────┐
                          │  SQLite + Drizzle    │
                          │  Event / Agent /     │
                          │  Task / Project      │
                          └──────────┬──────────┘
                                     │ ingest
                          ┌──────────┴──────────┐
                          │ gateway-adapter      │
                          │ ws event 정규화       │
                          └──────────┬──────────┘
                                     │
                          ┌──────────┴──────────┐
                          │  Hermes (OpenClaw)   │
                          │  자율 에이전트 런타임   │
                          └─────────────────────┘
```

## Office — 에이전트의 하루

Hermes의 상태는 공간으로 매핑된다. 사무실을 거니는 동료처럼.

| 상태 | 공간 | 의미 |
|------|------|------|
| `idle` | Watercooler | 대기 중, 다음 지시를 기다림 |
| `writing` | Desk | 코드 또는 문서 작성 중 |
| `researching` | Library | 정보 탐색, 분석 중 |
| `executing` | Workbench | 도구 실행, 빌드, 테스트 |
| `syncing` | Hallway | 외부 시스템과 동기화 |
| `error` | Red Corner | 오류 발생, 주의 필요 |

---

## Operations Checklist

운영 점검/복구 기준 문서:
- [`MISSION_CONTROL_CHECKLIST.md`](./MISSION_CONTROL_CHECKLIST.md)

E2E/에이전트 운영 문서:
- [`docs/E2E_PHASE3_REPORT.md`](./docs/E2E_PHASE3_REPORT.md)
- [`docs/E2E_SESSION_SEND_RUNBOOK.md`](./docs/E2E_SESSION_SEND_RUNBOOK.md)
- [`docs/ACCOUNT_ROUTING_POLICY.md`](./docs/ACCOUNT_ROUTING_POLICY.md)
- [`docs/ACCOUNT_STATUS.md`](./docs/ACCOUNT_STATUS.md)
- [`docs/HERMES_OPERATING_PROFILE.md`](./docs/HERMES_OPERATING_PROFILE.md)
- [`docs/AGENT_ROUTING_MATRIX.md`](./docs/AGENT_ROUTING_MATRIX.md)

## Quick Start

```bash
# 개발
pnpm install --prod=false
pnpm seed           # 시드 데이터 생성
pnpm api:dev        # http://127.0.0.1:8787 (Hono API)
pnpm dev            # http://127.0.0.1:3000 (Next.js Web)

# 프로덕션 (PM2)
pnpm build
pm2 startOrReload ecosystem.config.js --env production
# http://127.0.0.1:3001
```

## Scripts

| 명령어 | 설명 |
|--------|------|
| `pnpm dev` | 개발 서버 |
| `pnpm api:dev` | Hono API 개발 서버 |
| `pnpm api:start` | Hono API 서버 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm start` | 프로덕션 서버 |
| `pnpm lint` | ESLint |
| `pnpm seed` | 시드 데이터 |
| `pnpm adapter` | OpenClaw Gateway 이벤트 수집기 |

## API Endpoints

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/health` | 헬스체크 (DB, SSE, uptime, git SHA) |
| `GET` | `/api/stream` | SSE 실시간 이벤트 스트림 |
| `GET` | `/api/events?since=` | 이벤트 폴링 (SSE 폴백) |
| `POST` | `/api/events` | 이벤트 수동 생성 |
| `POST` | `/api/adapter/ingest` | OpenClaw 어댑터 인제스트 |
| `GET` | `/api/agents` | 에이전트 목록 |
| `POST` | `/api/agents/:id/pause` | 에이전트 일시정지 |
| `POST` | `/api/agents/:id/resume` | 에이전트 재개 |
| `GET` | `/api/projects` | 프로젝트 목록 |
| `GET/PATCH` | `/api/tasks` | 태스크 CRUD |
| `GET` | `/api/memory` | 메모리 아이템 |
| `GET` | `/api/docs` | 문서 탐색기 |
| `GET` | `/api/schedule` | 스케줄 목록 |
| `GET` | `/api/gateway/status` | Gateway 연결 상태 |
| `POST` | `/api/gateway/rpc` | Gateway RPC 호출 |
| `GET` | `/api/gateway/sessions` | Gateway 세션 목록 |
| `POST` | `/api/gateway/sessions/send` | Gateway 세션 메시지 전송 |
| `POST` | `/api/gateway/sessions/spawn` | Hermes 경유 세션 위임 전송 |
| `PATCH` | `/api/gateway/config` | Gateway 설정 패치 |
| `GET` | `/api/gateway/cron` | Gateway cron 목록 |
| `GET` | `/api/gateway/cron/status` | Gateway cron 상태 |

## OpenClaw 연동

```bash
# 실전송 — Gateway 이벤트를 Vulcan에 인제스트
pnpm adapter

# dry-run — DB 미삽입, stdout 출력만
ADAPTER_DRY_RUN=1 pnpm adapter
```

어댑터 동작:
1. OpenClaw Gateway WebSocket(`ws://127.0.0.1:18789`) 연결
2. `message / tool_call / error / sync` 이벤트 정규화
3. `POST /api/adapter/ingest`로 전송 → API 저장 후 UI에 실시간 반영

## Environment

`apps/api/.env.example` 참조:

```env
VULCAN_INGEST_URL=http://127.0.0.1:8787/api/adapter/ingest
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=
VULCAN_GATEWAY_SCOPES=operator.admin
ADAPTER_DRY_RUN=1
```

## Stack

| 레이어 | 기술 |
|--------|------|
| Framework | Next.js 16 (App Router) + Hono |
| Language | TypeScript (strict) |
| Database | SQLite + Drizzle ORM |
| Styling | Tailwind CSS v4 + CSS 변수 디자인 토큰 |
| Realtime | WebSocket + SSE fallback |
| Icons | Lucide React |
| Animation | Framer Motion |
| Typography | Geist Sans / Geist Mono |
| PWA | Service Worker + Web App Manifest |
| Deploy | PM2 (self-hosted) |

## Design Tokens

Vulcan의 시각 언어: **Calm Intelligence**

| 토큰 | 값 | 용도 |
|------|-----|------|
| Background | `#0c0a09` | 앱 배경 |
| Surface | `#1c1917` | 카드, 패널 |
| Muted | `#292524` | 호버, 비활성 |
| Border | `#44403c` | 경계선 |
| Accent (Hearth) | `#e07a40` | 포인트, CTA |
| Foreground | `#fafaf9` | 본문 텍스트 |

> Hearth — Vulcan이 다스리는 불. 유일한 따뜻한 색.

## Guardrails

- OpenClaw의 자율성을 침해하지 않는다 (관찰 전용)
- Star-Office-UI 에셋 미사용 (placeholder만)
- Auto-Claude(AGPL) 코드 차용 없음
- Control-plane / 감사 / 정책 / RBAC는 M0 범위 밖

## Roadmap

**M1** — WebSocket 전환, OpenClaw 공식 API 연동, Office 애니메이션 정교화
**M2** — Proactive Memory 실험, 자체 pixel asset, 팀 운영 지표 시각화

---

<p align="center">
  <sub>The forge never sleeps. The messenger never stops.</sub>
</p>
