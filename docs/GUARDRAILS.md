# 가드레일 정책

> Phase 11 잔여 항목 B2. 2026-03-13 작성

## 1. 토큰 비용 상한

| 항목 | 제한 | 비고 |
|------|------|------|
| 에이전트 일일 토큰 한도 | Circuit Breaker 테이블 참조 | `circuit_breaker_config` |
| Hermes (메인) | 500,000 tokens/day | 오케스트레이터 |
| Daedalus (개발) | 300,000 tokens/day | 코드 생성 부하 |
| 기타 에이전트 | 100,000~200,000 tokens/day | 역할별 차등 |
| 일별 비용 알림 | Telegram 자동 발송 | `scheduleDailyCostReport()` |

## 2. 복잡도 상한

| 항목 | 제한 | 비고 |
|------|------|------|
| PR당 변경 파일 수 | **최대 15개** | 초과 시 분할 필수 |
| 단일 함수 LOC | **최대 150줄** | 초과 시 분리 |
| server.ts 라우트 추가 시 | 로직은 별도 파일로 분리 | server.ts 비대화 방지 |
| WorkOrder 타임아웃 | 기본 600초 (10분) | `createWorkOrder()` |

## 3. Feature Flag 필수 정책

신규 기능은 **반드시 feature flag 뒤에서 동작**해야 합니다.

| 규칙 | 설명 |
|------|------|
| 기본값 disabled | 신규 플래그는 `enabled: false`로 생성 |
| API로 토글 | `PUT /api/feature-flags/:id` |
| 감사 로그 연동 | 플래그 변경 시 `audit_log` 자동 기록 |
| 코드 내 사용 | `isFeatureEnabled("flag-id")` 호출 |

### 현재 활성 플래그

| 플래그 ID | 설명 | 기본값 |
|-----------|------|--------|
| `gateway-trace-bridge` | Gateway 이벤트 → Trace 자동 변환 | disabled |
| `audit-hash-chain` | 감사 로그 SHA-256 Hash Chain | disabled |
| `pm-skills-workflow` | PM Skills 워크플로우 체인 | disabled |

## 4. 파괴적 작업 규칙

| 작업 | 필수 조건 |
|------|----------|
| DB 마이그레이션 | git 체크포인트 + 사용자 확인 |
| 파일 삭제 | 사용자 확인 필수 |
| 환경변수 수정 | 기존 값 보고 후 변경 |
| PM2 프로세스 제어 | 사용자 확인 필수 |
| git force push | **절대 금지** |

## 5. 서버 격리

| 방향 | 규칙 |
|------|------|
| 내부 → 외부 | 어떤 정보도 나가지 않음 |
| 외부 → 내부 | 자유롭게 읽기 가능 |
| 자격증명 | `.env` 또는 환경변수에만 보관 |
