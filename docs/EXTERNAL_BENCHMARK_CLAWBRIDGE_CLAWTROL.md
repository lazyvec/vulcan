# Vulcan 벤치마크: ClawBridge / ClawTrol 도입 정리

- 작성일: 2026-03-07 (KST)
- 대상 레포:
  - https://github.com/dreamwing/clawbridge
  - https://github.com/wolverin0/clawtrol

## TL;DR
Vulcan에는 **ClawBridge의 모바일 관제 UX + ClawTrol의 작업 계약(Outcome/Complete) 패턴**을 가져오는 것이 가장 효과적입니다.

반면, ClawTrol 전체 스택(Rails/PG/SolidQueue) 자체를 그대로 도입하는 건 현재 Vulcan 방향(Next/Hono/OpenClaw 중심)과 충돌이 커서 비추천입니다.

---

## 1) ClawBridge에서 가져올 것

### A. 모바일 퍼스트 관제 화면 (우선순위: P0)
- 근거: ClawBridge는 "폰에서 상태 확인/제어"에 특화
- Vulcan 도입 포인트:
  - Office/Team/Activity 핵심 KPI를 모바일 카드로 재배치
  - 1화면 요약: 런타임 상태, 활성 에이전트, 실패/대기 작업, 승인 필요 건수

### B. 실시간 피드에서 중복 제거/병렬 로그 정리 (P0)
- 근거: ClawBridge는 parallel logging + dedup 강조
- Vulcan 도입 포인트:
  - 동일 이벤트 반복 압축
  - background task 로그가 메인 피드에 묻히지 않도록 lane/태그 분리

### C. 운영 제어 단축 액션 (P1)
- 근거: cron 트리거, 서비스 재시작, runaway kill 같은 Mission Control 액션 제공
- Vulcan 도입 포인트:
  - 이미 있는 운영 체크리스트와 연결
  - UI 버튼은 "안전한 읽기/조회"와 "승인 필요한 액션"을 명확히 분리

### D. 원격 접근 UX 철학만 참고 (P2)
- 근거: ClawBridge는 Quick Tunnel/Auto-networking 제공
- 주의:
  - one-liner 설치/외부 터널 자동 생성은 운영 리스크가 큼
  - Vulcan은 기본적으로 현재 보안 정책(로컬/명시적 노출) 유지 권장

---

## 2) ClawTrol에서 가져올 것

### A. 태스크 결과 보고 계약 (P0)
- 근거: `task_outcome` -> `agent_complete` 순서의 명시적 계약
- Vulcan 도입 포인트:
  - Vulcan 작업 실행 결과를 구조화해서 저장:
    - summary / achieved / evidence / remaining
  - 완료 보고 누락 방지 ("무음 종료" 제거)

### B. Follow-up 의사결정 강제 (P0)
- 근거: YES/NO + recommended_action 강제
- Vulcan 도입 포인트:
  - 작업 종료 시 반드시 다음 액션 상태를 남김:
    - in_review / requeue_same_task / done_hold

### C. 칸반 상태 모델 확장 (P1)
- 근거: `inbox -> up_next -> in_progress -> in_review -> done`
- Vulcan 도입 포인트:
  - 현재 태스크 흐름을 review 중심으로 강화
  - "끝났는데 검토 안 된 카드" 누락 방지

### D. Origin Routing 아이디어 (P1)
- 근거: origin_chat_id/thread 기반 회신 라우팅
- Vulcan 도입 포인트:
  - 알림/완료 메시지의 원문맥(채팅/스레드) 귀환 정확도 개선

### E. 세션 헬스/출력 복구 개념 (P2)
- 근거: session health / transcript 기반 recover_output
- Vulcan 도입 포인트:
  - 세션 끊김/응답 누락 시 자동 복구 워크플로 설계

---

## 3) 지금은 보류/비도입 권장

### 1) ClawTrol 전체 스택 이식
- 이유:
  - Rails + PG + SolidQueue + Hotwire 전체를 들여오면 구조가 이원화됨
  - Vulcan의 현재/목표 아키텍처와 중복·충돌 가능성 큼

### 2) 과도한 자동 루프(무인 반복 코딩)
- 이유:
  - 건님 운영 정책은 통제된 자동화 + 승인 포인트 중시
  - 품질/비용/안전 우선순위와 충돌 가능

### 3) 무분별한 공개 터널 자동화
- 이유:
  - 외부 노출면 증가
  - 기본은 폐쇄/명시적 공개 원칙 유지가 맞음

---

## 4) Vulcan 적용 우선순위 (실행 순서)

## Phase A (이번 주)
1. 모바일 관제 요약 화면 설계 (P0)
2. Activity dedup + lane 분리 (P0)
3. 작업 종료 구조화 리포트 스키마 추가 (P0)

## Phase B (다음)
4. Follow-up 의사결정 강제 플로우 (P1)
5. Origin routing 강화 (P1)
6. 운영 제어 액션 버튼 + 승인 가드 (P1)

## Phase C (후속)
7. 세션 헬스/출력 복구 (P2)
8. 모바일 전용 UX polish (P2)

---

## 5) 건님 운영 스타일 기준 최종 권고

건님은 이미
- Mission Control 지향
- 에이전트 분업
- 승인/로그/경고 자동화
를 선택했기 때문에,

핵심은 "새 도구 도입"보다
**Vulcan 내부에 ClawBridge/ClawTrol의 검증된 패턴을 흡수**하는 것입니다.

즉,
- ClawBridge에서 UX/관제 감각을
- ClawTrol에서 작업 계약/추적 모델을
가져오고,
실행 엔진은 기존 OpenClaw + Vulcan 구조를 유지하는 방식이 최적입니다.
