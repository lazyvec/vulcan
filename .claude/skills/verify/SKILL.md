---
name: verify
description: lint, 타입 체크, 빌드를 순차 실행하고 오류를 자동 수정합니다. "검증 해줘", "빌드 확인" 요청 시 사용합니다.
allowed-tools: Read, Glob, Grep, Edit, Write, Bash
model: haiku
---

# Verification

## Sequence
```bash
npm run lint              # 1. ESLint
npx tsc --noEmit          # 2. TypeScript 타입 체크
npm run build             # 3. Next.js 빌드
```

E2E 영향 시: `npm run test:smoke`

## Auto-fix Strategy
- **Lint errors**: `npm run lint -- --fix` 시도
- **Type errors**: 분석 후 타입 수정
- **Build failures**: build-error-resolver 에이전트 호출

실패 시 최대 3회 반복, 초과 시 중단 + 보고.

## Output Format
```
## 검증 결과
- Lint: ✅ Pass / ❌ N errors
- Types: ✅ Pass / ❌ N errors
- Build: ✅ Success / ❌ Failed
- E2E: ✅ N passed / ⏭️ Skip
```
