# PROGRESS

<!-- last-session --> **마지막 세션**: 2026-03-14 | 브랜치: `main`

## 2026-03-14: Office View v2 — 2D 픽셀아트 인터랙티브 오피스

### 요약
에이전트 오피스 뷰를 6존 CSS Grid → 2D 탑다운 바닥맵으로 전면 업그레이드. 에이전트 이동 애니메이션, 말풍선, 히트맵, XP 랭킹, 토큰 바, 이벤트 트레일, 메모리 타임라인을 추가하여 한눈에 모든 에이전트 활동을 파악 가능한 대시보드 구현.

### 변경 내용

#### 신규 컴포넌트 (16개, `components/office-v2/`)
- **바닥맵**: `OfficeFloorMap.tsx`, `FloorZone.tsx` — 16:9 비율 position:relative/absolute 컨테이너, 6개 존 배경
- **스프라이트**: `PixelAvatar.tsx`, `AgentSprite.tsx`, `sprite-map.ts` — SVG 8x8 결정론적 픽셀아트 아바타
- **이동**: `MovingAgent.tsx` — framer-motion spring 물리 기반 존 간 이동 애니메이션
- **인터랙션**: `SpeechBubble.tsx`, `AgentPopoverV2.tsx` — 말풍선(40자 요약) + 팝오버(역할태그/체류시간/토큰/미션)
- **대시보드**: `MiniTokenBar.tsx`, `ActivityHeatmap.tsx`, `AgentRanking.tsx`, `EventTrail.tsx`, `MemoryTimeline.tsx`, `OfficeHeader.tsx`
- **타입/상수**: `types.ts`, `constants.ts` — FloorZoneConfig, SpriteConfig, XP 레벨 공식

#### 수정 파일
- `app/(layout)/office/page.tsx` — OfficeFloorMap 컴포넌트로 교체
- `styles/tokens.css` — 바닥 그리드 CSS 변수 + prefers-reduced-motion 지원
- `AgentOfficeView.tsx` → `AgentOfficeView.legacy.tsx` 리네임 (복원 가능)

#### 핵심 설계 결정
- **PixiJS/Phaser 없이 framer-motion + DOM** — 에이전트 10명 수준에서 Canvas 불필요, 접근성/SSR 호환
- **에이전트는 바닥맵의 직접 자식** — 존은 배경 영역, 스프라이트는 absolute로 이동
- **useSyncExternalStore** — React 19 순수 렌더링 규칙 준수 (체류 시간 타이머)
- **lg 브레이크포인트** — 1024px부터 사이드 패널 분리 (노트북 최적화)

#### 접근성 (크로스체크 반영)
- role="dialog" + ESC 닫기 + 포커스 이동 (팝오버)
- role="application" + aria-label (바닥맵)
- role="region" + aria-label (FloorZone)
- aria-hidden (상태 dot, 이모지 뱃지, 아이콘)
- prefers-reduced-motion: reduce 지원
- tertiary → muted-foreground 색상 일괄 수정 (WCAG AA 대비비)

#### 검증
- pnpm lint: 통과
- tsc --noEmit: 통과
- pnpm build: 통과
- 크로스체크: Sonnet 코드리뷰 + Sonnet UX리뷰 (Codex/Gemini 쿼타 초과로 내부 에이전트 사용)

---

## 2026-03-14: UI/UX 전면 리뉴얼 — Claude의 감성과 편의성 주입

### 요약
Vulcan Mission Control의 시각적 완성도와 사용성을 글로벌 최고 수준으로 끌어올리기 위한 전면 리뉴얼 완료. Claude 특유의 부드럽고 지능적인 디자인 철학을 이식하여 프리미엄 대시보드 경험 구축.

### 변경 내용

#### 1. 디자인 시스템 개편 (Claude-Style Foundation)
- **Soft Minimalism**: 전역적으로 부드러운 그림자(`--shadow-claude`)와 미세한 안쪽 그림자 적용.
- **Glassmorphism**: 사이드바, 상단바, 칸반 레인 등에 `backdrop-blur`와 유리 질감 레이아웃 적용.
- **Visual Breathing**: 여백 시스템 최적화 및 타이포그래피 위계(font-weight, tracking) 정교화.
- **Color Polish**: Hearth 포인트 컬러의 농도를 조절하여 시각적 피로도를 낮추고 시각적 위계 명확화.

#### 2. 살아있는 인터랙션 (Living Micro-interactions)
- **Spring Physics**: `Framer Motion`을 활용하여 모든 버튼, 모달, 카드에 실제 물리 법칙이 적용된 스프링 애니메이션 주입.
- **Breathing Avatars**: 에이전트 아바타에 상태별 고유 리듬의 박동(`Pulse`) 효과 추가 (생동감 부여).
- **Interactive Feedback**: 버튼 클릭 시 탄성 피드백 및 호버 시 자연스러운 강조 효과.

#### 3. 모바일 최적화 및 맥락적 편의성
- **Adaptive Bottom Sheets**: 모바일 환경에서 모든 모달을 하단 바텀 시트로 자동 전환. 한 손 조작성 극대화.
- **Gesture Support**: 바텀 시트에 상단 드래그 핸들 디자인 추가.
- **Floating Search**: 상단바 검색창을 배경 위로 떠 있는 스타일로 개선하여 접근성 강화.
- **Safe Area**: iOS 등 모바일 기기의 Safe Area 대응 및 터치 타겟 48px+ 확보.

#### 4. 인간 중심적 사용자 경험 (Empathetic UX)
- **Warm Micro-copy**: 기계적인 메시지를 "에이전트가 새로운 지시를 기다리고 있어요"와 같이 친절하고 상황 중심적인 언어로 교체.
- **Delightful Empty States**: 빈 화면에 은은한 그라데이션 광채와 아이콘을 배치하여 긍정적인 다음 행동 유도.

### 테스트 결과
- ✅ 린트: `pnpm lint` 통과 (any 타입 우회 및 미사용 변수 제거)
- ✅ 타입체크: `tsc --noEmit` 통과
- ✅ 빌드: `pnpm build` 성공 (Next.js 16 최적화 빌드)
- ✅ 스모크 테스트: 핵심 페이지 13종 정상 렌더링 확인

### 변경 파일 (28개+)
- `apps/web/styles/tokens.css` — 디자인 토큰 전면 개편
- `apps/web/app/globals.css` — 전역 스타일 및 유리 질감 유틸리티 추가
- `apps/web/components/ui/Button.tsx` — 스프링 애니메이션 버튼 구현
- `apps/web/components/ui/Modal.tsx` — 어댑티브 바텀 시트 구현
- `apps/web/components/ui/EmptyState.tsx` — 감성적인 엠티 스테이트 구현
- `apps/web/components/Sidebar.tsx` — 유리 질감 사이드바 및 애니메이션
- `apps/web/components/Topbar.tsx` — 플로팅 검색바 및 위계 조정
- `apps/web/components/AgentOfficeView.tsx` — 살아있는 아바타 및 팝오버 리뉴얼
- `apps/web/components/KanbanBoard.tsx` — 물리적 질감의 드래그 앤 드롭 보드
- 기타 20여 개 도메인 컴포넌트 접근성 및 터치 타겟 수정 완료

---

## 2026-03-13: Phase 11 잔여 항목 완료

### 요약
Phase 11의 7개 미완료 항목 중 4개 구현 + 2개 문서 완료. (2개 스킵: Govrix UI, ECC — 기존 기능으로 대체됨)

### 변경 내용

#### A1. Feature Flags 시스템
- **신규**: `apps/api/src/feature-flags.ts` — JSON 파일 기반 플래그 관리 (인메모리 Map + 파일 persist)
- **신규**: `apps/api/data/feature-flags.json` — 3개 기본 플래그 (`gateway-trace-bridge`, `audit-hash-chain`, `pm-skills-workflow`)
- **API**: `GET /api/feature-flags`, `PUT /api/feature-flags/:id`
- **타입**: `FeatureFlag` 인터페이스 (`packages/shared/src/types.ts`)

#### A2. Gateway-to-Trace 자동 브릿지
- **신규**: `apps/api/src/model-pricing.ts` — 모델별 토큰 단가 (GPT-5.4, Gemini 3.1 Pro, Gemini 3 Flash, Claude)
- **수정**: `event-adapter.ts`에 `mapGatewayEventToTrace()` 추가 — completion/response 이벤트에서 토큰 사용량 자동 추출
- **수정**: `server.ts` — Gateway RPC `onEvent` 콜백에서 feature flag 확인 후 `appendTrace()` 자동 호출
- **동작**: `gateway-trace-bridge` 플래그 활성화 시 자동 trace 수집

#### A3. 감사 로그 Hash Chain
- **수정**: `auditLogTable`/`auditLogPgTable`에 `prevHash` 컬럼 추가
- **수정**: `appendAuditLog()` — SHA-256 해시 체인 (`GENESIS → SHA-256(prevHash + rowData)`)
- **신규**: `verifyAuditChain()` — 체인 무결성 검증 (ts 오름차순 순회, 해시 재계산)
- **API**: `GET /api/audit-log/integrity` — 변조 감지
- **동작**: `audit-hash-chain` 플래그 활성화 시 적용. 기존 레코드는 prevHash=''

#### A4. PM Skills WorkOrder 체인 워크플로우
- **신규**: `apps/api/src/workflows.ts` — 워크플로우 템플릿 + 체인 실행 엔진
- **PM Skills 템플릿**: Discover(Metis) → Strategy(Athena) → Write-PRD(Themis)
- **API**: `GET /api/workflows/templates`, `POST /api/workflows/trigger`, `GET /api/workflows/:workflowId/status`
- **자동 체인**: WO 완료 시 다음 단계 자동 생성, 마지막 단계 완료 시 Telegram 알림
- **타입**: `WorkflowTemplate`, `WorkflowStep` + `WorkOrderType`에 `"discover"`, `"prd"` 추가
- **동작**: `pm-skills-workflow` 플래그 활성화 시 적용

#### B1. 라이선스 체크리스트
- **신규**: `docs/LICENSE_CHECKLIST.md` — 전체 의존성 라이선스 전수 조사 (MIT/Apache 2.0/ISC/BSD, copyleft 없음)

#### B2. 가드레일 정책
- **신규**: `docs/GUARDRAILS.md` — 토큰 비용 상한, 복잡도 상한 (PR당 15파일), feature flag 필수 정책

### 테스트
- ✅ 빌드: `pnpm -r build` 통과
- ✅ 테스트: `pnpm test` 66개 전체 통과
- ✅ 타입체크: `tsc --noEmit` 통과

### 변경 파일 (신규 5개 + 수정 9개 + 문서 2개 = 16개)
1. `packages/shared/src/types.ts` — FeatureFlag, AuditLogItem.prevHash, WorkflowTemplate, WorkOrderType 확장
2. `packages/shared/src/schemas.ts` — workOrderTypeSchema 확장, triggerWorkflowInputSchema 추가
3. `apps/api/src/feature-flags.ts` (신규)
4. `apps/api/data/feature-flags.json` (신규)
5. `apps/api/src/model-pricing.ts` (신규)
6. `apps/api/src/workflows.ts` (신규)
7. `apps/api/src/gateway-rpc/event-adapter.ts` — mapGatewayEventToTrace()
8. `apps/api/src/schema.ts` — auditLogTable prevHash
9. `apps/api/src/pg-schema.ts` — auditLogPgTable prevHash
10. `apps/api/src/db.ts` — ensureColumn audit_log prev_hash
11. `apps/api/src/store.ts` — appendAuditLog hash chain, verifyAuditChain()
12. `apps/api/src/server.ts` — 10개+ 엔드포인트 추가, gateway onEvent, workflow 훅
13. `docs/LICENSE_CHECKLIST.md` (신규)
14. `docs/GUARDRAILS.md` (신규)
15. `docs/PROGRESS.md`

---

## 2026-03-13: Phase 5 (Memory 검색 강화) — Hermes 지식 인덱싱

### 요약
마스터 플랜 Phase 5: Hermes 파일시스템 메모리(22개 마크다운, ~189KB)를 DB에 인덱싱하여 FTS5 검색 가능하게 구현.

### 변경 내용

#### 5.1 memories 테이블 + FTS5
- **스키마**: `memories` 테이블 (id, file_path, memory_type, layer, title, content, content_hash, tags, lifecycle, utility_score, access_count, evergreen 등 20개 컬럼)
- **FTS5**: `memories_fts` 가상 테이블 (content-sync 모드, unicode61 토크나이저)
- **트리거**: INSERT/UPDATE/DELETE 3개 트리거로 FTS 자동 동기화
- **Drizzle 정의**: SQLite(`memoriesTable`) + PostgreSQL(`memoriesPgTable`) 이중 스키마

#### 5.2 파일 동기화 + Store + API
- **신규**: `memory-sync.ts` — 파일 스캔, SHA-256 해시, title/tags 추출, 단방향 동기화
- **Store**: 10개 함수 (get/upsert/update/delete/search/touch/decay/stats/existing)
- **API 7개 라우트**: GET /api/memories, search, stats, :id, PATCH :id, POST sync, POST decay
- **FTS5 검색**: BM25 랭킹, snippet 하이라이팅, LIKE 폴백

#### 5.3 UI: 지식 검색 페이지
- **신규**: `KnowledgeSearch.tsx` — 검색 바(debounce 300ms), layer/type 필터, 결과 카드, 상세 패널, 동기화/decay 버튼, 통계 대시보드
- **신규**: `/knowledge` 페이지 (서버 컴포넌트, stats SSR)
- **Sidebar**: 15개 네비게이션 ("지식" 추가, 메모리 아래)

#### 5.4 Temporal Decay
- `POST /api/memories/decay`: halfLifeDays(기본 30), archiveThreshold(기본 0.1)
- 공식: `new_score = current × 0.5^(days_since_access / halfLife)`
- evergreen=true 항목 면제

#### 5.5 Auto-Flush (파일 변경 감지 → 자동 동기화)
- `memory-sync.ts`에 `startAutoFlush()` / `stopAutoFlush()` 추가
- `fs.watch` recursive 감시 + 5분 간격 setInterval 폴링 폴백
- debounce 2초로 빈번한 변경 병합
- 서버 시작 시 자동 활성화, 셧다운 시 정리

#### 5.6 Category 자동갱신 (규칙 기반 + AI 트리거 태깅)
- **신규**: `memory-classify.ts` — 25개 키워드→태그 매핑 규칙
- `inferTags()`: 규칙 기반 자동 태깅 (에이전트, 개발, API 등)
- `inferMemoryType()`: 콘텐츠 분석으로 fact/skill 자동 분류
- `classifyAll()`: 전체 메모리 일괄 분류
- Gateway RPC Metis 에이전트 연동 프롬프트 (`POST /api/memories/:id/classify-ai`)
- API 3개 라우트: classify, classify-all, classify-ai

#### 5.7 pgvector 벡터 임베딩 + 시맨틱 검색
- **신규**: `memory-embedding.ts` — OpenAI text-embedding-3-small (1536차원)
- `generateEmbedding()` / `generateEmbeddings()`: OpenAI API 단건/배치 호출
- `semanticSearch()`: 인메모리 코사인 유사도 (SQLite 환경용)
- `hybridSearchRRF()`: FTS5 BM25 + Vector → RRF 통합 검색
- `pg-schema.ts`: vector(1536) 커스텀 타입 + embedding 컬럼
- `docker-compose.yml`: `pgvector/pgvector:pg16` 이미지로 교체
- API 4개 라우트: semantic, embed, embed-all, embedding-status
- **UI**: 시맨틱/키워드 토글 버튼 (Sparkles 아이콘, 검색 모드 전환)

### 변경 파일 (16개)
| 파일 | 유형 |
|------|------|
| `packages/shared/src/types.ts` | 수정 |
| `packages/shared/src/schemas.ts` | 수정 |
| `apps/api/src/schema.ts` | 수정 |
| `apps/api/src/pg-schema.ts` | 수정 |
| `apps/api/src/db.ts` | 수정 |
| `apps/api/src/memory-sync.ts` | 신규 |
| `apps/api/src/memory-classify.ts` | 신규 |
| `apps/api/src/memory-embedding.ts` | 신규 |
| `apps/api/src/store.ts` | 수정 |
| `apps/api/src/server.ts` | 수정 |
| `apps/web/components/KnowledgeSearch.tsx` | 신규 |
| `apps/web/app/(layout)/knowledge/page.tsx` | 신규 |
| `apps/web/components/Sidebar.tsx` | 수정 |
| `apps/web/lib/api-server.ts` | 수정 |
| `apps/web/lib/types.ts` | 수정 |
| `docker-compose.yml` | 수정 |

### 테스트 결과
- 빌드: 통과 (packages/shared + apps/api + apps/web)
- 단위 테스트: 66개 통과
- API 테스트: sync(22문서), search, semantic, stats, decay, classify-all 모두 정상
- 스모크 테스트: 사이드바 15개 링크 반영

---

## 2026-03-13: Phase 4 (Mission Control 메트릭스 강화) — 실시간 대시보드

### 요약
마스터 플랜 Phase 4: 에이전트 오피스 뷰, 실시간 상태 표시, FinOps 대시보드 강화, Kanban WorkOrder 연동 구현.

### 변경 내용

#### 4.1 에이전트 오피스 뷰
- **신규**: `AgentOfficeView.tsx` — CSS Grid 6존 레이아웃 (Library, Red Corner, Hallway, Watercooler, Desk, Workbench)
- 에이전트별 2글자 아바타 + 상태 도트 + CSS 애니메이션 (idle=정적, writing/researching=파란 펄스, executing=녹색 펄스, syncing=녹색 정적, error=빨간 깜빡임)
- 에이전트 클릭 → 현재 WorkOrder 요약 + 오늘 토큰 소비 팝오버
- `tokens.css`에 `agent-pulse-blue`, `agent-pulse-green`, `agent-blink-red` 등 5개 애니메이션 클래스 추가
- `/office` 페이지 리뉴얼 (WorkOrder + 토큰 데이터 SSR fetch)

#### 4.2 에이전트 상태 실시간 표시
- **신규**: `useAgentStatus.ts` — WebSocket + 15초 폴링 fallback 결합 커스텀 훅
- `server.ts`: `PUT /api/agents/:id`에서 status 변경 시 `agent.status_changed` 이벤트 발행
- WebSocket 연결 상태 인디케이터 (실시간/폴링 뱃지)

#### 4.3 FinOps 대시보드 강화
- `CostDashboard.tsx`: 기간 선택기 (7일/14일/30일), 비용 트렌드 지표 (전반부 vs 후반부 비교), CB 발동 이력 섹션
- `GET /api/traces/daily-cost`: `days` 쿼리 파라미터 추가 (기본 7, 최대 90)
- **신규**: `GET /api/traces/cb-history` — traces 테이블에서 `circuit_broken` 상태 집계
- `store.ts`: `getCBTriggerHistory()` 함수
- `api-server.ts`: `getCBHistory()`, `getDailyCostSummaries(since?, days?)` 확장

#### 4.4 Kanban WorkOrder 연동
- `KanbanBoard.tsx`: TaskCard에 WorkOrder 뱃지 (상태 + fromAgent→toAgent)
- `TaskDetailModal.tsx`: "에이전트 활동" 탭 추가 (WorkOrder + 이벤트 로그)
- **신규**: `GET /api/tasks/:id/activity` — taskId 관련 이벤트 + WorkOrder 조회
- `store.ts`: `getTaskActivity()` 함수
- `tasks/page.tsx`: WorkOrder 데이터 fetch → linkedTaskId 매핑 → KanbanBoard 전달

### 변경 파일 (13개)
| 파일 | 유형 |
|------|------|
| `apps/web/components/AgentOfficeView.tsx` | 신규 |
| `apps/web/hooks/useAgentStatus.ts` | 신규 |
| `apps/web/app/(layout)/office/page.tsx` | 수정 |
| `apps/web/components/CostDashboard.tsx` | 수정 |
| `apps/web/app/(layout)/costs/page.tsx` | 수정 |
| `apps/web/components/KanbanBoard.tsx` | 수정 |
| `apps/web/components/TaskDetailModal.tsx` | 수정 |
| `apps/web/app/(layout)/tasks/page.tsx` | 수정 |
| `apps/web/lib/api-server.ts` | 수정 |
| `apps/web/lib/types.ts` | 수정 |
| `apps/web/styles/tokens.css` | 수정 |
| `apps/api/src/server.ts` | 수정 |
| `apps/api/src/store.ts` | 수정 |

### 테스트 결과
- ✅ TypeScript 타입체크 통과 (API + Web)
- ✅ 프로덕션 빌드 성공
- ✅ Vitest 66/66 통과

---

## 2026-03-13: Phase 3 (WorkOrder 실전 적용) — 에이전트 간 구조화된 통신

### 요약
마스터 플랜 Phase 3: WorkOrder/WorkResult 기반 에이전트 간 핸드오프 시스템 구현.
Executor→Verifier(Argus) 2단계 검증 루프, 상태 전이 머신, CEO 에스컬레이션.

### 변경 내용
- **타입**: `WorkOrder`, `WorkResult`, `WorkOrderStatus`, `WorkOrderType` (shared/types.ts)
- **Zod**: `createWorkOrderInputSchema`, `updateWorkOrderInputSchema`, `workResultInputSchema`, `workOrderCheckpointInputSchema` (shared/schemas.ts)
- **DB**: `work_orders`, `work_results` 테이블 (schema.ts + db.ts + pg-schema.ts, 7개 인덱스)
- **Store**: `createWorkOrder`, `getWorkOrder`, `listWorkOrders`, `updateWorkOrder`, `createWorkResult`, `getWorkResultsByOrderId`, `saveWorkOrderCheckpoint`, `getWorkOrderStats`
- **API 7개**: `POST/GET /api/work-orders`, `GET/PATCH /api/work-orders/:id`, `POST /api/work-orders/:id/result`, `POST /api/work-orders/:id/checkpoint`, `POST /api/work-orders/:id/verify`
- **검증 루프**: result 제출 → Argus 자동 검증 → 실패 시 1회 재시도 → CEO Telegram 에스컬레이션
- **상태 머신**: pending→accepted→in_progress→review→completed, 역방향 차단, 종료 상태 보호
- **UI**: `WorkOrderDashboard.tsx` (목록 + 필터 + 상세 확장), `/work-orders` 페이지, Sidebar "작업지시" 네비
- **OpenClaw**: work-order.schema.json + work-result.schema.json 10인 에이전트 enum 업데이트

### 교차검증 수정 (8건)
1. pg-schema.ts deadline 타입 timestamp→integer 정합
2. getWorkOrderStats 전체 풀스캔→GROUP BY SQL
3. PATCH 상태 전이 머신 검증 추가
4. result 제출 시 완료/취소 상태 가드
5. /verify 상태 가드 (in_progress/review만)
6. toAgentId 존재 검증
7. checkpointJson 크기 상한 + JSON 검증
8. inputsJson JSON 유효성 검증

### 검증
- TypeScript 타입체크: shared + api + web 전부 통과
- 빌드: `pnpm -r build` 성공 (/work-orders 라우트 확인)
- 테스트: 66개 전부 통과

### 변경 파일 (13개)
| 파일 | 변경 |
|------|------|
| `packages/shared/src/types.ts` | 수정 (WorkOrder/WorkResult 타입) |
| `packages/shared/src/schemas.ts` | 수정 (Zod 스키마 4개) |
| `apps/api/src/schema.ts` | 수정 (2개 테이블) |
| `apps/api/src/db.ts` | 수정 (bootstrap SQL) |
| `apps/api/src/pg-schema.ts` | 수정 (PG 포워드호환) |
| `apps/api/src/store.ts` | 수정 (8개 함수) |
| `apps/api/src/server.ts` | 수정 (7개 엔드포인트 + 상태 머신) |
| `apps/web/lib/api-server.ts` | 수정 (fetch 함수) |
| `apps/web/components/WorkOrderDashboard.tsx` | 신규 |
| `apps/web/app/(layout)/work-orders/page.tsx` | 신규 |
| `apps/web/components/Sidebar.tsx` | 수정 (네비 추가) |
| `~/.openclaw/schemas/work-order.schema.json` | 수정 (10인 enum) |
| `~/.openclaw/schemas/work-result.schema.json` | 수정 (10인 enum) |

---

## 2026-03-13: Phase 2 (Observability) — Trace 수집 + FinOps + Lightpanda

### 요약
Vulcan MC Phase 11 (Observability): Trace 수집, Circuit Breaker, 비용 대시보드 구현.
동시에 BRS 브라우저 백엔드를 Lightpanda 경량 브라우저로 전환.

### Workstream A: Lightpanda 도입
- `~/.local/bin/lightpanda` — nightly 바이너리 설치 (메모리 ~6MB)
- `~/.config/systemd/user/lightpanda.service` — CDP 서버 상시 실행 (port 9222)
- `brs-browser` — Lightpanda CDP 우선 + Chromium fallback + 셸 인젝션 수정
- `brs-web` — Crawl4AI CDP 시도 + 자동 Chromium fallback + 셸 인젝션 수정
- `~/hermes/TOOLS.md` — Lightpanda 섹션 추가

### Workstream B: Trace/FinOps
- **타입**: `TraceEnvelope`, `CircuitBreakerConfig`, `DailyCostSummary` (shared/types.ts)
- **Zod**: `traceEnvelopeInputSchema`, `traceIngestPayloadSchema`, `circuitBreakerConfigInputSchema` (shared/schemas.ts)
- **DB**: `traces`, `circuit_breaker_config` 테이블 (schema.ts + db.ts + pg-schema.ts)
- **Store**: `appendTrace`, `getTracesSince`, `getDailyTokenUsage`, `getDailyCostSummaries`, `getCircuitBreakerConfig`, `upsertCircuitBreakerConfig`, `checkCircuitBreaker`
- **API**: `POST /api/traces/ingest`, `GET /api/traces`, `GET /api/traces/daily-cost`, `GET /api/circuit-breaker`, `PUT /api/circuit-breaker`
- **CB 시드**: 10개 에이전트 기본 토큰 상한 자동 생성
- **Telegram**: 매일 23:00 KST 에이전트별 비용 요약 알림
- **MC UI**: `CostDashboard.tsx` (일별 BarChart + 에이전트 PieChart + CB 테이블), `/costs` 페이지, Sidebar 네비 추가

### 검증
- TypeScript 타입체크: shared + api + web 전부 통과
- 빌드: `pnpm -r build` 성공 (/costs 라우트 확인)
- 테스트: 66개 전부 통과
- brs-browser: 5/5 URL 성공 (4 lightpanda + 1 chromium fallback)
- 교차검증: sonnet 코드 리뷰 → 셸 인젝션, uniqueIndex 누락, 타이머 격리, NaN 방어 4건 즉시 수정

### 변경 파일 (16개)
| 워크스트림 | 파일 | 변경 |
|-----------|------|------|
| A | `~/.local/bin/lightpanda` | 신규 (바이너리) |
| A | `~/.config/systemd/user/lightpanda.service` | 신규 |
| A | `~/.best-research-stack/bin/brs-browser` | 수정 |
| A | `~/.best-research-stack/bin/brs-web` | 수정 |
| A | `~/hermes/TOOLS.md` | 수정 |
| B | `packages/shared/src/types.ts` | 수정 |
| B | `packages/shared/src/schemas.ts` | 수정 |
| B | `apps/api/src/schema.ts` | 수정 |
| B | `apps/api/src/db.ts` | 수정 |
| B | `apps/api/src/pg-schema.ts` | 수정 |
| B | `apps/api/src/store.ts` | 수정 |
| B | `apps/api/src/server.ts` | 수정 |
| B | `apps/web/lib/api-server.ts` | 수정 |
| B | `apps/web/components/CostDashboard.tsx` | 신규 |
| B | `apps/web/app/(layout)/costs/page.tsx` | 신규 |
| B | `apps/web/components/Sidebar.tsx` | 수정 |

---

## 2026-03-10: 텔레그램 미디어 다운로드 실패 수정 (IPv6→IPv4 강제)

### 원인
서버에 글로벌 IPv6 주소 없음 → Node.js가 IPv6 우선 시도 → 텔레그램 파일 다운로드 타임아웃 → "Failed to download media" 에러

### 변경 파일
- `ecosystem.config.js` — 모든 PM2 앱에 `NODE_OPTIONS=--dns-result-order=ipv4first` 추가
- `~/.bashrc` — 전역 `NODE_OPTIONS` 환경변수 추가
- `~/.openclaw/openclaw.json` — `channels.telegram.network.autoSelectFamily=false`
- `~/.config/systemd/user/openclaw-gateway.service.d/override.conf` — `OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY=1` + `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER=ipv4first`

---

## 2026-03-10: 문서 전면 현행화 — Phase 10 완료 반영

### 요약
실제 코드 상태에 맞춰 모든 프로젝트 문서를 검토·업데이트. 소모된 문서 17개 삭제, 핵심 문서 6개 현행화.

### 변경 파일
- `CLAUDE.md` — Phase 10 완료 반영, 설계 나침반 통합, 시스템 흐름 현행화
- `MISSION_CONTROL_CHECKLIST.md` — 전면 재작성 (Docker/PM2/Tunnel/Vault 동기화 포함)
- `docs/Vulcan_PRODUCT_MASTER.md` — v3 전면 현행화 ("현재/목표" 이분법 제거, 19개 테이블/80개+ API/13개 화면 반영)
- `docs/Vulcan_BRAND_MASTER.md` — v1.1 안티패턴 섹션 현행화 (에이전트 제어/승인/메트릭스 실제 구현 반영)
- `docs/ROADMAP.md` — Phase 0~10 완료, Phase 11~12 백로그
- `docs/BACKLOG.md` — 완료 항목 제거, Vault 아이디어 5개 추가

### 삭제된 파일 (17개)
README.orig.md, docs/ARCHITECTURE.md, docs/ACCEPTANCE.md, docs/SECURITY.md, docs/OPS_CHECKLIST.md, docs/BRAND.md, docs/E2E_PHASE3_LAST_RUN.md, docs/E2E_PHASE3_REPORT.md, docs/E2E_SESSION_SEND_RUNBOOK.md, docs/ACCOUNT_ROUTING_POLICY.md, docs/AGENT_ROUTING_MATRIX.md, docs/ACCOUNT_STATUS.md, docs/MEGA_PLAN_EXEC_TEMPLATE.md, docs/HERMES_UPGRADE_MINIMAL.md, .omx/plans/open-questions.md, .omx/plans/phase-0-kickoff-2026-03-06.md, .omx/plans/phase-2-batch1-websocket-gateway-rpc-2026-03-06.md

---

## 2026-03-10: Vault UI 수정 — 입력창 겹침, 구문강조 CSS, 수동싱크, hydration 수정

### 요약
- 검색창/입력창 아이콘·placeholder 텍스트 겹침 수정 (`.has-icon` CSS 클래스)
- `highlight.js` 코드 구문강조 CSS 글로벌 import 추가
- 수동 볼트 싱크 버튼 추가 (노트 목록 + 열린 노트 새로고침)
- React hydration #418 에러 해결 (VaultExplorer를 `next/dynamic` SSR 비활성화)

### 변경 파일
- `apps/web/app/globals.css` — highlight.js CSS import, `.has-icon` 클래스
- `apps/web/components/VaultExplorer.tsx` — 싱크 버튼, `has-icon` 클래스, RefreshCw import
- `apps/web/app/(layout)/vault/page.tsx` — Server Component 분리
- `apps/web/app/(layout)/vault/client.tsx` — Client Component 래퍼 (dynamic import)
- `apps/web/package.json` — highlight.js 추가

---

## 2026-03-10: Obsidian Vault 기본 사용성 이식 (8개 기능)

### 요약
Vault UI를 Obsidian 네이티브에 가깝게 고도화. 첨부파일 서빙, 마크다운 확장(highlight/callout/구문강조), 에디터 툴바, URL 딥링크, 검색 snippet 등 8개 기능 일괄 구현.

### 신규/변경 API
| 메서드 | 경로 | 기능 |
|--------|------|------|
| GET | `/api/vault/files/*` | 첨부파일 바이너리 서빙 (MIME 화이트리스트 + Cache-Control) |
| POST | `/api/vault/search` | 검색 결과에 snippet(문맥 미리보기 ±60자) 포함 |

### MarkdownRenderer 강화
- **==highlight==** 지원: 커스텀 remark 플러그인 → `<mark>` 렌더링
- **Callout/Admonition**: `> [!NOTE]` 등 Obsidian callout 문법 → 아이콘+컬러 카드 (14종 지원)
- **코드 구문 강조**: `rehype-highlight` 적용
- **이미지 상대경로 자동 처리**: `attachments/...` → `/api/vault/files/...` prefix 자동 추가

### MarkdownEditor 강화
- **서식 툴바**: Bold, Italic, Heading, Link, Image, List, Checkbox, Code, Quote (9개 버튼)
- **단축키**: Ctrl+B (굵게), Ctrl+I (기울임), Ctrl+K (링크)
- **이미지 드래그앤드롭**: drop 이벤트 핸들러 추가 (기존 paste와 동일 로직)

### URL 딥링크 + 브라우저 히스토리
- `?note=Oracle/Daily/2026-03-01.md` 쿼리파라미터로 직접 링크
- `router.push`로 URL 업데이트 → 뒤로가기 자동 지원
- 페이지 로드 시 `searchParams`에서 노트 경로 읽어 자동 선택

### 검색 결과 본문 미리보기
- API: 매칭 위치 전후 ~60자 snippet 추출
- UI: 검색 모드에서 결과 목록 표시 + 매칭 키워드 `<mark>` 강조

### 변경 파일
- `apps/api/src/vault.ts` — readVaultFile(), searchVaultNotesWithSnippet(), ALLOWED_MIME
- `apps/api/src/server.ts` — GET /api/vault/files/* 라우트 추가
- `apps/web/components/MarkdownRenderer.tsx` — highlight, callout, rehype-highlight, img 경로
- `apps/web/components/MarkdownEditor.tsx` — 툴바, 단축키(Ctrl+B/I/K), D&D
- `apps/web/components/VaultExplorer.tsx` — 딥링크, SearchResultList, initialNotePath
- `apps/web/app/(layout)/vault/page.tsx` — searchParams 처리
- `apps/web/package.json` — rehype-highlight, @types/mdast 추가

---

## 2026-03-10: Obsidian Vault 편집 기능 전면 구축

### 요약
Vault UI를 읽기 전용에서 **완전한 CRUD + 편집기**로 고도화. CodeMirror 6 기반 마크다운 에디터, 이미지 업로드, 노트 이름 변경까지 구현.

### 신규 API 엔드포인트 (6개)
| 메서드 | 경로 | 기능 |
|--------|------|------|
| PUT | `/api/vault/notes/:path` | 노트 내용 수정 (frontmatter 보존) |
| POST | `/api/vault/notes` | 새 노트 생성 (중복 시 409, 폴더 자동 생성) |
| DELETE | `/api/vault/notes/:path` | 노트 삭제 |
| PATCH | `/api/vault/notes/:path` | 노트 이름/경로 변경 |
| POST | `/api/vault/upload` | 이미지/첨부파일 업로드 (multipart) |

### 신규 컴포넌트
- `MarkdownEditor.tsx` — CodeMirror 6 기반 (마크다운 문법 하이라이팅, 라인 넘버, Vulcan 다크 테마, 이미지 붙여넣기)

### UI 기능
- **편집 모드**: CodeMirror 6 에디터 + 분할 프리뷰 (view/edit 토글)
- **새 노트**: 경로 입력 모달 (폴더 자동 생성)
- **삭제**: 확인 대화상자 포함
- **이름 변경**: rename 모달
- **이미지 붙여넣기**: 클립보드 → 자동 업로드 → `![](attachments/...)` 삽입
- **단축키**: Ctrl+S 저장, Esc 취소

### 백엔드 함수 (vault.ts)
- `writeVaultNote()` — 기존 노트 수정 (frontmatter 자동 보존)
- `createVaultNote()` — 새 노트 생성 (중복 방지 + 디렉토리 자동 생성)
- `deleteVaultNote()` — 노트 삭제
- `renameVaultNote()` — 이름/경로 변경
- `uploadToVault()` — attachments/ 폴더에 파일 저장

### 보안
- 모든 경로 조작에 `assertInsideVault()` path traversal 방어 적용
- 모든 mutation에 audit log + event publish

### 변경 파일 (6개)
| 파일 | 변경 |
|------|------|
| `apps/api/src/vault.ts` | write/create/delete/rename/upload 함수 추가 |
| `apps/api/src/server.ts` | PUT/POST/DELETE/PATCH/upload 라우트 추가 |
| `apps/web/components/MarkdownEditor.tsx` | **신규** — CodeMirror 6 에디터 |
| `apps/web/components/VaultExplorer.tsx` | 편집 UI 전면 개편 |
| `apps/web/package.json` | CodeMirror 6 의존성 추가 |
| `pnpm-lock.yaml` | 락파일 |

### 검증
- `tsc --noEmit` — 통과
- `pnpm build` — 통과 (13개 라우트)
- `pnpm lint` — 통과

---

## 2026-03-10: UI/UX 크로스체크 리뷰 후 접근성 + 디자인 토큰 보강

### 요약
Phase A~D UI/UX 전면 개편 결과에 대한 크로스체크 리뷰를 수행하고, 발견된 심각(S1~S6) + 개선필요(M1~M11) 총 17건의 이슈를 전부 수정했다.

### 심각 이슈 (S1~S6)
- ✅ S1: `focus-visible` 포커스 링 전역 정의 + `--color-focus-ring` 토큰
- ✅ S2: `caption-text` 대비율 수정 (`#8d877f` → `#a39d95`, WCAG AA 4.5:1+)
- ✅ S3: `StatusDot` role="img" + aria-label + 하드코딩 색상 토큰화
- ✅ S4: `Modal` WAI-ARIA (role, aria-modal, aria-labelledby, focus trap, Escape, body scroll lock)
- ✅ S5: `Sidebar` aria-label/aria-hidden + `Layout` 오버레이 접근성
- ✅ S6: 하드코딩 색상 토큰화 (25개 인스턴스 → CSS 변수)

### 개선필요 이슈 (M1~M11)
- ✅ M1: `KanbanBoard` 영문 라벨 한국어화 (6-lane + 우선순위)
- ✅ M2: `ApprovalsPanel` 상태/모드 한국어 매핑
- ✅ M3: `AgentLifecyclePanel` window.confirm → Modal 컴포넌트
- ✅ M4: `MemoryBoard` 인라인 모달→Modal + Toast 피드백 + EmptyState
- ✅ M6: `Toast` aria-live, role="alert", 닫기 버튼
- ✅ M7: `Tabs` WAI-ARIA (role="tablist"/"tab", 화살표 키, roving tabIndex)
- ✅ M8: `Input`/`Select` useId(), aria-invalid, aria-describedby
- ✅ M9: `AgentCommandPanel`/`GatewayOpsPanel` label-input htmlFor/id 연결
- ✅ M10: `DocsExplorer`/`KanbanBoard` EmptyState 컴포넌트 통일
- ✅ M11: 토큰 네이밍 정리 (color-primary-12 → color-primary-bg) + section/card-title 분리

### 추가 토큰
- `--color-chart-1~8`: 차트 팔레트 토큰
- `--color-destructive-hover`: 파괴적 버튼 hover 토큰
- `--color-focus-ring`: 포커스 링 토큰

### Layout 개선
- `useSyncExternalStore`로 localStorage 읽기 (lint 규칙 준수)

### 검증
- `pnpm lint` — 통과 (ESLint 에러 0)
- `pnpm build` — 통과 (13개 라우트 정상 생성)

### 변경 파일 (18개)
| 구분 | 파일 |
|------|------|
| 토큰 | `styles/tokens.css`, `app/globals.css` |
| 레이아웃 | `app/(layout)/layout.tsx` |
| 공통 UI | `components/ui/{Button,Modal,Toast,Tabs,Input,Select,StatusDot,EmptyState}.tsx` |
| 페이지 | `components/{Sidebar,Topbar,KanbanBoard,ActivityDashboard,ApprovalsPanel,LiveActivityPanel,MemoryBoard,DocsExplorer,SkillsMarketplace,TaskDetailModal,VaultExplorer}.tsx` |
| Team | `components/team/{AgentCommandPanel,AgentLifecyclePanel,GatewayOpsPanel}.tsx` |

---

## 2026-03-10: Hermes 기억 시스템 강화 (P0 + P1)

### 요약
OpenClaw memorySearch 활성화(P0) + Vulcan 메모리 시스템 확장(P1). 설정 변경 + 코드 변경 모두 포함.

### P0: 설정 활성화
- ✅ `openclaw.json` — memorySearch(하이브리드 BM25+vector, temporal decay 30일, MMR, sessionMemory) + memoryFlush(60K 토큰 임계값) 설정 추가
- ✅ `MEMORY.md` — 체계적 구조 재편 (프로필/프로젝트/패턴/교훈/자기개선 섹션화)
- ✅ 메모리 서브 파일 생성: `projects.md`, `patterns.md`, `lessons.md`, `self-improvement.md`

### P1: Vulcan 코드 변경
- ✅ MemoryItem 스키마 확장: `profile|lesson` container, `updatedAt`, `importance`, `expiresAt`, `memoryType` 추가
- ✅ DB 스키마: SQLite(schema.ts) + PostgreSQL(pg-schema.ts) 양쪽 컬럼 추가
- ✅ DB 마이그레이션: `ensureLegacyBootstrap()`에 `ensureColumn()` 4개 추가 (기존 DB 호환)
- ✅ API CRUD: `POST /api/memory`, `PATCH /api/memory/:id`, `DELETE /api/memory/:id`, `GET /api/memory/search`
- ✅ MemoryBoard UI: 4탭(저널/장기기억/프로필/교훈), importance 별표, 만료 임박 하이라이트, 편집 모달, 삭제 기능
- ✅ smoke test 수정: 메모리 페이지 테스트를 탭 UI에 맞게 업데이트

### 검증
- `pnpm lint` — 통과 (shared/api/web 모두)
- `pnpm build` — 통과 (13개 라우트)
- `pnpm test:smoke` — 메모리 테스트 통과 (나머지 실패는 기존 이슈)

### 변경 파일
| 구분 | 파일 |
|------|------|
| P0 설정 | `~/.openclaw/openclaw.json` |
| P0 메모리 | `~/MEMORY.md`, `~/memory/{projects,patterns,lessons,self-improvement}.md` |
| P1 타입 | `packages/shared/src/types.ts` |
| P1 DB | `apps/api/src/{schema,pg-schema,db}.ts` |
| P1 API | `apps/api/src/{server,store}.ts` |
| P1 UI | `apps/web/components/MemoryBoard.tsx`, `apps/web/app/(layout)/memory/page.tsx`, `apps/web/lib/api-server.ts` |
| P1 테스트 | `apps/web/tests/smoke/vulcan.smoke.spec.ts` |

### 후속 작업
- ⚠️ Gateway 재시작 후 Telegram에서 `memory_search` 동작 확인 필요
- ⚠️ PM2 프로세스 재시작 필요 (사용자 확인 후)

---

## 2026-03-10: UI/UX 전면 개편 (Phase A~D)

### 요약
Brand Master 문서를 코드에 100% 반영하는 UI/UX 전면 개편 완료. 기능 변경 없이 디자인 시스템 정비, 컴포넌트 분리, 한국어 UI 우선 적용.

### 완료 항목

**Phase A: 디자인 시스템 기반 정비**
- ✅ `styles/tokens.css` — semantic 상태 토큰 쌍 (success/warning/destructive/info bg/text/border), surface-hover/active, spacing 토큰
- ✅ `app/globals.css` — @theme inline 토큰 등록, 타이포그래피 클래스, page-enter 애니메이션, skeleton, prefers-reduced-motion
- ✅ `components/ui/` — Button, Badge, Card, Modal, Toast, Input, Select, Tabs, StatusDot, EmptyState 10개 공통 컴포넌트
- ✅ `lib/ui-utils.ts` — statusBadgeMap, eventCategoryColorMap, laneColorMap, approvalStatusColorMap, commandStatusColorMap
- ✅ `lib/ui-types.ts` — BadgeStatus 타입

**Phase B: Sidebar + Topbar + 레이아웃 개편**
- ✅ Sidebar — 12개 lucide-react 아이콘, M0 Scope 제거, 접힌 상태(토글), Gateway 연결 dot
- ✅ Topbar — breadcrumb, 검색바, Button 컴포넌트 적용
- ✅ Layout — ToastProvider, sidebar collapse persist (useSyncExternalStore), max-w-[1600px], page-enter

**Phase C: 페이지별 컴포넌트 리팩토링**
- ✅ TeamControlBoard 735줄 → 4개 하위 컴포넌트 + 80줄 컨테이너
  - team/AgentRoster, AgentCommandPanel, AgentLifecyclePanel, GatewayOpsPanel
- ✅ OfficeView 421줄 → 3개 하위 컴포넌트 + 100줄 컨테이너, Demo Controls 제거
  - office/ZoneBoard, AgentDetailCard, CommandHistory
- ✅ ActivityDashboard — 차트 토큰 색상, Button/Tabs/EmptyState 적용
- ✅ ApprovalsPanel — Tabs/Button/Badge/EmptyState, approvalStatusColorMap
- ✅ LiveActivityPanel — 토큰 색상
- ✅ KanbanBoard — 토큰 색상, snap-x 모바일 스크롤
- ✅ MemoryBoard, DocsExplorer — 토큰/공통 컴포넌트 적용

**Phase D: 비주얼 폴리싱 + 한국어화**
- ✅ page-enter 애니메이션, prefers-reduced-motion, skeleton CSS
- ✅ 타이포그래피 위계 클래스 정의 (page-title, section-title, card-title, body-text, caption-text)
- ✅ **한국어 UI 전면 적용** — Sidebar 12개 메뉴, Topbar 페이지 제목/검색/버튼, KanbanBoard 필터/라벨, TeamControlBoard 하위 패널, OfficeView/CommandHistory, LiveActivityPanel, ActivityDashboard, MemoryBoard, DocsExplorer

### 검증
- `pnpm lint` — 통과 (ESLint 에러 0)
- `pnpm build` — 통과 (13개 라우트 정상 생성)

### 변경 파일 (30+개)
| 구분 | 파일 |
|------|------|
| 신규 | `components/ui/{Button,Badge,Card,Modal,Toast,Input,Select,Tabs,StatusDot,EmptyState,index}.tsx` |
| 신규 | `components/team/{AgentRoster,AgentCommandPanel,AgentLifecyclePanel,GatewayOpsPanel}.tsx` |
| 신규 | `components/office/{ZoneBoard,AgentDetailCard,CommandHistory}.tsx` |
| 신규 | `lib/ui-utils.ts`, `lib/ui-types.ts` |
| 수정 | `styles/tokens.css`, `app/globals.css`, `app/(layout)/layout.tsx` |
| 수정 | `components/{Sidebar,Topbar,TeamControlBoard,OfficeView,KanbanBoard}.tsx` |
| 수정 | `components/{ActivityDashboard,ApprovalsPanel,LiveActivityPanel,MemoryBoard,DocsExplorer}.tsx` |

---

## 2026-03-09: Phase 9 — Playwright 테스트 확장 (6 → 16)

### 요약
기존 6개 smoke 테스트를 16개로 확장. 7개 페이지 렌더링, 사이드바 네비게이션, API health, 크로스 페이지 이동 검증 추가.

### 완료 항목
- ✅ `apps/web/tests/smoke/vulcan.smoke.spec.ts` — 10개 테스트 추가 (총 16개)
  - 페이지 렌더링: team, activity, skills, approvals, vault, notifications, memory
  - 네비게이션: 12개 사이드바 링크 전체 검증
  - API: `/api/health` → `ok: true` 확인
  - 크로스 페이지: Tasks → Team → Activity 순차 이동
- ✅ `apps/web/app/(layout)/vault/error.tsx` — Vault 에러 fallback 추가 (API 미가용 시 graceful)
- ✅ `apps/api/package.json` — dev/start 스크립트에 `--env-file-if-exists=.env` 추가 (Vault 503 해결)
- ✅ `docs/WORK_PLAN.md` — Phase 9 Playwright 항목 완료 체크

### 검증
- `pnpm test:smoke` — 16/16 통과 (28.2s), Vault 포함 전체 정상 렌더링
- `pnpm lint` — 통과
- `pnpm build` — 통과

---

## 2026-03-09: Phase 10 — Docker Compose 인프라 컨테이너화

### 요약
PostgreSQL + Redis를 Docker Compose로 관리하도록 인프라 컨테이너화를 완료했다.
App(api/web/adapter)은 PM2 유지, 인프라만 Docker로 격리 관리.
기존 로컬 PostgreSQL(5432)/Redis(6379)와 충돌 방지를 위해 5433/6380 포트 사용.

### 완료 항목
- ✅ `docker-compose.yml` — PostgreSQL 16 Alpine + Redis 7 Alpine, healthcheck, 볼륨 영속
- ✅ `.env.docker` — Docker Compose 전용 POSTGRES_PASSWORD
- ✅ `ecosystem.config.js` — DATABASE_URL/REDIS_URL 기본값 설정 (5433/6380)
- ✅ `apps/api/.env.example` — Docker 연결 예시 주석 추가
- ✅ `package.json` (루트) — `infra:up`, `infra:down`, `infra:logs` 스크립트
- ✅ `.gitignore` — `.env.docker` 예외 추가

### 검증
- `docker compose up -d` — 컨테이너 정상 시작
- `docker compose ps` — postgres/redis healthy
- PostgreSQL 16.13 접속 확인 (Docker exec)
- Redis PONG 응답 확인 (Docker exec)
- `pnpm lint` — 통과
- `pnpm build` — 통과

### PM2 운영 연결
- ✅ `ecosystem.config.js` — DATABASE_URL/REDIS_URL을 환경변수 기반(`infraEnv`)으로 전환
- ✅ BullMQ `enqueueHealthcheckJob` jobId 콜론 버그 수정 (`:` → `-`)
- ✅ `~/.bashrc` — `REDIS_URL=redis://127.0.0.1:6380` 추가
- ✅ PM2 재시작 후 검증: PostgreSQL connected + Redis connected + workers true + Gateway connected

### 설계 결정
- PostgreSQL: 기존 로컬(5432) 유지 (실데이터 보존), Docker PG(5433)는 백업/테스트용
- Redis: Docker(6380)에서 제공 → BullMQ 큐/워커 실제 활성화
- App Docker화 보류: PM2 유지 (Gateway 연결, 디버깅 용이)

### 현재 상태
- ✅ M0 ~ Phase 10(인프라) 완료, Redis 실연결 활성화
- 🗂️ Phase 10 잔여: App Dockerfile, PM2→Docker 전환 (필요 시 별도 세션)
- 🗂️ Phase 11~12 예정(백로그)

---

## 2026-03-09: Phase 9 — Vitest 유닛/통합 테스트 + CI 강화

### 요약
Vitest를 도입하여 63개 테스트를 추가하고, CI에서 테스트 실패 시 빌드가 실패하도록 강화했다.

### 완료 항목

**Vitest 도입**
- ✅ `apps/api/vitest.config.ts` — ESM + @vulcan/shared alias 설정
- ✅ `apps/api/package.json` — vitest devDep + `test`/`test:watch` 스크립트

**유닛 테스트 (48개)**
- ✅ `telegram.test.ts` — escapeHtml, shouldNotify(기본필터/카테고리/타입/silentHours), formatEventMessage, formatApprovalRequestMessage, formatApprovalResultMessage, getApprovalInlineKeyboard
- ✅ `store.test.ts` — parseStringArray, parseJsonRecord (null/undefined/빈값/유효JSON/잘못된JSON)
- ✅ `constants.test.ts` — eventCategoryOf(모든 28종 타입→7카테고리 매핑), statusFromEventType

**Store 통합 테스트 (15개)**
- ✅ `__tests__/store-integration.test.ts` — 임시 SQLite DB로 실제 CRUD 검증
  - Agent CRUD (생성/조회/수정/비활성화)
  - Task CRUD (생성/조회/수정/레인변경/삭제/코멘트)
  - Event Ingestion (저장/조회/통계)
  - Approval Policy CRUD (생성/수정)
  - Audit Log, countRecords

**CI 강화**
- ✅ `.github/workflows/ci.yml` — Vitest 실행 단계 추가 (테스트 실패 시 CI 실패)
- ✅ `package.json` (루트) — `test` 스크립트 추가

**코드 변경**
- ✅ `store.ts` — `parseStringArray`, `parseJsonRecord` export 추가
- ✅ `telegram.ts` — `escapeHtml` export 추가
- ✅ `server.ts` — `app` export + 직접 실행 시에만 서버 시작 (테스트에서 import 가능)

### 검증
- `pnpm test` — 63개 테스트 통과 (4 파일, 1.46s)
- `pnpm lint` — shared + api + web 타입체크/린트 통과
- `pnpm build` — 전체 빌드 성공

### 잔여/후속
- Playwright 확장: 기존 6개 smoke 테스트 유지, 필요 시 별도 세션
- Hono app 통합 테스트: server.ts 팩토리 패턴 리팩토링 후 가능 (Gateway/BullMQ 의존성 분리 필요)
- 기존 Node.js test (gateway-rpc): 동작하므로 Vitest 포팅 보류

---

## 2026-03-09: Phase 8 승인/거버넌스 — Telegram 인라인 키보드 승인

### 요약
Phase 8 승인/거버넌스의 Telegram 승인 경로를 구현했다.
기존 웹 URL 딥링크 방식에서 **Telegram 인라인 키보드 버튼**으로 전환하고,
외부 노출 없이 동작하도록 **Long Polling** 방식을 채택했다.

### 완료 항목

**데이터 모델**
- ✅ `packages/shared/src/types.ts` — `Approval`에 `telegramMessageId: number | null` 추가
- ✅ `apps/api/src/schema.ts` — `approvalsTable`에 `telegram_message_id` 컬럼 추가
- ✅ `apps/api/src/pg-schema.ts` — `approvalsPgTable`에 동일 컬럼 추가
- ✅ `apps/api/src/db.ts` — `ensureColumn` 자동 마이그레이션 추가
- ✅ `apps/api/src/store.ts` — `mapApproval` 필드 매핑 + `updateApprovalTelegramMessageId()` 함수 추가

**Telegram API 확장**
- ✅ `apps/api/src/telegram.ts`
  - `sendTelegramMessage` — `replyMarkup` 파라미터 + `messageId` 반환 추가
  - `editTelegramMessage` — 승인 처리 후 메시지 업데이트 (버튼 제거 + 결과 표시)
  - `answerCallbackQuery` — 버튼 클릭 시 toast 알림
  - `getApprovalInlineKeyboard` — 승인/거절 인라인 키보드 생성
  - `formatApprovalResultMessage` — 결과 텍스트 포맷 (✅ 승인됨 / ❌ 거절됨 / ⏰ 자동 승인됨)
  - `startTelegramPolling` / `stopTelegramPolling` — Long Polling 기반 콜백 수신
  - `formatApprovalRequestMessage` — URL 딥링크 제거, 텍스트만 반환

**서버 로직**
- ✅ `apps/api/src/server.ts`
  - `handleTelegramCallback` — 인라인 키보드 콜백 처리 (파싱 → resolve → 피드백 → 메시지 업데이트)
  - `sendApprovalNotification` — 인라인 키보드 첨부 + message_id 저장
  - `updateApprovalTelegramMsg` — 승인/거절/자동승인 시 원본 메시지를 결과로 교체
  - 서버 시작 시 자동 polling 시작, shutdown 시 정리
  - 웹 UI resolve 시에도 Telegram 메시지 업데이트

**설계 결정**
- Herald Bot (`@vulcan_herald_bot`) 전용 Alert 봇 사용 (기존 설정 활용)
- Webhook 대신 **Long Polling** (2초 간격) — Tailscale 내부 네트워크 외부 노출 방지
- `TELEGRAM_WEBHOOK_URL` 환경변수 불필요

### 버그 수정 (E2E 검증 중 발견)

**1. 알림 스팸 (heartbeat/sync 이벤트)**
- ✅ `apps/api/src/telegram.ts` — `shouldNotify`에 기본 제외 필터 추가
  - `DEFAULT_EXCLUDED_CATEGORIES`: `system`, `legacy`
  - `DEFAULT_EXCLUDED_TYPES`: `sync`, `ping`, `system.sync`, `system.health`

**2. 승인 후 커맨드 상태 미갱신**
- ✅ `apps/api/src/server.ts` — `executeApprovedCommand`에 inline Gateway RPC 실행 폴백 추가
  - Redis 없을 때 BullMQ 큐 대신 직접 Gateway RPC 실행

**3. Node.js fetch IPv6 ETIMEDOUT**
- ✅ `apps/api/src/server.ts` — `setDefaultAutoSelectFamily(false)` 추가
  - Node.js v22 undici의 IPv6 자동 선택으로 인한 Telegram API 연결 실패 해결

**4. PM2 환경변수 미전달**
- ✅ `ecosystem.config.js` — `telegramEnv` 조건부 스프레드 추가
  - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`를 PM2 환경에 주입

### 검증
- `pnpm lint` 통과
- `pnpm build` 통과
- **실환경 E2E 검증 완료**:
  - delegate 커맨드 → 승인 정책 매칭 → Telegram 인라인 키보드 발송 (messageId=44)
  - Telegram 승인 버튼 클릭 → status=`approved`, resolvedBy=`telegram`
  - 커맨드 상태 `pending_approval` → `sent` (executedAt 기록)
  - 알림 스팸 없음 (heartbeat/sync 필터링 정상)

### 현재 상태
- ✅ M0 ~ Phase 8 완료
- 🚧 Phase 9~10 병행 진행
- 🗂️ Phase 11~12 예정(백로그)

---

## 2026-03-09: Phase 11 백로그 정의 (예정)

### 요약
사용자 요청으로 Phase 11(Observability/Governance 업그레이드) 예정 항목을 문서화했다.
현재는 Phase 8~10 병행 진행 상태를 유지하고, Phase 11은 후속 작업용 백로그로 관리한다.

### 추가된 예정 범위
- ✅ Govrix 기능군 선택 도입 계획(트래픽 계측/PII/감사)
- ✅ PM Skills 워크플로우 이식 계획(Discovery→Strategy→PRD)
- ✅ everything-claude-code 핵심 모듈 선별 도입 계획(hook profile/verification/security)
- ✅ 토큰비·복잡도 가드레일 + 기능 플래그 전략
- ✅ 라이선스/저작권 최종 검증 체크리스트 작업 항목

---

## 2026-03-08: Phase 7 Telegram 알림 시스템 구현 (Herald Bot)

### 요약
Phase 7 전체를 완료. 이벤트 발생 시 Telegram 실시간 알림 파이프라인 전체를 구축했다.
`@vulcan_herald_bot`을 활용하여 이벤트 → 필터링 → BullMQ 큐(또는 로컬 폴백) → Telegram Bot API 발송 → 로그 기록 흐름을 완성.

### 완료 항목

**Batch 1: 데이터 + 알림 서비스**
- ✅ `packages/shared/src/types.ts` — NotificationCategory, NotificationPreference, NotificationLog 타입
- ✅ `packages/shared/src/schemas.ts` — updateNotificationPreferencesSchema (Zod)
- ✅ `apps/api/src/schema.ts` — notificationPreferencesTable, notificationLogsTable (SQLite)
- ✅ `apps/api/src/pg-schema.ts` — 동일 2개 테이블 (PostgreSQL)
- ✅ `apps/api/src/db.ts` — DDL 부트스트랩 + 인덱스
- ✅ `apps/api/src/store.ts` — CRUD 4개 함수 (getNotificationPreferences, upsertNotificationPreferences, appendNotificationLog, getNotificationLogs)
- ✅ `apps/api/src/telegram.ts` — **신규** Telegram Bot API 직접 호출, 이벤트 메시지 포맷, 카테고리/조용한시간 필터
- ✅ `apps/api/src/queue.ts` — NotificationQueueJobData, getNotificationQueue, enqueueNotificationJob, notification 워커

**Batch 2: API + 이벤트 후크 연동**
- ✅ `apps/api/src/server.ts` — 4개 엔드포인트 (GET/PUT preferences, POST test, GET logs) + 이벤트 구독 후크
- ✅ 이벤트 후크: subscribeEvents → shouldNotify 필터 → BullMQ 큐 enqueue (Redis 없으면 직접 발송 폴백)

**Batch 3: UI**
- ✅ `apps/web/components/Sidebar.tsx` — Notifications 항목 추가
- ✅ `apps/web/app/(layout)/notifications/page.tsx` — **신규** Server Component
- ✅ `apps/web/components/NotificationSettings.tsx` — **신규** 카테고리 토글(7종), 조용한 시간(KST), 테스트 발송, 발송 이력
- ✅ `apps/web/lib/api-server.ts` — getNotificationPreferences, getNotificationLogs
- ✅ `apps/web/lib/types.ts` — NotificationCategory, NotificationPreference, NotificationLog re-export

**기타**
- ✅ `package.json` — lint-staged에서 tsc -p와 파일 인자 충돌 해결 (bash -c 래핑)

### 검증
- tsc --noEmit (api + web) 통과
- pnpm lint 통과
- pnpm build 통과 (/notifications 라우트 정상 생성)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- ✅ Phase 3 완료
- ✅ Phase 4 완료
- ✅ Phase 5 완료
- ✅ Phase 6 완료
- ✅ Phase 7 완료
- ▶️ 다음: Phase 8 승인/거버넌스 또는 Phase 9 테스트 + CI/CD

---

## 2026-03-08: Phase 6 Activity/Audit + 메트릭스 완료

### 요약
Phase 6 전체를 완료. 이벤트 타입 체계화(28종 타입 + 7 카테고리), Activity/Audit API 필터링+페이지네이션, recharts 메트릭스 대시보드, LiveActivityPanel 강화를 구현했다.

### 완료 항목

**Batch 1: 데이터 + API 레이어**
- ✅ `packages/shared/src/constants.ts` — EVENT_TYPES(28종), EVENT_CATEGORIES(7카테고리), EVENT_CATEGORY_LABELS, EVENT_TYPE_ICONS, eventCategoryOf() 추가
- ✅ `packages/shared/src/types.ts` — ActivityStats 인터페이스 추가
- ✅ `apps/api/src/db.ts` — events(type,agent_id,source) + audit_log(action) 인덱스 4개 추가
- ✅ `apps/api/src/store.ts` — getActivityEvents(), getAuditLogsFiltered(), getEventStats() 함수 3개 추가
- ✅ `apps/api/src/server.ts` — GET /api/activity, GET /api/activity/stats, GET /api/audit 확장

**Batch 2: 메트릭스 대시보드 UI**
- ✅ `apps/web/package.json` — recharts ^2.15.0 의존성 추가
- ✅ `apps/web/lib/api-server.ts` — getActivityEvents(), getActivityStats(), getAuditLogs() 추가
- ✅ `apps/web/lib/types.ts` — ActivityStats, AuditLogItem re-export
- ✅ `apps/web/components/Sidebar.tsx` — Activity 네비게이션 항목 추가
- ✅ `apps/web/app/(layout)/activity/page.tsx` — Activity 페이지 Server Component (신규)
- ✅ `apps/web/components/ActivityDashboard.tsx` — 메트릭스 대시보드 (신규)
  - 4개 요약 카드 (이벤트 수, 활성 에이전트, 에러, 커맨드 성공률)
  - 시간대별 이벤트 BarChart, 에이전트별 PieChart, 타입별 분포 horizontal BarChart
  - Events/Audit 탭 피드 + 카테고리 필터 + Load More 페이지네이션
  - 엔티티 링크 (agentId → /team, taskId → /tasks)

**Batch 3: LiveActivityPanel 강화**
- ✅ `apps/web/components/LiveActivityPanel.tsx` — 전면 강화
  - 이벤트 카테고리 토글 칩 필터 (7개 카테고리)
  - 소스 링크 (agentId/taskId → next/link 이동)
  - IntersectionObserver 무한 스크롤
  - EVENT_TYPE_ICONS 기반 동적 아이콘/색상
  - 통계 요약 ("N events · N errors (1h)")

### 검증
- pnpm lint 통과
- pnpm build 통과 (/activity 라우트 정상 생성)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- ✅ Phase 3 완료
- ✅ Phase 4 완료
- ✅ Phase 5 완료
- ✅ Phase 6 완료
- ▶️ 다음: Phase 9 테스트 + CI/CD

---

## 2026-03-08: Phase 5 스킬 마켓플레이스 완료

### 요약
Phase 5 전체를 완료. 스킬 데이터 모델(skills/agent_skills/skill_registry 3개 테이블), Gateway 동기화 API 8개 엔드포인트, 2패널 마켓플레이스 UI(Catalog/Per Agent 탭)를 구현했다.

### 완료 항목

**Batch 1: 데이터 레이어**
- ✅ `packages/shared/src/types.ts` — Skill, AgentSkill, SkillRegistryEntry, SkillCategory 타입
- ✅ `packages/shared/src/schemas.ts` — skillCategorySchema, upsertSkillInputSchema, installSkillInputSchema
- ✅ `apps/api/src/schema.ts` — skillsTable, agentSkillsTable, skillRegistryTable (SQLite)
- ✅ `apps/api/src/pg-schema.ts` — 동일 3개 테이블 PostgreSQL 버전
- ✅ `apps/api/src/db.ts` — DDL 부트스트랩에 3개 테이블 + 5개 인덱스
- ✅ `apps/api/src/store.ts` — 스킬 CRUD 10개 함수 (트랜잭션 기반 syncAgentSkillsFromGateway 포함)

**Batch 2: API 레이어**
- ✅ `apps/api/src/server.ts` — 8개 API 엔드포인트 추가
  - `GET /api/skills` (카탈로그, category/q 필터)
  - `GET /api/skills/by-id/:id` (단건 조회)
  - `PUT /api/skills/by-name/:name` (upsert)
  - `GET /api/agents/:id/skills` (에이전트 스킬 목록)
  - `POST /api/agents/:id/skills` (설치 + Gateway sync)
  - `DELETE /api/agents/:id/skills/:skillName` (제거 + Gateway sync)
  - `POST /api/skills/sync` (전체 동기화)
  - `GET /api/skill-registry` (레지스트리)
- ✅ `apps/web/lib/api-server.ts` — getSkills, getAgentSkills, getSkillRegistry 함수

**Batch 3: UI 레이어**
- ✅ `apps/web/components/Sidebar.tsx` — Skills 네비게이션 추가
- ✅ `apps/web/app/(layout)/skills/page.tsx` — Skills 페이지 Server Component
- ✅ `apps/web/components/SkillsMarketplace.tsx` — 2패널 마켓플레이스 UI
  - 왼쪽: 카테고리 필터 + 검색 + 스킬 목록 + Sync 버튼 + 레지스트리
  - 오른쪽: Catalog 탭 (스킬 상세 + Install/Remove) + Per Agent 탭 (에이전트별 관리)
  - 에러 토스트 표시, 접근성(aria-pressed) 반영

### 외부 리뷰 (코드 검수)
- 판정: **CONDITIONAL PASS → 수정 후 PASS**
- 코드 품질 4.0/5, 아키텍처 4.5/5, 보안 3.5/5, 성능 3.0→4.0/5, UX 3.5→4.0/5
- HIGH 이슈 3건 수정 완료:
  - H-1: sync N+1 → SQLite 트랜잭션 적용
  - H-2: PG discoveredFrom uuid→text 타입 수정
  - H-3: API 경로 충돌 → `/api/skills/by-id/:id`, `/api/skills/by-name/:name` 분리
- MEDIUM 이슈 3건 수정 완료:
  - M-1: UI 에러 토스트 추가
  - M-3: handleInstall/handleRemove refreshSkills 일관성 통일
  - M-4: idx_agent_skills_skill 인덱스 추가

### 검증
- pnpm lint 통과
- pnpm build 통과 (/skills 라우트 정상 생성)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- ✅ Phase 3 완료
- ✅ Phase 4 완료
- ✅ Phase 5 완료
- ▶️ 다음: Phase 6 Activity/Audit + 메트릭스

---

## 2026-03-08: Phase 4 태스크 시스템 고도화 완료

### 요약
Phase 4 전체(3 Batch)를 완료. 태스크 데이터 모델 확장, 6-lane 칸반 + @dnd-kit 드래그앤드롭, TaskDetailModal(생성/수정/삭제/코멘트), 에이전트 할당 연동까지 구현.

### 완료 항목

**Batch 1: 데이터 레이어**
- ✅ `packages/shared/src/types.ts` — TaskLane 6-lane, TaskPriority, Task 확장 필드, TaskComment, TaskDependency
- ✅ `packages/shared/src/schemas.ts` — Zod 스키마 추가 (createTask, updateTask, createTaskComment, createTaskDependency)
- ✅ `apps/api/src/schema.ts` — tasks 테이블 확장 + task_comments, task_dependencies 테이블
- ✅ `apps/api/src/pg-schema.ts` — PostgreSQL 동일 확장
- ✅ `apps/api/src/store.ts` — mapTask 확장 + CRUD 11개 함수 (createTask, updateTask, deleteTask, addTaskComment, getTaskComments, addTaskDependency, getTaskDependencies, deleteTaskDependency 등)
- ✅ `apps/api/src/db.ts` — 레거시 SQLite 부트스트랩에 새 테이블/컬럼/인덱스 추가
- ✅ `apps/api/src/server.ts` — 새 API 엔드포인트 8개 (GET/POST tasks, PUT/DELETE tasks/:id, GET/POST comments, GET/POST/DELETE deps)

**Batch 2: 칸반 UI 재작성**
- ✅ `apps/web/components/KanbanBoard.tsx` — @dnd-kit 드래그앤드롭 + 6-lane 그리드 + 우선순위 아이콘/필터 + TaskDetail 연동
- ✅ `apps/web/components/TaskDetailModal.tsx` — 새 파일. 생성/수정/삭제 + 코멘트 조회/추가 모달

**Batch 3: 에이전트 할당 연동**
- ✅ `apps/web/lib/types.ts` — TaskComment, TaskDependency, TaskPriority re-export
- ✅ `apps/web/lib/schema.ts` — tasks 테이블 새 필드 반영
- ✅ `apps/web/lib/store/sqliteStore.ts` — mapTask 확장
- ✅ `apps/web/lib/api-server.ts` — getTasks 필터 확장 (projectId, assigneeAgentId, priority)

### 검증
- lint 통과 (shared + api + web)
- build 통과 (API + Next.js)

---

## 2026-03-07: Vault UI 구현 (Obsidian 볼트 웹 탐색기)

### 요약
Obsidian 볼트(마크다운 노트 저장소)를 웹에서 탐색/검색/클리핑할 수 있는 Vault 페이지를 추가했다.
좌측 파일 트리 + 우측 마크다운 뷰어 2컬럼 레이아웃, 디바운스 검색, URL 클리핑 기능을 포함한다.

### 완료 항목
- ✅ `apps/web/app/(layout)/vault/page.tsx` — Vault 페이지 (SSR, getVaultNotes)
- ✅ `apps/web/components/VaultExplorer.tsx` — 메인 컴포넌트
  - 재귀 TreeItem으로 폴더/파일 트리 구현
  - 디바운스(300ms) 실시간 검색
  - URL 클리핑 기능
  - useMemo/useCallback 최적화
  - Frontmatter 태그 추출 및 칩 표시
- ✅ `apps/web/components/MarkdownRenderer.tsx` — 마크다운 렌더러
  - react-markdown + remark-gfm
  - 코드 블록, 테이블, 외부 링크 커스텀 스타일링
  - Vulcan CSS 변수 시스템 완전 활용
- ✅ `apps/web/components/Sidebar.tsx` — 네비게이션에 Vault 항목 추가
- ✅ `apps/web/lib/api-server.ts` — getVaultNotes() 함수 추가
- ✅ `apps/web/package.json` — react-markdown, remark-gfm 의존성 추가

### 외부 리뷰 (Gemini)
- 판정: **통과 (PASS)**
- 의도 부합성, UX/UI, 코드 품질, CSS 일관성, 보안 모두 양호

### 개선 제안 반영 (3건 완료)
- ✅ `[[위키링크]]` 지원: `remark-wiki-link` 추가, 점선 밑줄 스타일, 클릭 시 노트 간 이동
- ✅ 클리핑 Toast 알림: 경량 `useToast` 훅 + `ToastContainer` 구현 (성공/실패 3초 자동 소멸)
- ✅ `TreeItem`에 `React.memo` 적용: 대규모 볼트 리렌더링 최적화

### 검증 결과
- `pnpm build` 성공
- `pnpm lint` 성공

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- ✅ Phase 3 완료 + 운영 하드닝 반영
- ✅ Vault UI 추가 완료
- ▶️ 다음: Phase 4 태스크 시스템 고도화

## 2026-03-06: Phase 3 운영 안정화 (PM2 토큰 덮어쓰기 방지 + 재배포 검증)

### 요약
PM2 `startOrReload` 시 `OPENCLAW_GATEWAY_TOKEN=""`이 주입되어 Gateway 연결이 끊길 수 있는 재발 리스크를 제거했다.
`ecosystem.config.js`를 수정해 토큰/패스워드가 실제로 있을 때만 env에 포함되도록 하드닝하고, 재배포 후 연결 상태를 다시 검증했다.

### 완료 항목
- ✅ `ecosystem.config.js`
  - `gatewayAuthEnv` 추가
  - `OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`를 빈 문자열 기본값에서 제거
  - PM2 env/env_production에서 인증 env를 조건부 주입으로 변경
- ✅ 재배포 및 상태 검증
  - `pm2 startOrReload ecosystem.config.js --env production`
  - `vulcan-api`, `vulcan-mc`, `vulcan-adapter` `online` 확인

### 검증 결과
- `node -e "require('./ecosystem.config.js')"` 성공
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)
- `GET /api/health` → `gateway.connected=true`, `protocol=3`
- `GET /api/gateway/status` → `connected=true`
- `GET /api/agents?includeInactive=1` → 에이전트 5개 조회 성공

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- ✅ Phase 3 완료 + 운영 하드닝 반영
- ▶️ 다음: Phase 4 태스크 시스템 고도화

## 2026-03-06: Phase 3 Batch 8 (Gateway Ops + pause/resume 마무리)

### 요약
Phase 3의 마지막 배치로 Gateway 운영 제어와 에이전트 일시정지/재개 흐름을 Team 화면에 통합했다.
`config.patch`, `cron.*`, `pause/resume` 경로를 UI/API 양쪽에서 연결해 에이전트 생명주기 관리 Phase를 닫았다.

### 완료 항목
- ✅ `apps/api/src/server.ts`
  - `POST /api/agents/:id/pause` 추가
  - `POST /api/agents/:id/resume` 추가
  - pause/resume 시 Gateway `sessions.patch` best-effort 호출 + 감사로그 기록
- ✅ `apps/web/components/TeamControlBoard.tsx`
  - lifecycle 액션에 `Pause/Resume` 추가
  - paused 상태 표시(`agent.config.paused`) 반영
  - Gateway Ops 패널 추가
    - `GET /api/gateway/status`
    - `GET /api/gateway/config`, `PATCH /api/gateway/config`
    - `GET /api/gateway/cron`, `GET /api/gateway/cron/status`
  - config patch JSON 입력 검증/오류 처리
- ✅ 문서 동기화
  - `CLAUDE.md`, `docs/WORK_PLAN.md`, `docs/ROADMAP.md`를 Phase 3 완료 기준으로 갱신
- ✅ 배포 안정화
  - 루트 `package.json`의 `start` 스크립트 인자 전달 수정 (`next start --port ...` 형태로 정상화)
  - PM2 `vulcan-mc` / `vulcan-adapter` 프로세스 재생성 후 `online` 상태 확인
- ✅ Gateway 실환경 연동 핫픽스
  - Gateway 인증 토큰 주입 후 `connected=true` 상태 복구
  - `pause/resume` RPC payload를 OpenClaw 스키마에 맞춰 수정 (`sessions.patch` + `sendPolicy`)
  - `direct/delegate/session send/spawn` 경로를 `chat.send(sessionKey)` 스키마로 정렬

### 검증 결과
- `pnpm --filter @vulcan/api lint` 성공
- `pnpm --filter @vulcan/web lint` 성공
- `pnpm --filter @vulcan/api test:gateway-rpc` 성공 (3/3)
- `pnpm --filter @vulcan/api test:gateway-event-adapter` 성공 (4/4)
- `pnpm --filter @vulcan/web build` 성공
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)
- 실환경 E2E 성공
  - `POST /api/agents/hermes/pause` → `gateway.ok=true`
  - `POST /api/agents/hermes/resume` → `gateway.ok=true`
  - `POST /api/agents/hermes/command` / `POST /api/agents/aegis/delegate` → command status `sent`
  - `POST /api/gateway/sessions/send` / `POST /api/gateway/sessions/spawn` → 성공 응답

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- ✅ Phase 3 완료 (Batch 8)
- ▶️ 다음: Phase 4 태스크 시스템 고도화

## 2026-03-06: Phase 3 Batch 7 (Mission Control UX 리파인: Tasks/Team/Office)

### 요약
Phase 3 일곱 번째 배치로 테마는 유지한 채 레이아웃/UX 밀도를 끌어올렸다.
특히 사용자 피드백 기준으로 조악했던 Tasks Kanban, Team(Agents), Office 화면의 정보 위계를 정리하고, Team lifecycle 액션에 confirm 단계를 추가했다.

### 완료 항목
- ✅ `apps/web/components/KanbanBoard.tsx`
  - 상단 요약/필터 바 재구성 (검색 + assignee + 총량)
  - lane 헤더 메타(아이콘/설명/카운트) 강화
  - 카드 메타(업데이트 시간/담당자) 가독성 개선
  - lane 이동 UX를 select 기반으로 정리 + optimistic rollback 보강
- ✅ `apps/web/components/TeamControlBoard.tsx`
  - 좌측 제어 패널/우측 상태별 roster 2패널 구조로 재배치
  - active/inactive 상태 가시성 강화
  - `deactivate/reactivate` confirm 단계 추가
  - `message/taskLabel` 입력 검증 강화 (taskLabel 규칙 검증)
- ✅ `apps/web/components/OfficeView.tsx`
  - Zone Board(상태→오피스 존) 중심 레이아웃 재구성
  - Selected Agent 상세/command history 우선순위 재정렬
  - Agent roster와 demo controls를 보조 패널화해 운영 동선 정리
- ✅ 문서 동기화
  - `CLAUDE.md`, `docs/WORK_PLAN.md`, `docs/ROADMAP.md`를 Batch 7 기준으로 갱신

### 검증 결과
- `pnpm --filter @vulcan/web lint` 성공
- `pnpm --filter @vulcan/web build` 성공
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- 🚧 Phase 3 진행중 (Batch 7 완료)
  - 다음 핵심: Gateway RPC 통합 잔여(`config.patch`, `cron.*`) + 에이전트 pause/resume 검증 UX

## 2026-03-06: Phase 3 Batch 6 (Team 제어 패널 + inactive 포함 조회)

### 요약
Phase 3 여섯 번째 배치로 에이전트 제어 UI를 Team 화면에 본격 연결했다.
inactive 에이전트까지 조회할 수 있도록 API를 확장하고, Team 제어 패널에서 direct/delegate/session/deactivate/reactivate를 실행할 수 있게 했다.

### 완료 항목
- ✅ `apps/api/src/store.ts`
  - `getAgents({ includeInactive })` 옵션 지원
- ✅ `apps/api/src/server.ts`
  - `GET /api/agents?includeInactive=1` 지원
- ✅ `apps/web/lib/api-server.ts`
  - `getAgents({ includeInactive })` 지원
- ✅ `apps/web/components/TeamControlBoard.tsx` 신규 추가
  - 대상 에이전트 선택
  - direct/delegate 호출
  - `sessions.send`/`sessions.spawn` 호출
  - deactivate/reactivate 액션
  - refresh/오류/성공 상태 처리
- ✅ `apps/web/app/(layout)/team/page.tsx`
  - 기존 read-only 카드 뷰 → 제어 패널 컴포넌트 연결

### 검증 결과
- `pnpm --filter @vulcan/web lint` 성공
- `pnpm --filter @vulcan/web build` 성공
- `pnpm --filter @vulcan/api lint` 성공
- `pnpm --filter @vulcan/api test:gateway-rpc` 성공 (3/3)
- `pnpm --filter @vulcan/api test:gateway-event-adapter` 성공 (4/4)
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- 🚧 Phase 3 진행중 (Batch 6 완료)
  - 다음 핵심: Team/Office 제어 패널의 입력 스키마 고도화 + confirm dialog/승인 UX

## 2026-03-06: Phase 3 Batch 5 (`sessions.spawn/send` 명시 API 연동)

### 요약
Phase 3 다섯 번째 배치로 Gateway 세션 계열 메서드를 명시 API로 노출했다.
기존 generic RPC(`/api/gateway/rpc`)와 별개로 `sessions.spawn/send`를 전용 엔드포인트로 제공해 UI/자동화에서 안전하게 호출할 수 있는 경로를 확보했다.

### 완료 항목
- ✅ `apps/api/src/gateway-rpc/client.ts`
  - `sessionsSpawn(params)`
  - `sessionsSend(params)`
- ✅ `apps/api/src/server.ts`
  - `POST /api/gateway/sessions/spawn`
  - `POST /api/gateway/sessions/send`

### 검증 결과
- `pnpm --filter @vulcan/api lint` 성공
- `pnpm --filter @vulcan/api test:gateway-rpc` 성공 (3/3)
- `pnpm --filter @vulcan/api test:gateway-event-adapter` 성공 (4/4)
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- 🚧 Phase 3 진행중 (Batch 5 완료)
  - 다음 핵심: `sessions.spawn/send`를 에이전트 제어 UI/위임 플로우에 직접 연결

## 2026-03-06: Phase 3 Batch 4 (오피스 커맨드 이력/재시도 UI 연결)

### 요약
Phase 3 네 번째 배치로 운영 API를 UI에 연결했다.
`OfficeView`에서 선택한 에이전트의 커맨드 이력을 조회하고, 실패 커맨드를 즉시 재시도할 수 있는 패널을 추가했다.

### 완료 항목
- ✅ `apps/web/components/OfficeView.tsx`
  - 선택 에이전트 변경 시 `/api/agent-commands` 조회
  - 커맨드 상태(queued/sent/failed) 시각화
  - 실패 커맨드 `Retry` 버튼 → `/api/agent-commands/:id/retry` 호출
  - refresh/loading/error 상태 처리
- ✅ `apps/web/lib/types.ts`
  - `AgentCommand`, `AgentCommandStatus` 타입 re-export

### 검증 결과
- `pnpm --filter @vulcan/web lint` 성공
- `pnpm --filter @vulcan/web build` 성공
- `pnpm --filter @vulcan/api lint` 성공
- `pnpm --filter @vulcan/api test:gateway-rpc` 성공 (3/3)
- `pnpm --filter @vulcan/api test:gateway-event-adapter` 성공 (4/4)
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- 🚧 Phase 3 진행중 (Batch 4 완료)
  - 다음 핵심: Team/Office 제어 UI 확장(생성/수정/비활성화/직접 명령) + `sessions.spawn/send` 연동

## 2026-03-06: Phase 3 Batch 3 (커맨드 조회/재시도 API)

### 요약
Phase 3 세 번째 배치로 커맨드 운영 가시성을 추가했다.
`agent_commands`를 조회/단건 조회할 수 있는 API를 추가하고, 실패 커맨드를 새 커맨드로 재큐잉하는 retry API를 도입했다.

### 완료 항목
- ✅ `apps/api/src/store.ts` 확장
  - `getAgentCommands(filters)` 추가
  - `getAgentCommandById(id)` 추가
- ✅ `apps/api/src/server.ts` API 추가
  - `GET /api/agent-commands` (`agentId`, `status`, `limit` 필터)
  - `GET /api/agent-commands/:id`
  - `POST /api/agent-commands/:id/retry` (failed 전용)
- ✅ 재시도 정책 구현
  - 원본 row overwrite 없이 신규 command row 생성
  - Redis 큐 사용 시 `202 queued`
  - Redis 미사용 시 inline 실행 폴백
  - retry 감사 로그(`agent.command.retry*`, `agent.delegate.retry*`) 기록

### 검증 결과
- `pnpm --filter @vulcan/api lint` 성공
- `pnpm --filter @vulcan/api test:gateway-rpc` 성공 (3/3)
- `pnpm --filter @vulcan/api test:gateway-event-adapter` 성공 (4/4)
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- 🚧 Phase 3 진행중 (Batch 3 완료)
  - 다음 핵심: 에이전트 제어 UI 연결 + `sessions.spawn/send` 경로 고도화

## 2026-03-06: Phase 3 Batch 2 (BullMQ 커맨드/헬스체크 워커)

### 요약
Phase 3 두 번째 배치로 비동기 실행 기반을 도입했다.
Redis(`REDIS_URL`)가 설정된 경우 `/delegate`, `/command` 요청은 BullMQ 커맨드 큐로 들어가고 워커가 Gateway RPC를 실행한다. 동시에 헬스체크 큐 워커가 Gateway 상태를 주기적으로 동기화한다.

### 완료 항목
- ✅ `apps/api/src/queue.ts` 확장
  - `vulcan-commands`, `vulcan-healthchecks` 큐 추가
  - command/healthcheck 워커 부트스트랩
  - queue job enqueue 유틸 추가 (`enqueueCommandJob`, `enqueueHealthcheckJob`)
  - 큐/워커 리소스 정리(`closeQueueResources`) 보강
- ✅ `apps/api/src/server.ts` 큐 연동
  - `/api/agents/:id/delegate`, `/api/agents/:id/command`:
    - Redis 사용 시 `202 queued` 비동기 처리
    - Redis 미사용 시 기존 inline 실행 폴백 유지
  - 워커 실행 로직 추가:
    - command job → `chat.send` 실행 + `agent_commands` 상태/감사로그 갱신
    - healthcheck job → `gateways` 상태 스냅샷 갱신
  - `/api/health`의 Redis 상태에 command/healthcheck 큐 및 워커 상태 노출
  - SIGINT/SIGTERM 시 queue/gateway 종료 처리

### 검증 결과
- `pnpm --filter @vulcan/api lint` 성공
- `pnpm --filter @vulcan/api test:gateway-rpc` 성공 (3/3)
- `pnpm --filter @vulcan/api test:gateway-event-adapter` 성공 (4/4)
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- 🚧 Phase 3 진행중 (Batch 2 완료)
  - 다음 핵심: 에이전트 관리 UI + 고급 Gateway 제어(`sessions.spawn/send`, config/cron UX 연결)

## 2026-03-06: Phase 3 Batch 1 (에이전트 생명주기 API 기본형 + 감사 로그)

### 요약
Phase 3의 첫 배치로 에이전트 생명주기 관리의 백엔드 기반을 구축했다.
에이전트 모델/스키마를 확장하고 `gateways`, `agent_commands`, `audit_log` 테이블을 도입했으며, 생명주기 API(`create/update/deactivate/delegate/command`)와 mutation 감사 로깅을 연결했다.

### 완료 항목
- ✅ 공유 타입/스키마 확장 (`@vulcan/shared`)
  - `Agent` 확장 필드: `skills`, `config`, `isActive`, `gatewayId`, `capabilities`
  - 입력 검증 스키마: `createAgent`, `updateAgent`, `delegate`, `command`
- ✅ API DB 스키마 확장 (`sqlite + pg`)
  - `agents` 컬럼 확장
  - 신규 테이블: `gateways`, `agent_commands`, `audit_log`
- ✅ SQLite 레거시 DB 업그레이드 보강
  - 기존 DB에서도 신규 컬럼/테이블이 자동 생성되도록 bootstrap 보강
  - 마이그레이션 저널 존재 시에도 보강 로직이 실행되도록 `ensureSchema` 수정
- ✅ Store 계층 기능 추가
  - agent CRUD(soft deactivate 포함), gateway upsert/list, command 이력, audit append/list
- ✅ Gateway RPC 연동 보강
  - `agentsCreate`, `agentsUpdate`, `agentsDelete` 래퍼 추가
- ✅ 생명주기 API 추가
  - `POST /api/agents`
  - `PUT /api/agents/:id`
  - `DELETE /api/agents/:id` (soft delete)
  - `POST /api/agents/:id/delegate`
  - `POST /api/agents/:id/command`
  - `GET /api/gateways`
  - `GET /api/audit?limit=`
- ✅ mutation 감사 로깅 적용
  - `PATCH /api/tasks/:id`
  - `POST /api/events`
  - `POST /api/adapter/ingest`
  - 신규 생명주기 엔드포인트

### 검증 결과
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm --filter @vulcan/api test:gateway-rpc` 성공 (3/3)
- `pnpm --filter @vulcan/api test:gateway-event-adapter` 성공 (4/4)
- `pnpm test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- 🚧 Phase 3 진행중 (Batch 1 완료)
  - 다음 핵심: BullMQ 워커/제어 UI/고급 Gateway 제어 통합

## 2026-03-06: Phase 2 Batch 3 (Gateway 이벤트 어댑터 전환 + 팬아웃 정합화)

### 요약
Phase 2의 마지막 배치로 이벤트 수집 경로를 로그 파일 폴링에서 Gateway WebSocket 직접 수신으로 전환했다.
Gateway 이벤트를 ingest 이벤트로 변환하는 모듈/테스트를 추가하고, 어댑터 실행 경로(`pnpm adapter`)를 API Gateway 어댑터로 전환해 Redis Pub/Sub 팬아웃 경로를 완성했다.

### 완료 항목
- ✅ `apps/api/src/gateway-rpc/event-adapter.ts` 추가
  - Gateway event → Vulcan ingest event 변환
  - 이벤트 타입/요약/agentId 추론
  - fingerprint 기반 dedupe 유틸
- ✅ `apps/api/scripts/adapter-openclaw-gateway.ts` 추가
  - Gateway WS 이벤트 수신
  - rate-limit + heartbeat + ingest 전송
  - graceful shutdown 처리
- ✅ 실행 경로 전환
  - 루트 `pnpm adapter` → API Gateway 어댑터
  - PM2 `vulcan-adapter` env를 Gateway 기준으로 갱신
- ✅ 테스트 추가
  - `event-adapter` 변환 규칙 테스트 4종

### 검증 결과
- `pnpm --filter @vulcan/api test:gateway-event-adapter` 성공 (4/4)
- `pnpm --filter @vulcan/api test:gateway-rpc` 성공 (3/3)
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- ✅ Phase 2 완료
- 🔜 **다음 작업: Phase 3 — 에이전트 생명주기 관리**

## 2026-03-06: Phase 2 Batch 2 (Gateway RPC 클라이언트 + v3 핸드셰이크)

### 요약
Phase 2의 두 번째 배치로 OpenClaw Gateway RPC 연결을 API에 내장했다.
챌린지 기반(v3) 인증 핸드셰이크와 지수 백오프 재연결을 구현하고, `agents/chat/sessions/config/cron` 네임스페이스 호출을 위한 래퍼/엔드포인트를 추가했다.

### 완료 항목
- ✅ `apps/api/src/gateway-rpc/*` 신규 모듈 추가
  - `connect.challenge` 기반 v3 서명 핸드셰이크
  - `agents.*`, `chat.*`, `sessions.*`, `config.*`, `cron.*` 래퍼
  - 자동 재연결(지수 백오프), 상태 스냅샷(`getStatus`)
- ✅ Hono API에 Gateway 제어 엔드포인트 추가
  - `/api/gateway/status`
  - `/api/gateway/rpc`
  - `/api/gateway/agents`
  - `/api/gateway/chat/send`, `/api/gateway/chat/abort`
  - `/api/gateway/sessions`, `/api/gateway/sessions/reset`
  - `/api/gateway/config`
  - `/api/gateway/cron`, `/api/gateway/cron/status`
- ✅ `/api/health` 응답에 Gateway 연결 상태 포함
- ✅ 운영 설정 반영
  - `apps/api/.env.example`: Gateway URL/인증/재연결 정책 변수 추가
  - `ecosystem.config.js`: API 프로세스 Gateway env 반영
- ✅ Gateway mock 통합 테스트 추가
  - 정상 핸드셰이크 + `agents.list`
  - 재연결 시나리오
  - challenge timeout 시나리오

### 검증 결과
- `pnpm --filter @vulcan/api test:gateway-rpc` 성공 (3/3)
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)

### 범위 경계 (다음 배치)
- ⏭️ Phase 2 잔여:
  - Redis Pub/Sub 팬아웃 (Gateway 이벤트 → 모든 클라이언트)
  - 로그 파일 폴링 어댑터를 Gateway 이벤트 직접 수신으로 대체

## 2026-03-06: Phase 2 Batch 1 (WebSocket 실시간 경로 전환)

### 요약
Phase 2의 첫 배치로 WebSocket 경로를 도입했다.
`/api/ws` 엔드포인트와 공용 메시지 프로토콜을 추가하고, 프론트엔드 실시간 수신을 SSE에서 WebSocket 기본 경로로 전환했다.

### 완료 항목
- ✅ `@vulcan/shared`에 실시간 프로토콜 타입/스키마 추가
  - `event | command | ack | error` envelope
- ✅ Hono API에 `/api/ws` WebSocket 엔드포인트 추가 (`@hono/node-ws`)
  - seed 이벤트 전송
  - `command: ping` → `ack: pong` 처리
  - heartbeat ack 전송
- ✅ 프론트엔드 `useVulcanWebSocket` 훅 추가 (자동 재연결)
- ✅ `LiveActivityPanel` 실시간 입력 경로를 WebSocket으로 전환
  - WebSocket 단절 시 기존 `/api/events?since=` 폴링 폴백 유지
- ✅ Playwright/PM2 환경에 `NEXT_PUBLIC_VULCAN_WS_URL` 반영

### 검증 결과
- `pnpm lint` 성공
- `pnpm build` 성공
- `pnpm test:smoke` 성공 (6/6)
- 수동 WebSocket 검증 성공
  - `ws://127.0.0.1:8793/api/ws` 연결
  - `command ping` → `ack pong` 수신
  - `POST /api/events` 후 `type:event` 프레임 수신

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- 🚧 Phase 2 진행중 (Batch 1 완료)
  - 다음 핵심: OpenClaw Gateway RPC 클라이언트/핸드셰이크, Redis 팬아웃 정합화

## 2026-03-06: Phase 1 PostgreSQL 전환 마무리 (완료)

### 요약
Phase 1의 남은 PostgreSQL 전환 항목을 마무리했다.
PostgreSQL 마이그레이션 정합성을 보정하고, SQLite → PostgreSQL 데이터 이관 경로를 임시 DB에서 실증했다.

### 완료 항목
- ✅ PostgreSQL Drizzle 스키마 보정 (`docs.created_at`, `docs.updated_at` 컬럼명 정합성)
- ✅ 초기 PostgreSQL 마이그레이션 SQL 보정 (`pgcrypto` 확장 + 컬럼명 정합성)
- ✅ SQLite → PostgreSQL 이관 스크립트 개선
  - `--dry-run`에서 `DATABASE_URL` 없이 실행 가능
  - SQLite 파일 존재 여부 검증 + 경로 출력
- ✅ SQLite 런타임 마이그레이션 경로 회귀 수정
  - `apps/api/drizzle`(PostgreSQL)와 SQLite 마이그레이션 경로 충돌 분리

### 검증 결과
- `pnpm --filter @vulcan/api exec node --input-type=module ...` (clean DB 생성 후 Drizzle migration 적용) 성공
  - public 테이블 7종 생성 확인 (`agents/projects/tasks/events/memory_items/docs/schedules`)
- `env -u DATABASE_URL pnpm --filter @vulcan/api migrate:sqlite-to-pg -- --dry-run` 성공
- `pnpm --filter @vulcan/api exec node --input-type=module ...` (임시 DB에서 실제 `sqlite-to-postgres` 실행) 성공
  - row count 검증: `agents 5 / projects 3 / tasks 4 / events 106 / memory_items 4 / docs 3 / schedules 3`
- `pnpm build` 성공
- `pnpm lint` 성공
- `pnpm test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- ✅ Phase 1 완료
- 🔜 **다음 작업: Phase 2 — WebSocket + Gateway RPC**

## 2026-03-06: Phase 1 Kickoff (Hono API + 연결 상태)

### 요약
Phase 1의 첫 배치를 구현했다.
`apps/api`를 신설해 기존 12개 API를 Hono로 포팅하고, PostgreSQL/Redis 연결 상태를 Health에 포함했다.

### 완료 항목
- ✅ `apps/api` 워크스페이스 신설 (`hono`, `@hono/node-server`, `pg`, `ioredis`, `bullmq`)
- ✅ API 포팅: agents/projects/tasks/events/stream/adapter/memory/docs/schedule/health
- ✅ 미들웨어 적용: CORS, 보안 헤더, 로깅, 공통 에러 응답
- ✅ Health 확장: SQLite + PostgreSQL + Redis 상태 리포트
- ✅ 이벤트 스트림 in-memory → Redis Pub/Sub 전환 (REDIS_URL 기반)
- ✅ Next.js API Route 제거 + `/api/*` → Hono rewrite 연결
- ✅ Web 서버 컴포넌트 데이터 로드를 Store 직접 호출 → Hono API fetch로 전환
- ✅ PM2 설정에 `vulcan-api` 프로세스 추가
- ✅ 어댑터 기본 인제스트 URL을 API(8787) 기준으로 전환

### 검증 결과
- `pnpm --filter @vulcan/api build` 성공
- `pnpm --filter @vulcan/api lint` 성공
- `pnpm build` 성공 (shared + api + web)
- `pnpm lint` 성공 (shared + api + web)
- 임시 API 기동 후 검증:
  - `GET /api/health` 응답 확인
  - `GET /api/agents` 응답 확인
  - `POST /api/events`, `PATCH /api/tasks/:id`, `POST /api/adapter/ingest` 동작 확인
- `pnpm test:smoke` 성공 (Playwright webServer로 API+Web 동시 기동, 6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- 🚧 Phase 1 진행중
  - 남은 핵심: PostgreSQL 스키마 전환, 외래키/데이터 마이그레이션, Redis Pub/Sub 이벤트 스트림 전환

## 2026-03-06: Phase 0 Foundation 완료

### 요약
Phase 0 체크리스트를 전부 완료했다.
단일 앱 구조를 `pnpm` 워크스페이스 모노레포로 전환하고, 공유 패키지·검증 스키마·마이그레이션 기반을 도입했다.

### 완료 항목
- ✅ `apps/web` + `packages/shared` 구조로 모노레포 전환
- ✅ `@vulcan/shared`로 타입/상수 추출 (`types`, `constants`)
- ✅ Zod 스키마 추가 및 API 경계 검증 적용 (`adapter/ingest`, `events`, `tasks/[id]`)
- ✅ Drizzle Kit 도입 (`drizzle.config.ts`, 초기 마이그레이션 생성/적용)
- ✅ Store 인터페이스 추상화 (`lib/store` 디렉터리 구조화 + SQLite 구현 분리)

### 검증 결과
- `pnpm install --prod=false` 성공
- `pnpm -r build` 성공
- `pnpm lint` 성공
- `pnpm db:migrate` 성공
- `pnpm seed` 성공
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3215 pnpm --filter @vulcan/web test:smoke` 성공 (6/6)

### 현재 상태
- ✅ M0 완료
- ✅ Phase 0 완료
- 🔜 **다음 작업: Phase 1 — PostgreSQL + Redis + Hono**

## 2026-03-06: 고도화 로드맵 v2 수립

### 요약
openclaw-mission-control 참조 분석 → Vulcan 고도화 방향 확정.
**관찰 전용 → 완전한 양방향 제어 플랫폼**으로의 패러다임 전환.

### 확정된 설계 결정
| 항목 | 결정 |
|------|------|
| Vulcan ↔ OpenClaw | Gateway WebSocket RPC (`ws://127.0.0.1:18789`) |
| 에이전트 모델 | 단일 Gateway 내 멀티 에이전트 |
| 제어 계층 | Hermes 경유 위임 + 직접 제어 (이중 모드) |
| Telegram | 별도 봇 불필요. 기존 채널로 알림 전송 |
| DB | PostgreSQL + Redis 전환 |
| 백엔드 | Hono (TypeScript) 분리 |
| 철학 | "사용자가 Vulcan으로 제어. Hermes가 오케스트레이션." |

### 현재 상태
- ✅ M0 기능 완료 (관찰, 칸반, 메모리, 문서, PWA)
- ✅ 디자인/UX 오버홀 Pass 1 + Pass 2 완료
- ✅ 고도화 로드맵 v2 수립 완료
- 🔜 **다음 작업: Phase 0 — Foundation (모노레포 + 공유 패키지)**

### 산출물
- `docs/ROADMAP.md` — 전체 로드맵 (Phase 0~10)
- `docs/WORK_PLAN.md` — 실행 체크리스트
- `docs/Vulcan_PRODUCT_MASTER.md` — 제품 정의 개정 (v2)

---

## 2026-03-07: 운영 알림 오탐 정리

### 변경 요약
- Vulcan 서비스 장애가 아니라 watchdog 오탐과 PM2 밖에 남아 있던 orphan 프로세스가 반복 알림의 원인이었음을 확인했다.
- `vulcan-api`/`vulcan-adapter`/`vulcan-mc` 실서비스는 정상 연결 상태를 유지했고, OpenClaw Gateway의 `token_missing` 경고는 오래된 테스트/수동 실행 프로세스 종료 후 재발이 멈췄다.
- PM2 환경에 Gateway 클라이언트 식별자/버전을 명시해 운영 상태를 더 쉽게 추적할 수 있게 했다.

### 확인/조치 내용
- ✅ `pm2 list`, `/api/health`, `/api/gateway/status`로 실서비스 정상 상태 확인
- ✅ `/home/linuxuser/scripts/vulcan-watchdog.sh` 수정
- ✅ 최근 로그 기반 실패 집계 + cooldown/dedupe 적용
- ✅ 헬스 정상 시 `token_missing` 계열 오탐 제외
- ✅ PM2 밖 orphan 프로세스(`gateway-rpc/client.test.ts`, 수동 `adapter-openclaw-gateway.ts`) 종료
- ✅ 종료 후 `token_missing_after_cutoff = 0` 확인

### 후속 메모
- watchdog 스크립트는 레포 밖(`/home/linuxuser/scripts`)에 있으므로 운영 서버 기준으로만 반영됨
- `ecosystem.config.js`에는 API/adapter용 `VULCAN_GATEWAY_CLIENT_ID`, `VULCAN_GATEWAY_CLIENT_VERSION` 명시값을 유지

## 2026-03-06: 디자인/UX 오버홀 Pass 1

### 변경 요약
Vulcan Mission Control의 전반적인 디자인/UX를 개선. 기능 변경 없이 시각적 완성도, 모바일 사용성, PWA 기반을 구축.

### 변경 파일 (16개)
| 파일 | 변경 내용 |
|------|----------|
| `styles/tokens.css` | Atrium 중립 팔레트 적용 (배경/서피스/보더/텍스트) |
| `lib/brandTokens.ts` | 토큰 동기화 (`card` → `surface`) |
| `app/globals.css` | `@theme inline`에 전체 디자인 토큰 등록, 스크롤바/overscroll 개선 |
| `app/layout.tsx` | PWA manifest 연결, theme-color, viewport-fit |
| `app/(layout)/layout.tsx` | 모바일 사이드바 토글 + 오버레이 구현 |
| `components/Sidebar.tsx` | `isOpen`/`onClose` props, 슬라이드 애니메이션 |
| `components/Topbar.tsx` | 햄버거 메뉴 버튼 (모바일) |
| `components/KanbanBoard.tsx` | 카드 디자인 개선, moveTask API 연동 |
| `components/LiveActivityPanel.tsx` | lucide-react 아이콘, framer-motion 애니메이션 |
| `components/OfficeView.tsx` | 에이전트 상태 카드 중심 리팩토링 |
| `components/MemoryBoard.tsx` | 일관된 카드 레이아웃 |
| `components/DocsExplorer.tsx` | 일관된 카드 레이아웃, 선택 상태 파생 |
| `public/manifest.json` | PWA 기본 설정 (standalone, theme-color) |
| `package.json` | lucide-react, framer-motion, @tailwindcss/typography 추가 |
| `tailwind.config.ts` | 신규 생성 (typography 플러그인) |

### Pass 2 완료
- ✅ `stone-*` 하드코딩 → 디자인 토큰 변수 통일
- ✅ OfficeView selectedAgentId setter 복원
- ✅ select 요소 aria-label 추가
- ✅ Service Worker 구현
- ✅ PWA 아이콘 정식 마감
- ✅ Sidebar 브랜드 톤 마감
- ✅ README.md 전면 재작성
- ✅ BRAND.md 토큰/상태/아이콘 문서화
