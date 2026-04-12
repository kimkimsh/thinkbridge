# ThinkBridge — AI 소크라테스식 튜터링 시스템

> "AI가 답을 주는 시대, 생각하는 법을 가르치는 AI"
>
> **2026 KIT 바이브코딩 공모전 출품작**

---

## 🎯 프로젝트 개요

ThinkBridge는 **AI가 절대 정답을 제공하지 않고**, 소크라테스식 질문법으로 학생 스스로 답에 도달하도록 이끄는 1:1 AI 튜터링 시스템입니다. 기존 AI 챗봇이 "답을 주는 도구"라면, ThinkBridge는 "생각을 키우는 동반자"를 지향합니다.

### 기존 AI 챗봇과의 차이

| 항목 | 기존 AI 챗봇 (ChatGPT 등) | ThinkBridge |
|------|--------------------------|-------------|
| 답변 방식 | 정답 직접 제공 | 소크라테스식 질문으로 유도 |
| 사고 분석 | 없음 | 블룸의 개정판 분류체계 기반 6차원 실시간 분석 |
| 학습 경로 | 단발성 QA | 5단계 소크라테스 진행 (명확화→탐색→유도→검증→확장) |
| 교강사 도구 | 없음 | 반별 대시보드 + 사고력 히트맵 + 세션 리플레이 |
| 리포트 | 없음 | 레이더 차트 + 성장 추이 + AI 서술형 요약 |

---

## 👥 주요 기능 (4 역할)

### 🎓 학생 (Student)
- **소크라테스식 AI 채팅** — 실시간 SSE 스트리밍 (토큰 단위 타이핑 애니메이션)
- **실시간 6차원 사고 분석 패널** — 매 턴마다 업데이트, 접힘/펼침 지원
- **5단계 진행 바** — 명확화 → 탐색 → 유도 → 검증 → 확장
- **힌트 요청** — 어려울 때 더 구체적인 유도 질문 요청
- **학습 리포트** — 세션 종료 시 자동 생성 (Radar + Growth Trend + Timeline + AI 내러티브). 서버 늦어지면 최대 5회 × 2초 자동 retry + 진행률 표시
- **세션 히스토리** — 과거 대화 재접근 및 리포트 확인 (completed는 리포트로 자동 리다이렉트, active는 메시지·분석·턴 카운트·stage 모두 복원)
- **종료 오버레이** — 세션 종료 클릭 시 전체 화면 반투명 오버레이 + 스피너 + "사고 과정을 분석하고 있어요" 안내
- **세션 재개 시 상태 복원** — 진행중 세션 카드 클릭 시 이전 메시지 배열, 마지막 분석, 턴 카운트, 현재 stage 까지 모두 복원

### 👨‍🏫 교강사 (Instructor)
- **반별 대시보드** — 반 선택 드롭다운 + 4개 Summary Card (총 학생/평균 세션/활성률/평균 점수)
- **사고력 히트맵** — 학생×6차원 매트릭스 (빨강/노랑/초록 3단계) + AI 인사이트 자동 생성
- **학생 목록** — 점수 뱃지 (평균 기반 색상 구분) + 클릭 시 세션 리플레이
- **세션 리플레이** — 턴별 메시지 + 분석 패널 동기화 (좌측 세션 목록 / 중앙 메시지 / 우측 ThoughtPanel) + 헤더에 학생명·과목·주제·세션 ID 메타 표시

### 🛡️ 운영자 (Admin)
- **전체 통계 카드** — 총 학생, 총 세션, 전체 평균, 활성률
- **반별 비교 BarChart** — 3개 반 × 6차원 사고력
- **과목별 RadarChart** — 수학/과학/논술 overlay 비교
- **Demo Data Banner** — 시드 데이터 기반임을 명시

### 🚀 게스트 (Guest — 회원가입 없음)
- **5턴 무료 체험** — 랜딩 "바로 체험하기" 원클릭 진입
- **CAS 패턴 race 방어** — DB 레벨 atomic `UPDATE ... WHERE total_turns < 5 ... RETURNING`
- **전용 프롬프트** (`GUEST_SOCRATIC_PROMPT`) — 5턴 내 Stage 1→3 압축 진행
- **회원가입 전환 CTA** — 5턴 소진 시 "계속하려면 회원가입이 필요합니다"

### 🎯 공통 UX 레이어

#### 튜토리얼 오버레이 (4 역할)
- **4 페이지 × 18 steps** — chat (7), sessions (3), instructor dashboard (4), admin dashboard (4)
- **자동 실행** — 각 페이지 최초 방문 + 데이터 로드 완료 조건 충족 시 트리거 (`useAutoStartTutorial`)
- **수동 재실행** — 페이지 헤더 `?` (도움말) 아이콘 버튼. 채팅 중에는 ProgressBar 헤더 우측에서 접근 가능
- **SVG mask 스포트라이트 + 툴팁** — DIY 구현 (서드파티 라이브러리 無). 4 placement + mobile center fallback
- **키보드 네비게이션** — `ArrowRight`/`Enter` 다음, `ArrowLeft` 이전, `Esc` 종료
- **영속성** — localStorage `thinkbridge_tutorial_{id}_v1` 키로 완료 플래그 저장 (auto-trigger 억제)
- **글로벌 OFF 스위치** — `thinkbridge_tutorial_disabled="true"` 로 데모/녹화 시 완전 비활성화

#### 에러 처리 + 네비게이션 일관성
- **한국어 에러 정규화** — `normalizeErrorMessage()`가 "Failed to fetch" 등 브라우저 원문을 "네트워크 연결을 확인해 주세요."로 치환
- **이중 에러 배너** — Hero CTA 아래 inline + 상단 우측 fixed 배너 동시 표시 → 사용자 시선 어디서든 인지
- **Navbar 로고 역할별 라우팅** — 로그인 시 `getHomePathForRole()` 로 student/instructor/admin 홈으로 이동
- **로그인 화면 "처음 화면으로" 링크** — 좌상단 `ArrowLeft` 버튼으로 랜딩 복귀
- **Hero CTA 역할별 분기** — 로그인 상태에서 "대화 계속하기" / "강사 대시보드로" / "관리자 대시보드로" 단일 CTA 노출

#### 모바일 UX
- **상단 고정 햄버거** — 하단 floating 방식이 콘텐츠를 가리던 문제를 해결. 모든 페이지에서 Navbar 좌측 (로고 앞) 에 `Menu` 아이콘 버튼 고정
- **좌측 Sheet 슬라이드인** — 역할별 네비게이션 링크 + 아이템 클릭 시 자동 닫힘
- **반응형 튜토리얼** — 뷰포트 < 768px 일 때 툴팁 placement 무시하고 중앙 배치 (matchMedia)
- **채팅 입력 바와 충돌 없음** — 종료/힌트 버튼 4-state (base/hover/active/disabled) 명확 구분

---

## 🏗️ 아키텍처

```
[Browser]
    │
    │ HTTPS
    ▼
[Vercel: Next.js 14 Frontend]
    │
    │ REST + SSE (fetch + ReadableStream)
    ▼
[Render: FastAPI Backend]  ◀── UptimeRobot 5분 ping (cold start 방지)
    │
    ├──► [Supabase PostgreSQL]  (Session mode pooler, port 5432)
    │
    └──► [Anthropic Claude API]  (Tool Use 1-tool + text 패턴)
```

### 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 14 (App Router, TypeScript strict), Tailwind CSS, shadcn/ui, Recharts, lucide-react |
| Backend | FastAPI (Python 3.12), SQLAlchemy 2.0 async, asyncpg, Pydantic v2, sse-starlette |
| AI | Anthropic SDK 0.34.2 (Claude Sonnet, Tool Use + Streaming) |
| DB | Supabase PostgreSQL (async) |
| 배포 FE | Vercel (GitHub App 자동 배포) |
| 배포 BE | Render (Docker) + UptimeRobot 5분 ping |
| 인증 | Custom JWT (python-jose) + 게스트 모드 |
| 로깅 | stdlib logging + Render logs |

---

## 🤖 AI 아키텍처 (1-Tool + Text 패턴)

**핵심 혁신**: 1회 Claude API 호출로 응답 + 분석을 동시 획득.

```
Claude Response:
  [text block]     → 소크라테스식 유도 질문 (토큰 단위 실시간 스트리밍)
  [tool_use block] → analyze_thinking JSON (6차원 점수 + stage + patterns + engagement)
                      │
                      └─► 완료 시 파싱하여 ThoughtPanel/DB 저장
```

### 6차원 사고 분석 프레임워크 (Bloom's Revised Taxonomy)

| 차원 | 블룸 단계 | 측정 |
|------|---------|------|
| 문제 이해 | Understand | 문제를 명확히 파악하는지 |
| 전제 확인 | Remember/Understand | 숨은 가정/조건 인식 |
| 논리 구조화 | Analyze | 단계적 사고 전개 |
| 근거 제시 | Apply | 주장에 대한 근거 제공 |
| 비판적 사고 | Evaluate | 대안 검토 + 반례 생각 |
| 창의적 사고 | Create | 새로운 접근법 발견 |

### 3단계 Fallback

1. **Tool 미호출** → `DEFAULT_ANALYSIS` (all scores=5) + 로그 경고
2. **JSON 파싱 실패** → 동일 기본값 + 에러 로깅
3. **API 5xx/timeout** → exponential backoff 재시도 (529 Overload 전용 처리 포함) → 실패 시 `event: error` yield

### Guest 5턴 한도 (CAS 패턴)

SQLAlchemy async + Supabase Pooler 환경에서 `SELECT ... FOR UPDATE`는 동시 요청을 직렬화하지 못함을 실측 확인 후, **atomic UPDATE ... RETURNING** 패턴으로 재설계:

```sql
UPDATE tutoring_sessions
SET total_turns = total_turns + 1
WHERE id = :session_id
  AND total_turns < 5
RETURNING total_turns;
```

- `rowcount == 0` → 한도 도달 → 403
- `rowcount == 1` → DB 레벨 원자적 증가
- Pooling mode·트랜잭션 경계 무관하게 동작

자세한 맥락: [`docs/work_log/09_sse_and_race_hardening.md`](docs/work_log/09_sse_and_race_hardening.md)

---

## 📦 데이터 모델 (8 테이블)

| 테이블 | 핵심 필드 | 비고 |
|--------|---------|------|
| `User` | id, email, role(student/instructor/admin), is_guest | 게스트는 role=student + is_guest=True |
| `ClassRoom` | name, subject, instructor_id | 시드 전용 (3개 반) |
| `Enrollment` | user_id, class_id | 시드 전용 |
| `TutoringSession` | user_id, subject, topic, status, total_turns | active/completed |
| `Message` | session_id, role, content, turn_number | user/assistant |
| `ThoughtAnalysis` | message_id(unique), 6차원 점수(0-10), patterns(JSON), socratic_stage(1-5), engagement_level | CheckConstraint로 무결성 보장 |
| `Report` | session_id(unique), summary, dimension_scores(JSON) | 세션 종료 시 자동 생성 |
| `TokenUsage` | session_id, input_tokens, output_tokens, model | API 호출별 추적 |

---

## 📁 프로젝트 구조

```
thinkbridge/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI 엔트리 + CORS + lifespan
│   │   ├── config.py                # Pydantic Settings
│   │   ├── database.py              # async engine (NullPool + Session mode)
│   │   ├── models/                  # 8 SQLAlchemy 모델
│   │   ├── schemas/                 # Pydantic 요청/응답 스키마
│   │   ├── routers/
│   │   │   ├── auth.py              # register/login/guest
│   │   │   ├── sessions.py          # CRUD + SSE streaming (CORE)
│   │   │   ├── reports.py           # session report + growth trend
│   │   │   ├── dashboard.py         # instructor API
│   │   │   └── admin.py             # admin stats API
│   │   ├── services/
│   │   │   ├── ai_engine.py         # 1-tool+text + streaming + 3-stage fallback
│   │   │   └── report_generator.py  # narrative generation
│   │   └── core/
│   │       ├── security.py          # JWT + bcrypt + getCurrentUser
│   │       └── prompts.py           # SOCRATIC_SYSTEM_PROMPT + GUEST + tool schema
│   ├── tests/
│   │   ├── test_guest_race.py       # asyncio.gather 기반 CAS 방어 검증
│   │   └── test_api_scenarios.py
│   ├── seed_data.py                 # 시드 (8 학생, 3 반, 40 세션 + 3 hand-crafted 대화)
│   ├── seed_sync.py                 # psycopg2 기반 (pgbouncer 우회용)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx           # AuthProvider + 한글 폰트
│   │   │   ├── global-error.tsx     # root-level error boundary (v3)
│   │   │   ├── error.tsx            # segment-level error
│   │   │   ├── page.tsx             # 랜딩 (ChatGPT 비교 + demo mode)
│   │   │   ├── login/ register/
│   │   │   ├── student/{chat, sessions, report/[id]}/
│   │   │   ├── instructor/{dashboard, replay/[sessionId]}/
│   │   │   └── admin/dashboard/
│   │   ├── components/
│   │   │   ├── chat/                # ChatInterface (SSE 스트리밍), MessageBubble, ThoughtPanel, ProgressBar
│   │   │   ├── charts/              # Radar/Heatmap/Growth/Timeline (Recharts)
│   │   │   ├── dashboard/           # ClassSelector, StudentList, SummaryCards
│   │   │   ├── replay/              # SessionReplay (instructor 리플레이 듀얼 패널)
│   │   │   ├── tutorial/            # TutorialOverlay (SVG mask 스포트라이트), TutorialButton (? 아이콘)
│   │   │   └── layout/              # Navbar, Sidebar (desktop-only), MobileMenu (Sheet + 햄버거 트리거)
│   │   ├── lib/
│   │   │   ├── api.ts               # REST + SSE (fetch + ReadableStream, AbortController 지원)
│   │   │   ├── auth.tsx             # AuthProvider + JWT 관리 + getHomePathForRole()
│   │   │   ├── constants.ts         # 6차원 라벨 + stage 라벨 + 색상
│   │   │   ├── tutorial.tsx         # TutorialProvider + useTutorial + useAutoStartTutorial + waitForTarget
│   │   │   ├── tutorialSteps.ts     # 4 튜토리얼 × 18 steps 정의 (targetSelector + placement)
│   │   │   └── tutorialConstants.ts # z-index, storage keys, timing, 라벨
│   │   └── types/                   # TypeScript 인터페이스
│   ├── package.json
│   └── next.config.mjs
├── docs/
│   ├── work_log/                    # 01-20 순차 개발 일지 (v1→v3 안정화→v3.1 UX 폴리시→튜토리얼→모바일 재설계)
│   ├── revise_plan_v1/ v2/ v3/      # 계획 변천 기록
│   ├── superpowers/{specs, plans}/  # 구조화된 spec + 실행 plan
│   ├── test/user_test/              # 113 시나리오 + 25 수정검증 시나리오 + 자동/수동 테스트 리포트
│   ├── bug_fix/
│   └── ui_review/
├── scripts/
│   └── warmup.sh                    # 데모 전 cold start 방지
├── e2e-student-test.js              # Playwright E2E (24 시나리오)
├── CLAUDE.md                        # 에이전트용 프로젝트 가이드
├── .gitignore
├── README.md                        # 이 파일
└── LIVE_ACCESS.md                   # 🔒 URL/credentials (gitignore — 로컬 전용)
```

---

## 🧪 로컬 개발 환경 설정

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# .env 편집 (LIVE_ACCESS.md 참조 — 로컬 전용)
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# .env.local에 NEXT_PUBLIC_API_URL 설정 (LIVE_ACCESS.md 참조)
npm run dev  # http://localhost:3000
```

### 시드 데이터 주입

```bash
# asyncpg + pgbouncer 호환 이슈 회피용 동기 스크립트
python backend/seed_sync.py
```

---

## 🔍 테스트 & QA

### 백엔드 — Race 방어 자동 검증

```bash
# 로컬 (race 재현성 최대)
THINKBRIDGE_API_URL=http://localhost:8000 python backend/tests/test_guest_race.py

# 프로덕션 smoke test
python backend/tests/test_guest_race.py
```

기대 출력:
```
200: 5, 403: 1, raw: [200, 200, 200, 200, 200, 403]
PASS: Guest 5-turn limit correctly enforced under concurrency
```

### 프론트엔드 — E2E Playwright

```bash
node e2e-student-test.js  # 24 시나리오 (로그인 → 세션 → 리포트)
```

### 사용자 수동 검증 가이드

`docs/test/user_test/` 폴더에 두 종류의 체크리스트가 준비되어 있습니다.

#### 전체 커버리지 — 113 시나리오

| 파일 | 용도 |
|------|------|
| `comprehensive_test_scenarios.md` | 전체 113개 시나리오 (L.1-20, ST.1-35, IN.1-14, AD.1-9, X.1-35) |
| `automated_test_report.md` | Playwright 자동 실행 결과 (17개 PASS, 18 스크린샷) |
| `manual_only_tests.md` | 사용자 수동 필수 96개 (3단계 우선순위) |
| `screenshots/` | 자동 테스트 시 캡처한 증거 이미지 |

#### UX Fix 배치 검증 — 25 시나리오 (v1.3)

사용자 피드백 + 튜토리얼 + 모바일 재설계를 커버하는 최신 시나리오:

| 파일 | 용도 |
|------|------|
| `fix_verification_scenarios.md` | 25 시나리오 (V.1-V.25): §1 에러/진행률 4 · §2 네비/복원 6 · §3 UI 폴리시 2 · §4 튜토리얼 10 · §5 통합 3 |
| `fix_verification_automated_results.md` | Claude + Playwright 자동 검증 결과 (18 PASS, 4 PARTIAL, 시나리오 수정 로그 포함) |
| `fix_verification_manual_remaining.md` | 수동 관찰 필수 항목 (overlay flash, hover 시각, 스크린 리더 등) |

---

## 📖 개발 이력 (Work Log)

프로젝트 진화 타임라인 — 각 파일은 해당 단계의 의사결정·이슈·해결을 담고 있습니다.

### 📅 v1 → v3 기반 구축

| 단계 | 문서 | 내용 |
|------|------|------|
| 1 | [`01_overview.md`](docs/work_log/01_overview.md) | 프로젝트 개요 + 초기 스택 선정 |
| 2 | [`02_implementation.md`](docs/work_log/02_implementation.md) | 기본 구현 (Auth + Sessions + 1-tool Pattern) |
| 3 | [`03_deployment.md`](docs/work_log/03_deployment.md) | Supabase + Render + Vercel 배포 + 8가지 트러블슈팅 |
| 4 | [`04_qa_testing.md`](docs/work_log/04_qa_testing.md) | QA + E2E 첫 구축 |
| 5 | [`05_architecture.md`](docs/work_log/05_architecture.md) | 아키텍처 정리 |
| 6 | [`06_ai_response_fix.md`](docs/work_log/06_ai_response_fix.md) | Claude tool-only 응답 방어 |
| 7 | [`07_ui_redesign.md`](docs/work_log/07_ui_redesign.md) | UI/UX 리디자인 |
| 8 | [`08_prompt_engineering.md`](docs/work_log/08_prompt_engineering.md) | 프롬프트 튜닝 |
| 9 | [`09_sse_and_race_hardening.md`](docs/work_log/09_sse_and_race_hardening.md) | SSE flush + Guest CAS race 해결 |
| 10 | [`10_v3_stability_hardening.md`](docs/work_log/10_v3_stability_hardening.md) | **v3 안정화 대규모 작업 (20 commits)** |

### 🛠 v3 이후 인프라 & 문서 정리

| 단계 | 문서 | 내용 |
|------|------|------|
| 11 | [`11_nested_git_cleanup.md`](docs/work_log/11_nested_git_cleanup.md) | `frontend/.git/` 중첩 저장소 제거 + Vercel CLI 링크 무영향 확인 |

### 🎨 v3.1 UX 폴리시 (사용자 테스트 피드백 반영, 12 이슈)

| 단계 | 문서 | 내용 |
|------|------|------|
| 12 | [`12_instructor_replay_header.md`](docs/work_log/12_instructor_replay_header.md) | 강사 리플레이 헤더에 학생명·과목·주제·세션 ID 노출 (`?name=` query 활용) |
| 13 | [`13_landing_auth_navbar_fixes.md`](docs/work_log/13_landing_auth_navbar_fixes.md) | `normalizeErrorMessage()` + 이중 배너 + 로그인 상태 Hero CTA + Navbar 로고 역할별 라우팅 |
| 14 | [`14_session_resume_restore.md`](docs/work_log/14_session_resume_restore.md) | **CRITICAL**: 진행중 세션 재개 시 메시지·분석·턴·stage 모두 복원 + completed 세션은 리포트로 자동 리다이렉트 |
| 15 | [`15_progress_indicators_ui_polish.md`](docs/work_log/15_progress_indicators_ui_polish.md) | 세션 종료 오버레이 + 리포트 retry 5×2s + 종료 버튼 4-state + 모바일 햄버거 위치 (초기안) |

### 🎓 v3.2 튜토리얼 오버레이 (DIY, 18 steps × 4 pages)

| 단계 | 문서 | 내용 |
|------|------|------|
| 16 | [`16_tutorial_overlay_core.md`](docs/work_log/16_tutorial_overlay_core.md) | Core 인프라 — `TutorialProvider` + `TutorialOverlay` (SVG mask 스포트라이트) + 상수/타이밍/storage keys |
| 17 | [`17_tutorial_overlay_integration.md`](docs/work_log/17_tutorial_overlay_integration.md) | 4 페이지에 `data-tutorial-id` 18개 + `TutorialButton` 4개 + `useAutoStartTutorial` 게이팅 |

### 🔧 v3.3 UX 보완 (튜토리얼 빈틈 + 모바일 재설계, 2026-04-13)

| 단계 | 문서 | 내용 |
|------|------|------|
| 18 | [`18_login_back_to_home_button.md`](docs/work_log/18_login_back_to_home_button.md) | 로그인 페이지 좌상단 "처음 화면으로" 뒤로가기 링크 추가 (`ArrowLeft` + `aria-label`) |
| 19 | [`19_chat_interface_tutorial_button.md`](docs/work_log/19_chat_interface_tutorial_button.md) | ChatInterface 헤더에 `TutorialButton` 누락 보완 — 대화 중에도 튜토리얼 재실행 가능 |
| 20 | [`20_mobile_hamburger_top_navbar.md`](docs/work_log/20_mobile_hamburger_top_navbar.md) | 모바일 햄버거 **하단 floating → 상단 Navbar 좌측 고정** 재설계. `MobileMenu` 신설, `Sidebar` desktop-only 로 단순화 |

### 계획 변천 (revise_plan)

| 버전 | 폴더 | 특징 |
|------|------|------|
| v1 | `docs/revise_plan_v1/` | 초기 설계 |
| v2 | `docs/revise_plan_v2/` | 공모전 대응 재설계 (1-tool+text 확정) |
| v3 | `docs/revise_plan_v3/` | **안정화 중심** (P0/P1/P2 + DOC + backlog + 실행 순서) |

### 구조화된 Spec + Plan

- [`docs/superpowers/specs/2026-04-12-sse-and-guest-race-hardening-design.md`](docs/superpowers/specs/) — v3 설계 spec
- [`docs/superpowers/plans/2026-04-12-sse-and-guest-race-hardening.md`](docs/superpowers/plans/) — 실행 계획

---

## 🛡️ v3 안정화 주요 개선 (2026-04-12)

20 commits로 구조/안정성 강화:

### P0 — Critical Fixes (3)
- `anthropic.OverloadedError` → `InternalServerError` (SDK 0.34.2 실 매핑)
- `_saveAiResponseToDb` 침묵 실패 → client에 error event yield
- `apiRequest` empty/non-JSON body 방어 (Render cold start HTML 대응)

### P1 — High Priority (6)
- Guest 턴 보상 감소 (CAS 증가 후 AI 실패 시)
- SSE AbortController (unmount 시 fetch cancel)
- 스트리밍 retry canned text 제거 → error event로 전환
- `generateSseEvents` exception differentiation
- `parseSSEBuffer` 로깅 강화
- 랜딩 게스트/데모 로그인 에러 visibility

### P2 — Structural (5)
- Message (session, turn, role) 중복 INSERT 방어
- Report race 제거 (auto-create 폐기, endSession eager generation)
- `socraticStage` [1,5] clamp
- `global-error.tsx` root-layout 에러 boundary
- `useSearchParams` Suspense boundary

### Docs Drift (5)
- SSE parseSSEBuffer 예시 CRLF 반영
- SSEEvent type "error" variant 반영
- CAS supersedes FOR UPDATE (spec annotation)
- `/api/auth/me` 문서 정정
- Stuck detection 실제 동작 반영, prompt versioning docstring

### Dead Code 정리 (1)
- `processTurn` non-streaming 함수 제거

**검증**: Production race test `5x200 + 1x403` PASS / E2E 24/24 PASS / 자동 테스트 17/17 PASS.

---

## 🎨 v3.1 UX 폴리시 (사용자 테스트 피드백, 2026-04-12)

`10_v3_stability_hardening.md` 이후 실사용 관찰에서 발견된 12 이슈를 4개 카테고리로 정리하여 수정. 자세한 검증 시나리오는 `docs/test/user_test/fix_verification_scenarios.md` 참조.

### A. 에러 처리 + 진행률 (4건)
- Guest 로그인 실패 시 Hero CTA 직하단 inline 배너 + top-right 배너 **동시 표시** (L.9)
- 세션 종료 후 리포트까지의 대기를 전체 화면 오버레이 (`z-[70]`) + 스피너 + "사고 과정을 분석하고 있어요" 메시지로 명시
- `normalizeErrorMessage()` — "Failed to fetch"/"Load failed"/"NetworkError..." → "네트워크 연결을 확인해 주세요." (Chrome/Firefox/Safari 공통)
- 리포트 페이지 미준비 시 5회 × 2초 자동 retry + 진행 카운터 "(N/5)" 오버레이

### B. 네비게이션 + 상태 복원 (6건)
- 로그인 상태 Hero CTA — `user.role`에 따라 "대화 계속하기 →" / "강사 대시보드로 →" / "관리자 대시보드로 →" 단일 CTA
- Navbar 로고 `getHomePathForRole()` 적용 — 로그인 상태에서는 역할별 홈으로 이동
- **진행중 세션 재개 CRITICAL**: `initialMessages` + `initialAnalysis` + `initialStage` + `initialTurnCount` 으로 이전 상태 완전 복원
- completed 세션 chat URL 접근 시 `/student/report/{id}` 자동 리다이렉트 (`router.replace`)
- 세션 목록 completed 카드에 "리포트" 명시 버튼 (FileText 아이콘 + outline)
- 강사 리플레이 헤더에 학생명·과목·주제·세션 ID 메타 라인 (query param `?name=` 활용)

### C. UI 폴리시 (2건)
- 종료 버튼 `variant="outline"` + 4-state 색상 (base/hover/active/disabled) + `aria-label` + `title` + 150ms transition
- 모바일 햄버거 `/student/chat` 에서만 `bottom-4 left-4` (v3.3에서 상단 Navbar로 재설계)

---

## 🎓 v3.2 튜토리얼 오버레이 (2026-04-12, 18 steps × 4 pages)

서드파티 라이브러리 없이 React 기반 DIY 구현. 2 phase 로 배포.

### Core (Phase 2)
- `TutorialProvider` — React Context로 activeTutorialId + currentStepIndex 관리
- `TutorialOverlay` — `createPortal(..., document.body)` + SVG mask 스포트라이트 + 4 placement (top/bottom/left/right) + center fallback
- `useAutoStartTutorial(id, ready)` — 페이지마다 다른 게이팅 조건으로 auto-trigger
- `waitForTarget(selector, timeoutMs)` — DOM 요소 등장 polling (기본 5s timeout → center fallback)
- `TutorialButton` — `?` (HelpCircle) 아이콘으로 완료 후에도 재실행 가능

### Integration (Phase 3)
- **chat** (7 steps): 과목 선택 → 주제 입력 → 시작 버튼 → progress bar → 사고 분석 패널 → 힌트 버튼 → 대화 마무리
- **sessions** (3 steps): 새 대화 시작 → 첫 카드 → 리포트 버튼
- **instructor** (4 steps): 반 선택 → 요약 통계 → 히트맵 → 학생 목록
- **admin** (4 steps): 데모 배너 → 전체 통계 → 반별 bar → 과목별 radar

### 상수 (`tutorialConstants.ts`)
- `TUTORIAL_OVERLAY_Z_INDEX = 80` (end-session z-70 + 사이드바 z-50 + ThoughtPanel 플로팅 z-40 위)
- `TUTORIAL_BACKDROP_OPACITY = 0.55`
- `TUTORIAL_WAIT_DEFAULT_TIMEOUT_MS = 5000` / `TUTORIAL_WAIT_POLL_INTERVAL_MS = 100`
- `TUTORIAL_MOBILE_BREAKPOINT_PX = 768` (< 768px → center fallback)
- `TUTORIAL_STORAGE_KEY_PREFIX = "thinkbridge_tutorial_"` + `_v1` suffix (완료 플래그 버전 invalidation)
- `TUTORIAL_DISABLED_STORAGE_KEY = "thinkbridge_tutorial_disabled"` (글로벌 OFF 스위치)

### 접근성
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + `aria-describedby`
- 키보드 네비게이션: `Enter`/`ArrowRight` 다음, `ArrowLeft` 이전, `Esc` 종료

---

## 🔧 v3.3 UX 보완 (2026-04-13)

v3.2 튜토리얼 배포 후 실사용 피드백 + 모바일 경험 전면 재검토.

### 튜토리얼 빈틈 보완
- **채팅 세션 중 재실행 경로 추가** — `ChatInterface.tsx` ProgressBar 헤더 우측에 `TutorialButton` 배치. 이전에는 "새 대화 시작" 카드 헤더에만 있어서 세션 시작 후엔 재실행 불가능했음
- **로그인 페이지 "처음 화면으로" 링크** — `ArrowLeft` + aria-label로 랜딩 복귀 경로 명시화 (기존에는 브라우저 뒤로가기에 의존)

### 모바일 햄버거 재설계
- **하단 floating → 상단 Navbar 좌측 고정** — 페이지마다 좌/우 위치가 달랐던 v3.1 임시안 (`HAMBURGER_CHAT_POSITION` / `HAMBURGER_DEFAULT_POSITION`) 을 폐기. 모든 페이지에서 일관된 상단 고정 위치
- `MobileMenu.tsx` 신설 — Sheet + 햄버거 트리거 캡슐화. `Sidebar.tsx`는 데스크톱 전용으로 단순화
- `NavList` / `getNavItemsForRole` 을 Sidebar에서 `export` → 데스크톱 사이드바와 모바일 Sheet 가 동일 네비 소스 공유
- 하단 콘텐츠(입력 바, 세션 카드, ThoughtPanel 플로팅 트리거) 가림 현상 완전 해소

### 검증 체계
- `docs/test/user_test/fix_verification_scenarios.md` v1.3 — 25 시나리오 (V.1-V.25)
- Claude + Playwright 자동 검증으로 18 PASS 확보, 4 PARTIAL 항목은 수동 관찰 필요 (overlay flash, hover 시각 등)

---

## ⚠️ 알려진 제약 (Backlog)

공모전 제출 범위 외로 의도적으로 defer된 항목 ([`docs/revise_plan_v3/05_backlog.md`](docs/revise_plan_v3/05_backlog.md)):

| ID | 내용 | 영향도 |
|----|------|-------|
| B-1 | snake↔mPascal↔camel 3단계 매핑 통일 | 구조적 (토큰 낭비) |
| B-2 | Guest user DB cleanup job | 장기 운영 시 bloat |
| B-3 | JWT refresh token | 세션 수명 UX |
| B-4 | `lazy="selectin"` 기본값 변경 | 성능 |
| B-5 | Admin stats SQL 집계 전환 | 대규모 데이터 성능 |
| B-6 | Hint 버튼 별도 endpoint | Guest 턴 낭비 방지 |
| B-7 | ChatInterface 상태 머신 리팩터 | 유지보수성 |
| B-10 | Accessibility 전면 audit | WCAG AA 완전 준수 |

**P1-3 (Fallback flag) 미적용**: Supabase 대시보드 수동 ALTER TABLE 필요하여 별도 cycle로 이관.

---

## 🔐 Live Access / Credentials

라이브 URL, 데모 계정, 배포 대시보드 링크, 환경 변수 예시는 **`LIVE_ACCESS.md`** (루트 디렉토리, `.gitignore` 제외 — 공개 저장소 미등록)에 정리되어 있습니다.

로컬에 해당 파일이 없다면 팀 내부 채널로 받아야 합니다.

---

## 🏆 2026 KIT 바이브코딩 공모전

- **심사 기준**: 기술적 완성도, AI 활용 능력/효율성, 기획력/실무 접합성, 창의성
- **핵심 원칙**: "학생 채팅 1개 기능의 완벽함 > 기능 10개의 존재"
- **Iron Rule**: Day 3 끝까지 학생 채팅이 라이브 URL에서 동작 ✅ 달성
- **제출일**: 2026-04-13
- **최종 버전**: v3.3 (기반 v1→v3 10 commits + v3.1 UX 폴리시 + v3.2 튜토리얼 + v3.3 UX 보완 = 20개 work_log 파일)

### 7일 개발 요약

| 단계 | 일자 | 주요 산출 |
|------|------|---------|
| v1 기반 구축 | 04-07 ~ 04-09 | FastAPI + Next.js 스캐폴드, Auth, Supabase/Render/Vercel 배포 |
| v2 AI 엔진 | 04-09 ~ 04-10 | Claude 1-tool+text 패턴, 6차원 분석, SSE 스트리밍 |
| v3 안정화 | 04-10 ~ 04-12 | CAS race 방어, SSE CRLF 대응, 3-stage fallback, 20 commits |
| v3.1 UX 폴리시 | 04-12 | 12 사용자 피드백 이슈 수정 (에러/네비/복원/UI) |
| v3.2 튜토리얼 | 04-12 | 4 페이지 × 18 steps DIY 튜토리얼 + localStorage 영속성 |
| v3.3 UX 보완 | 04-13 | 채팅 중 튜토리얼 재실행, 로그인 뒤로가기, 모바일 상단 햄버거 |

### AI 리포트 첨부 문서

`docs/③ 2026 KIT 바이브코딩 공모전_팀명(개인은 이름)_AI리포트.docx` 참조.

---

## 📚 추가 문서

- **에이전트용 프로젝트 가이드**: [`CLAUDE.md`](CLAUDE.md) — Claude Code 세션에서 자동 로드
- **백엔드 구현 가이드**: [`backend/CLAUDE.md`](backend/CLAUDE.md)
- **프론트엔드 구현 가이드**: [`frontend/CLAUDE.md`](frontend/CLAUDE.md)
- **에이전트 팀 설정**: [`.claude/agents.md`](.claude/agents.md)

---

## 📝 라이선스 & 기여

본 프로젝트는 2026 KIT 바이브코딩 공모전 출품작으로 작성되었으며, 심사 기간 종료 후 별도 라이선스가 정해질 예정입니다.

이슈 제보 / 기여 제안은 공모전 종료 후 GitHub Issues를 통해 받을 예정입니다.
