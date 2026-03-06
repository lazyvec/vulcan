# OPS CHECKLIST (M0+)

운영 점검은 아래 순서로 실행합니다.

## 1) Runtime Facts

```bash
cd /home/linuxuser/projects/vulcan
pm2 ls
pm2 describe vulcan-mc
pm2 describe vulcan-adapter
curl -sS http://127.0.0.1:3001/api/tasks | head
curl -sS http://127.0.0.1:3001/api/stream -N --max-time 2 || true
curl -sS http://127.0.0.1:3001/api/health
```

기대 결과:
- `vulcan-mc`, `vulcan-adapter` 모두 `online`
- `/api/tasks` JSON 응답
- `/api/stream`에서 `data:` 이벤트 또는 `event: ready`
- `/api/health`에서 `"ok":true`

## 2) Env/Port Wiring

```bash
cd /home/linuxuser/projects/vulcan
cat .env.example
rg -n "PORT|VULCAN_INGEST_URL|OPENCLAW_LOG" ecosystem.config.js
```

기대 결과:
- `PORT=3001`
- `VULCAN_INGEST_URL=http://127.0.0.1:3001/api/adapter/ingest`
- adapter env에 `OPENCLAW_LOG_DIR` 또는 `OPENCLAW_LOG_FILE` 존재

## 3) Git + Secrets Hygiene

```bash
cd /home/linuxuser/projects/vulcan
git status
rg -n --hidden --glob '!.git' --glob '!node_modules' --glob '!.next' "(API_KEY|SECRET|TOKEN)=" .
```

기대 결과:
- `.env` 파일이 tracked 상태가 아님
- 민감 키 하드코딩 문자열 미검출

## 4) Adapter Liveness

```bash
cd /home/linuxuser/projects/vulcan
pm2 logs vulcan-adapter --lines 60 --nostream
```

기대 결과:
- `[adapter] starting -> .../api/adapter/ingest`
- `[adapter] sent N event(s)` 주기적 출력
- `ingest unavailable`가 지속적으로 반복되지 않음

## 5) Domain Health

```bash
curl -sS https://vulcan.yomacong.com/api/health
curl -sS https://vulcan.yomacong.com/api/stream -N --max-time 3 | head
```

기대 결과:
- 도메인 health가 localhost와 동일하게 `ok:true`
- 도메인 SSE에서도 `data:` 이벤트 확인

## 6) PM2 Persistence

```bash
cd /home/linuxuser/projects/vulcan
pm2 startOrReload ecosystem.config.js --env production
pm2 save
pm2 ls
```

기대 결과:
- 재시작 후에도 `vulcan-mc`, `vulcan-adapter` online 유지

## 7) Reverse Proxy SSE (선택)

현재는 Cloudflared 경유 구성이므로 웹서버(Nginx/Caddy) 직접 설정이 필수는 아닙니다.
직접 프록시를 둘 경우에는 SSE 버퍼링을 꺼야 합니다.

Nginx 예시:
- `proxy_buffering off;`
- `proxy_http_version 1.1;`
- `proxy_read_timeout`을 충분히 크게 설정
