# Work Plan — Vulcan Mission Control

> 세션 시작 시 자동으로 참조. 현재 Phase를 확인하고 이어서 작업.
> 전체 로드맵: `docs/ROADMAP.md` | 제품 정의: `docs/PRODUCT_MASTER.md`

> **문서 맵**: [PRODUCT_MASTER](PRODUCT_MASTER.md) · [BRAND_MASTER](BRAND_MASTER.md) · [ROADMAP](ROADMAP.md) · [WORK_PLAN](WORK_PLAN.md) · [PROGRESS](PROGRESS.md) · [DECISIONS](DECISIONS.md)

## 현재: Phase 11+++ 완료 → 다음: Phase 12 (백로그)

---

## 완료된 Phase (요약)

- Phase 0: Foundation — ✅ 완료 (2026-03-06)
- Phase 1: PostgreSQL + Redis + Hono — ✅ 완료 (2026-03-06)
- Phase 2: WebSocket + Gateway RPC — ✅ 완료 (2026-03-06)
- Phase 3: 에이전트 생명주기 — ✅ 완료 (2026-03-06)
- Phase 4: 태스크 고도화 — ✅ 완료 (2026-03-08)
- Phase 5: 스킬 마켓플레이스 — ✅ 완료 (2026-03-08)
- Phase 6: Activity/Audit — ✅ 완료 (2026-03-08)
- Phase 7: Telegram 알림 — ✅ 완료 (2026-03-08)
- Phase 8: 승인/거버넌스 — ✅ 완료 (2026-03-09)
- Phase 9: 테스트 + CI/CD — ✅ 완료 (2026-03-09)
- Phase 10: Docker 배포 — ✅ 완료 (2026-03-09)
- Phase 11: Observability — ✅ 완료 (2026-03-13)
- Phase 11+: WorkOrder — ✅ 완료 (2026-03-13)
- Phase 11++: 메트릭스 강화 — ✅ 완료 (2026-03-13)
- Phase 11+++: Memory 강화 — ✅ 완료 (2026-03-14)

---

## Phase 12: Agency Agents 레퍼런스 트랙 (백로그) — 의존성: Phase 11

> 목적: agency-agents 계열 멀티 에이전트 오케스트레이션 아이디어를 Vulcan/Hermes 운영에 적용 가능 여부 검토.

### 인프라 잔여 항목 (Phase 10 미완료)

- [ ] Dockerfile (web, api 멀티스테이지 빌드)
- [ ] PM2 → Docker Compose 전환

### 레퍼런스 분석

- [ ] agency-agents 레퍼런스 분석: 구조/역할/워크플로우 매핑
- [ ] Vulcan 아키텍처 충돌/중복 파악
- [ ] 부분 흡수 후보 선정 (팀 오케스트레이션, 역할 분리, 워크플로우 템플릿)
- [ ] PoC 범위 정의 (작은 실험 1개)

### Governance 잔여 항목 (Phase 11 미완료)

- [ ] Govrix PoC: 프록시 기반 LLM 트래픽 계측 + Vulcan ingest 연결
- [ ] Govrix UI 연동: 대체가 아닌 병행(모듈형) 통합 설계
- [ ] PII 감사 추적 정책 실험 (Merkle/tamper-evidence 개념 검토)
- [ ] ECC 패턴 선별 도입: hook profile, verification loop, security scan, continuous-learning

---

## 블로커/리스크

| 항목 | 영향 | 대응 |
|------|------|------|
| agency-agents 프로젝트 성숙도 미확인 | Phase 12 범위 불확실 | PoC 범위를 최소화하여 실험 |
| Govrix 외부 의존성 | 통합 복잡도 증가 가능 | 모듈형 병행 설계로 격리 |
| Docker 전환 시 PM2 생태계 호환 | 배포 파이프라인 변경 필요 | 현재 PM2 유지, 필요 시 점진 전환 |
