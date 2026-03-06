# SECURITY NOTES (M0+)

## 1) Dependency Audit

검증 명령:

```bash
cd /home/linuxuser/projects/vulcan
npm audit --omit=dev
```

현재 상태:
- 결과: `found 0 vulnerabilities`
- 기존 moderate 이슈(`drizzle-kit` 체인 `esbuild`)는 M0+ 운영 범위에서 불필요한 패키지를 제거해 해소

## 2) Secrets Hygiene

원칙:
- `.env`는 커밋 금지
- `.env.example`만 버전관리
- 코드/문서 하드코딩 금지

검증 명령:

```bash
cd /home/linuxuser/projects/vulcan
git ls-files | rg "^\\.env$" || true
git ls-files | rg "^\\.env\\.example$"
rg -n --hidden --glob '!.git' --glob '!node_modules' --glob '!.next' "(API_KEY|SECRET|TOKEN)=" .
```

기대 결과:
- `.env` tracked 없음
- `.env.example` tracked 존재
- 민감정보 패턴 미검출(또는 테스트 문자열만 존재)

## 3) Runtime Safety Defaults

적용 항목:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Cross-Origin-Opener-Policy: same-origin`

관련 파일:
- `next.config.ts`
- `app/api/stream/route.ts` (`X-Accel-Buffering: no`)

## 4) Scope Guardrails

M0+에서 의도적으로 포함하지 않음:
- 승인/감사/정책 엔진
- RBAC / 멀티테넌시
- Star-Office-UI 에셋 복사
- Auto-Claude(AGPL) 코드 차용
