# Vulcan Brand

## Tone

- **Calm Intelligence** — 과장 없이, 정확하게
- **Warm Obsidian** — 어둡지만 차갑지 않은

## Core Tokens (Atrium Neutral + Vulcan Hearth)

| 토큰 | 값 | 용도 |
|------|-----|------|
| Background | `#1a1917` | 앱 배경 |
| Surface | `#252422` | 카드, 패널 |
| Muted | `#2d2b29` | 호버, 비활성 |
| Border | `hsl(34 6% 24%)` | 경계선 |
| Primary (Hearth) | `#e07a40` | 포인트, CTA, active |
| Primary Hover | `#e8955e` | 호버 강조 |
| Primary 12% | `rgba(224,122,64,0.12)` | active 배경, 선택 |
| Foreground | `#f5f4f2` | 본문 텍스트 |
| Muted Foreground | `#bfbab4` | 보조 텍스트 |
| Tertiary | `#8d877f` | 3차 텍스트, 힌트 |

## Sidebar Navigation 상태

| 상태 | 텍스트 | 배경 | 비고 |
|------|--------|------|------|
| default | `--muted-foreground` | transparent | |
| hover | `--foreground` | `--muted` | |
| active | `--primary` | `--primary-12` | 좌측 3px accent bar |
| active+hover | `--primary` | primary 16% | |

## Radius Rule

| 요소 | 값 |
|------|-----|
| 버튼/입력/배지 | 8px |
| 카드/패널 | 12px |
| 모달/시트 | 16px |

## Typography

| 용도 | 서체 |
|------|------|
| UI/Headline | Geist Sans |
| Code/Data | Geist Mono |

## Icon Set

| 파일 | 크기 | 용도 |
|------|------|------|
| `public/favicon.ico` | 16+32 | 브라우저 탭 |
| `public/apple-touch-icon.png` | 180x180 | iPhone 홈화면 |
| `public/logo-192.png` | 192x192 | PWA 아이콘 |
| `public/logo-512.png` | 512x512 | PWA 스플래시/설치 |
| `public/logo.svg` | vector | 원본 SVG |

## Guardrail

- 과한 네온/사이버펑크 금지
- OpenClaw를 대체하지 않고, 가시성/운영 편의 레이어만 제공
- 제품 철학(통제/감사/정책)은 M0 범위 밖
