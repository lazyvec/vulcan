# Backlog — Vulcan Mission Control

> Hub Protocol 활성화. "~하면 좋겠다" → 🟢 / "버그" → 🔴 / "해줘" → Feature Task Protocol
> 실행 체크리스트: `docs/WORK_PLAN.md` | 전체 로드맵: `docs/ROADMAP.md`

---

## 🔴 버그 / 긴급

<!-- - [ ] 설명 — 발견일 -->

## 🟡 개선 (로드맵 파생)

### Phase 11: Observability + Governance 고도화

- [ ] Govrix 계열 PoC: LLM 트래픽 계측 (cost/token/latency) — 2026-03-06
  - 참고: [ClawBridge](https://github.com/dreamwing/clawbridge) 일일/월간 비용 차트, [Paperclip](https://github.com/paperclipai/paperclip) 에이전트별 월 예산 강제
- [ ] 토큰 경제 대시보드 UI — 에이전트별/일별 비용 시각화 (recharts 활용) — 2026-03-10
- [ ] 에이전트별 비용 예산 설정 + 임계치 초과 시 경고/차단 — 2026-03-10
- [ ] PII 플래그 + 감사 추적 파이프라인 — 2026-03-06
- [ ] PM Skills 기반 기획 워크플로우 표준화 (discover → strategy → PRD) — 2026-03-06
- [ ] ECC 패턴 선택 도입 (hook profile, verification loop, security scan) — 2026-03-06
- [ ] 운영 가드레일: 토큰비/복잡도 상한, 기능 플래그, 단계별 롤아웃 — 2026-03-06
- [ ] Nightshift — 야간 자동 실행 스케줄러 UI + 아침 브리핑 생성 — 2026-03-10
  - 참고: [ClawTrol](https://github.com/wolverin0/clawtrol) Nightshift 기능
- [ ] Factory Loops — 에이전트 자율 반복 (찾기→개선→테스트→커밋→반복) — 2026-03-10
  - 참고: [ClawTrol](https://github.com/wolverin0/clawtrol) Factory Loops

### Phase 12: agency-agents 레퍼런스 트랙

- [ ] 에이전트 자율 학습/피드백 루프 PoC — 2026-03-06
- [ ] 에이전트 간 협업 프로토콜 — 2026-03-06
- [ ] 멀티 모달 에이전트 지원 — 2026-03-06
- [ ] 멀티에이전트 방문/초대 시스템 (Join Key) — 2026-03-10
  - 참고: [Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI) 방문 에이전트 상태 푸시

## 🟢 아이디어

### Vault 고도화
- [ ] 그래프 뷰 — 노트 연결 시각화 (Vault 노트 간 링크를 그래프로 표현) — 2026-03-10
- [ ] 백링크 — 노트 간 역참조 (현재 노트를 참조하는 다른 노트 목록) — 2026-03-10
  - 참고: [kepano](https://stephango.com/vault) "첫 언급 시 내부 링크, 미해결 링크도 미래 연결고리"
- [ ] 탭/분할 뷰 — 다중 노트 동시 열기 — 2026-03-10
- [ ] Mermaid 다이어그램 렌더링 (노트 내 ```mermaid 블록 지원) — 2026-03-10
- [ ] KaTeX 수학 수식 렌더링 (노트 내 $...$ / $$...$$ 수식 지원) — 2026-03-10
- [ ] 프랙탈 저널링 — 일일→주간→월간→연간 자동 정리 + 무작위 재방문 — 2026-03-10
  - 참고: [kepano vault](https://stephango.com/vault), [kepano-obsidian](https://github.com/kepano/kepano-obsidian)

### Office View / 에이전트 시각화
- [ ] Office View에 에이전트 이동 애니메이션 — 2026-03-06
  - 참고: [Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI) Phaser 엔진 + 말풍선 + 자동 영역 이동
- [ ] 에이전트 아바타를 자체 제작 픽셀 아트로 교체 — 2026-03-06
- [ ] 에이전트 활동 히트맵 (시간대별 어떤 에이전트가 활발한지) — 2026-03-06
- [ ] 데스크톱 펫 모드 — 투명 윈도우 부동 에이전트 (Tauri) — 2026-03-10
  - 참고: [Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI) Desktop Pet

### 에이전트 운영
- [ ] 워크플로우 팩 — 사전 정의 작업 프로필 (development/report/web_research/novel) — 2026-03-10
  - 참고: [Claw-Empire](https://github.com/GreenSheep01201/claw-empire) 6개 워크플로우 프로필
- [ ] 에이전트 성과 메트릭 + XP 랭킹 시스템 — 2026-03-10
  - 참고: [Claw-Empire](https://github.com/GreenSheep01201/claw-empire) XP 기반 랭킹
- [ ] 메모리 타임라인 뷰 — 에이전트 기억 진화 시각화 — 2026-03-10
  - 참고: [ClawBridge](https://github.com/dreamwing/clawbridge) Memory Timeline

### 기타
- [ ] proactive memory 실험 (mem0 / supermemory / memU 비교) — 2026-03-06
- [ ] 모바일 미션 컨트롤 (PWA 또는 사이드카) — 2026-03-10
  - 참고: [ClawBridge](https://github.com/dreamwing/clawbridge) 모바일 중심 대시보드
