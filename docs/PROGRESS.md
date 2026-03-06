# PROGRESS

<!-- last-session --> **마지막 세션**: 2026-03-06 | 브랜치: `main`

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
