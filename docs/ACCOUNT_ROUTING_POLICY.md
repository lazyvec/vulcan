# Account Routing Policy (Claude/Codex/Gemini)

## 계정 역할
- `claude-sub`: **Pro**
- `claude-main`: **Pro**
- `claude-work`: **Max**

## 기본 원칙
1. **Pro 우선 사용** (`sub`, `main`)
2. Pro가 부족하면 Max(`work`)로 전환
3. 부족 판단은 아래 기준 사용

## 부족 기준 (기본값)
- `5시간 잔량 < 20%` **또는**
- `주간 잔량 < 20%`

> 임계값은 스크립트 환경변수로 조정 가능
> - `PRO_MIN_5H` (기본 20)
> - `PRO_MIN_WEEKLY` (기본 20)

## 라우팅 순서
1. `claude-sub` 평가
2. `claude-main` 평가
3. 둘 다 부족이면 `claude-work`로 전환

## Max 경고 정책
- Max는 보호 락 없음 (제한 없이 사용 가능)
- 단, 아래 조건이면 경고 출력
  - `Max 주간 잔량 < 20%` 이고
  - `주간 리셋까지 24시간 이상` 남아있음

## 운영 출력
`account-health-check.sh`는 아래를 생성:
- `docs/ACCOUNT_STATUS.md`
  - 계정별 잔량/리셋(KST)
  - 라우팅 추천
  - Max 경고 여부
