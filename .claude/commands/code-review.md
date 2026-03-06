# /code-review - Code Quality Review

코드를 리뷰하고 품질 피드백을 제공합니다.

## 사용법
```
/code-review [파일 또는 디렉토리]
```

## 프로세스

### 1. 변경 사항 파악
```bash
git diff --name-only HEAD~1
```

### 2. 리뷰 항목
- TypeScript 타입 안전성 (no `any`)
- React 19 / Next.js 16 패턴 준수
- SSE 스트림 안정성
- Drizzle ORM 쿼리 효율성
- Tailwind v4 스타일링 일관성
- 보안 (XSS, SQL injection, 입력 검증)

### 3. 결과 보고
```
## 리뷰 결과

### 좋은 점
- ...

### 수정 필요
- [Critical] 파일:라인 - 설명
- [Warning] 파일:라인 - 설명

### 제안
- ...
```

## 자동 실행
- `code-reviewer` 에이전트 호출
