# ACCEPTANCE CHECKLIST (M0+)

아래를 순서대로 실행하고, 기대 결과를 만족하면 M0+ 완료입니다.

## 1) Static Checks

```bash
cd /home/linuxuser/projects/vulcan
pm2 flush
npm run lint
npm run build
npm run seed
```

기대 결과:
- pm2 로그 파일이 비워져 기준점 생성
- lint 성공
- build 성공
- seed 로그에 `[seed] complete`

## 2) Playwright Smoke (6 tests: desktop+mobile)

```bash
cd /home/linuxuser/projects/vulcan
npx playwright install chromium
npm run test:smoke
```

기대 결과:
- 총 6개 테스트 통과
- desktop viewport 3개 + mobile viewport 3개

## 3) Health + Data API

```bash
curl -sS http://127.0.0.1:3001/api/health
curl -sS http://127.0.0.1:3001/api/tasks | head
curl -sS https://vulcan.yomacong.com/api/health
```

기대 결과:
- health: `"ok":true`, `"dbOk":true`, `"sseOk":true`
- tasks: `{"tasks":[...]}` 형태
- 도메인 health도 동일하게 green

## 4) Adapter Ingest (always-on + auto attach)

```bash
cd /home/linuxuser/projects/vulcan
timeout 6s env ADAPTER_DRY_RUN=1 ADAPTER_HEARTBEAT_MS=2000 npm run adapter || true
```

기대 결과:
- `[adapter][dry-run] would send ...`
- `adapter attached: ...` 또는 `heartbeat: ... adapter alive` 메시지 출력
- 이벤트 JSON이 콘솔에 출력됨(전송은 하지 않음)

실전송 검증:

```bash
cd /home/linuxuser/projects/vulcan
pm2 restart vulcan-adapter
pm2 logs vulcan-adapter --lines 80 --nostream
```

기대 결과:
- `[adapter] sent N event(s)` 출력
- OpenClaw 로그 변화가 있을 때 `message/tool_call/error/sync` 이벤트 유입
- 로그 소스가 없어도 heartbeat 로그와 함께 프로세스가 계속 유지

## 5) SSE Live Stream

```bash
curl -sS http://127.0.0.1:3001/api/stream -N --max-time 3
curl -sS https://vulcan.yomacong.com/api/stream -N --max-time 3
```

기대 결과:
- `event: ready`
- `data: {...}` 이벤트가 실시간으로 도착

## 6) UI Final Validation

브라우저:
- `https://vulcan.yomacong.com`

체크:
- `/tasks` 진입 및 칸반/필터 동작
- Live Activity가 실시간 갱신
- `/office`에서 pulse/glow, demo 버튼 이벤트, agent group 칩 반영
- Topbar `Pause/Resume`, `Ping Hermes`, 검색 동작
- 모바일 뷰에서 레이아웃 깨짐 없음
