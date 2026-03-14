# Vulcan Mission Control — UX/UI/Design 전면 리뷰 요청

## 프로젝트 정보
- **경로**: ~/projects/vulcan
- **프론트엔드**: Next.js 16 + React 19 + Tailwind CSS 4 + Framer Motion
- **컴포넌트 위치**: `apps/web/components/`
- **페이지 위치**: `apps/web/app/(layout)/`
- **스타일 토큰**: `apps/web/styles/tokens.css` + `apps/web/lib/brandTokens.ts`
- **브랜드**: Atrium 중립 팔레트 + Hearth 포인트(`#e07a40`)
- **접속 경로**: Cloudflare Tunnel(`vulcan.yomacong.com`) — PC, 모바일 둘 다

## 리뷰 범위

**실사용자 관점에서** 모든 페이지의 UX/UI/디자인 품질을 PC와 모바일 **두 가지 뷰포트** 모두에서 점검한다.

### 1. 반응형 레이아웃 (모바일 최우선)
- 각 컴포넌트/페이지의 반응형 CSS 확인 (`sm:`, `md:`, `lg:` breakpoint 사용 현황)
- 모바일에서 가로 스크롤 발생 여부
- 터치 타겟 크기 (최소 44×44px)
- 모바일에서 사이드바/네비게이션 처리 (햄버거 메뉴? 항상 표시?)
- 모달/다이얼로그의 모바일 대응
- 테이블/그리드의 모바일 대응 (수평 스크롤? 스택?)

### 2. 페이지별 UX 점검

아래 각 페이지를 실제 코드를 읽고 판단:

| 페이지 | 파일 | 핵심 체크포인트 |
|--------|------|-----------------|
| Office | `AgentOfficeView.tsx` | 6존 그리드 모바일 대응, 에이전트 카드 터치, 팝오버 위치 |
| Tasks | `KanbanBoard.tsx`, `TaskDetailModal.tsx` | 6-lane 칸반 모바일 대응(좌우 스크롤?), 드래그앤드롭 터치, 모달 크기 |
| Team | `TeamControlBoard.tsx`, 하위 패널 3개 | 에이전트 목록/제어패널 모바일 레이아웃, 버튼 크기 |
| Skills | `SkillsMarketplace.tsx` | 2패널 구조 모바일 대응, 카드 그리드 |
| Vault | `VaultExplorer.tsx`, `MarkdownEditor.tsx` | 파일 트리+에디터 분할 모바일 대응, CodeMirror 터치 |
| Memory | `MemoryBoard.tsx` | 탭 UI 모바일 대응, 카드 레이아웃 |
| Knowledge | `KnowledgeSearch.tsx` | 검색바+필터+결과 모바일 대응, 상세 패널 |
| Work Orders | `WorkOrderDashboard.tsx`, `WorkflowPanel.tsx` | 대시보드 카드/테이블 모바일 대응 |
| Approvals | `ApprovalsPanel.tsx` | 승인 목록/딥링크 모바일 대응 |
| Costs | `CostDashboard.tsx` | recharts 차트 모바일 대응, 기간 선택기 |
| Activity | `ActivityDashboard.tsx` | 이벤트 목록/감사로그 탭 모바일 대응 |
| Notifications | `NotificationSettings.tsx` | 설정 폼 모바일 대응 |

### 3. UI/디자인 일관성
- 색상 토큰 사용 일관성 (하드코딩 색상 vs CSS 변수)
- 여백/패딩 일관성
- 타이포그래피 계층 (h1/h2/body/caption)
- 컴포넌트 간 디자인 언어 통일성
- 다크 모드 대응 여부
- 로딩 상태 표시 (skeleton, spinner)
- 빈 상태(empty state) 처리
- 에러 상태 표시

### 4. 접근성
- 키보드 내비게이션
- ARIA 레이블
- 색상 대비
- 포커스 표시

### 5. 네비게이션/사이드바
- `Sidebar.tsx` — 15개 메뉴 항목의 모바일 처리
- `Topbar.tsx` — 상단바 모바일 대응
- 현재 위치 표시
- 깊은 페이지에서의 뒤로가기

## 출력 형식

### 발견 사항을 심각도별로 분류:

**🔴 CRITICAL** — 모바일에서 사용 불가능한 수준
**🟠 HIGH** — 사용은 가능하나 경험이 매우 나쁨
**🟡 MEDIUM** — 개선하면 좋은 UX 이슈
**🟢 LOW** — 사소한 디자인 개선점

### 각 발견 사항에 포함:
1. 어떤 페이지/컴포넌트의 어떤 부분인지
2. 현재 상태 설명 (코드 근거 포함)
3. 구체적 수정 제안

## 주의사항
- **실제 코드를 읽고** 판단할 것. 추측하지 말 것.
- Tailwind CSS 클래스를 확인해서 반응형 처리가 되어 있는지 판단할 것
- 각 컴포넌트의 `className` prop을 꼼꼼히 볼 것
- PC에서는 괜찮지만 모바일에서 문제가 되는 부분을 특히 집중할 것
- 최종 결과를 `/home/linuxuser/projects/vulcan/docs/ux-review-report.md`에 저장할 것
