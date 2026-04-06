# ThinkBridge v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an AI Socratic tutoring system with streaming responses, Tool Use integration, guest trial mode, 6-dimension thinking analysis, and instructor dashboard — all deployable in 1 week.

**Architecture:** Next.js 14 frontend (Vercel) + FastAPI backend (Render) + Supabase PostgreSQL. Single Claude API call per turn using Tool Use for combined Socratic response + thinking analysis. SSE streaming for real-time AI response display.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts, FastAPI, SQLAlchemy, Supabase PostgreSQL, Anthropic Claude API (Tool Use + Streaming), Vercel, Render

---

## Key Changes from v1

| Change | Reason | Impact |
|--------|--------|--------|
| Remove TDD (all test tasks) | Competition speed > test coverage | Save ~5 hours |
| Tool Use integration (2 API calls → 1) | Speed 2x, token savings | Core architecture change |
| SSE streaming | UX critical (4-10s wait → instant) | New task added |
| Guest trial mode | Judge dropout prevention | New task added |
| Supabase DB | Always-on, no cold start | Simplify deployment |
| Render backend | More generous free tier | Simplify deployment |
| Keep Class/Enrollment (seed-only, no management UI) | Admin dashboard needs class-level stats | Minimal extra work |
| Growth trend graph | MVP essential | Move from nice-to-have |
| Deploy Day 1 PM | Risk mitigation | Reorder tasks |
| Keep admin role (seed-data dashboard) | 3 roles complete = stronger planning score | ~3h extra work |

---

## File Structure (v2)

```
thinkbridge/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                          # FastAPI app, CORS, SSE, routers
│   │   ├── config.py                        # Settings from env vars
│   │   ├── database.py                      # async engine (Supabase), Base
���   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py                      # User (+ is_guest, admin role)
│   │   │   ├── class_room.py               # ClassRoom (seed-only)
│   │   │   ├── enrollment.py               # Enrollment (seed-only)
│   │   │   ├── session.py                  # TutoringSession
│   │   │   ├── message.py                  # Message
│   │   │   ├── thought_analysis.py         # ThoughtAnalysis
│   │   │   ├── report.py                   # Report (session_id FK)
│   │   │   └── token_usage.py              # TokenUsage tracking
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── session.py
│   │   │   ├── message.py
│   │   │   └── report.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                      # register, login, guest
│   │   │   ├── sessions.py                 # CRUD sessions, SSE messages
│   │   │   ├── reports.py                  # get reports
│   │   │   ├── dashboard.py               # instructor endpoints
│   │   │   └── admin.py                    # admin stats (seed-data based)
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── ai_engine.py               # Combined Socratic + Analyzer (Tool Use)
│   │   │   └── report_generator.py         # Report generation
│   │   └── core/
│   │       ├── __init__.py
│   │       ├── security.py
│   │       └── prompts.py                   # All prompts (v1→v2→v3 history)
│   ├── seed_data.py                         # Rich demo data
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                     # Landing + guest trial
│   │   │   ├── globals.css
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── student/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── chat/page.tsx
│   │   │   │   ├── sessions/page.tsx
│   │   │   │   └── report/[id]/page.tsx
│   │   │   ├── instructor/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   └── replay/[sessionId]/page.tsx
│   │   │   └── admin/
│   │   │       ├── layout.tsx               # admin auth guard
│   │   │       └── dashboard/page.tsx       # seed-data stats dashboard
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── ChatInterface.tsx        # + streaming + hint button
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── ThoughtPanel.tsx         # collapsible
│   │   │   │   └── ProgressBar.tsx          # Socratic 5-stage progress
│   │   │   ├── charts/
│   │   │   │   ├── RadarChart.tsx           # + comparison overlay
│   │   │   │   ├── HeatmapChart.tsx
│   │   │   │   ├── ThoughtTimeline.tsx
│   │   │   │   └── GrowthTrendChart.tsx     # NEW: time-series line chart
│   │   │   ├── dashboard/
│   │   │   │   ├── StudentList.tsx
│   │   │   │   └── SummaryCards.tsx         # NEW: key metrics cards
│   │   │   ├── replay/
│   │   │   │   └── SessionReplay.tsx
│   │   │   └── layout/
│   │   │       ├── Navbar.tsx
│   │   │       └── Sidebar.tsx
│   │   ├── lib/
│   │   │   ├── api.ts                       # + SSE streaming client
│   │   │   ├── auth.ts
│   │   │   └── constants.ts
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   └── .env.local.example
├── .gitignore
├── .env.example
└── README.md
```

---

## Task 1: Project Scaffolding + Supabase DB + Deployment Skeleton

**Files:** backend scaffolding, config, database, main.py, .gitignore, README, Dockerfile

**Goal:** Project skeleton deployed to Render within Day 1. Supabase DB connected.

- [ ] **Step 1:** Create project directory structure (all folders, __init__.py files)
- [ ] **Step 2:** Write requirements.txt (fastapi, uvicorn, sqlalchemy[asyncio], asyncpg, pydantic-settings, python-jose, passlib[bcrypt], anthropic, python-multipart, httpx, sse-starlette)
- [ ] **Step 3:** Write config.py with Supabase DATABASE_URL, ANTHROPIC_API_KEY, CORS settings
- [ ] **Step 4:** Write database.py with async engine pointing to Supabase PostgreSQL
- [ ] **Step 5:** Write main.py with FastAPI app, CORS middleware, health endpoint, lifespan create_all
- [ ] **Step 6:** Write Dockerfile and .gitignore
- [ ] **Step 7:** Write README.md (Korean project description + setup guide)
- [ ] **Step 8:** Create Supabase project and get connection string
- [ ] **Step 9:** git init, initial commit
- [ ] **Step 10:** Deploy skeleton to Render, verify /health endpoint works at live URL
- [ ] **Step 11:** Commit deployment config

---

## Task 2: Database Models (v2 Simplified)

**Files:** all model files in backend/app/models/

**Goal:** 8 tables (User, ClassRoom, Enrollment, TutoringSession, Message, ThoughtAnalysis, Report, TokenUsage). ClassRoom/Enrollment are seed-data only (no management UI).

- [ ] **Step 1:** Write User model (id, email, name, role [student/instructor/admin], hashed_password, is_guest, created_at)
- [ ] **Step 1b:** Write ClassRoom model (id, name, subject, instructor_id FK, created_at) — seed-only
- [ ] **Step 1c:** Write Enrollment model (id, user_id FK, class_id FK, role) — seed-only
- [ ] **Step 2:** Write TutoringSession model (id, user_id, subject, topic, status, total_turns, started_at, ended_at)
- [ ] **Step 3:** Write Message model (id, session_id, role, content, turn_number, created_at)
- [ ] **Step 4:** Write ThoughtAnalysis model (id, message_id unique, 6 dimension scores, detected_patterns JSON, socratic_stage, engagement_level)
- [ ] **Step 5:** Write Report model (id, session_id FK, summary, dimension_scores JSON, generated_at)
- [ ] **Step 6:** Write TokenUsage model (id, session_id FK, input_tokens, output_tokens, model, created_at)
- [ ] **Step 7:** Write models/__init__.py re-exporting all
- [ ] **Step 8:** Import models in main.py for create_all
- [ ] **Step 9:** Commit

---

## Task 3: Pydantic Schemas

**Files:** all schema files in backend/app/schemas/

- [ ] **Step 1:** Write user schemas (UserRegister, UserLogin, UserResponse, TokenResponse, GuestResponse)
- [ ] **Step 2:** Write session schemas (SessionCreate, SessionResponse, SessionDetail)
- [ ] **Step 3:** Write message schemas (MessageCreate, MessageResponse, MessageWithAnalysis, ThoughtAnalysisResponse)
- [ ] **Step 4:** Write report schemas (ReportResponse, HeatmapEntry, HeatmapResponse, StudentSummary, GrowthTrendEntry)
- [ ] **Step 5:** Write schemas/__init__.py
- [ ] **Step 6:** Commit

---

## Task 4: Auth System + Guest Mode

**Files:** core/security.py, routers/auth.py

- [ ] **Step 1:** Write security.py (hash_password, verify_password, create_access_token, get_current_user, get_optional_user for guest)
- [ ] **Step 2:** Write auth router: POST /register, POST /login
- [ ] **Step 3:** Add POST /guest endpoint (create temporary guest user, return token, no password needed)
- [ ] **Step 4:** Mount auth router in main.py
- [ ] **Step 5:** Test manually with curl/httpie
- [ ] **Step 6:** Commit + deploy to Render

---

## Task 5: AI Engine — Tool Use Integration (Core)

**Files:** core/prompts.py, services/ai_engine.py

This is the most critical task. Single Claude API call using Tool Use for combined Socratic response + thinking analysis.

- [ ] **Step 1:** Write prompts.py with:
  - SOCRATIC_SYSTEM_PROMPT (v2: with Few-shot examples, 5-stage strategy)
  - Keep v1 prompt as comment for evolution history
  - Tool definitions for analyze_thinking and generate_response

- [ ] **Step 2:** Write ai_engine.py with AiEngine class:
  - `process_turn()` method: single Claude API call with Tool Use
  - Tool: `analyze_thinking` (input_schema: 6 dimensions, patterns, stage, engagement)
  - Tool: `socratic_response` (input_schema: response text)
  - Parse tool results, return both analysis dict + response text
  - Fallback: if tool use fails, retry with simpler prompt
  - Track token usage (input_tokens, output_tokens from response.usage)

- [ ] **Step 3:** Write streaming variant `process_turn_streaming()`:
  - Use `client.messages.stream()` with Tool Use
  - Yield SSE events: first analysis JSON, then response text chunks
  - Handle partial tool results during streaming

- [ ] **Step 4:** Add conversation history windowing (max 8 recent turns, summarize older)

- [ ] **Step 5:** Test manually: create a test script that sends a message and prints the response

- [ ] **Step 6:** Commit with message explaining Tool Use architecture

---

## Task 6: Session & Message API with SSE Streaming

**Files:** routers/sessions.py, main.py

- [ ] **Step 1:** Write sessions router:
  - POST /sessions (create session)
  - GET /sessions (list my sessions)
  - GET /sessions/{id} (detail with messages + analysis)

- [ ] **Step 2:** Write SSE streaming message endpoint:
  - POST /sessions/{id}/messages returns StreamingResponse (SSE)
  - Flow: save user message → call ai_engine.process_turn_streaming() → stream events:
    - event: "analysis" → ThoughtAnalysis JSON
    - event: "token" → each text chunk of Socratic response
    - event: "done" → final message saved
  - Save AI message and analysis to DB after streaming completes

- [ ] **Step 3:** Write session end endpoint:
  - PATCH /sessions/{id}/end
  - Trigger report generation in background (or sync for MVP)

- [ ] **Step 4:** Add guest session support (allow guest users, limit to 3 turns)

- [ ] **Step 5:** Mount sessions router in main.py

- [ ] **Step 6:** Test streaming endpoint manually with curl

- [ ] **Step 7:** Commit + deploy

---

## Task 7: Report Generator & Dashboard API

**Files:** services/report_generator.py, routers/reports.py, routers/dashboard.py

- [ ] **Step 1:** Write report_generator.py:
  - generate_session_report(): aggregate analyses, call Claude for narrative summary
  - get_student_aggregate(): compute average scores across all sessions
  - get_student_growth_trend(): return per-session dimension averages (time series)

- [ ] **Step 2:** Write reports router:
  - GET /reports/session/{id}

- [ ] **Step 3:** Write dashboard router:
  - GET /dashboard/classes (instructor's classes)
  - GET /dashboard/classes/{class_id}/students (class students with avg scores)
  - GET /dashboard/classes/{class_id}/heatmap (class heatmap)

- [ ] **Step 4:** Write admin router (seed-data based stats):
  - GET /admin/stats (total students, total sessions, avg scores, active rate)
  - GET /admin/classes (class-level comparison: avg scores per class)
  - GET /admin/subjects (subject-level 6-dimension comparison)
  - All data is aggregated from seeded ClassRoom/Enrollment/Session/Analysis tables

- [ ] **Step 5:** Mount all routers in main.py

- [ ] **Step 5:** Commit + deploy

---

## Task 8: Frontend Scaffolding + Types + API Client

**Files:** Next.js project, types, lib/api.ts, lib/auth.ts, lib/constants.ts

- [ ] **Step 1:** Create Next.js 14 project with TypeScript, Tailwind, App Router
- [ ] **Step 2:** Install: recharts, shadcn/ui, lucide-react
- [ ] **Step 3:** Init shadcn/ui, add components (button, card, input, label, badge, tabs, scroll-area, textarea, select, sheet, separator, avatar, dropdown-menu)
- [ ] **Step 4:** Write types/index.ts (all TypeScript interfaces matching backend schemas)
- [ ] **Step 5:** Write lib/api.ts with:
  - Standard REST request helper
  - SSE streaming helper (EventSource or fetch + ReadableStream)
  - Guest trial function
- [ ] **Step 6:** Write lib/auth.ts (AuthProvider context, login/register/guest/logout)
- [ ] **Step 7:** Write lib/constants.ts (DIMENSION_LABELS, DIMENSION_KEYS, PATTERN_LABELS, etc.)
- [ ] **Step 8:** Write .env.local.example
- [ ] **Step 9:** Commit

---

## Task 9: Frontend Auth Pages + Layout

**Files:** layout.tsx, page.tsx (landing), login, register, Navbar, Sidebar, student/instructor layouts

- [ ] **Step 1:** Write root layout.tsx with AuthProvider
- [ ] **Step 2:** Write landing page (page.tsx):
  - Hero: "AI가 답을 주는 시대, 생각하는 법을 가르치는 AI"
  - **"바로 체험하기" 버튼** (guest trial — most important CTA)
  - Feature cards with descriptions
  - Login/Register links
- [ ] **Step 3:** Write login/page.tsx
- [ ] **Step 4:** Write register/page.tsx (student/instructor role selection)
- [ ] **Step 5:** Write Navbar (user info, logout)
- [ ] **Step 6:** Write Sidebar (role-based nav, mobile responsive with Sheet component)
- [ ] **Step 7:** Write student/layout.tsx and instructor/layout.tsx (auth guard + sidebar)
- [ ] **Step 8:** Commit

---

## Task 10: Student Chat Interface with Streaming

**Files:** chat components, student/chat/page.tsx

This is the most important frontend task — the primary demo experience.

- [ ] **Step 1:** Write ProgressBar.tsx (Socratic 5-stage progress, shown prominently at top of chat)
- [ ] **Step 2:** Write MessageBubble.tsx (user/AI message display, NO pattern badges for student view)
- [ ] **Step 3:** Write ThoughtPanel.tsx:
  - **Collapsible by default** for students
  - Shows 6 dimension bars, socratic stage, engagement level
  - URL param ?demo=true → always open
  - Animated bar transitions on update
- [ ] **Step 4:** Write ChatInterface.tsx:
  - SSE streaming: listen to EventSource, display AI response character by character
  - Update ThoughtPanel when "analysis" SSE event arrives
  - Update ProgressBar when socratic_stage changes
  - **"힌트 더 받기" button** in input area
  - Loading state: typing animation (not "생각하는 중..." text)
  - Session end → auto redirect to report page
- [ ] **Step 5:** Write student/chat/page.tsx:
  - Subject selector (수학/과학/논술)
  - Topic input
  - Guest mode: show turn limit (3턴)
  - Start chat → create session → render ChatInterface
- [ ] **Step 6:** Commit

---

## Task 11: Student Sessions & Report Pages

**Files:** sessions/page.tsx, report/[id]/page.tsx, RadarChart, ThoughtTimeline, GrowthTrendChart

- [ ] **Step 1:** Write RadarChart.tsx:
  - 6-dimension radar with Recharts
  - **Comparison overlay** (this session vs average) — always shown
- [ ] **Step 2:** Write ThoughtTimeline.tsx:
  - Turn-by-turn timeline with badges
  - Show strongest/weakest dimension per turn
- [ ] **Step 3:** Write GrowthTrendChart.tsx (NEW):
  - Time-series line chart (Recharts LineChart)
  - 6 lines (one per dimension) across sessions
  - X-axis: session dates, Y-axis: scores 0-10
- [ ] **Step 4:** Write sessions/page.tsx (session history list)
- [ ] **Step 5:** Write report/[id]/page.tsx:
  - Auto-loads report (no manual "generate" button — triggered at session end)
  - RadarChart with comparison overlay
  - GrowthTrendChart
  - ThoughtTimeline
  - AI narrative report text
  - **"이번 세션에서 N번의 사고 전환을 거쳐 스스로 답에 도달했습니다"** summary
- [ ] **Step 6:** Commit

---

## Task 12: Instructor Dashboard

**Files:** dashboard/page.tsx, SummaryCards, StudentList, HeatmapChart, replay page

- [ ] **Step 1:** Write SummaryCards.tsx (4 cards: total students, avg sessions, weekly active %, avg score)
- [ ] **Step 2:** Write StudentList.tsx (student cards with name, session count, avg score badge)
- [ ] **Step 3:** Write HeatmapChart.tsx:
  - Color-coded matrix (students x 6 dimensions)
  - **AI insight text** below: "전체 학생의 N%가 비판적 사고 영역에서 4점 이하입니다"
- [ ] **Step 4:** Write dashboard/page.tsx:
  - Class selector (from instructor's classes)
  - SummaryCards at top
  - HeatmapChart
  - StudentList
  - Click student → navigate to replay
- [ ] **Step 5:** Write replay/[sessionId]/page.tsx:
  - List student's sessions
  - Click session → dual panel replay (messages + turn analysis)
  - **First student message auto-selected**
- [ ] **Step 6:** Commit

---

## Task 12b: Admin Dashboard (Seed-Data Based)

**Files:** admin/layout.tsx, admin/dashboard/page.tsx, new chart components

**Goal:** Visually impressive admin dashboard powered entirely by seeded demo data. ~3 hours of work for full 3-role completion.

- [ ] **Step 1:** Write admin/layout.tsx (auth guard: admin role only, sidebar with "전체 현황" nav)

- [ ] **Step 2:** Write admin/dashboard/page.tsx with 4 sections:
  - **전체 현황 카드** (4 cards): 총 학생 수, 총 세션 수, 전체 평균 사고력 점수, 월간 활성률
  - **반별 사고력 비교** (BarChart): 고등수학 1반 vs 물리학 기초반 — 6차원 평균 비교
  - **과목별 6차원 레이더 비교** (RadarChart with 3 overlays): 수학 vs 과학 vs 논술
  - **반별 학생 수 & 세션 수 요약 테이블**

- [ ] **Step 3:** Fetch data from:
  - GET /api/admin/stats → 카드 데이터
  - GET /api/admin/classes → 반별 비교 차트 데이터
  - GET /api/admin/subjects → 과목별 레이더 데이터

- [ ] **Step 4:** Update Sidebar.tsx to include admin nav items when role === "admin"
- [ ] **Step 5:** Update register page to allow admin role selection (or admin is seed-only)
- [ ] **Step 6:** Commit

---

## Task 13: Demo Data Seeding (Rich)

**Files:** seed_data.py

- [ ] **Step 1:** Write rich seed_data.py:
  - 1 admin (admin@demo.com / demo1234)
  - 1 instructor (instructor@demo.com / demo1234)
  - 2 classes: 고등수학 1반, 물리학 기초반 (instructor가 담당)
  - 5 students enrolled in both classes, with distinct personality profiles:
    - 김민수: 창의성 높고 논리 약함 (creative_thinking 8, logical_structure 4)
    - 이서연: 전반적 균형 (all 6-7)
    - 박지호: 소극적 참여 (engagement: passive, all 3-5)
    - 정하윤: 비판적 사고 강함 (critical_thinking 8, premise_check 7)
    - 최준서: 빠른 성장 패턴 (session 1: low → session 5: high)
  - **학생당 5개 세션** (성장 추이 보여줄 수 있는 데이터)
  - **8-10턴 완전한 대화** 3개 (수학, 과학, 논술 각 1개)
  - 각 대화에서 자연스러운 점수 변화 (초반 낮음 → 중반 개선 → 후반 돌파)
  - Token usage 데모 데이터도 생성

- [ ] **Step 2:** Run seed script, verify data in Supabase dashboard
- [ ] **Step 3:** Commit

---

## Task 14: Prompt Tuning & Quality Verification

**Files:** core/prompts.py (refinement)

- [ ] **Step 1:** Test Socratic Engine with 5 different scenarios:
  - 수학: 이차방정식 근의 공식 유도
  - 수학: 피타고라스 정리 증명
  - 과학: 뉴턴 운동법칙
  - 과학: 광합성 과정
  - 논술: 인과관계 논증
- [ ] **Step 2:** Verify AI never gives direct answers in all scenarios
- [ ] **Step 3:** Refine prompts based on test results (add/modify few-shot examples)
- [ ] **Step 4:** Save prompt v1 and v2 as comments for AI report evolution history
- [ ] **Step 5:** Test ThoughtAnalysis accuracy — verify scores make sense for given responses
- [ ] **Step 6:** Commit prompt refinements

---

## Task 15: Mobile Responsive + UI Polish

**Files:** Various frontend components

- [ ] **Step 1:** Chat page mobile: ThoughtPanel → collapsible drawer (Sheet component)
- [ ] **Step 2:** Sidebar → hamburger menu on mobile (Sheet component)
- [ ] **Step 3:** Dashboard → stack cards vertically on mobile, heatmap horizontal scroll
- [ ] **Step 4:** Add loading skeletons (replace "로딩 중..." text with skeleton UI)
- [ ] **Step 5:** Add toast notifications for errors (API failures)
- [ ] **Step 6:** Landing page responsive adjustments
- [ ] **Step 7:** Commit

---

## Task 16: Final Deployment + Verification

**Files:** Environment configs, deployment settings

- [ ] **Step 1:** Set all environment variables on Render (backend) and Vercel (frontend)
- [ ] **Step 2:** Run seed_data.py on production DB
- [ ] **Step 3:** Verify full flow on live URL:
  - Guest trial: landing → "바로 체험하기" → 3 turn chat → sign up prompt
  - Student: register → chat with streaming → end session → view report
  - Instructor: login → dashboard → heatmap → replay
- [ ] **Step 4:** Test on mobile browser
- [ ] **Step 5:** Fix any deployment-specific bugs
- [ ] **Step 6:** Final commit

---

## Task 17: AI Report Writing

**Files:** AI report document (separate from code)

- [ ] **Step 1:** Fill in AI report template sections:
  - 기획: target user, pain point, solution, expected improvement
  - AI 도구 선택: Claude API + Claude Code, selection rationale
  - 활용 전략: Tool Use architecture, prompt evolution (v1→v2→v3), streaming, token management
  - 토큰 효율성: actual token usage data from TokenUsage table

- [ ] **Step 2:** Create architecture diagrams for the report
- [ ] **Step 3:** Document prompt evolution with before/after examples
- [ ] **Step 4:** Add token usage statistics
- [ ] **Step 5:** Export as PDF

---

## Parallelization Guide (v2)

**Independent parallel groups for Claude Code Max agents:**

```
Group A (Backend):  Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7
Group B (Frontend): Task 1(wait) → Task 8 → Task 9 → Task 10 → Task 11 → Task 12
Group C (Data/AI):  Task 5(wait) → Task 13 → Task 14
Group D (Polish):   Task 15 (after Groups A+B)
Group E (Deploy):   Task 16 (after all)
Group F (Report):   Task 17 (Day 7, after all)
```

**Realistic parallelization:**
- Day 1: Task 1 (both agents share scaffolding)
- Day 2: Task 2+3+4 (Agent A: backend) | Task 8 (Agent B: frontend scaffold)
- Day 3: Task 5+6 (Agent A: AI engine) | Task 9+10 (Agent B: auth pages + chat UI)
- Day 4: Task 7 (Agent A: reports+dashboard+admin API) | Task 11 (Agent B: student pages)
- Day 5: Task 13+14 (Agent A: demo data + prompt tuning) | Task 12+12b (Agent B: instructor + admin dashboard)
- Day 6: Task 15 (Agent B: polish) | Task 16 (both: deployment)
- Day 7: Task 17 (AI report writing)

---

## Risk Mitigation (v2)

| Risk | Probability | Mitigation |
|------|------------|------------|
| Deployment failure | Medium (was High in v1) | Day 1 PM skeleton deploy, Supabase always-on |
| AI response too slow | Low (was High in v1) | Tool Use 1-call, SSE streaming |
| Prompt quality issues | Medium | Day 2 + Day 5 tuning sessions |
| Frontend complexity | Medium | shadcn/ui rapid development, no TDD overhead |
| Demo data insufficient | Low | Rich seed_data with 5 students x 5 sessions |
| Judge can't try the app | Low (was High in v1) | Guest trial mode, no signup required |
