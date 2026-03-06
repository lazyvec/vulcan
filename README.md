# Vulcan Mission Control (M0+)

Vulcan은 OpenClaw의 자율성을 유지한 채, 작업/상태/이벤트를 시각적으로 운영하기 위한 Mission Control GUI입니다.

## 핵심 구성

- Next.js App Router + TypeScript
- Warm Obsidian 토큰 + Geist Sans/Mono
- SQLite + Drizzle ORM
- SSE(`GET /api/stream`) + 폴백 polling(`GET /api/events?since=...`)
- OpenClaw 로그 기반 adapter(`scripts/adapter-openclaw.mjs`)

## 로컬 실행

```bash
cd /home/linuxuser/projects/vulcan
npm install
npm run seed
npm run dev
```

- 개발 URL: `http://127.0.0.1:3000`

## 서버 실행(PM2)

```bash
cd /home/linuxuser/projects/vulcan
npm install --include=dev
npm run build
pm2 startOrReload ecosystem.config.js --env production
pm2 save
```

- 운영 URL: `http://127.0.0.1:3001`
- 공개 URL: `https://vulcan.yomacong.com`

## 스크립트

```bash
npm run dev
npm run lint
npm run build
npm run start
npm run seed
npm run adapter
```

## 환경변수

`.env.example` 기준:

- `PORT=3001`
- `VULCAN_INGEST_URL=http://127.0.0.1:3001/api/adapter/ingest`
- `OPENCLAW_LOG_DIR=/tmp/openclaw`
- `OPENCLAW_LOG_FILE=` (특정 로그 파일 강제 지정 시 사용)
- `ADAPTER_DRY_RUN=1` (전송 없이 이벤트 출력)

## API 엔드포인트

- `GET /api/health`
- `GET /api/stream`
- `GET /api/events?since=...`
- `POST /api/events`
- `POST /api/adapter/ingest`
- `GET /api/tasks`
- `PATCH /api/tasks/:id`
- `GET /api/projects`
- `GET /api/agents`
- `GET /api/memory`
- `GET /api/docs`
- `GET /api/schedule`

## OpenClaw 연동

```bash
# 실전송
npm run adapter

# dry-run (DB 미삽입)
ADAPTER_DRY_RUN=1 npm run adapter
```

기본 동작:
- `/tmp/openclaw` 또는 `~/.openclaw*/logs`의 `openclaw-*.log` 자동 탐색
- `message / tool_call / error / sync` 이벤트 정규화
- `VULCAN_INGEST_URL`로 ingest 후 UI Live Activity/Office에 반영

## 가드레일

- Star-Office-UI 에셋 미사용(placeholder만 사용)
- Auto-Claude(AGPL) 코드 차용 없음
- Control-plane/감사/정책/RBAC는 M0+ 범위에 포함하지 않음
