# Parcae B2B/B2C Mega-Plan

Updated: 2026-03-09

## 0) Intake
- 아이디어 1줄: 15KB 초경량 0.04ms 사주/명리 코어 엔진(Parcae)을 활용한 B2B 종량제 API 및 B2C 멘탈케어 서비스
- 내부/외부: 외부 서비스 (1인운영/수익성/유지보수 최우선)
- 핵심 Edge: 기존 무거운 DB 기반 사주 엔진과 대비되는 초고속 연산, Vercel Edge 환경 0원 서버비, LLM 친화적 압축 포맷
- 제약(예산/일정/기술): 운영 유지보수(CS) 최소화, 서버비 0원 수렴(Vercel/Cloudflare Workers)

## 1) Discover (PM-Skills)
- 사용자 문제: 
  - B2B: 운세/타로 앱 개발사들이 비싸고 무거운 사주 API에 의존함. 토큰 소모가 큼.
  - B2C: 기존 사주 앱은 일회성 흥미 위주이며, 사용자의 불안감을 해소해주는 '지속적 멘탈 케어' 기능이 부족함.
- 타겟 세그먼트: 
  - B2B: AI 타로/운세 챗봇을 만드는 인디 해커 및 스타트업.
  - B2C: 진로, 연애 등으로 고민이 많고 심리적 위안과 결정 타이밍이 필요한 2030.
- 핵심 가설 3개:
  1. 개발자들은 LLM 프롬프트에 바로 넣을 수 있는 '압축된 명식 데이터(JSON)' API를 선호할 것이다.
  2. B2C 유저들은 단순 운세보다 "오늘 회의에서 말조심하세요" 같은 구체적이고 따뜻한 타이밍/멘탈 코칭에 기꺼이 월 구독료를 낼 것이다.
  3. 무장애(Zero-Downtime) Edge 환경으로 트래픽이 폭주해도 1인 관리가 가능하다.
- 실패 가설(버릴 조건): 
  - API 연동 후 결과값 해석 오류를 API 탓으로 돌리는 CS가 주 5건 이상 발생하면 B2C 전용으로 피벗하거나 API 문서를 폐쇄형으로 전환.

## 2) Strategy (PM-Skills)
- 포지셔닝 한 줄: "LLM이 가장 읽기 쉬운 초고속 명리 API (B2B)" / "사주를 빙자한 월 4,900원 초개인화 AI 라이프 코치 (B2C)"
- 경쟁 회피 전략: 
  - 정통 명리학의 '적중률' 경쟁을 피하고, 철저히 '기술적 가벼움(B2B)'과 '멘탈 케어(B2C)'로 승부. (점신, 포스텔러 등과 직접 경쟁 회피)
- 수익 모델: 
  - B2B: API 호출당 종량제 (예: 기본 10원, 프리미엄 작명/궁합 500원)
  - B2C: 제한된 횟수의 상세 채팅이 포함된 월 구독형(4,900원) 또는 단건 고단가 리포트(신생아 작명 30,000원)
- 운영 자동화 원칙: 결제 및 Rate Limit 자동화(Stripe), 무제한 자유 채팅 방지로 LLM 비용 폭탄 사전 차단.

## 3) Write-PRD (PM-Skills)
- MVP 범위(포함/제외): 
  - 포함: Parcae 코어 엔진 패키징, Vercel 기반 REST API 엔드포인트(toCompact 포맷 지원), Stripe 결제 연동(Rate limit).
  - 제외: 화려한 B2C 프론트엔드 UI, 무제한 AI 채팅 기능.
- 성공 지표(KPI): 
  - B2B: API 연동 개발사 3곳 확보.
  - 시스템: API 응답 속도 < 50ms 유지, 월 유지비 $0.
- 출시 체크리스트:
  - [ ] 라이선스(MIT) 준수 여부 및 THIRD_PARTY_LICENSES.md 포함
  - [ ] Vercel Edge 배포 및 부하 테스트
  - [ ] Stripe Webhook 및 API 키 발급 포털 연동
- 리스크와 대응: 
  - LLM 할루시네이션(B2C): 단정적 흉조 언급 금지 시스템 프롬프트 가드레일 적용.

## 4) Mega-Review (Garry Tan)
- Scope reduction 결과: B2C 앱은 잠시 미루고, **B2B API 엔진과 개발자용 Docs 사이트 배포**를 MVP의 유일한 목표로 컷.
- Silent failure 목록:
  1. 잘못된 생년월일 형식 입력 -> `InvalidDateException` (400 Bad Request 리턴)
  2. Stripe 결제 지연/실패로 인한 Rate Limit 초과 오인 -> `PaymentSyncDelayed` (Grace period 24시간 부여 및 402 Payment Required 리턴 전 1일 유예)
  3. LLM 파싱 정합성 실패(압축 포맷 오류) -> `FormatMismatchException` (Fallback으로 표준 JSON 포맷 리턴)
- ASCII 흐름도:
```
[Client App] --> (REST API Request) --> [Vercel Edge]
                                            |
                                            +--> [Stripe Rate Limit Check]
                                            |
                                            +--> [Parcae Core Engine (0.04ms)]
                                            |
[Client App] <-- (toCompact JSON Response)<-+
```

## 5) ECC Minimal Verification
- Hook Profile: `standard` (코드 구현 및 테스트 위주)
- Evidence required:
  - [ ] 코어 엔진 Unit Test 통과 (Coverage > 90%)
  - [ ] Vercel 배포 후 실제 cURL 응답 속도 및 포맷 검증 로그
  - [ ] Stripe API 연동 결제/제한 테스트 캡처
- Cost guardrail:
  - 단계 예산: 구현당 토큰 50k 제한.
  - 초과 시 조치: 로직 분리 및 서브에이전트 위임.

## 6) Action Packet
- PRODUCT_MASTER 반영 포인트: Parcae B2B API 중심 아키텍처 및 Edge 배포 파이프라인 명시.
- 워커 실행 프롬프트: 
  "Parcae 코어 엔진의 Vercel Edge API 라우팅을 구현하라. 입력은 생년월일시, 출력은 LLM 친화적인 `toCompact` JSON 포맷이어야 한다. 응답 속도는 50ms 이내를 목표로 하며, 잘못된 입력에 대한 400 예외 처리를 반드시 포함하라. 구현 후 Vitest를 이용해 API 엔드포인트의 Unit Test를 작성하고 통과시켜라."
- 다음 24시간 작업: Vercel Edge API 스캐폴딩 및 Parcae 엔진 연동 코드 작성.
