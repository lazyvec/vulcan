# Vulcan 모바일 감사 — Codex × Gemini 교차검증 취합

## 감사 결과 요약
- **Codex (gpt-5.3-codex)**: 16건 (Critical 2, Major 10, Minor 4)
- **Gemini (gemini-3.1-pro)**: 10건 (Critical 1, Major 4, Minor 5)
- **교차 확인**: 6건 양쪽 모두 발견 (높은 신뢰도)

## 이미 수정된 항목 (필터링)
- ✅ globals.css 브레이크포인트 1024→1023px (commit 155a5b2)
- ✅ Sidebar.tsx md:→lg: 브레이크포인트 통일 (commit 155a5b2)
- ✅ layout.tsx md:hidden→lg:hidden 오버레이 (commit 155a5b2)
- ✅ VaultExplorer 일부 터치 타겟 44px (commit 33ded21)
- ✅ iOS input font-size 1rem (globals.css, commit 155a5b2)

## 미수정 — 우선순위별 수정 목록

### Critical (2건)
| # | 파일 | 이슈 | 발견 |
|---|------|------|------|
| C1 | KanbanBoard.tsx | 6열 min-w-[240px] → 375px에서 가로 스크롤 + 중첩 스크롤 트랩 | Codex |
| C2 | Topbar.tsx | 메뉴 버튼 `md:hidden` → `lg:hidden` 불일치 (768-1023px 사각지대) | Codex+Gemini |

### Major (12건)
| # | 파일 | 이슈 | 발견 |
|---|------|------|------|
| M1 | Topbar.tsx | 메뉴 버튼 터치 타겟 <44px (`p-1.5` + 22px 아이콘) | Codex+Gemini |
| M2 | Topbar.tsx | 검색 input `text-sm`(14px) → iOS 자동줌 | Codex+Gemini |
| M3 | Button.tsx | 공용 sm/md 크기 44px 미달 | Codex |
| M4 | Tabs.tsx | overflow-x 없음 + 44px 미달 | Codex |
| M5 | ApprovalsPanel.tsx | nowrap flex + grid-cols-2 모바일 오버플로우 | Codex |
| M6 | NotificationSettings.tsx | nowrap flex 375px 오버플로우 | Codex |
| M7 | MemoryBoard.tsx | 편집/삭제 아이콘 버튼 44px 미달 | Codex |
| M8 | SkillsMarketplace.tsx | 스크롤 트랩 + 버튼 44px 미달 + 패널 레이아웃 | Codex |
| M9 | LiveActivityPanel.tsx | min-h-[420px] + overflow-auto 스크롤 트랩 | Codex |
| M10 | Modal.tsx | footer nowrap + safe-area + 닫기 버튼 44px | Codex |
| M11 | layout.tsx | 사이드바 열림 시 body 스크롤 미잠금 | Gemini |
| M12 | VaultExplorer.tsx | 노트 액션 버튼 터치 타겟 | Gemini |

### Minor (5건)
| # | 파일 | 이슈 | 발견 |
|---|------|------|------|
| m1 | Sidebar.tsx | 하단 footer safe-area-inset-bottom 없음 | Gemini |
| m2 | layout.tsx | 메인 레이아웃 safe-area 없음 | Codex+Gemini |
| m3 | VaultExplorer.tsx | text-[10px] 보조텍스트 <12px | Codex+Gemini |
| m4 | Topbar.tsx | 제목 h1 truncation 없음 | Gemini |
| m5 | VaultExplorer.tsx | 모달 max-h-[80vh] 미설정 (iOS 키보드) | Gemini |
