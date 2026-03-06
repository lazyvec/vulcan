# Vulcan M0 Architecture

## Data Flow

OpenClaw
→ `scripts/adapter-openclaw.mjs` (poll + parse + rate-limit + dry-run)
→ `POST /api/adapter/ingest`
→ SQLite(Event/Task/Agent 상태 반영)
→ `GET /api/stream` (SSE push)
→ UI Live Activity / Office 상태 업데이트

폴백: `GET /api/events?since=`

## Components

- `vulcan-ui`: Next.js App Router 화면
- `vulcan-api`: Route Handlers
- `adapter-openclaw`: OpenClaw 로그 기반 최소 신호 수집
- `store`: SQLite + Drizzle

## M0 Schema

- Agent(id, name, roleTags[], mission, avatarKey, status, statusSince, lastSeenAt)
- Project(id, name, status, progress, priority, ownerAgentId, updatedAt)
- Task(id, projectId, title, assigneeAgentId, lane, createdAt, updatedAt)
- Event(id, ts, source, agentId, projectId, taskId, type, summary, payloadJson)
- MemoryItem(id, container, title, content, tags[], sourceRef, createdAt)
- Doc(id, title, tags[], format, content, createdAt, updatedAt)
- Schedule(id, name, cronOrInterval, status, lastRunAt, nextRunAt, ownerAgentId)

## Status Standard

- idle
- writing
- researching
- executing
- syncing
- error

Office 상태-공간 매핑:
- idle -> Watercooler
- writing -> Desk
- researching -> Library
- executing -> Workbench
- syncing -> Hallway
- error -> Red Corner

## API Endpoints (M0)

- `GET /api/agents`
- `GET /api/projects`
- `GET /api/tasks`
- `PATCH /api/tasks/:id`
- `GET /api/events`
- `POST /api/events`
- `GET /api/stream`
- `GET /api/health`
- `POST /api/adapter/ingest`
- `GET /api/memory`
- `GET /api/docs`
- `GET /api/schedule`

## Runtime Notes (M0+)

- SSE endpoint는 `X-Accel-Buffering: no`를 강제해 reverse proxy 버퍼링을 피합니다.
- health endpoint는 `dbOk`, `sseSubscribers`, `records`, `uptimeMs`, `gitSha`를 제공합니다.
- adapter는 `OPENCLAW_LOG_FILE` 우선, 없으면 `OPENCLAW_LOG_DIR`/기본 경로 자동 탐색을 사용합니다.
