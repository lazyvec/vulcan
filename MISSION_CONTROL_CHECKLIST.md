# Vulcan Mission Control - 운영 체크리스트

> 목적: Vulcan + OpenClaw + 인프라 운영을 빠르게 점검/복구하기 위한 실전 가이드
> 갱신일: 2026-03-10

## 0) 기본 원칙
- 허브 레포: `vulcan` (pnpm 모노레포: apps/web, apps/api, packages/shared)
- 보고 방식: 시작/중간/완료 단계별 짧은 보고
- 파괴적 작업은 사용자 확인 필수 (PM2 재시작, DB 마이그레이션, Docker 재시작)

## 1) 인프라 점검

### 1-1. Docker 인프라 (PostgreSQL + Redis)
```bash
cd ~/projects/vulcan && pnpm infra:up    # 시작
docker compose ps                          # 상태 확인
docker compose logs --tail=20             # 최근 로그
```
- PostgreSQL: 포트 5432
- Redis: 포트 6379

### 1-2. PM2 프로세스
```bash
pm2 status                                 # 전체 상태
pm2 logs vulcan-api --lines 20            # API 로그
pm2 logs vulcan-mc --lines 20             # Web 로그
```
| 프로세스 | PM2 이름 | 포트 | 역할 |
|----------|----------|------|------|
| Hono API | `vulcan-api` | 8787 | REST + WebSocket + BullMQ Worker |
| Next.js | `vulcan-mc` | 3001 | UI |
| 어댑터 | `vulcan-adapter` | - | Gateway 어댑터 |

### 1-3. Cloudflare Tunnel
```bash
systemctl --user status cloudflared        # 터널 상태
# 설정: ~/.cloudflared/config.yml
```
- 프로덕션: `https://vulcan.yomacong.com`
- Tailscale: `https://vulcan.tail9732fd.ts.net`

### 1-4. Vault 동기화 (rclone bisync)
```bash
# 동기화 상태 확인
tail -5 ~/logs/vault-bisync.log

# 수동 동기화
~/scripts/vault-bisync.sh

# cron 확인 (5분 간격)
crontab -l | grep vault
```
- NAS: `http://lazyvec-nas:5005/Obsidian/` (WebDAV)
- 로컬: `~/ObsidianVault/lazyvec/`
- 설정: `~/.config/rclone/rclone.conf`

## 2) OpenClaw 점검

### 2-1. 런타임/게이트웨이 상태
```bash
openclaw status
openclaw gateway status
```
확인 포인트:
- Runtime: `running`
- RPC probe: `ok`
- Gateway listening: `127.0.0.1:18789`

### 2-2. 채널 상태
`openclaw status`의 Channels 섹션:
- Telegram: `Enabled=ON`, `State=OK`
- ackReactionScope: `all` (DM 리액션 필수)
- reactionLevel: `extensive`
- inlineButtons: `all`

### 2-3. 보안/설정 경고
`openclaw status`의 Doctor warnings / Security audit 확인.

## 3) 장애 대응

### 3-1. Vulcan 서비스 재시작
```bash
# API만 재시작
pm2 restart vulcan-api

# 전체 재시작
pm2 restart all

# 인프라 재시작 (DB+Redis)
cd ~/projects/vulcan && pnpm infra:down && pnpm infra:up
```

### 3-2. OpenClaw 재시작
```bash
openclaw gateway restart
openclaw gateway status
openclaw status
```

### 3-3. 로그 확인
```bash
# Vulcan API
pm2 logs vulcan-api --lines 50

# OpenClaw
openclaw logs --follow

# Vault 동기화
cat ~/logs/vault-bisync.log
```

## 4) 개발 명령어

```bash
cd ~/projects/vulcan

# 개발 서버
pnpm dev              # Next.js (localhost:3000)
pnpm api:dev          # Hono API (localhost:8787)

# 테스트
pnpm test             # Vitest
pnpm test:smoke       # Playwright (16개)

# 빌드/린트
pnpm build            # 프로덕션 빌드
pnpm lint             # ESLint

# DB
pnpm seed             # 시드 데이터

# 어댑터
pnpm adapter          # Gateway 어댑터
```

## 5) 변경 작업 전/후 체크

### 작업 전
- [ ] 영향 범위 확인
- [ ] `git add -A && git commit -m "chore: 체크포인트"` (롤백 포인트)
- [ ] 사용자 승인 필요 작업 여부 확인

### 작업 후
- [ ] `pnpm lint && pnpm build` 통과
- [ ] `pm2 status` 정상
- [ ] API health: `curl localhost:8787/api/health`
- [ ] 변경점/결과/다음 할 일 보고
