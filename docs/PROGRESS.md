# PROGRESS

<!-- last-session --> **마지막 세션**: 2026-03-14 | 브랜치: `main`

> **문서 맵**: [PRODUCT_MASTER](PRODUCT_MASTER.md) · [BRAND_MASTER](BRAND_MASTER.md) · [ROADMAP](ROADMAP.md) · [WORK_PLAN](WORK_PLAN.md) · [PROGRESS](PROGRESS.md) · [DECISIONS](DECISIONS.md)

<!-- 최근 10개 세션만 유지. 오래된 세션은 archive/PROGRESS-2026-03.md로 이동 예정 -->

## 2026-03-14: Office View v2 — 2D 픽셀아트 인터랙티브 오피스

### 요약
에이전트 오피스 뷰를 6존 CSS Grid → 2D 탑다운 바닥맵으로 전면 업그레이드. 에이전트 이동 애니메이션, 말풍선, 히트맵, XP 랭킹, 토큰 바, 이벤트 트레일, 메모리 타임라인을 추가하여 한눈에 모든 에이전트 활동을 파악 가능한 대시보드 구현.

### 변경 내용
- 신규 컴포넌트 16개 (`components/office-v2/`): OfficeFloorMap, FloorZone, PixelAvatar, AgentSprite, MovingAgent, SpeechBubble, AgentPopoverV2, MiniTokenBar, ActivityHeatmap, AgentRanking, EventTrail, MemoryTimeline, OfficeHeader 등
- `app/(layout)/office/page.tsx` — OfficeFloorMap 컴포넌트로 교체
- `styles/tokens.css` — 바닥 그리드 CSS 변수 + prefers-reduced-motion 지원
- `AgentOfficeView.tsx` → `AgentOfficeView.legacy.tsx` 리네임 (복원 가능)
- 잔여 이슈 수정: sprite-map 접두사 매칭, 팝오버 뷰포트 경계, 말풍선 겹침, EventTrail 중복 제거, 10개 에이전트 32x32 픽셀아트 스프라이트 PNG 생성

### 검증
- ✅ pnpm lint 통과
- ✅ tsc --noEmit 통과
- ✅ pnpm build 통과

---

## 2026-03-14: UI/UX 전면 리뉴얼 — Claude의 감성과 편의성 주입

### 요약
Vulcan Mission Control의 시각적 완성도와 사용성을 글로벌 최고 수준으로 끌어올리기 위한 전면 리뉴얼 완료. Claude 특유의 부드럽고 지능적인 디자인 철학을 이식.

### 변경 내용
- 디자인 시스템 개편: Soft Minimalism, Glassmorphism, Visual Breathing, Color Polish
- 살아있는 인터랙션: Spring Physics (Framer Motion), Breathing Avatars, Interactive Feedback
- 모바일 최적화: Adaptive Bottom Sheets, Gesture Support, Floating Search, Safe Area
- 인간 중심적 UX: Warm Micro-copy, Delightful Empty States
- 변경 파일 28개+

### 검증
- ✅ pnpm lint 통과
- ✅ tsc --noEmit 통과
- ✅ pnpm build 성공
- ✅ 스모크 테스트: 핵심 페이지 13종 정상 렌더링

---

## 2026-03-13: Phase 11 잔여 항목 완료

### 요약
Phase 11의 7개 미완료 항목 중 4개 구현 + 2개 문서 완료. (2개 스킵: Govrix UI, ECC — 기존 기능으로 대체됨)

### 변경 내용
- Feature Flags 시스템: JSON 파일 기반 플래그 관리, 3개 기본 플래그
- Gateway-to-Trace 자동 브릿지: completion/response 이벤트 → trace 자동 수집
- 감사 로그 Hash Chain: SHA-256 선형 해시 체인, 무결성 검증 API
- PM Skills WorkOrder 체인 워크플로우: Discover→Strategy→Write-PRD 자동 체인
- 라이선스 체크리스트 + 가드레일 정책 문서

### 검증
- ✅ pnpm -r build 통과
- ✅ pnpm test 66개 전체 통과
- ✅ tsc --noEmit 통과

---

## 2026-03-13: Phase 5 (Memory 검색 강화) — Hermes 지식 인덱싱

### 요약
마스터 플랜 Phase 5: Hermes 파일시스템 메모리(22개 마크다운, ~189KB)를 DB에 인덱싱하여 FTS5 검색 가능하게 구현.

### 변경 내용
- memories 테이블 + FTS5 가상 테이블 + 트리거 3개
- 파일 동기화 (memory-sync.ts): SHA-256 해시, title/tags 추출, 단방향 동기화
- Store 10개 함수, API 7개 라우트
- KnowledgeSearch.tsx UI: 검색 바, layer/type 필터, 결과 카드, 통계 대시보드
- Temporal Decay: halfLifeDays 기반 유틸리티 점수 감쇠
- Auto-Flush: fs.watch + 5분 폴링 폴백
- Category 자동갱신: 25개 키워드→태그 규칙 기반 + AI 트리거 태깅
- pgvector 벡터 임베딩 + 시맨틱 검색 (OpenAI text-embedding-3-small, RRF 통합)

### 검증
- ✅ 빌드 통과 (packages/shared + apps/api + apps/web)
- ✅ 단위 테스트 66개 통과
- ✅ API 테스트: sync, search, semantic, stats, decay, classify-all 모두 정상

---

## 2026-03-13: Phase 4 (Mission Control 메트릭스 강화) — 실시간 대시보드

### 요약
마스터 플랜 Phase 4: 에이전트 오피스 뷰, 실시간 상태 표시, FinOps 대시보드 강화, Kanban WorkOrder 연동 구현.

### 변경 내용
- AgentOfficeView.tsx: CSS Grid 6존 레이아웃, 상태별 CSS 애니메이션, 팝오버
- useAgentStatus.ts: WebSocket + 15초 폴링 fallback
- CostDashboard 강화: 기간 선택기, 트렌드 지표, CB 발동 이력
- Kanban WorkOrder 연동: TaskCard WorkOrder 뱃지, TaskDetailModal 에이전트 활동 탭

### 검증
- ✅ TypeScript 타입체크 통과
- ✅ 프로덕션 빌드 성공
- ✅ Vitest 66/66 통과

---

## 2026-03-13: Phase 3 (WorkOrder 실전 적용) — 에이전트 간 구조화된 통신

### 요약
마스터 플랜 Phase 3: WorkOrder/WorkResult 기반 에이전트 간 핸드오프 시스템 구현. Executor→Verifier(Argus) 2단계 검증 루프, 상태 전이 머신, CEO 에스컬레이션.

### 변경 내용
- WorkOrder/WorkResult 타입 + Zod 스키마 (shared 패키지)
- work_orders + work_results DB 테이블 (SQLite + PG 포워드호환)
- Store 8개 함수, API 7개 엔드포인트
- 상태 전이 머신: pending→accepted→in_progress→review→completed
- 검증 루프: WorkResult → Argus 자동 검증 → 실패 시 1회 재시도 → CEO Telegram 에스컬레이션
- WorkOrderDashboard.tsx UI + /work-orders 페이지
- 교차검증 8건 수정

### 검증
- ✅ TypeScript 타입체크 통과
- ✅ pnpm -r build 성공
- ✅ 테스트 66개 전부 통과

---

## 2026-03-13: Phase 2 (Observability) — Trace 수집 + FinOps + Lightpanda

### 요약
Vulcan MC Phase 11 (Observability): Trace 수집, Circuit Breaker, 비용 대시보드 구현. 동시에 BRS 브라우저 백엔드를 Lightpanda 경량 브라우저로 전환.

### 변경 내용
- Lightpanda 도입: CDP 서버 상시 실행, brs-browser/brs-web Lightpanda 우선 + Chromium fallback
- traces + circuit_breaker_config 테이블
- Store 7개 함수, API 5개 엔드포인트
- CB 시드: 10개 에이전트 기본 토큰 상한
- Telegram 매일 23:00 KST 에이전트별 비용 요약 알림
- CostDashboard.tsx (일별 BarChart + 에이전트 PieChart + CB 테이블), /costs 페이지

### 검증
- ✅ TypeScript 타입체크 통과
- ✅ pnpm -r build 성공
- ✅ 테스트 66개 전부 통과
- ✅ brs-browser: 5/5 URL 성공

---

## 2026-03-10: 텔레그램 미디어 다운로드 실패 수정 (IPv6→IPv4 강제)

### 요약
서버에 글로벌 IPv6 주소 없음 → Node.js가 IPv6 우선 시도 → 텔레그램 파일 다운로드 타임아웃 에러 수정.

### 변경 내용
- `ecosystem.config.js` — 모든 PM2 앱에 `NODE_OPTIONS=--dns-result-order=ipv4first` 추가
- `~/.bashrc` — 전역 `NODE_OPTIONS` 환경변수 추가
- `~/.openclaw/openclaw.json` — `channels.telegram.network.autoSelectFamily=false`
- systemd override — `OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY=1` + DNS ipv4first

---

## 2026-03-10: 문서 전면 현행화 — Phase 10 완료 반영

### 요약
실제 코드 상태에 맞춰 모든 프로젝트 문서를 검토/업데이트. 소모된 문서 17개 삭제, 핵심 문서 6개 현행화.

### 변경 내용
- `CLAUDE.md` — Phase 10 완료 반영, 설계 나침반 통합
- `MISSION_CONTROL_CHECKLIST.md` — 전면 재작성
- `docs/Vulcan_PRODUCT_MASTER.md` — v3 전면 현행화
- `docs/Vulcan_BRAND_MASTER.md` — v1.1 안티패턴 섹션 현행화
- `docs/ROADMAP.md` — Phase 0~10 완료, Phase 11~12 백로그
- `docs/BACKLOG.md` — 완료 항목 제거, Vault 아이디어 5개 추가
- 삭제 17개 파일 (README.orig, ARCHITECTURE, ACCEPTANCE, SECURITY 등)

---

## 2026-03-10: Vault UI 수정 — 입력창 겹침, 구문강조 CSS, 수동싱크, hydration 수정

### 요약
Vault UI 4건 버그 수정: 검색창/입력창 아이콘 겹침, highlight.js 구문강조 CSS, 수동 볼트 싱크 버튼, React hydration 에러 해결.

### 변경 내용
- `apps/web/app/globals.css` — highlight.js CSS import, `.has-icon` 클래스
- `apps/web/components/VaultExplorer.tsx` — 싱크 버튼, `has-icon` 클래스
- `apps/web/app/(layout)/vault/page.tsx` — Server Component 분리
- `apps/web/app/(layout)/vault/client.tsx` — Client Component 래퍼 (dynamic import)
- `apps/web/package.json` — highlight.js 추가
