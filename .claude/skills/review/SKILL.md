---
name: review
description: 코드 품질, 보안, 모범사례를 리뷰합니다. "리뷰 해줘", "코드 봐줘" 요청 시 사용합니다.
argument-hint: [file-or-directory]
allowed-tools: Read, Glob, Grep
model: haiku
---

# Code Review

## Checklist

### TypeScript
- [ ] Strict types (no `any`)
- [ ] Proper interfaces
- [ ] Null/undefined handling

### React / Next.js
- [ ] App Router 패턴 준수
- [ ] `'use client'` 지시어 적절성
- [ ] Server Component vs Client Component 분리

### Vulcan-specific
- [ ] SSE 스트림 안정성 (`lib/event-stream.ts`)
- [ ] Drizzle ORM 쿼리 효율성
- [ ] SQLite 동기 API 유지 (비동기 전환 금지)
- [ ] 어댑터 패턴 준수

### Security
- [ ] XSS/injection 방지
- [ ] 입력 검증
- [ ] DB 파일 직접 접근 차단

## Output Format
```
## 리뷰 결과

### 좋은 점
- (긍정적 포인트)

### 수정 필요
- [ ] Critical: (심각)
- [ ] Warning: (주의)
- [ ] Suggestion: (개선)

### 상세 피드백
- `file:line` - 설명
```

## Arguments
$ARGUMENTS - File or directory to review
