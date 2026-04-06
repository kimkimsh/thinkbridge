# ThinkBridge v3 (Final) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an AI Socratic tutoring system prioritizing student chat quality above all else. Streaming responses, Tool Use (1-tool + text), guest trial, 6-dimension analysis, instructor dashboard.

**Architecture:** Next.js 14 (Vercel) + FastAPI (Render) + Supabase PostgreSQL. 1 Claude API call per turn: text block (Socratic response, streamed) + tool_use block (thinking analysis, parsed on complete). SSE via fetch ReadableStream.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Recharts, FastAPI, SQLAlchemy, Supabase, Anthropic Claude API (Tool Use), Vercel, Render

---

## v2 → v3 Key Changes

| Change | Reason | Impact |
|--------|--------|--------|
| 1-tool + text (not 2-tool) | Eng v2: simpler, streaming-friendly | Reduces Task 5 complexity by ~50% |
| fetch ReadableStream (not EventSource) | Eng v2: EventSource doesn't support POST | Explicit tech decision |
| Guest 5 turns + dedicated prompt | CEO/Design v2: 3 turns too short | Better judge experience |
| Demo role switcher (one-click) | Design v2: logout/login 3x is impossible | Demo feasibility guaranteed |
| Admin dashboard → P1 (seed-data based) | 3 roles complete = stronger planning score | ~3h, seed data minimizes effort |
| 8 students, 3 classes seed data | Design v2: 5 students too sparse | Visual density |
| Non-streaming fallback first | Eng v2: guarantee working app | Risk mitigation |
| UptimeRobot ping + warm-up | Eng v2: Render 30s cold start | Deployment reliability |
| Growth trend API endpoint added | Eng v2: frontend chart had no data source | Spec-plan consistency |
| ChatGPT comparison on landing | Competition v2: creativity +1, 1h work | Differentiation |
| AI report daily logging | Competition v2: raw records most convincing | Report quality |

---

## File Structure (v3)

```
thinkbridge/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── class_room.py          # seed-only
│   │   │   ├── enrollment.py          # seed-only
│   │   │   ├── session.py
│   │   │   ├── message.py
│   │   │   ├── thought_analysis.py
│   │   │   ├── report.py
│   │   │   └── token_usage.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── session.py
│   │   │   ├── message.py
│   │   │   └── report.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── sessions.py            # includes SSE streaming
│   │   │   ├── reports.py
│   │   │   ├── dashboard.py
│   │   │   └── admin.py               # seed-data based stats
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── ai_engine.py           # 1-tool + text, streaming + non-streaming
│   │   │   └── report_generator.py
│   │   └── core/
│   │       ├── __init__.py
│   │       ├── security.py
│   │       └── prompts.py             # v1/v2/v3 history + guest prompt
│   ├── seed_data.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx               # Landing + ChatGPT comparison + guest CTA
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
│   │   │       ├── layout.tsx
│   │   │       └── dashboard/page.tsx  # seed-data stats
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── ChatInterface.tsx   # streaming + hint button
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── ThoughtPanel.tsx    # collapsible
│   │   │   │   └── ProgressBar.tsx     # 5-stage progress
│   │   │   ├── charts/
│   │   │   │   ├── RadarChart.tsx      # + comparison overlay
│   │   │   │   ├── HeatmapChart.tsx
│   │   │   │   ├── ThoughtTimeline.tsx
│   │   │   │   └── GrowthTrendChart.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── StudentList.tsx
│   │   │   │   ├── SummaryCards.tsx
│   │   │   │   └── ClassSelector.tsx
│   │   │   ├── replay/
│   │   │   │   └── SessionReplay.tsx
│   │   │   └── layout/
│   │   │       ├── Navbar.tsx
│   │   │       └── Sidebar.tsx         # role-based + mobile hamburger
│   │   ├── lib/
│   │   │   ├── api.ts                  # REST + SSE streaming (ReadableStream)
│   │   │   ├── auth.ts
│   │   │   └── constants.ts
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   ├── tailwind.config.ts
│   └── next.config.ts
├── .gitignore
└── README.md
```

---

## Task 1: Scaffolding + Supabase + Deploy Skeleton (Day 1 AM)

- [ ] Create project structure (all dirs, __init__.py)
- [ ] Write requirements.txt (fastapi, uvicorn, sqlalchemy[asyncio], asyncpg, pydantic-settings, python-jose, passlib[bcrypt], anthropic, python-multipart, httpx, sse-starlette)
- [ ] Write config.py (Supabase DATABASE_URL, ANTHROPIC_API_KEY, CORS)
- [ ] Write database.py (async engine → Supabase PostgreSQL)
- [ ] Write main.py (FastAPI app, CORS, health endpoint, lifespan create_all)
- [ ] Write Dockerfile, .gitignore, .env.example
- [ ] Write README.md (Korean, live URL placeholder, demo accounts)
- [ ] Create Supabase project, get connection string
- [ ] git init + initial commit
- [ ] **Deploy to Render** — verify /health works at live URL
- [ ] **Deploy SSE test endpoint** — verify streaming works through Render proxy
- [ ] Set up UptimeRobot 5-min ping on /health
- [ ] Commit

---

## Task 2: Database Models (Day 1 AM/PM)

- [ ] Write User model (role: student/instructor/admin, is_guest)
- [ ] Write ClassRoom model (seed-only)
- [ ] Write Enrollment model (seed-only)
- [ ] Write TutoringSession model
- [ ] Write Message model
- [ ] Write ThoughtAnalysis model (6 dimensions, patterns JSON, stage, engagement enum)
- [ ] Write Report model (session_id FK)
- [ ] Write TokenUsage model
- [ ] Write models/__init__.py
- [ ] Import in main.py
- [ ] Commit

---

## Task 3: Schemas + Auth + Guest Mode (Day 1 PM → Day 2 AM)

- [ ] Write all Pydantic schemas (user, session, message, report, growth trend)
- [ ] Write core/security.py (JWT, password hash, get_current_user)
- [ ] Write routers/auth.py (register, login)
- [ ] Add POST /auth/guest (create guest user, return token, is_guest=True)
- [ ] Mount in main.py
- [ ] Manual test (curl register/login/guest)
- [ ] Commit + deploy

---

## Task 4: AI Engine — 1-Tool + Text Pattern (Day 2) ★ CRITICAL

This is the most important backend task.

- [ ] **Write prompts.py:**
  - SOCRATIC_SYSTEM_PROMPT with few-shot examples (2-3 ideal dialogue patterns)
  - GUEST_SOCRATIC_PROMPT (compressed 5-turn experience: Stage 1→3)
  - Keep v1 prompt as comment block for evolution history
  - Tool definition: `analyze_thinking` (input_schema with 6 dimensions, patterns, stage, engagement)

- [ ] **Write ai_engine.py — Non-streaming first:**
  - `process_turn()`: single Claude API call with 1 tool defined
  - System prompt instructs: "respond with Socratic question AND call analyze_thinking tool"
  - Parse response: extract text blocks → Socratic response, tool_use blocks → analysis JSON
  - Pydantic validation on tool result, fallback to defaults on failure
  - Track token usage (response.usage.input_tokens, output_tokens)
  - History windowing: send only last 8 turns, summarize older

- [ ] **Test non-streaming flow manually** (script that sends message, prints response + analysis)

- [ ] **Add streaming variant: `process_turn_streaming()`:**
  - Use `client.messages.stream()` 
  - Yield events as they arrive:
    - content_block_start(text) → start streaming
    - content_block_delta(text) → yield "token" event with text chunk
    - content_block_start(tool_use) → start buffering JSON
    - content_block_delta(partial_json) → buffer
    - content_block_stop(tool_use) → parse complete JSON → yield "analysis" event
  - Final "done" event

- [ ] **Implement 3-stage fallback:**
  1. Tool not called → use text as response, default analysis
  2. JSON parse failure → default analysis
  3. API timeout/error → retry once, then error event

- [ ] Test streaming manually
- [ ] Commit: "feat(ai): implement Tool Use agent with 1-tool+text streaming architecture"

---

## Task 5: Session API + SSE Streaming (Day 2-3)

- [ ] Write routers/sessions.py:
  - POST /sessions (create)
  - GET /sessions (list mine)
  - GET /sessions/{id} (detail with messages + analyses)

- [ ] **POST /sessions/{id}/messages — SSE Streaming:**
  ```python
  from sse_starlette.sse import EventSourceResponse
  
  async def event_generator():
      async for event in ai_engine.process_turn_streaming(...):
          yield {"event": event["type"], "data": json.dumps(event["data"])}
  
  return EventSourceResponse(event_generator())
  ```
  - Save user message first
  - Stream AI response + analysis
  - Save AI message + ThoughtAnalysis + TokenUsage after stream completes

- [ ] PATCH /sessions/{id}/end (set completed, trigger report generation)
- [ ] Guest support: allow guest users, limit to 5 turns, check in send_message
- [ ] Stuck detection: if engagement_level=="stuck" 2x consecutive, force stage down
- [ ] Mount in main.py
- [ ] **Test SSE from curl** (`curl -N -X POST ...`)
- [ ] Commit + deploy, verify SSE works on Render

---

## Task 6: Report Generator + Dashboard API (Day 3-4)

- [ ] Write report_generator.py:
  - generate_session_report(): aggregate analyses → Claude narrative
  - get_student_growth_trend(): per-session dimension averages (time series)

- [ ] Write routers/reports.py:
  - GET /reports/session/{id}
  - GET /students/{id}/growth (growth trend data)

- [ ] Write routers/dashboard.py:
  - GET /dashboard/classes
  - GET /dashboard/classes/{class_id}/students
  - GET /dashboard/classes/{class_id}/heatmap

- [ ] Mount in main.py
- [ ] Commit + deploy

---

## Task 7: Frontend Scaffolding (Day 2, parallel with backend)

- [ ] Create Next.js 14 project (TypeScript, Tailwind, App Router)
- [ ] Install dependencies (recharts, shadcn/ui components)
- [ ] Write types/index.ts (all interfaces)
- [ ] Write lib/api.ts:
  - REST request helper
  - **SSE streaming helper using fetch + ReadableStream:**
    ```typescript
    async function* streamMessages(sessionId: number, content: string) {
      const response = await fetch(`${API}/api/sessions/${sessionId}/messages`, {
        method: 'POST', headers: {...}, body: JSON.stringify({content})
      });
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // Parse SSE events from buffer
        const events = parseSSEBuffer(buffer);
        for (const event of events.parsed) yield event;
        buffer = events.remaining;
      }
    }
    ```
  - Guest trial function
- [ ] Write lib/auth.ts (AuthProvider, login/register/guest/logout)
- [ ] Write lib/constants.ts
- [ ] Commit

---

## Task 8: Auth Pages + Layout + Landing (Day 3, parallel)

- [ ] Root layout.tsx with AuthProvider
- [ ] **Landing page (page.tsx) — most important page for judges:**
  - Hero: "AI가 답을 주는 시대, 생각하는 법을 가르치는 AI"
  - **"바로 체험하기" 버튼** (guest trial CTA, most prominent)
  - **ChatGPT vs ThinkBridge 비교 섹션**: 같은 질문에 ChatGPT(답 제공) vs ThinkBridge(사고 유도) 정적 비교 카드
  - Feature cards (3개)
  - **데모 모드 섹션**: [학생으로 체험] [교강사로 체험] 원클릭 로그인 버튼
  - useEffect warm-up: 페이지 로드 시 백엔드 /health 호출
- [ ] login/page.tsx
- [ ] register/page.tsx (학생/교강사 역할 선택)
- [ ] Navbar (user info, logout)
- [ ] Sidebar (role-based nav, **mobile: Sheet hamburger**)
- [ ] student/layout.tsx, instructor/layout.tsx (auth guard)
- [ ] Commit

---

## Task 9: Student Chat Interface + Streaming (Day 3) ★ MOST CRITICAL

**This is the single most important task. 80% of the demo.**

- [ ] **ProgressBar.tsx**: Socratic 5-stage progress, prominently at chat top
  - Animated transitions on stage change
  - Stage labels: 명확화 → 탐색 → 유도 → 검증 → 확장

- [ ] **MessageBubble.tsx**: Clean user/AI message display

- [ ] **ThoughtPanel.tsx**:
  - Collapsible (default closed for students)
  - ?demo=true → always open
  - 6 dimension bars with animated transitions
  - Socratic stage indicator
  - Engagement level badge

- [ ] **ChatInterface.tsx** (core):
  - **SSE streaming via fetch ReadableStream:**
    - On "token" event → append character to AI message (typing effect)
    - On "analysis" event → update ThoughtPanel + ProgressBar
    - On "done" event → finalize
  - **"힌트 더 받기" button** next to send button
  - Loading: typing animation dots (not text)
  - "대화 마무리" button (always visible)
  - Stage 5 reached → auto-show "리포트 확인" button
  - Session end → redirect to report page

- [ ] **student/chat/page.tsx**:
  - Subject selector (수학/과학/논술)
  - Topic input
  - Guest mode: show remaining turns badge, "5턴 체험 중"
  - Start → create session → render ChatInterface

- [ ] **Test full flow**: type message → see streaming response + analysis panel update
- [ ] Commit: "feat: add student Socratic chat with SSE streaming and real-time analysis"

---

## Task 10: Student Report + Charts (Day 4)

- [ ] RadarChart.tsx (6-dim, **with comparison overlay**: this session vs average)
- [ ] GrowthTrendChart.tsx (LineChart, 6 lines across sessions)
- [ ] ThoughtTimeline.tsx (turn-by-turn with badges)
- [ ] sessions/page.tsx (session list)
- [ ] report/[id]/page.tsx:
  - Auto-loaded report (generated at session end)
  - RadarChart with comparison
  - GrowthTrendChart
  - ThoughtTimeline
  - AI narrative text
  - "N번의 사고 전환을 거쳐 스스로 답에 도달했습니다" summary
  - **Report loading skeleton** while generating
- [ ] Commit

---

## Task 11: Instructor Dashboard (Day 5)

- [ ] SummaryCards.tsx (4 cards: students, avg sessions, active %, avg score)
- [ ] ClassSelector.tsx (class dropdown)
- [ ] StudentList.tsx (cards with name, sessions, avg score)
- [ ] HeatmapChart.tsx (students x 6 dimensions, color-coded, **AI insight text below**)
- [ ] dashboard/page.tsx (ClassSelector + SummaryCards + HeatmapChart + StudentList)
- [ ] replay/[sessionId]/page.tsx:
  - Student's session list → click → dual panel replay
  - **First student message auto-selected**
- [ ] Commit

---

## Task 12: Seed Data (Day 5-6)

- [ ] Write seed_data.py:
  - 1 admin, 1 instructor, 8 students (distinct profiles)
  - 3 classes (고등수학 1반, 물리학 기초반, 논술 심화반)
  - Enrollments for all students
  - 학생당 5 sessions
  - **3 full 8-10 turn conversations** (수학/과학/논술, hand-crafted)
  - Natural score progression per student
  - TokenUsage demo data
- [ ] Run seed on production DB
- [ ] Verify dashboard displays correctly with seeded data
- [ ] Commit

---

## Task 13: Prompt Tuning (Day 5-6)

- [ ] Test 5 scenarios: 수학(이차방정식), 수학(피타고라스), 과학(뉴턴), 과학(광합성), 논술
- [ ] Verify AI never gives direct answers
- [ ] Test guest prompt: verify Stage 1→3 in 5 turns
- [ ] Refine prompts, save v1/v2/v3 versions (comments)
- [ ] Test ThoughtAnalysis accuracy
- [ ] **Compare with other model** (GPT-4 etc.) for AI report data
- [ ] Commit prompt refinements

---

## Task 14: Mobile Responsive + UI Polish (Day 6)

- [ ] Chat: ThoughtPanel → Sheet drawer on mobile
- [ ] Sidebar → hamburger menu (Sheet)
- [ ] Dashboard: cards vertical stack, heatmap horizontal scroll
- [ ] Loading skeletons (replace "로딩 중..." text)
- [ ] Toast notifications for API errors
- [ ] Landing page responsive
- [ ] Error boundary (global)
- [ ] Commit

---

## Task 15: Admin Dashboard — Seed-Data Based (Day 5-6)

**Goal:** Visually impressive admin dashboard powered by seeded data. 3 roles complete = planning score boost.

- [ ] Write routers/admin.py:
  - GET /admin/stats (total students, sessions, avg scores, active rate — aggregated from DB)
  - GET /admin/classes (per-class avg scores for bar chart)
  - GET /admin/subjects (per-subject 6-dimension averages for radar comparison)
- [ ] Add admin schemas to backend schemas
- [ ] Write admin/layout.tsx (auth guard: role === "admin")
- [ ] Write admin/dashboard/page.tsx:
  - **전체 현황 카드 4개** (총 학생, 총 세션, 전체 평균 점수, 활성률)
  - **반별 사고력 비교** (BarChart: 3개 반의 6차원 평균 비교)
  - **과목별 6차원 레이더** (RadarChart with 3 overlays: 수학 vs 과학 vs 논술)
  - **"Demo Data" 배너** 상단: "데모 데이터입니다. 실제 운영 시 전체 학원 데이터가 표시됩니다."
- [ ] Update Sidebar.tsx: admin nav items when role === "admin"
- [ ] Update landing page demo mode: add "운영자로 체험" button
- [ ] Commit

---

## Task 16: Final Deploy + Verification (Day 6)

- [ ] Set all env vars (Render + Vercel)
- [ ] Run seed_data.py on production
- [ ] **Warm-up script** for demo preparation
- [ ] Verify full flows:
  - Guest: landing → 체험 → 5 turns → signup prompt
  - Student: login → chat → stream → end → report
  - Instructor: dashboard → heatmap → replay
  - Admin: stats → class comparison → subject radar
- [ ] Test on mobile browser
- [ ] Fix deployment bugs
- [ ] **README: add screenshots, live URL, demo accounts, architecture diagram**
- [ ] Commit

---

## Task 17: AI Report (Day 7)

- [ ] Compile daily logs into report
- [ ] Fill report template:
  - 기획: user/pain point/solution
  - AI 도구: Claude API + Claude Code, comparison test results
  - 활용 전략: Tool Use architecture, prompt evolution diff, streaming
  - 토큰 효율성: actual TokenUsage data, cost estimates
- [ ] Create architecture diagrams
- [ ] Include prompt v1→v2→v3 diffs with before/after examples
- [ ] Add screenshots of key features
- [ ] Export as PDF
- [ ] Final commit + submission

---

## Day-by-Day Schedule (v3 Final)

| Day | Backend Agent | Frontend Agent | Critical Milestone |
|-----|--------------|----------------|-------------------|
| Day 1 | Task 1 + Task 2 + Task 3 | — | ✅ Backend deployed on Render |
| Day 2 | **Task 4 (AI Engine)** ★ | Task 7 (FE scaffold) | ✅ Non-streaming AI works |
| Day 3 | Task 5 (SSE API) | Task 8 + **Task 9** ★ | ✅ **Chat works on live URL** |
| Day 4 | Task 6 (Reports API) | Task 10 (Reports UI) | ✅ Student flow complete |
| Day 5 | Task 12 + Task 13 | Task 11 + Task 15 (Admin) | ✅ All 3 roles complete |
| Day 6 | — | Task 14 (Polish) + Task 16 | ✅ Deployed + polished |
| Day 7 | Task 17 (AI Report) | Task 17 (AI Report) | ✅ Submitted |

**Iron Rule: If Day 3 ends and chat doesn't work on live URL, Day 4 AM is 100% dedicated to fixing it. Nothing else matters.**

---

## Risk Matrix (v3 Final)

| Risk | v1 Prob | v2 Prob | v3 Prob | Mitigation |
|------|---------|---------|---------|-----------|
| Deploy failure | 60% | 30% | **10%** | Day 1 deploy + UptimeRobot + SSE test |
| AI response slow | 90% | 20% | **5%** | 1-tool + streaming + non-streaming fallback |
| Prompt quality | 40% | 25% | **15%** | Few-shot + 2 tuning sessions + guest prompt |
| Dashboard empty | 50% | 15% | **5%** | 8 students x 5 sessions rich seed data |
| Judge can't try | 70% | 10% | **3%** | Guest 5 turns + one-click demo + warm-up |
| Demo too slow | 40% | 20% | **5%** | Tab pre-login + warm-up script |
| Scope overrun | 20% | 40% | **15%** | Admin=P2, non-streaming fallback, iron rule |
