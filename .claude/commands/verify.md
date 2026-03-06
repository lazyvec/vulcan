# /verify - Code Verification

코드 변경 후 전체 검증을 실행합니다.

## 사용법
```
/verify
```

## 프로세스

### 1. 검증 순서
```bash
npm run lint              # 1. ESLint
npx tsc --noEmit          # 2. TypeScript 타입 체크
npm run build             # 3. Next.js 빌드
```

### 2. E2E 영향 시
```bash
npm run test:smoke        # Playwright 스모크 테스트
```

### 3. 자동 수정
- **Lint 에러**: `npm run lint -- --fix` 시도
- **타입 에러**: 분석 후 수정
- **빌드 실패**: `build-error-resolver` 에이전트 호출
- 실패 시 최대 3회 반복, 초과 시 중단 + 보고

### 4. 결과 보고
```
## 검증 결과
- Lint: ✅ Pass / ❌ N errors
- Types: ✅ Pass / ❌ N errors
- Build: ✅ Success / ❌ Failed
- E2E: ✅ N passed / ⏭️ Skip
```

## 자동 실행
- `linter` 에이전트 호출
- 필요시 `build-error-resolver` 에이전트 추가 호출
