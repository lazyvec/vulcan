---
name: feature
model: sonnet
description: Vulcan에 새 기능을 구현합니다. "기능 만들어줘", "기능 추가해줘", feature 구현 요청 시 사용합니다.
argument-hint: [feature-description]
allowed-tools: Read, Glob, Grep, Edit, Write, Bash
---

# Feature Implementation

## Before Starting
1. Read `CLAUDE.md` 금지사항 확인
2. Read `docs/ARCHITECTURE.md` 구조 파악
3. 기존 유사 코드 검색

## Vulcan Rules
- **단일 서버**: Next.js App Router + SQLite (외부 DB 없음)
- **실시간**: SSE 기반 (WebSocket 아님)
- **어댑터 패턴**: 외부 데이터 → `/api/adapter/ingest` → DB → SSE
- **오피스 메타포**: 에이전트 상태를 사무실 위치로 시각화

## Tech Stack
- Next.js 16 App Router + TypeScript 5.9
- SQLite + Drizzle ORM (`lib/schema.ts`)
- Tailwind CSS v4 (`styles/tokens.css`)
- React 19 + Framer Motion
- SSE (`lib/event-stream.ts`)

## Steps
1. CLAUDE.md 금지사항 확인
2. 관련 기존 코드 분석
3. 필요한 컴포넌트/API/스키마 식별
4. 점진적 구현
5. lint → tsc → build 검증

## Arguments
$ARGUMENTS - Feature description
