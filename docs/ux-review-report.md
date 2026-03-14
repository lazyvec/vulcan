# Vulcan Mission Control UX/UI 리뷰 보고서

- **리뷰 날짜:** 2026년 3월 14일
- **리뷰어:** Senior UX/UI Designer (Gemini)

## 총평

Vulcan Mission Control 프로젝트는 `Sidebar`, `Topbar`, `VaultExplorer` 등에서 반응형 웹의 기본을 잘 따르고 있으나, 복잡한 데이터(Kanban, Table)를 모바일 환경에서 표현하는 데 심각한 사용성 문제를 보입니다. 또한, 일부 인터랙션 요소의 터치 영역이 작아 모바일 사용성을 저해하며, 일관된 디자인 시스템의 부재는 장기적으로 UI 비일관성을 초래할 위험이 있습니다.

아래는 주요 발견 사항 및 개선 권고안입니다.

---

## 1. 🔴 CRITICAL - 즉시 수정 필요한 문제

### 칸반 보드(KanbanBoard)의 모바일 가용성 문제

- **파일:** `apps/web/components/KanbanBoard.tsx`
- **문제:** 모바일 화면에서 칸반 보드의 레인(Lane)들이 세로로 쌓이지 않고, 가로로 나열되어 강제 가로 스크롤이 발생합니다. 이는 사용자가 전체 보드 구조를 파악하기 어렵게 만들고, 좌우, 상하 다중 스크롤을 유발하여 극도로 나쁜 사용자 경험을 제공합니다.
- **코드 근거:**
  ```tsx
  // KanbanBoard.tsx
  <div className="grid min-h-0 flex-1 gap-3 overflow-x-auto pb-2 lg:snap-x lg:snap-mandatory lg:grid-cols-3 xl:grid-cols-6">
    // ...
  </div>
  ```
  `grid-cols-1`과 같은 기본(모바일) 설정 없이 `lg:` 브레이크포인트부터 그리드 컬럼을 정의하여, 모바일에서도 다중 컬럼 레이아웃이 적용됩니다.
- **개선 권고:**
  - **Option A (권장):** 모바일에서는 레인을 세로로 쌓도록 `grid-cols-1`을 기본값으로 추가합니다. (`grid grid-cols-1 lg:grid-cols-3 ...`)
  - **Option B:** 모바일에서는 레인 이름을 탭(Tab)이나 드롭다운(Select)으로 제공하고, 선택된 레인의 내용만 보여주는 방식으로 변경합니다.

---

## 2. 🟠 HIGH - 사용성을 심각하게 저해하는 문제

### 태스크 상세 모달(TaskDetailModal)의 모바일 레이아웃 깨짐

- **파일:** `apps/web/components/TaskDetailModal.tsx`
- **문제:** 'Lane', 'Priority', 'Assignee'를 선택하는 3단 그리드 레이아웃이 모바일 화면에서도 그대로 유지됩니다. 좁은 화면 폭으로 인해 각 `<select>` 요소들이 심하게 찌그러져 내용을 알아보기 어렵고 조작이 힘듭니다.
- **코드 근거:**
  ```tsx
  // TaskDetailModal.tsx
  <div className="grid grid-cols-3 gap-3">
    // ... 3개의 select
  </div>
  ```
  반응형 프리픽스(`sm:`, `md:`) 없이 `grid-cols-3`가 하드코딩되어 모든 화면 크기에서 동일하게 적용됩니다.
- **개선 권고:** 모바일 화면에서는 항목들이 세로로 쌓이도록 반응형 클래스를 추가합니다. 예: `grid grid-cols-1 sm:grid-cols-3 gap-3`

### 비용 대시보드(CostDashboard) 테이블의 가로 스크롤

- **파일:** `apps/web/components/CostDashboard.tsx`
- **문제:** Circuit Breaker 관련 테이블들이 `overflow-x-auto`로 처리되어 모바일에서 가로 스크롤이 발생합니다. 4개 정도의 컬럼은 모바일 화면에 충분히 표시할 수 있음에도 불구하고 가로 스크롤을 유발하는 것은 좋지 않은 경험입니다.
- **코드 근거:**
  ```tsx
  // CostDashboard.tsx
  <div className="overflow-x-auto">
    <table className="w-full ...">
      // ...
    </table>
  </div>
  ```
- **개선 권고:**
  - 테이블의 각 셀에 `whitespace-nowrap` 클래스가 있는지 확인하고, 있다면 제거하여 내용이 자연스럽게 줄바꿈되도록 합니다.
  - 모바일에서는 테이블을 `block` 요소로 변환하여 각 행을 카드(Card) 형태로 표시하는 것을 고려합니다.

---

## 3. 🟡 MEDIUM - 개선이 권장되는 UX 문제

### 일관성 없는 터치 타겟 크기

- **문제:** 여러 컴포넌트에서 사용되는 버튼들의 터치 타겟 크기가 44x44px 미만으로 너무 작아 모바일 사용자가 누르기 어렵습니다.
- **코드 근거 및 파일:**
  - **`KanbanBoard.tsx`**: '상세' 버튼 (`<button>`)이 `px-2 py-0.5 text-[10px]`로 매우 작습니다.
    ```tsx
    <button
      type="button"
      className="rounded border ... px-2 py-0.5 text-[10px] ..."
      onClick={() => onOpenDetail(task)}
    >
      상세
    </button>
    ```
  - **`TaskDetailModal.tsx`**: '삭제' 아이콘 버튼 (`<button>`)이 `p-1`로 패딩이 매우 작습니다.
    ```tsx
    <button
      type="button"
      className="rounded p-1 ... "
      onClick={handleDelete}
    >
      <Trash2 size={16} />
    </button>
    ```
- **개선 권고:** 모든 아이콘 버튼과 작은 텍스트 버튼에 최소 `min-h-[44px]` `min-w-[44px]`을 적용하거나, 충분한 패딩(`p-3` 등)을 부여하여 W3C 권장 터치 타겟 크기를 준수해야 합니다.

### Vault 탐색기(VaultExplorer)의 불필요한 리사이즈 핸들

- **파일:** `apps/web/components/VaultExplorer.tsx`
- **문제:** 데스크톱 환경을 위한 사이드바 너비 조절 핸들(`vault-resize-handle`)이 모바일 화면에서도 노출됩니다. 이는 터치 환경에서는 기능하지 않으며 불필요한 UI 요소입니다.
- **코드 근거:**
  ```tsx
  // VaultExplorer.tsx
  <div
    className="vault-resize-handle"
    onMouseDown={handleResizeStart}
  />
  ```
- **개선 권고:** 리사이즈 핸들에 `hidden lg:block` 클래스를 추가하여 데스크톱에서만 보이도록 제한합니다.

---

## 4. 🟢 LOW - 사소한 개선점

### 탑바(Topbar)의 제한적인 검색 기능

- **파일:** `apps/web/components/Topbar.tsx`
- **문제:** `sm` 브레이크포인트 미만(대부분의 모바일 세로 모드)에서 상단 검색창이 사라집니다. 공간 효율을 위한 결정으로 보이나, 이 경우 사용자는 검색 기능을 전혀 사용할 수 없게 됩니다.
- **코드 근거:**
  ```tsx
  // Topbar.tsx
  <div className="relative mx-auto hidden max-w-md flex-1 sm:block">
    <Search ... />
    <input ... />
  </div>
  ```
- **개선 권고:** 검색 아이콘 버튼을 노출시키고, 클릭 시 모달이나 전체 화면을 덮는 검색창을 띄워주는 방식을 고려할 수 있습니다.

---

## 5. UI 일관성 및 디자인 시스템

- **파일:** `apps/web/tailwind.config.ts`
- **분석:** `tailwind.config.ts`의 `theme.extend`가 비어있습니다. 이는 프로젝트가 Tailwind CSS의 기본 색상, 여백, 폰트 설정을 그대로 사용하고 있음을 의미합니다. 현재는 CSS 변수(`var(--color-...)`)를 통해 일관성을 유지하고 있으나, 명시적인 디자인 토큰 시스템이 없으면 향후 개발 과정에서 비일관적인 스타일(e.g., `bg-blue-500` 직접 사용)이 추가될 위험이 있습니다.
- **개선 권고:** `tailwind.config.ts`에 프로젝트의 공식 컬러 팔레트, 타이포그래피 스케일, 여백 단위를 정의하여 디자인 시스템을 코드로 강제하는 것이 장기적인 유지보수와 UI 일관성에 유리합니다.

---
## 추가 리뷰

### 🟠 HIGH

- **컴포넌트**: `WorkflowPanel.tsx`
- **분석**: 워크플로우의 각 단계를 보여주는 `StepBox`들이 `flex` 컨테이너 안에 나열되는데, `flex-wrap` 속성이 없어 모바일처럼 좁은 화면에서 단계가 많아질 경우 가로로 화면을 벗어납니다. 가로 스크롤 기능도 없어 사용자는 뒷 단계의 내용을 확인할 방법이 전혀 없습니다.
- **개선 제안**: 스텝들을 감싸는 `div`에 `flex flex-wrap gap-2` 클래스를 적용하여 화면 폭에 따라 스텝들이 자동으로 줄바꿈되도록 해야 합니다. 또는 모바일에서는 강제로 세로 목록으로 표시하는 것을 고려해야 합니다.

### 🟡 MEDIUM

- **컴포넌트**: `AgentOfficeView.tsx`
- **분석**: 에이전트 아바타를 클릭하면 나타나는 팝오버(`AgentPopover`)의 폭이 `w-72`(288px)로 고정되어 있어 좁은 모바일 화면에서는 좌우가 잘릴 위험이 있습니다. 또한 팝오버를 닫는 'X' 버튼의 패딩이 `p-0.5`로 매우 작아 터치 조작이 어렵습니다.
- **개선 제안**: 팝오버에 `max-w-[calc(100vw-2rem)]`과 같은 클래스를 추가하여 화면 폭을 넘지 않도록 하고, 닫기 버튼의 터치 영역을 `p-2` 이상으로 확대해야 합니다.

- **컴포넌트**: `SkillsMarketplace.tsx`
- **분석**: 2단 패널 구조는 모바일에서 1단으로 잘 전환되나, 스킬 상세정보 패널의 'Install'/'Remove' 버튼이 `px-2 py-0.5 text-[11px]`로 터치 타겟 크기가 매우 작습니다.
- **개선 제안**: 'Install'/'Remove' 버튼에 `min-h-[36px]`을 보장하고 `px-3 py-1.5` 정도의 충분한 패딩을 제공해야 합니다.

- **컴포넌트**: `KnowledgeSearch.tsx`
- **분석**: 전반적인 레이아웃은 반응형으로 잘 구성되어 있으나, 검색 결과 카드(`MemoryCard`) 우측의 상세보기(돋보기) 아이콘 버튼이 `p-1`로 터치 타겟이 너무 작습니다.
- **개선 제안**: 상세보기 아이콘 버튼의 터치 영역을 `p-2`로 늘리거나, `min-w-[44px] min-h-[44px]`를 적용하여 조작 편의성을 높여야 합니다.

### 🟢 LOW

- **컴포넌트**: `Sidebar.tsx`
- **분석**: 모바일 화면에서는 `lg` 브레이크포인트 기준으로 화면 좌측에서 슬라이드되는 오버레이 메뉴로 변경됩니다. 이는 `isOpen` prop과 `translate-x` 클래스로 제어되며, 표준적인 모바일 메뉴 구현 방식입니다. 메뉴 항목들은 `px-3 py-2`로 터치 영역이 적절합니다.
- **개선 제안**: 현재 구현은 양호합니다. 사이드바를 여는 햄버거 버튼과의 상호작용이 모바일에서 명확하게 제공되는지 `Topbar` 등 상위 컴포넌트와 함께 검토할 필요가 있습니다.

- **컴포넌트**: `TeamControlBoard.tsx` (및 하위 패널)
- **분석**: 페이지의 주된 레이아웃이 `xl:grid-cols-[...]`을 사용하므로, `xl` 미만 화면(태블릿, 모바일)에서는 제어 패널과 에이전트 목록이 자동으로 세로로 쌓입니다. 각 패널 내부의 버튼 그리드 또한 `sm:grid-cols-2` 등을 사용하여 모바일에서 1열로 적절히 변경됩니다.
- **개선 제안**: 전반적으로 반응형 처리가 잘 되어 있어 특별한 개선점은 보이지 않습니다.

- **컴포넌트**: `WorkOrderDashboard.tsx`
- **분석**: 요약 카드(`grid-cols-2 lg:grid-cols-4`), 필터, WorkOrder 카드 목록 모두 반응형으로 설계되어 모바일에서 자연스럽게 세로로 재배치됩니다. WorkOrder 카드 확장 시 내부 컨텐츠도 `sm:grid-cols-2`로 반응형 처리가 되어 있습니다.
- **개선 제안**: 없음.

- **컴포넌트**: `ApprovalsPanel.tsx`
- **분석**: 탭 기반 구조이며, 각 탭의 내용은 세로로 쌓이는 카드 형태라 모바일에 매우 적합합니다. 정책 추가/수정 폼 역시 `lg:grid-cols-2`를 사용해 모바일에서 1열로 잘 보입니다.
- **개선 제안**: 없음.

- **컴포넌트**: `ActivityDashboard.tsx`
- **분석**: 대시보드의 모든 요소(메트릭 카드, 차트, 필터)가 `md:`, `lg:` 등 반응형 브레이크포인트를 사용해 구현되어 모바일에서 깨짐 없이 표시됩니다. 이벤트 피드는 단순 수직 목록으로 모바일 사용성에 문제가 없습니다.
- **개선 제안**: 없음.

- **컴포넌트**: `NotificationSettings.tsx`
- **분석**: 모든 설정 UI가 반응형으로 설계되었습니다. 카테고리 버튼 그리드(`sm:grid-cols-4`), 조용한 시간 설정(`flex-wrap`), 액션 버튼(`sm:flex-row`) 모두 모바일에서 적절하게 표시됩니다. 특히 `min-h-[44px]`를 통해 버튼의 최소 터치 영역을 보장한 점이 이상적입니다.
- **개선 제안**: 없음. 모범적인 반응형 UI입니다.

- **컴포넌트**: `MemoryBoard.tsx`
- **분석**: 탭과 카드 목록으로 구성된 단순 1단 레이아웃으로, 모바일 환경에서 사용하기에 전혀 문제가 없습니다. 카드 내 편집/삭제 버튼에 `min-h-[44px] min-w-[44px]`를 명시적으로 적용하여 터치 영역을 확실히 보장한 점이 훌륭합니다.
- **개선 제안**: 없음.
