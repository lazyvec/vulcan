---
name: build-fix
description: "빌드 또는 타입체크 오류를 자동으로 분석하고 수정한다. 최대 3회 반복."
model: haiku
allowed-tools: Read, Edit, Grep, Glob, Bash
---

빌드/타입체크 오류를 자동으로 수정하라.

## 절차

1. `npm run build` 실행
2. 오류가 있으면:
   a. 오류 메시지에서 파일 경로, 줄 번호, 오류 코드 추출
   b. 해당 파일을 읽고 원인 분석
   c. 수정 적용
   d. 다시 `npm run build` 실행
3. 최대 3회 반복
4. 3회 초과 시 남은 오류를 정리하여 보고

## 보고 형식
```
수정 결과:
- 시도: N/3회
- 수정된 오류: N개
- 남은 오류: N개 (있다면 목록)
- 수정된 파일: 파일 목록
```
