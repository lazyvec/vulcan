---
name: component
description: React 컴포넌트를 생성합니다. "컴포넌트 만들어줘", "UI 만들어줘" 요청 시 사용합니다.
argument-hint: [component-name]
allowed-tools: Read, Glob, Grep, Edit, Write
model: haiku
---

# Component Generator

## Locations
- UI 프리미티브: `components/ui/`
- 커스텀 컴포넌트: `components/`
- 페이지: `app/` (App Router)

## Template
```tsx
interface ComponentNameProps {
  className?: string;
}

export function ComponentName({ className }: ComponentNameProps) {
  return (
    <div className={className}>
      {/* content */}
    </div>
  );
}
```

## Rules
- Tailwind CSS v4 유틸리티 사용 (`styles/tokens.css` 디자인 토큰 참조)
- Hearth 포인트 컬러: `#e07a40` (브랜드 액센트)
- Framer Motion으로 애니메이션
- 기존 유사 컴포넌트 먼저 확인
- `'use client'` 지시어 필요 여부 판단

## Arguments
$ARGUMENTS - Component name or description
