# PROGRESS

<!-- last-session --> **마지막 세션**: 2026-03-06 00:42 | 브랜치: `design/ux-overhaul-pass1`

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

### 디자인 결정
- **색상**: Atrium 중립 팔레트(#1A1917 base) 차용, Vulcan 포인트 컬러(#e07a40) 유지
- **모바일**: 사이드바 → 슬라이드 오버레이 + 햄버거 메뉴
- **PWA**: manifest.json + viewport-fit=cover
- **실시간성**: framer-motion으로 이벤트 진입 애니메이션

### 검증 결과
- `npm run build`: 통과
- `npm run lint`: 통과 (경고 0)

### 남은 과제 (Pass 2)
- PWA 정식 아이콘 (192x192, 512x512 PNG) 생성
- `stone-*` 하드코딩 → 디자인 토큰 변수 통일
- OfficeView selectedAgentId setter 복원
- Sidebar "Warm Obsidian" 라벨 검토
- select 요소 aria-label 추가
- Service Worker 구현 (오프라인 지원)
