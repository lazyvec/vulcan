# Vulcan Mission Control - 운영 체크리스트

> 목적: OpenClaw + Telegram 기반 운영을 빠르게 점검/복구하기 위한 1페이지 실전 가이드

## 0) 기본 원칙
- 허브 레포: `vulcan`
- 보고 방식: 시작/중간/완료 단계별 짧은 보고
- 기본 응답 형식: 한줄 요약 먼저 + 상세

## 1) 일일 점검 (2~3분)

### 1-1. 런타임/게이트웨이 상태
```bash
openclaw status
openclaw gateway status
```
확인 포인트:
- Runtime: `running`
- RPC probe: `ok`
- Gateway listening: `127.0.0.1:<port>`

### 1-2. 채널 상태
`openclaw status`의 Channels 섹션에서 Telegram이 `Enabled=ON`, `State=OK`인지 확인.

### 1-3. 보안/설정 경고 확인
`openclaw status`의 Doctor warnings / Security audit를 확인하고,
새 경고가 생기면 원인/영향/대응안을 바로 메모.

---

## 2) 장애 시 1차 대응 (5분)

### 2-1. 서비스 재시작
```bash
openclaw gateway restart
```
재확인:
```bash
openclaw gateway status
openclaw status
```

### 2-2. 로그 확인
```bash
openclaw logs --follow
```
확인 포인트:
- Telegram 인증/전송 에러
- 포트 바인딩 충돌
- 설정 파싱 오류

### 2-3. 설정 파일 확인
기본 설정 파일:
- `~/.openclaw/openclaw.json`

중점 확인 항목:
- `channels.telegram.enabled`
- `channels.telegram.botToken`
- `channels.telegram.dmPolicy`
- `gateway.mode`

---

## 3) Telegram 정책 운영 기준

현재 정책:
- 그룹 미사용
- 1:1 DM 중심 운영

권장 설정 기준:
- 그룹을 계속 쓰지 않으면 `groupPolicy` 경고는 정보성으로 관리
- 그룹을 나중에 쓸 경우에만 allowlist/정책 재설정

---

## 4) 변경 작업 전/후 체크

### 작업 전
- [ ] 영향 범위 확인 (메시징/게이트웨이/인증)
- [ ] 롤백 방법 확인
- [ ] 사용자 승인 필요 작업 여부 확인

### 작업 후
- [ ] `openclaw status` 정상
- [ ] `openclaw gateway status` 정상
- [ ] Telegram 송수신 테스트 성공
- [ ] 변경점/결과/다음 할 일 보고

---

## 5) 빠른 명령어 모음
```bash
# 전체 상태
openclaw status

# 게이트웨이
openclaw gateway status
openclaw gateway restart

# 실시간 로그
openclaw logs --follow
```
