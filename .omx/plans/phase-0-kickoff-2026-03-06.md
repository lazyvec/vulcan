# Phase 0 착수 계획 (세션 실행 범위)

## Context
- 현재 구조: 단일 Next.js 앱, 모노레포 미전환
- 현재 핵심 파일: `lib/types.ts`, `lib/statusMap.ts`, `lib/store.ts`
- DB 초기화 방식: `ensureSchema()`에서 SQLite DDL 직접 실행
- 기준 체크리스트: `docs/WORK_PLAN.md`의 Phase 0 항목

## Work Objectives
- 이번 세션에서 Phase 0 전체가 아니라, **리스크 낮은 착수 단위**를 끝까지 검증 가능한 형태로 시작
- 이후 Phase 1로 넘어가기 위한 기술 기반(워크스페이스/공유 패키지/검증 경계/마이그레이션 기반) 확보

## Guardrails
### Must Have
- 단계는 4단계로 제한하고, 각 단계마다 되돌릴 수 있는 검증 지점을 둔다.
- 기존 M0 동작(API/SSE/seed/build) 회귀 여부를 매 단계에서 확인한다.
- DB 변경은 파괴적 변경 없이 additive 방식으로만 시작한다.

### Must NOT Have
- 사용자 승인 전 코드 변경/파일 이동/의존성 전환을 실행하지 않는다.
- PM2 재시작/중단, DB 초기화/삭제를 임의로 수행하지 않는다.
- `ensureSchema()` 제거를 한 번에 강행하지 않는다(병행 안전장치 없이 전환 금지).

## Task Flow (3-6 steps)
### 1) 착수 게이트 확정 + 베이스라인 스냅샷
작업:
- 현재 `docs/WORK_PLAN.md` Phase 0 항목을 이번 세션 범위(착수)로 고정
- 실행 전 체크포인트 커밋/검증 명령 세트 정의 (`lint`, `build`, `seed`, 핵심 API 확인)
- 의존성 갭 확인(`zod`, `drizzle-kit`, 워크스페이스 스크립트 체계) 및 도입 순서 확정

Acceptance Criteria:
- 이번 세션 목표/비목표가 문서로 명시됨
- 체크포인트 커밋 전략과 검증 명령이 합의됨
- 의존성/스크립트 갭 리스트가 작성되고 순차 도입 계획이 확정됨
- 승인 전 코드 변경 금지 게이트가 명문화됨

### 2) 모노레포 뼈대 전환 (구조 우선, 로직 무변경)
작업:
- `pnpm-workspace.yaml` + `apps/web` + `packages/shared` 구조만 우선 도입
- 앱 로직은 그대로 두고 경로/스크립트만 최소 수정

Acceptance Criteria:
- `pnpm install` 성공
- 웹 앱 빌드/실행 커맨드가 새 구조에서 동작
- 기존 핵심 화면 및 API 기본 동작이 깨지지 않음

### 3) 공유 패키지 추출 + Store 인터페이스 1차 추상화
작업:
- `lib/types.ts`, `lib/statusMap.ts`를 `packages/shared`로 추출
- `lib/store.ts`를 인터페이스 + SQLite 구현체로 분리(동작 동일성 유지)

Acceptance Criteria:
- 앱 내부 import가 공유 패키지를 참조하고 타입 오류가 없음
- Store 분리 후 기존 read/write API 결과가 동일
- 회귀 테스트(기본 API/화면 흐름) 통과

### 4) Zod 경계 + Drizzle Kit 마이그레이션 부트스트랩
작업:
- 우선순위 API(ingest, task update) request/response Zod 검증 추가
- Drizzle Kit 초기 마이그레이션을 도입하되, 초기 단계는 `ensureSchema()`와 병행 가능한 안전 전환으로 설계

Acceptance Criteria:
- 잘못된 입력이 Zod 에러로 일관 처리됨
- 신규 DB(빈 파일)와 기존 DB(데이터 존재) 모두에서 앱 부팅 성공
- 마이그레이션 생성/적용 경로가 문서화되고 재실행 가능

## Risks / Rollback / Safety
1. 리스크: 모노레포 전환 시 import/path alias 깨짐
- 안전장치: 단계 2 완료 직후 빌드/기본 API 검증
- 롤백: 단계 1 체크포인트 커밋으로 즉시 복귀

2. 리스크: shared 추출 중 순환 의존 또는 런타임 참조 오류
- 안전장치: shared는 순수 타입/상수만 포함, 앱 전용 로직 금지
- 롤백: 파일 이동 단위 커밋으로 분리해 부분 롤백 가능하게 유지

3. 리스크: 마이그레이션 전환 중 기존 SQLite 데이터 접근 실패
- 안전장치: 초기에는 `ensureSchema()` 완전 제거 금지, 병행 운용 후 제거
- 롤백: migration 경로 비활성화 플래그/커밋 롤백으로 즉시 복구

4. 리스크: npm 기반 현재 환경에서 pnpm 전환 시 lockfile/스크립트 충돌
- 안전장치: 전환 초기에는 `apps/web` 단위 빌드 검증을 우선하고 루트 스크립트는 점진 이관
- 롤백: 기존 `npm` 동작 경로를 체크포인트 시점까지 유지

## Approval Gate (필수)
`사용자가 "승인" 또는 "proceed"를 명시하기 전에는 코드 변경을 시작하지 않는다.`
