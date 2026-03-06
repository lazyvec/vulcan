# Agent Routing Matrix

## 기본 라우팅
- 설계/계획/통합 판단: **Claude**
- 실제 코딩/대량 처리: **Codex**
- 디자인/UI/시각/미감: **Gemini**

## 실행 시나리오별 우선순위

### 1) 아키텍처/요구사항/플랜 수립
1. Claude
2. (보조) Gemini: UI 관점 보강
3. (보조) Codex: 구현 난이도/작업량 산정

### 2) 기능 구현/리팩터링/대량 변경
1. Codex
2. Claude: 통합/리뷰/리스크 검토
3. Gemini: UI 관련 변경 시 보조

### 3) UI/UX 개선 및 시각적 품질 튜닝
1. Gemini
2. Codex: 실제 코드 반영
3. Claude: 제품/구조 일관성 검토

## 조율 규칙 (Hermes L2)
- 기본적으로 Claude Code의 내부 분배를 허용
- Hermes가 중간 점검하여 필요 시 재배정
- 재배정 트리거:
  - 응답 지연/세션 timeout 반복
  - 계정 한도 임계 접근
  - 결과물 품질 미달

## 계정/티어 연동 규칙
- `claude-sub`, `claude-main`: Pro
- `claude-work`: Max
- 기본은 Pro 우선, Pro 부족 시 Max 투입
