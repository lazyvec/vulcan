# Vulcan Mission Control — UX/UI/Design 완벽 수정 미션

너는 시니어 UX/UI 디자이너 겸 프론트엔드 엔지니어다.
Vulcan Mission Control의 모바일+PC UI를 **흠잡을 데 없이 완벽**하게 만들어야 한다.

## 프로젝트 정보

- **스택**: Next.js 16 + React 19 + Tailwind CSS 4 + Framer Motion
- **컴포넌트**: `apps/web/components/` (32개 "use client" 컴포넌트)
- **페이지**: `apps/web/app/(layout)/` (12개 라우트)
- **스타일 토큰**: `apps/web/styles/tokens.css` (CSS 변수 기반)
- **브랜드 토큰**: `apps/web/lib/brandTokens.ts`
- **UI 컴포넌트**: `apps/web/components/ui/` (Button, Badge, Modal, Tabs, Toast, EmptyState)
- **브랜드**: Atrium 중립 팔레트 + Hearth 포인트(`#e07a40`)
- **접속**: Cloudflare Tunnel(`vulcan.yomacong.com`) — PC, 모바일, 태블릿

## 미션: 3단계 실행

---

### 1단계: 전수 검토

모든 컴포넌트의 실제 코드(className)를 읽고 아래 항목을 빠짐없이 점검해.

#### 반응형 레이아웃 (모바일 375px / 태블릿 768px / PC 1280px)
- [ ] 모든 grid/flex 레이아웃에 모바일 기본값 존재하는지 (grid-cols-1, flex-col 등)
- [ ] 가로 스크롤이 발생하는 곳이 없는지 (overflow-x-auto가 정말 필요한 곳만)
- [ ] 모달/다이얼로그가 모바일에서 화면을 벗어나지 않는지
- [ ] 팝오버/드롭다운이 화면 밖으로 잘리지 않는지
- [ ] 분할 패널(사이드바+메인)이 모바일에서 적절히 스택되는지

#### 터치 인터랙션
- [ ] 모든 버튼/링크/아이콘의 터치 타겟이 최소 44x44px인지
- [ ] 드래그앤드롭이 터치에서도 동작하는지 (또는 대안 제공)
- [ ] 리사이즈 핸들 등 마우스 전용 UI가 모바일에서 숨겨져 있는지
- [ ] hover 효과만 있고 터치 대안이 없는 곳이 없는지

#### 네비게이션
- [ ] Sidebar가 모바일에서 오버레이 메뉴로 전환되는지
- [ ] Topbar가 모바일에서 적절한 크기인지
- [ ] 모바일에서 검색 기능에 접근 가능한지
- [ ] 현재 위치 표시(active state)가 명확한지

#### 타이포그래피 & 가독성
- [ ] 최소 폰트 크기가 12px 이상인지 (text-[10px], text-[11px] 등 점검)
- [ ] 텍스트 말줄임(truncate)이 적절히 적용되어 있는지
- [ ] 긴 텍스트가 레이아웃을 깨뜨리지 않는지

#### 색상 & 토큰 일관성
- [ ] 하드코딩 색상(bg-blue-500 등) 대신 CSS 변수 사용하는지
- [ ] 포커스 링(focus-visible)이 모든 인터랙티브 요소에 있는지
- [ ] 상태 색상(success/error/warning)이 일관적인지

#### 상태 처리
- [ ] 로딩 상태 표시 (spinner, skeleton, disabled 등)
- [ ] 빈 상태(empty state) 메시지 존재
- [ ] 에러 상태 사용자 피드백 존재
- [ ] 액션 진행 중 버튼 disabled 처리

#### 접근성
- [ ] 이미지/아이콘에 aria-label 또는 title
- [ ] 폼 요소에 label 연결
- [ ] 적절한 시맨틱 HTML (button vs div, nav 등)

### 점검 대상 컴포넌트 전체 목록

| 페이지 | 핵심 컴포넌트 |
|--------|-------------|
| / (Home) | AgentOfficeView |
| /office | AgentOfficeView, office/ZoneBoard, office/AgentDetailCard, office/CommandHistory |
| /tasks | KanbanBoard, TaskDetailModal |
| /team | TeamControlBoard, team/AgentLifecyclePanel, team/AgentCommandPanel, team/GatewayOpsPanel, team/AgentRoster |
| /skills | SkillsMarketplace |
| /vault | VaultExplorer, MarkdownEditor, MarkdownRenderer |
| /memory | MemoryBoard |
| /knowledge | KnowledgeSearch |
| /work-orders | WorkOrderDashboard, WorkflowPanel |
| /approvals | ApprovalsPanel |
| /costs | CostDashboard |
| /activity | ActivityDashboard |
| /notifications | NotificationSettings |
| 공통 | Sidebar, Topbar, MissionControlProvider, LiveActivityPanel |
| UI | ui/Modal, ui/Tabs, ui/Toast, ui/Button, ui/Badge, ui/EmptyState |

---

### 2단계: 수정

발견된 모든 문제를 직접 코드 수정해.

#### 수정 규칙
- className만 수정. 로직(JavaScript/TypeScript) 변경 최소화
- 기존 디자인 토큰(CSS 변수 `var(--color-*)`, `var(--radius-*)`)을 활용
- Tailwind 반응형 프리픽스 활용: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)
- 터치 타겟: `min-h-[44px] min-w-[44px]` 또는 충분한 패딩
- 기존 기능을 절대 깨뜨리지 말 것
- 새 파일 생성 금지. 기존 파일만 수정

#### 수정 우선순위
1. 모바일에서 사용 불가능한 레이아웃 깨짐
2. 터치 불가능한 작은 버튼/링크
3. 가로 스크롤 발생
4. 디자인 불일관성
5. 접근성 누락

---

### 3단계: 검증 & 배포

수정 완료 후 아래 명령어를 순서대로 실행:

```bash
# 1. 린트
cd ~/projects/vulcan && pnpm lint

# 2. 타입체크
cd ~/projects/vulcan && npx tsc --noEmit

# 3. 빌드
cd ~/projects/vulcan && pnpm build

# 4. 실패 시 수정 → 재시도 (최대 3회)

# 5. 모든 검증 통과 후 커밋 & 푸시
cd ~/projects/vulcan && git add -A && git commit -m "fix: UX/UI 전면 개선 — 모바일 반응형, 터치 타겟, 디자인 일관성

- 모바일 반응형 레이아웃 전면 점검 및 수정
- 터치 타겟 최소 44px 준수
- 디자인 토큰 일관성 강화
- 접근성 개선

Co-Authored-By: Gemini 2.5 Pro <noreply@google.com>" && git push origin main
```

---

## 최종 출력

모든 작업이 끝나면 아래 형식으로 요약 보고:

```
## 수정 완료 보고

### 수정한 파일 (N개)
- 파일명: 수정 내용 요약

### 검증 결과
- lint: PASS/FAIL
- tsc: PASS/FAIL
- build: PASS/FAIL
- push: PASS/FAIL

### 잔여 이슈 (있으면)
- 없음 / 또는 목록
```
