# 검증 순서

코드 수정 후:
1. `npm run lint` — ESLint
2. `npx tsc --noEmit` — TypeScript 타입 체크
3. `npm run build` — Next.js 빌드

E2E 영향 시: `npm run test:smoke` (Playwright)
실패 시 자동 수정 최대 3회, 초과 시 중단 + 보고.
