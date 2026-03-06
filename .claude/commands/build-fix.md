# /build-fix - Build Error Resolution

빌드 오류를 자동으로 분석하고 수정합니다.

## 사용법
```
/build-fix
```

## 프로세스

### 1. 빌드 실행
```bash
npm run build 2>&1 | head -100
```

### 2. 오류 분석
- TypeScript 에러 파싱
- ESLint 에러 파싱
- Next.js 빌드 에러 파싱 (App Router 특화)

### 3. 자동 수정
- 하나씩 순차적으로 수정
- 각 수정 후 빌드 재실행
- 최대 3회 반복

### 4. 검증
- 최종 빌드 성공 확인
- 린트 통과 확인

## 자동 실행
- `build-error-resolver` 에이전트 호출
- 반복적으로 오류 수정 및 검증
