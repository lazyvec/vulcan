# 의존성 라이선스 전수 조사

> Phase 11 잔여 항목 B1. 2026-03-13 작성

## 요약

모든 프로덕션 의존성이 **MIT**, **Apache 2.0**, **ISC**, **BSD** 라이선스로 상업적·비공개 사용에 제한 없음.
copyleft (GPL, AGPL, LGPL) 의존성 **없음**.

## 프로덕션 의존성

### `apps/api` (Hono API 서버)

| 패키지 | 라이선스 | NOTICE 의무 |
|--------|---------|------------|
| `@hono/node-server` | MIT | 없음 |
| `@hono/node-ws` | MIT | 없음 |
| `better-sqlite3` | MIT | 없음 |
| `bullmq` | MIT | 없음 |
| `defuddle` | MIT | 없음 |
| `drizzle-orm` | Apache 2.0 | NOTICE 파일 보존 |
| `gray-matter` | MIT | 없음 |
| `hono` | MIT | 없음 |
| `ioredis` | MIT | 없음 |
| `pg` | MIT | 없음 |
| `turndown` | MIT | 없음 |
| `ws` | MIT | 없음 |

### `apps/web` (Next.js UI)

| 패키지 | 라이선스 | NOTICE 의무 |
|--------|---------|------------|
| `@codemirror/*` (6개) | MIT | 없음 |
| `@dnd-kit/*` (3개) | MIT | 없음 |
| `better-sqlite3` | MIT | 없음 |
| `drizzle-orm` | Apache 2.0 | NOTICE 파일 보존 |
| `framer-motion` | MIT | 없음 |
| `highlight.js` | BSD-3-Clause | 저작권 고지 보존 |
| `lucide-react` | ISC | 없음 |
| `next` | MIT | 없음 |
| `react` / `react-dom` | MIT | 없음 |
| `react-markdown` | MIT | 없음 |
| `recharts` | MIT | 없음 |
| `rehype-highlight` | MIT | 없음 |
| `remark-breaks` | MIT | 없음 |
| `remark-gfm` | MIT | 없음 |
| `remark-wiki-link` | MIT | 없음 |

### `packages/shared`

| 패키지 | 라이선스 | NOTICE 의무 |
|--------|---------|------------|
| `zod` | MIT | 없음 |

### 루트 (dev)

| 패키지 | 라이선스 | NOTICE 의무 |
|--------|---------|------------|
| `husky` | MIT | 없음 |
| `lint-staged` | MIT | 없음 |

## NOTICE 의무 정리

1. **drizzle-orm** (Apache 2.0): Apache 2.0 라이선스는 원본 NOTICE 파일을 배포물에 포함할 것을 요구. `node_modules` 내 포함되므로 소스 배포 시 자동 충족.
2. **highlight.js** (BSD-3-Clause): 저작권 고지 및 면책 조항 보존 의무. `node_modules` 내 포함.

## 결론

- copyleft 의존성 없음
- 상업적·비공개 사용 제한 없음
- `node_modules` 포함 배포 시 모든 라이선스 의무 자동 충족
