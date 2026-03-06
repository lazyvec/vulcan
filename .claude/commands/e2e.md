# /e2e - End-to-End Test

E2E 테스트를 생성하고 실행합니다.

## 사용법
```
/e2e [사용자 시나리오]
```

## 프로세스

### 1. 시나리오 분석
- 사용자 여정 정의
- 검증 포인트 식별
- 테스트 데이터 준비

### 2. Playwright 테스트 작성
```typescript
import { test, expect } from '@playwright/test';

test('user scenario', async ({ page }) => {
  await page.goto('/');
  await page.click('button');
  await expect(page).toHaveURL('/expected');
});
```

테스트 위치: `tests/` 디렉토리

### 3. 테스트 실행
```bash
npm run test:smoke
```

### 4. 결과 분석
- 성공/실패 확인
- 스크린샷 검토

## 예시
```
/e2e 대시보드 로드 후 에이전트 상태 확인
/e2e 태스크 칸반 보드에서 상태 변경
```

## 자동 실행
- Playwright 테스트 파일 생성
- 테스트 실행 및 결과 보고
