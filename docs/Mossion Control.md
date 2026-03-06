0) 메타
	•	영상 길이: 16:13 (유튜브 플레이어 화면 기준)
	•	분석 기준(오디오/자막/화면 중 무엇을 활용했는지):
	•	오디오/대사: 사용자가 제공한 스크립트(타임스탬프 포함) 기반
	•	화면: 사용자가 제공한 스크린샷(여러 타임스탬프 구간 캡처) 기반
	•	주의: 실제 원본 영상 전체를 직접 재생/청취한 것이 아니라, 제공된 스크립트 + 일부 화면 캡처로 분석함
	•	자막 품질(좋음/보통/나쁨): 보통
	•	이유: 일부 오탈자/인식 오류 존재 (예: “cananband”, “crown jobs”, “open clauses”, “Chad GBT”, “Shabuya”, “memories.mmarkdown”, “lefth hand” 등)

⸻

1) 한 문장 요지
	•	이 영상은 OpenClaw 안에 커스텀 “Mission Control” 대시보드를 만들고, 주요 화면(Tasks/Calendar/Projects/Memory/Docs/Team/Office)의 용도와 생성 프롬프트 방향을 설명한다.

⸻

2) 목차(구조)
	•		1.	Intro: Mission Control 개념 소개 + “몇 개 프롬프트로 구축 가능” 주장
	•		2.	시작 방법: OpenClaw에 Mission Control 템플릿 생성 요청 (Next.js, localhost, UI 스타일)
	•		3.	Task board 설명
	•		4.	Calendar 화면 설명
	•		5.	Projects 화면 설명
	•		6.	Memory 화면 설명
	•		7.	Docs 화면 설명
	•		8.	Team 화면 설명
	•		9.	Office 화면 설명
	•		10.	Important note: 그대로 복사보다 개인화 도구 발굴(Reverse prompting) 강조 + 마무리

⸻

3) 타임라인 정리 (핵심)
	•	[0:00–0:35] Intro / Mission Control 개요
	•	말로 한 핵심(대사 요약 3~6줄)
	•	OpenClaw에 “superpowers”를 주려면 Mission Control을 만들어야 한다고 말함.
	•	Mission Control은 OpenClaw용 커스텀 대시보드라고 설명함.
	•	이 대시보드가 “필요한 도구를 즉시(on the fly) 만들 수 있게 한다”고 설명함.
	•	자신의 전체 설정과 도구들을 보여주고, 몇 개 프롬프트로 직접 구축하는 방법을 보여주겠다고 말함.
	•	“프로그래밍/기술 경험 0이어도 가능”이라고 반복함.
	•	화면에 나온 핵심(UI/슬라이드/데모/텍스트/수치)
	•	[확인 불가] (이 구간 스크린샷 미제공)
	•	이 구간에서 정의/강조한 용어(있으면)
	•	Mission Control: OpenClaw용 커스텀 대시보드
	•	custom dashboard
	•	on the fly (도구 생성 맥락)

⸻

	•	[0:35–2:16] Mission Control 소개 + 커스텀 구축 방법(초기 프롬프트)
	•	말로 한 핵심(대사 요약 3~6줄)
	•	현재 배경이 다른 이유를 “Shabuya(스크립트 표기)”에서 찍고 있어서라고 말함.
	•	자신이 쓰는 Mission Control 도구들 중 “모두에게 유용한 것들”만 보여주겠다고 함.
	•	왼쪽 사이드바의 도구들은 모두 OpenClaw가 직접 만든 커스텀 도구이며, 본인은 코드를 한 줄도 쓰지 않았다고 말함.
	•	예시 프롬프트로 “calendar 보여주는 도구”, “tasks 보여주는 도구” 같은 식으로 한 줄 요청했다고 설명함.
	•	시청자가 따라 하려면 OpenClaw에 “Mission Control을 Next.js로 만들고 localhost에 호스팅” 요청하라고 함.
	•	“linear처럼 깔끔한 인터페이스” 요청도 가능하다고 함.
	•	화면에 나온 핵심(UI/슬라이드/데모/텍스트/수치)
	•	제목(유튜브 플레이어 상단 좌측): “If you have OpenClaw, you NEED to do this now (Mission Control)”
	•	Mission Control 앱 화면(공통 요소로 여러 스크린샷에서 반복 확인):
	•	좌측 사이드바 메뉴(예시): Tasks, Agents, Content, Approvals, Council, Calendar, Projects, Memory, Docs, People, Office, Team, System, Radar, Factory, Pipeline, Feedback
	•	상단 바: Search, Pause, Ping Henry (텍스트 확인됨)
	•	스크린샷 근거(시각 구조 확인): 3:07/6:07/7:12/Team/Office 구간 캡처들에서 공통 UI 프레임 확인
	•	이 구간에서 정의/강조한 용어(있으면)
	•	Mission Control
	•	custom tools
	•	Next.js
	•	localhost
	•	linear (UI 스타일 레퍼런스, 스크립트 발언 기준)

⸻

	•	[2:16–3:58] Task board
	•	말로 한 핵심(대사 요약 3~6줄)
	•	Task board를 “critical critical tool”이라고 강조함.
	•	이 보드로 OpenClaw/Henry 및 하위 에이전트가 무엇을 하는지 가시성을 확보한다고 설명함.
	•	보드는 단순한 칸반 보드이고, 카드가 자신(A) 또는 Henry(H)에 할당된다고 설명함.
	•	좌측이 아니라(스크립트엔 left라 했지만 화면상 우측) Live Activity Feed로 Henry의 상세 행동을 확인할 수 있다고 말함.
	•	리뷰가 필요한 작업은 Review 컬럼에 두고 본인이 승인한다고 말함.
	•	“heartbeat마다 task board를 확인해 backlog에서 OpenClaw에 할당된 작업을 자율 수행”하도록 설정했다고 설명함.
	•	화면에 나온 핵심(UI/슬라이드/데모/텍스트/수치)
	•	타임스탬프 표시된 스크린샷: 3:07 / 16:13
	•	상단 수치(3:07 캡처 기준):
	•	19 This week
	•	3 In progress
	•	42 Total
	•	45% Completion
	•	버튼/필터:
	•	+ New task
	•	담당자 필터처럼 보이는 텍스트: Alex / Henry
	•	프로젝트 드롭다운: All projects
	•	컬럼(가시 범위 기준):
	•	Recurring, Backlog, In Progress, Review
	•	우측 패널:
	•	Live Activity
	•	항목 예시로 Scout / Quill / Henry 등 로그 텍스트 표시
	•	카드 예시(부분 가독):
	•	“Record Claude Code …”
	•	“Build Council - Societ…”
	•	“Flesh out $10K Mac …”
	•	“Research Exo Labs du…”
	•	“Pre train a local model”
	•	“Build AI Employee Sc…”
	•	이 구간에서 정의/강조한 용어(있으면)
	•	Task board
	•	kanban board (스크립트 표기 오탈자 존재)
	•	Live Activity Feed
	•	heartbeat
	•	backlog / review

⸻

	•	[3:58–5:12] Calendar
	•	말로 한 핵심(대사 요약 3~6줄)
	•	Calendar 화면은 “가장 중요한 것 중 하나”라고 말함.
	•	OpenClaw가 예약한 cron jobs / scheduled tasks를 확인할 수 있다고 설명함.
	•	“OpenClaw가 proactive하지 않다”는 불만에 대한 확인 수단으로 제시함.
	•	사용자가 “밤/아침/오후에 뭔가 해달라”고 했을 때 실제로 스케줄되었는지 확인 가능하다고 말함.
	•	“I’ll do that”라고 말만 하고 실제로 안 하는 경우를 캘린더로 검증할 수 있다고 설명함.
	•	화면에 나온 핵심(UI/슬라이드/데모/텍스트/수치)
	•	타임스탬프 표시된 스크린샷: 4분대(캡처 시점 23:51:06)
	•	화면 제목:
	•	Scheduled Tasks
	•	부제: Henry’s automated routines
	•	Always Running 영역 + 배지:
	•	Reaction Poller · Every 5 min
	•	Trend Radar · 5x daily
	•	Opportunity Scanner · 6x daily
	•	우측 상단:
	•	Week / Today 토글
	•	주간 캘린더 컬럼:
	•	Sun ~ Sat
	•	이벤트 예시(가독 범위 기준):
	•	Trend Radar (12:00 PM)
	•	Morning Kickoff (6:55 AM)
	•	YouTube OpenClaw R… (7:00 AM)
	•	Scout Morning Resear… (8:00 AM)
	•	Morning Brief (8:00 AM)
	•	Quill Script Writer (8:30 AM)
	•	Daily Digest (9:00 AM)
	•	Evening Wrap Up (9:00 PM)
	•	Weekly Newsletter Dr… (10:00 PM, 수요일 컬럼 하단에 보임)
	•	이 구간에서 정의/강조한 용어(있으면)
	•	Calendar screen
	•	cron jobs
	•	scheduled tasks
	•	proactive

⸻

	•	[5:12–7:04] Projects
	•	말로 한 핵심(대사 요약 3~6줄)
	•	Projects 화면은 주요 프로젝트 진행 상황을 추적하는 용도라고 설명함.
	•	OpenClaw를 쓰다 보면 산만해져서 중요하지 않은 것들을 만들 수 있는데, 이 화면이 우선순위 유지에 도움 된다고 말함.
	•	큰 프로젝트들을 등록하고, 진행률을 보며 오랫동안 손대지 않은 프로젝트를 다시 볼 수 있다고 설명함.
	•	본인 예시로 “school AI extension” 언급 후 Vibe Coding Academy 홍보를 삽입함.
	•	이 화면이 다른 화면(작업/기억/문서)과 연결되어 조직화에 도움 된다고 주장함.
	•	“reverse prompting”으로 현재 프로젝트를 전진시키는 다음 작업을 뽑을 수 있다고 말함.
	•	화면에 나온 핵심(UI/슬라이드/데모/텍스트/수치)
	•	타임스탬프 표시된 스크린샷: 6:07 / 16:13
	•	화면 제목:
	•	Projects
	•	상단 요약: 5 total • 2 active • 3 planning
	•	프로젝트 카드 예시:
	•	Agent Org Infrastructure (Active)
	•	Mission Control (Active)
	•	Skool AI Extension (Active)
	•	Micro-SaaS Factory (Planning)
	•	Even G2 Integration (Planning)
	•	카드 내 요소(가독 범위 기준):
	•	진행률 바, % 숫자(예: 100%, 70%, 0%)
	•	담당자/에이전트 이름(Charlie, Henry, Violet, Unassigned)
	•	우선순위 배지(high / medium)
	•	“8 days ago by Henry” 류의 메타 텍스트
	•	이 구간에서 정의/강조한 용어(있으면)
	•	Projects screen
	•	reverse prompting
	•	major projects / high level tasks (스크립트 발언 기준)

⸻

	•	[7:04–8:29] Memory
	•	말로 한 핵심(대사 요약 3~6줄)
	•	Memory 화면을 “critical critical tool”이라 강조함.
	•	OpenClaw가 일별 대화를 기억하는 시스템이 좋다고 설명함.
	•	과거 특정 날짜 대화를 저널처럼 다시 보는 용도로 사용한다고 말함.
	•	원래는 정리 안 된 memories...markdown 파일 형태라 찾기/읽기가 어렵다고 설명함.
	•	이 화면은 과거 메모리 탐색/정리를 쉽게 해주며, 장기 메모리 문서도 함께 보게 만들라고 제안함.
	•	“전체 디지털 삶의 기록” 같은 표현으로 의미를 부여함.
	•	화면에 나온 핵심(UI/슬라이드/데모/텍스트/수치)
	•	타임스탬프 표시된 스크린샷: 7:12 / 16:13
	•	좌측 패널:
	•	검색창 placeholder: Search memory…
	•	Long-Term Memory 카드 (말풍선/배지 아이콘 포함)
	•	텍스트 예시: 1,608 words • Updated about 22 hours ago
	•	DAILY JOURNAL 섹션 및 날짜 목록 (Mon, Mar 2 / Sun, Mar 1 / Feb 2026 등)
	•	본문 패널:
	•	문서 제목: 2026-02-26 — Thursday
	•	상단 메타: 4.8 KB • 772 words / Modified 4 days ago
	•	항목 예시:
	•	9:00 AM — Qwen 3.5 Medium Series Research
	•	“What we discussed…”
	•	“Key findings…”
	•	“Recommendations given…”
	•	“Decision: Pending…”
	•	일부 수치/문구가 읽힘:
	•	35B-A3B, 27B dense, 122B-A10B, SWE-bench (72.4), 4-bit/8-bit, ~20GB RAM, ~70GB 등
	•	이 구간에서 정의/강조한 용어(있으면)
	•	Memory screen
	•	Long-Term Memory
	•	journal
	•	record of your entire digital life (표현)

⸻

	•	[8:29–10:30] Docs
	•	말로 한 핵심(대사 요약 3~6줄)
	•	Docs 화면은 Memory와 유사하지만 동등하거나 더 중요하다고 말함.
	•	OpenClaw가 만드는 계획서/아키텍처/PRD/뉴스레터/콘텐츠 등 문서들이 보통 채팅에 묻히는 문제를 제시함.
	•	Docs 화면에서는 OpenClaw가 만든 모든 문서를 포맷된 형태로 재탐색할 수 있다고 설명함.
	•	본인 사례로 매주 목요일 뉴스레터 초안을 OpenClaw가 쓰고, 본인은 그것을 Substack에 복붙 후 편집한다고 말함.
	•	문서 자동 분류, 포맷 표시, 검색 기능(예: “Mac Studio” 검색)을 강조함.
	•	화면에 나온 핵심(UI/슬라이드/데모/텍스트/수치)
	•	타임스탬프 표시된 스크린샷: 8분대(캡처 시점 23:52:02)
	•	좌측 패널:
	•	검색창 placeholder: Search documents…
	•	태그/필터칩 다수 (예: Journal, Nova, Other, Docs, Notes, YouTube Scripts, .md, .html, .pdf, .json, .mobi, .epub 등)
	•	파일 목록 예시:
	•	2026-02-26.md
	•	2026-02-25.md
	•	2026-02-25-vibe-coding-mainstream...
	•	arena-prd.md
	•	.DS_Store
	•	본문 패널(선택 문서):
	•	파일명: 2026-02-25-vibe-coding-mainstream.md
	•	메타: 3.2 KB • 583 words
	•	제목: Newsletter Draft — Feb 25, 2026
	•	섹션: Subject Line Options:
	•	보이는 항목 예시:
	•	“Vibe coding just went mainstream…”
	•	“The New York Times just wrote about vibe coding…”
	•	“Vibe coding is now a $100 million industry…”
	•	본문 일부:
	•	“This week, The New York Times published an opinion piece about vibe coding.”
	•	“This is the tipping point.”
	•	이 구간에서 정의/강조한 용어(있으면)
	•	Docs screen / docs tool
	•	planning docs / architecture docs / product requirement docs
	•	searchable / categorize

⸻

	•	[10:30–12:45] Team
	•	말로 한 핵심(대사 요약 3~6줄)
	•	Team 화면은 본인이 가장 중요하게 보는 화면 중 하나라고 말함.
	•	이 화면이 OpenClaw와 하위 에이전트들의 역할/구조/미션을 정리해준다고 설명함.
	•	모든 에이전트/서브에이전트, 역할, 디바이스 위치 등을 보여준다고 말함.
	•	예시로 Charlie(엔지니어, 로컬 Qwen, Mac Studio)와 Ralph(ChatGPT 기반)를 언급함.
	•	혼란 시 “누가 어떤 일을 해야 하는지” 판단하는 기준 화면(“record of truth”)로 설명함.
	•	상단 mission statement를 두고, reverse prompting으로 목표에 맞는 작업을 도출할 수 있다고 말함.
	•	화면에 나온 핵심(UI/슬라이드/데모/텍스트/수치)
	•	타임스탬프 표시된 스크린샷: Team 캡처들 (12분대 구간 추정)
	•	상단 미션 문구(스크린샷에서 직접 확인):
	•	“An autonomous organization of AI agents that does work for me and produces value 24/7”
	•	제목:
	•	Meet the Team
	•	보조 문구:
	•	9 AI agents across 3 machines, each with a real role and a real personality.
	•	카드 구조:
	•	최상단: Henry — Chief of Staff (태그: The Interface 등)
	•	중간 레이어(OPERATIONS (Mac Studio 2)):
	•	Charlie — Infrastructure Engineer
	•	Ralph — Foreman / QA Manager
	•	하단 레이어(입출력/실무 역할):
	•	Scout — Trend Analyst
	•	Quill — Content Writer
	•	Pixel — Thumbnail Designer
	•	Echo — Social Media Manager
	•	더 아래 META LAYER:
	•	Codex — Lead Engineer
	•	Violet — Research Analyst
	•	카드 태그 예시(가독 범위):
	•	Henry: Orchestration / Clarity / Delegation
	•	Charlie: coding / infrastructure / automation
	•	Ralph: Quality Assurance / Monitoring / Demo Recording
	•	Scout: Speed / Radar / Intuition
	•	Quill: Voice / Quality / Design
	•	Pixel: Visual / Attention / Style
	•	Echo: Viral / Speed / Reach
	•	이 구간에서 정의/강조한 용어(있으면)
	•	Team screen
	•	mission statement
	•	sub agents
	•	record of truth
	•	reverse prompting

⸻

	•	[12:45–14:23] Office
	•	말로 한 핵심(대사 요약 3~6줄)
	•	Office 화면은 겉보기엔 장난처럼 보여도 필요하다고 강조함.
	•	이 화면은 에이전트들이 지금 무엇을 하는지 시각적으로 보여준다고 설명함.
	•	에이전트들이 책상으로 가거나 서로 대화(물 마시는 곳/water cooler)하는 등 상태를 추적한다고 말함.
	•	특정 시점에 실제로 일하고 있는지 확인하는 시각적 확인 수단으로 제시함.
	•	“OpenClaw는 재밌게 써야 한다”는 점을 매우 강하게 반복함.
	•	boring CLI 대신 “재밌는 2D 인터페이스”를 제안하며, 2D pixel art office 생성 프롬프트 예시를 직접 말함.
	•	화면에 나온 핵심(UI/슬라이드/데모/텍스트/수치)
	•	타임스탬프 표시된 스크린샷: Office 구간 2장 (15:07 표기 스크린샷 포함)
	•	상단 배너:
	•	Demo Controls
	•	버튼/상태 배지:
	•	All Working
	•	Gather
	•	Run Meeting
	•	Watercooler
	•	중앙 2D 픽셀 오피스 맵:
	•	책상 여러 개, 원형 테이블, 화분 등 오브젝트
	•	캐릭터 라벨 예시:
	•	Alex, Henry, Quill, Echo, Violet, Scout, Codex, Pixel, Charlie, Ralph
	•	말풍선 예시: “Build Council - S…” (Henry 위)
	•	우측 패널:
	•	Live Activity
	•	“No recent activity” 문구 보이는 캡처 존재
	•	하단 상태 카드들:
	•	각 에이전트 이름 + 상태 (Idle, 작업명 등)
	•	예: Henry 카드에 Build Council - Socie… 표시
	•	이 구간에서 정의/강조한 용어(있으면)
	•	Office screen
	•	2D pixel art office
	•	visualizes all the work
	•	water cooler
	•	fun / boring CLI 대비

⸻

	•	[14:23–16:13] Important note / 복사보다 개인화 + 마무리
	•	말로 한 핵심(대사 요약 3~6줄)
	•	지금까지 보여준 것을 “그대로 복사만 하지 말라”고 말함.
	•	이유는 Mission Control이 개인화된 대시보드여야 하며, 사람마다 워크플로우가 다르기 때문이라고 설명함.
	•	해결 방법으로 다시 reverse prompting을 제시함.
	•	초기 버전을 만든 뒤, OpenClaw에게 현재 워크플로우/미션/목표 기반으로 어떤 커스텀 도구가 필요한지 묻게 하라고 말함.
	•	이 영상 링크 자체를 OpenClaw에 주면 transcript를 찾아서 구현하도록 시킬 수 있다고 다시 말함.
	•	좋아요/구독/알림, 주간 라이브 부트캠프(Vibe Coding Academy) 안내로 마무리함.
	•	화면에 나온 핵심(UI/슬라이드/데모/텍스트/수치)
	•	타임스탬프 표시된 스크린샷: 15:07/16:13 부근 Office 화면 지속
	•	Office 화면 내 에이전트 시각화가 계속 보임 (중요 메모 구간도 시각적으로는 동일 계열 화면 지속으로 보임)
	•	[불명확] 14:23 직후 “Important note” 구간만 별도 UI 전환 여부는 캡처로 전부 확인되지 않음
	•	이 구간에서 정의/강조한 용어(있으면)
	•	hyperpersonalized dashboard
	•	custom tools
	•	reverse prompting
	•	workflow / mission statement / goals

⸻

4) “영상이 주장하는 것”만 목록화
	•	주장/핵심포인트 1:
	•	근거 타임스탬프: 0:00–0:35
	•	표현 요약(말 그대로에 가깝게): Mission Control을 만들면 OpenClaw에 “superpowers”를 줄 수 있고, OpenClaw가 훨씬 더 강력해진다고 말함.
	•	주장/핵심포인트 2:
	•	근거 타임스탬프: 0:10–0:24
	•	표현 요약: Mission Control은 OpenClaw용 커스텀 대시보드이며, 필요한 도구를 즉석에서 만들 수 있게 한다고 설명함.
	•	주장/핵심포인트 3:
	•	근거 타임스탬프: 0:24–0:30, 1:57–2:06
	•	표현 요약: 프로그래밍/기술 경험 없이도 몇 개 프롬프트로 만들 수 있다고 말함.
	•	주장/핵심포인트 4:
	•	근거 타임스탬프: 0:58–1:12
	•	표현 요약: 자신의 Mission Control 왼쪽 도구들은 모두 OpenClaw가 만든 것이고, 본인은 코드를 쓰지 않았다고 말함.
	•	주장/핵심포인트 5:
	•	근거 타임스탬프: 2:14–3:58
	•	표현 요약: Task board는 OpenClaw와 하위 에이전트가 무엇을 하고 있는지 추적하는 핵심 도구라고 말함.
	•	주장/핵심포인트 6:
	•	근거 타임스탬프: 2:57–3:04
	•	표현 요약: Live activity feed로 Henry가 실제로 하는 일을 상세히 확인할 수 있다고 말함.
	•	주장/핵심포인트 7:
	•	근거 타임스탬프: 3:31–3:44
	•	표현 요약: OpenClaw가 heartbeat마다 task board를 확인해 backlog에서 자신에게 할당된 작업을 자율적으로 처리하도록 설정했다고 말함.
	•	주장/핵심포인트 8:
	•	근거 타임스탬프: 3:58–5:12
	•	표현 요약: Calendar 화면은 cron jobs/scheduled tasks를 확인해 OpenClaw의 proactive 행동을 검증하는 데 중요하다고 말함.
	•	주장/핵심포인트 9:
	•	근거 타임스탬프: 5:12–7:04
	•	표현 요약: Projects 화면은 산만함을 줄이고 주요 프로젝트 진행을 추적하는 데 좋다고 말함.
	•	주장/핵심포인트 10:
	•	근거 타임스탬프: 6:22–7:04
	•	표현 요약: reverse prompting으로 “지금 할 수 있는 다음 작업”이나 “현재 진행 중인 프로젝트 분류”를 OpenClaw에게 도출하게 할 수 있다고 말함.
	•	주장/핵심포인트 11:
	•	근거 타임스탬프: 7:04–8:29
	•	표현 요약: Memory 화면은 일자별 대화/기억을 저널처럼 정리·탐색하게 해주는 핵심 도구라고 말함.
	•	주장/핵심포인트 12:
	•	근거 타임스탬프: 8:29–10:30
	•	표현 요약: Docs 화면은 OpenClaw가 만든 각종 문서를 채팅에서 찾는 대신 검색/분류 가능한 저장소처럼 보게 해준다고 말함.
	•	주장/핵심포인트 13:
	•	근거 타임스탬프: 10:30–12:45
	•	표현 요약: Team 화면은 에이전트 조직 구조, 역할, 미션 스테이트먼트를 정리해 에이전트들의 작업 분배/정렬에 도움이 된다고 말함.
	•	주장/핵심포인트 14:
	•	근거 타임스탬프: 12:45–14:23
	•	표현 요약: Office 화면은 에이전트들의 현재 작업 상태를 시각적으로 확인하는 도구이고, OpenClaw 사용에서 “재미”도 중요하다고 강조함.
	•	주장/핵심포인트 15:
	•	근거 타임스탬프: 14:23–16:13
	•	표현 요약: 그대로 복사보다 개인 워크플로우에 맞는 커스텀 도구를 reverse prompting으로 찾는 것이 더 중요하다고 말함.
	•	주장/핵심포인트 16:
	•	근거 타임스탬프: 14:13–14:21, 15:38–15:52
	•	표현 요약: 영상 링크를 OpenClaw에 주면 transcript를 찾아서 구현에 활용할 수 있다고 말함.

⸻

5) “절차/레시피/단계”가 나오면 그대로 추출

절차 A: 초기 Mission Control 생성 (영상 발언 기준)
	•	Step 1: OpenClaw에 Mission Control 생성 요청
	•	입력: “I want my own mission control where we can build custom tools.”
	•	출력: Mission Control 대시보드 생성 작업 시작
	•	주의사항(영상에서 언급된 것만): 없음
	•	근거 타임스탬프: 1:51–1:57
	•	Step 2: 구현/호스팅 조건 지정
	•	입력: “Please build it in Next.js and host it on the local host.”
	•	출력: Next.js 기반 localhost 호스팅 템플릿 생성
	•	주의사항(영상에서 언급된 것만): “Once you do that, it will build a template.”
	•	근거 타임스탬프: 1:55–2:02
	•	Step 3: (선택) UI 스타일 요청
	•	입력: “make it a clean interface that looks like linear”
	•	출력: Linear 스타일 느낌의 깔끔한 인터페이스
	•	주의사항(영상에서 언급된 것만): “you’ll get a mission control that’s as beautiful as this”라고 말함
	•	근거 타임스탬프: 2:02–2:06

⸻

절차 B: Task board를 통해 자율 작업 처리하게 하는 설정 (영상 발언 기준)
	•	Step 1: Task board 만들기
	•	입력: 영상에서 보여준 task board를 설명하는 프롬프트
	•	출력: 칸반형 Task board UI
	•	주의사항(영상에서 언급된 것만): “No coding at all”
	•	근거 타임스탬프: 3:51–3:56
	•	Step 2: 새 작업 추가 및 할당
	•	입력: New task 생성 후 Henry/OpenClaw에 할당
	•	출력: 할당된 작업이 backlog 등에 등록됨
	•	주의사항(영상에서 언급된 것만): Henry/OpenClaw에 할당해야 자동 수행 흐름 설명이 이어짐
	•	근거 타임스탬프: 3:20–3:29
	•	Step 3: Heartbeat 체크 로직 지시
	•	입력: “every heartbeat check our task board… backlog… assigned to my openclaw… do any tasks…”
	•	출력: Heartbeat마다 backlog에서 자신에게 할당된 작업을 확인/수행하는 자율 동작
	•	주의사항(영상에서 언급된 것만): backlog에 OpenClaw에게 할당된 태스크를 찾는 조건
	•	근거 타임스탬프: 3:31–3:44

⸻

절차 C: Calendar 화면 생성 요청 (영상 발언 기준)
	•	Step 1: 캘린더 화면 요청
	•	입력: “build a calendar for you that shows all the cron jobs and scheduled tasks it have”
	•	출력: cron jobs / scheduled tasks를 보여주는 Calendar 화면
	•	주의사항(영상에서 언급된 것만): 스케줄링 여부 확인 용도로 사용
	•	근거 타임스탬프: 5:03–5:09

⸻

절차 D: Memory 화면 생성 요청 (영상 발언 기준)
	•	Step 1: 일자별 메모리 뷰 요청
	•	입력: “I want a memory screen… view every memory you have organized by day.”
	•	출력: 일자별 정리된 memory screen
	•	주의사항(영상에서 언급된 것만): Mission Control 내부 화면으로 요청
	•	근거 타임스탬프: 7:59–8:10
	•	Step 2: 장기 메모리 문서 추가 요청
	•	입력: “also have a long-term memory document…”
	•	출력: 장기 메모리 확인용 문서/뷰
	•	주의사항(영상에서 언급된 것만): 없음
	•	근거 타임스탬프: 8:10–8:16

⸻

절차 E: Docs 화면 생성 요청 (영상 발언 기준)
	•	Step 1: Docs tool 요청
	•	입력: “I want a docs tool where I can go back and view all the previous documents you created for me…”
	•	출력: 이전 문서 열람용 Docs 화면
	•	주의사항(영상에서 언급된 것만): “nicely formatted view”
	•	근거 타임스탬프: 9:56–10:03
	•	Step 2: 검색/분류 기능 지정
	•	입력: “Make it searchable and categorize the documents.”
	•	출력: 검색/분류 가능한 문서 도구
	•	주의사항(영상에서 언급된 것만): 없음
	•	근거 타임스탬프: 10:03–10:09

⸻

절차 F: Team 화면에서 미션 기반 운영 (영상 발언 기준)
	•	Step 1: Team screen 구성
	•	입력: 에이전트/서브에이전트/역할/디바이스/미션 스테이트먼트 정보를 표시하는 팀 화면 요청
	•	출력: Team screen (조직도/역할 카드)
	•	주의사항(영상에서 언급된 것만): mission statement를 상단에 두는 것을 강조
	•	근거 타임스탬프: 10:30–12:45 (설명 전반)
	•	Step 2: Mission statement 설정
	•	입력: 공통 목표 문장
	•	출력: 모든 에이전트가 참조하는 공통 목표
	•	주의사항(영상에서 언급된 것만): proactive tasks가 목표에 가까워지게 하는 기준
	•	근거 타임스탬프: 11:47–12:17
	•	Step 3: Reverse prompting으로 목표 정렬 작업 도출
	•	입력: “What task can we do right now that brings us closer to our mission statement?”
	•	출력: 목표 정렬형 다음 작업 제안
	•	주의사항(영상에서 언급된 것만): 에이전트가 idle일 때 활용 예시
	•	근거 타임스탬프: 12:17–12:27

⸻

절차 G: Office 화면 생성 요청 (영상 발언 기준)
	•	Step 1: 시각화 목적 화면 요청
	•	입력: “I want a screen that visualizes all the work you’re doing.”
	•	출력: 작업 시각화 화면
	•	주의사항(영상에서 언급된 것만): 없음
	•	근거 타임스탬프: 13:46–13:50
	•	Step 2: 2D 픽셀 오피스 조건 지정
	•	입력: “I want a 2D pixel art office that shows you and all the sub agents.”
	•	출력: 2D pixel art office 화면
	•	주의사항(영상에서 언급된 것만): 책상/서브에이전트 표시 포함
	•	근거 타임스탬프: 13:50–13:57
	•	Step 3: 작업 시 행동 규칙 지정
	•	입력: “when they are doing work, they go to their desk and actually do the work.”
	•	출력: 작업 중 상태를 책상 이동으로 표현하는 시각화
	•	주의사항(영상에서 언급된 것만): “similar to this” 수준 결과를 기대한다고 말함
	•	근거 타임스탬프: 13:57–14:02

⸻

절차 H: 개인화 커스텀 도구 찾기 (영상 발언 기준)
	•	Step 1: 초기 Mission Control 버전 구축
	•	입력: 앞서 소개한 기본 도구들 기반 초기 버전
	•	출력: 1차 Mission Control
	•	주의사항(영상에서 언급된 것만): 그대로 복사보다 개인화가 중요
	•	근거 타임스탬프: 14:54–15:02
	•	Step 2: Reverse prompt로 커스텀 도구 질의
	•	입력: “based on what you know about me, what we’ve done, our workflows, our mission statement, our goals, what custom tools should we build out…”
	•	출력: 개인 워크플로우에 맞는 커스텀 도구 목록 제안
	•	주의사항(영상에서 언급된 것만): 영상의 도구를 그대로 넣기보다 개인화 우선
	•	근거 타임스탬프: 15:02–15:20

⸻

6) 화면/데모에서 확인된 UI 요소 사전
	•	화면/기능 A: 좌측 네비게이션 사이드바
	•	위치/맥락: Mission Control 전 화면 공통 좌측
	•	동작: 화면 전환 메뉴로 보임 (Tasks/Calendar/Projects/Memory/Docs/Team/Office 등)
	•	결과: 각 기능 화면으로 이동하는 구조로 시연됨
	•	근거 타임스탬프: 3:07, 6:07, 7:12, Team 캡처, Office 캡처

⸻

	•	화면/기능 B: Task board (칸반 보드)
	•	위치/맥락: Tasks 메뉴 화면
	•	동작: New task 생성, 담당자/프로젝트 필터, 컬럼 이동(Backlog→In Progress→Review)
	•	결과: OpenClaw/Henry 작업 추적 및 검토/승인 흐름 가시화
	•	근거 타임스탬프: 발언 2:14–3:58 / 화면 3:07 캡처

⸻

	•	화면/기능 C: Live Activity 패널 (Tasks 화면 우측)
	•	위치/맥락: Task board 화면 우측
	•	동작: Scout/Quill/Henry 등 활동 로그를 실시간 리스트처럼 표시
	•	결과: Henry가 실제로 무엇을 하는지 상세 확인 가능하다고 설명됨
	•	근거 타임스탬프: 발언 2:57–3:04 / 화면 3:07 캡처

⸻

	•	화면/기능 D: Calendar / Scheduled Tasks 주간 뷰
	•	위치/맥락: Calendar 메뉴 화면
	•	동작: 요일별 스케줄 카드 표시, Week/Today 전환, Always Running 작업 표시
	•	결과: cron jobs/scheduled tasks 확인 및 proactive 동작 검증
	•	근거 타임스탬프: 발언 3:58–5:12 / 캡처(캘린더 화면)

⸻

	•	화면/기능 E: Projects 카드 보드
	•	위치/맥락: Projects 메뉴 화면
	•	동작: 프로젝트 카드별 진행률/상태/우선순위/담당자 표시
	•	결과: 주요 프로젝트 진행 상황 추적
	•	근거 타임스탬프: 발언 5:12–7:04 / 화면 6:07 캡처

⸻

	•	화면/기능 F: Memory 화면 (Long-Term Memory + Daily Journal)
	•	위치/맥락: Memory 메뉴 화면
	•	동작: 날짜별 메모리 목록 탐색, 선택한 날짜의 상세 메모리 읽기
	•	결과: 과거 대화/연구/결정 사항을 저널처럼 열람
	•	근거 타임스탬프: 발언 7:04–8:29 / 화면 7:12 캡처

⸻

	•	화면/기능 G: Docs 화면 (문서 검색/분류/리더)
	•	위치/맥락: Docs 메뉴 화면
	•	동작: 문서 검색, 태그/포맷 필터, 문서 목록 선택, 본문 읽기
	•	결과: OpenClaw 생성 문서 재탐색 및 재사용
	•	근거 타임스탬프: 발언 8:29–10:30 / Docs 캡처

⸻

	•	화면/기능 H: Team 화면 (에이전트 조직도 카드 레이아웃)
	•	위치/맥락: Team 메뉴 화면
	•	동작: 계층별 에이전트 카드/역할/태그/미션 문구 표시
	•	결과: 역할 분담 구조와 mission statement 시각화
	•	근거 타임스탬프: 발언 10:30–12:45 / Team 캡처들

⸻

	•	화면/기능 I: Office 화면 (2D 픽셀 오피스 시뮬레이션)
	•	위치/맥락: Office 메뉴 화면
	•	동작: 픽셀 캐릭터가 책상/공간에 위치, 상단 Demo Controls 버튼, 하단 에이전트 상태 카드
	•	결과: 에이전트들의 현재 작업 상태를 시각적으로 확인
	•	근거 타임스탬프: 발언 12:45–14:23 / Office 캡처들(15:07 포함)

⸻

	•	화면/기능 J: 상단 공통 바 (Search / Pause / Ping Henry)
	•	위치/맥락: 대부분의 Mission Control 화면 상단 우측
	•	동작: 검색, 일시정지, Henry ping 동작으로 보임 (정확 동작은 시연 미확인)
	•	결과: [확인 불가] (클릭 결과 미제공)
	•	근거 타임스탬프: 다수 캡처 공통 UI

⸻

7) 용어/개념 정의집 (영상 기준)
	•	Mission Control: OpenClaw 안에 만드는 커스텀 대시보드. 필요한 도구를 만들고 여러 기능 화면(Task/Calendar/Projects 등)을 통합 관리하는 UI. (0:10–0:16, 전반)
	•	Task board: OpenClaw/Henry/하위 에이전트 작업을 칸반 방식으로 추적하는 보드. (2:14–3:58)
	•	Live Activity Feed: Henry가 실제로 수행하는 작업 내용을 상세히 확인하는 패널. (2:57–3:04)
	•	Calendar screen: OpenClaw의 cron jobs 및 scheduled tasks를 확인하는 화면. (3:58–5:12)
	•	Projects screen: 주요 프로젝트 진행률과 집중 대상 프로젝트를 추적하는 화면. (5:12–7:04)
	•	Memory screen: 일자별 대화/메모리를 저널처럼 열람하고 정리하는 화면. (7:04–8:29)
	•	Docs screen / docs tool: OpenClaw가 생성한 문서를 검색/분류/열람하는 화면. (8:29–10:30)
	•	Team screen: 에이전트 조직 구조, 역할, 미션 스테이트먼트, 계층을 보여주는 화면. (10:30–12:45)
	•	Office screen: 에이전트들의 작업 상태를 2D 픽셀 오피스로 시각화하는 화면. (12:45–14:23)
	•	Mission statement: 모든 에이전트가 공통으로 작업 방향을 맞추는 목표 문장. (11:47–12:27)
	•	Reverse prompting: OpenClaw에게 역으로 질문해서(예: 다음 작업/미션/프로젝트 분류/필요 도구) 답을 끌어내는 방식으로 설명됨. (6:22–7:04, 12:17–12:27, 14:54–15:36)
	•	heartbeat: Task board를 주기적으로 확인하도록 설정한 점검 주기 개념(발언 기준). (3:31–3:44)
	•	cron jobs: Calendar 화면에서 표시/검증 대상으로 설명된 예약 작업. (4:04–4:07)
	•	proactive tasks: 사용자가 요청한 시간대에 자동으로 수행되도록 예약된 작업들 맥락에서 사용. (4:09–5:03)

⸻

8) 숫자/조건/규칙/제약 “원문 리스트”

주의: 아래는 영상 스크립트 발언 + 제공된 화면 캡처에서 확인된 수치/조건만 나열합니다.
OCR/캡처 가독성 한계로 일부는 [불명확] 처리했습니다.

	•	항목: 영상 길이
	•	값/조건: 16:13
	•	근거 타임스탬프: 유튜브 플레이어 캡처
	•	화면 표기/발언 중 무엇인지: 화면 표기
	•	항목: 초기 구축 방식
	•	값/조건: “just a couple of prompts” / “few prompts”
	•	근거 타임스탬프: 0:08–0:10, 0:22, 1:42–1:44
	•	화면 표기/발언 중 무엇인지: 발언
	•	항목: 경험 요구 조건
	•	값/조건: “Zero programming experience needed, zero technical experience needed.”
	•	근거 타임스탬프: 0:24–0:28
	•	화면 표기/발언 중 무엇인지: 발언
	•	항목: 효과 표현
	•	값/조건: “a hundred times more powerful”
	•	근거 타임스탬프: 0:30–0:33
	•	화면 표기/발언 중 무엇인지: 발언
	•	항목: Task board 상단 지표
	•	값/조건: 19 This week / 3 In progress / 42 Total / 45% Completion
	•	근거 타임스탬프: 3:07 (스크린샷)
	•	화면 표기/발언 중 무엇인지: 화면 표기
	•	항목: Task board 식별 규칙
	•	값/조건: “A is for me, H is for Henry”
	•	근거 타임스탬프: 2:48–2:52
	•	화면 표기/발언 중 무엇인지: 발언
	•	항목: Heartbeat 체크 규칙
	•	값/조건: every heartbeat에 task board 확인 → backlog에서 OpenClaw 할당 태스크 수행
	•	근거 타임스탬프: 3:31–3:44
	•	화면 표기/발언 중 무엇인지: 발언
	•	항목: Calendar Always Running 작업 주기 (캡처)
	•	값/조건: Reaction Poller · Every 5 min
	•	근거 타임스탬프: Calendar 캡처 (4분대 구간)
	•	화면 표기/발언 중 무엇인지: 화면 표기
	•	항목: Calendar Always Running 작업 주기 (캡처)
	•	값/조건: Trend Radar · 5x daily
	•	근거 타임스탬프: Calendar 캡처
	•	화면 표기/발언 중 무엇인지: 화면 표기
	•	항목: Calendar Always Running 작업 주기 (캡처)
	•	값/조건: Opportunity Scanner · 6x daily
	•	근거 타임스탬프: Calendar 캡처
	•	화면 표기/발언 중 무엇인지: 화면 표기
	•	항목: Calendar 이벤트 시간 예시 (캡처)
	•	값/조건: 6:55 AM / 7:00 AM / 8:00 AM / 8:30 AM / 9:00 AM / 9:00 PM / 10:00 PM / 12:00 PM
	•	근거 타임스탬프: Calendar 캡처
	•	화면 표기/발언 중 무엇인지: 화면 표기
	•	항목: Projects 상단 요약 (캡처)
	•	값/조건: 5 total • 2 active • 3 planning
	•	근거 타임스탬프: 6:07 (스크린샷)
	•	화면 표기/발언 중 무엇인지: 화면 표기
	•	항목: 프로젝트 카드 진행률 예시 (캡처)
	•	값/조건: 100%, 70%, 0% 등
	•	근거 타임스탬프: 6:07 (스크린샷)
	•	화면 표기/발언 중 무엇인지: 화면 표기
	•	항목: Vibe Coding Academy 부트캠프 빈도
	•	값/조건: every single Friday
	•	근거 타임스탬프: 5:49–5:54, 16:00–16:02
	•	화면 표기/발언 중 무엇인지: 발언
	•	항목: 본인이 했다고 말한 부트캠프 길이
	•	값/조건: entire two-hour boot camp on this mission control
	•	근거 타임스탬프: 5:54–5:58
	•	화면 표기/발언 중 무엇인지: 발언
	•	항목: Team 화면 상단 요약 (캡처)
	•	값/조건: 9 AI agents across 3 machines
	•	근거 타임스탬프: Team 화면 캡처
	•	화면 표기/발언 중 무엇인지: 화면 표기
	•	항목: Mission statement 시간 표현
	•	값/조건: produces value 24/7
	•	근거 타임스탬프: 12:08–12:12 / Team 화면 상단 미션 문구
	•	화면 표기/발언 중 무엇인지: 발언 + 화면 표기
	•	항목: Memory 화면 문서 메타(캡처 예시)
	•	값/조건: 4.8 KB • 772 words / Modified 4 days ago
	•	근거 타임스탬프: 7:12 (스크린샷)
	•	화면 표기/발언 중 무엇인지: 화면 표기
	•	항목: Long-Term Memory 카드 메타(캡처 예시)
	•	값/조건: 1,608 words • Updated about 22 hours ago
	•	근거 타임스탬프: 7:12 (스크린샷)
	•	화면 표기/발언 중 무엇인지: 화면 표기
	•	항목: Docs 화면 선택 문서 메타(캡처 예시)
	•	값/조건: 3.2 KB • 583 words
	•	근거 타임스탬프: Docs 캡처 (8분대)
	•	화면 표기/발언 중 무엇인지: 화면 표기
	•	항목: 뉴스레터 작성 주기(발언)
	•	값/조건: every Thursday
	•	근거 타임스탬프: 9:10–9:15
	•	화면 표기/발언 중 무엇인지: 발언
	•	항목: 문서 찾기 시간 문제(발언 예시)
	•	값/조건: “scroll back for 10 minutes”
	•	근거 타임스탬프: 9:30–9:32
	•	화면 표기/발언 중 무엇인지: 발언
	•	항목: Office 화면 UI 스타일 조건(프롬프트 예시)
	•	값/조건: 2D pixel art office / desks / sub agents
	•	근거 타임스탬프: 13:46–14:02
	•	화면 표기/발언 중 무엇인지: 발언

⸻

9) 빈칸/불확실성 로그
	•	[확인 불가] 원본 영상의 실제 오디오 톤/강조/발화 속도/정확 발음 (제공 스크립트 기반 분석이므로 직접 청취 불가)
	•	[확인 불가] 스크립트 오탈자 교정의 정답값 (예: “Shabuya”가 실제로는 “Shibuya”인지 여부 등) — 스크립트 그대로 사용
	•	[불명확] 0:00–0:35, 0:35–2:16 구간의 상세 화면 전환 (해당 구간 연속 스크린샷 없음)
	•	[불명확] Task board 화면에서 실제 컬럼 전체 개수/이름 (캡처에 보이는 범위만 확인됨)
	•	[불명확] Live Activity 피드 각 로그의 전체 문장 (일부 잘림)
	•	[불명확] Calendar 각 이벤트의 전체 이름/빈도/세부 규칙 (캡처 가시 범위만 확인)
	•	[불명확] Projects 카드별 상세 설명 전체 문구 (일부 잘림)
	•	[불명확] Memory 화면 본문의 전체 연구 내용/항목 문장 (가독 범위 제한)
	•	[불명확] Docs 화면의 태그 체계 전체 목록 및 실제 동작 결과 (시연 클릭 결과 미제공)
	•	[불명확] Team 화면 각 카드의 모든 설명문/태그 전체 (일부 잘림)
	•	[불명확] Team 화면에서 “어떤 모델이 어떤 에이전트를 구동하는지” 전체 매핑
	•	발언으로 Charlie=Qwen(local Mac Studio), Ralph=ChatGPT 언급은 있으나 나머지는 부분적/미확인
	•	[불명확] Office 화면에서 캐릭터 이동/상호작용 애니메이션 실제 동작 (정지 캡처만 제공)
	•	[확인 불가] 상단 공통 바(Search/Pause/Ping Henry)의 실제 클릭 동작 결과
	•	[확인 불가] 영상 말미(16:12–16:13) 마지막 문장 완결 (“I’ll see you in the next …”) 이후 단어

⸻

10) 최종 산출물: “영상 내용만으로 만든 한 장 요약”

핵심 10줄
	1.	영상은 OpenClaw 안에 커스텀 대시보드 Mission Control을 만드는 방법과 주요 화면 구성을 설명한다.
	2.	발표자는 Mission Control이 OpenClaw가 필요한 도구를 만들도록 하는 중심 UI라고 설명한다.
	3.	본인 Mission Control의 사이드바 도구들은 모두 OpenClaw가 만들었고, 본인은 코드를 쓰지 않았다고 말한다.
	4.	초기 생성 프롬프트 예시로 Next.js + localhost 기반 Mission Control 빌드를 제시한다.
	5.	Task board는 칸반 보드와 Live Activity Feed로 에이전트 작업 상태를 추적·검토하는 화면으로 소개된다.
	6.	Calendar는 cron jobs / scheduled tasks를 확인해 OpenClaw의 proactive 작업이 실제 예약되었는지 검증하는 화면으로 소개된다.
	7.	Projects는 주요 프로젝트 진행률을 추적하고, reverse prompting으로 다음 작업을 도출하는 데 쓰인다고 설명된다.
	8.	Memory는 일자별 대화/기억을 저널처럼 읽는 화면, Docs는 OpenClaw 생성 문서를 검색/분류/열람하는 화면으로 설명된다.
	9.	Team은 에이전트 조직도·역할·미션 스테이트먼트를 보여주는 화면, Office는 에이전트 작업을 2D 픽셀 오피스로 시각화하는 화면으로 소개된다.
	10.	발표자는 영상 예시를 그대로 복사하기보다, reverse prompting으로 개인 워크플로우에 맞는 커스텀 도구를 찾으라고 말한다.

절차(있다면) 5줄
	1.	OpenClaw에 Mission Control을 만들라고 요청하고, Next.js + localhost 조건을 붙인다.
	2.	필요하면 UI 스타일(예: linear 느낌)을 추가 요청한다.
	3.	Task/Calendar/Projects/Memory/Docs/Team/Office 같은 핵심 화면을 설명형 프롬프트로 각각 만들게 한다.
	4.	Task board에는 heartbeat 기반 backlog 확인/자율 수행 로직을 지시한다고 발표자는 설명한다.
	5.	초기 버전 완성 후 reverse prompting으로 개인 워크플로우 기준의 추가 커스텀 도구를 도출하게 한다.

키워드 10개
	•	Mission Control
	•	OpenClaw
	•	custom dashboard
	•	Task board
	•	Live Activity Feed
	•	Calendar
	•	Projects
	•	Memory
	•	Docs
	•	Team / Office / reverse prompting
