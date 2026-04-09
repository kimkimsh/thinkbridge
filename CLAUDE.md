# ThinkBridge - AI Socratic Tutoring System

> "AI가 답을 주는 시대, 생각하는 법을 가르치는 AI"

## Project Context

ThinkBridge는 2026 KIT 바이브코딩 공모전 출품작으로, AI가 절대 정답을 제공하지 않고 소크라테스식 질문법으로 학생의 사고를 유도하는 1:1 튜터링 시스템이다.

- **제출 기한**: 2026-04-13 (7일 개발)
- **심사 기준**: 기술적 완성도, AI 활용 능력/효율성, 기획력/실무 접합성, 창의성
- **제출물**: GitHub(public), 라이브 URL, AI 리포트
- **핵심 원칙**: "학생 채팅 1개 기능의 완벽함 > 기능 10개의 존재"
- **Iron Rule**: Day 3 끝까지 학생 채팅이 라이브 URL에서 동작해야 한다

## Architecture (v3 Final)

```
[Browser] → [Vercel: Next.js 14 Frontend]
                    ↓ REST + SSE (fetch ReadableStream)
            [Render: FastAPI Backend] ← UptimeRobot 5min ping
                    ↓
            [Claude API: Tool Use 1-tool + text]
            [Supabase PostgreSQL]
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Backend | FastAPI (Python), SQLAlchemy (async), Pydantic |
| AI | Claude API + Tool Use (1-tool + text pattern) |
| DB | Supabase PostgreSQL |
| Deploy FE | Vercel |
| Deploy BE | Render + UptimeRobot ping |
| Auth | Custom JWT + Guest mode |
| SSE | fetch + ReadableStream (POST support) |

### AI Call Architecture (CRITICAL)

**1-tool + text pattern** - 1회 API 호출로 응답 + 분석 동시 획득:
```
Claude Response:
  [text block] → Socratic guiding question (streamable char-by-char)
  [tool_use block] → analyze_thinking JSON (parsed on complete)
```

**3-stage Fallback:**
1. Tool not called → text as response, default analysis (all scores 5)
2. JSON parse failure → default analysis, error logged
3. API timeout/error → retry once, then error event to frontend

**Non-streaming first strategy:**
- Day 2: Non-streaming Tool Use로 전체 플로우 완성
- Day 3: Streaming layer 추가
- 최악의 경우에도 "동작하는 앱" 보장

## File Structure (v3)

```
thinkbridge/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/           # User, ClassRoom, Enrollment, Session, Message, ThoughtAnalysis, Report, TokenUsage
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── routers/          # auth, sessions (SSE), reports, dashboard, admin
│   │   ├── services/         # ai_engine (1-tool+text), report_generator
│   │   └── core/             # security (JWT), prompts (v1/v2/v3 + guest)
│   ├── seed_data.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/              # Pages: landing, login, register, student/*, instructor/*, admin/*
│   │   ├── components/       # chat/, charts/, dashboard/, replay/, layout/
│   │   ├── lib/              # api.ts (REST+SSE), auth.ts, constants.ts
│   │   └── types/            # index.ts
│   ├── package.json
│   ├── tailwind.config.ts
│   └── next.config.ts
├── CLAUDE.md                 # This file
└── README.md
```

## Data Model (8 Tables)

| Table | Key Fields | Notes |
|-------|-----------|-------|
| User | email, name, role(student/instructor/admin), is_guest | Guest = 5-turn trial |
| ClassRoom | name, subject, instructor_id | Seed-only |
| Enrollment | user_id, class_id | Seed-only |
| TutoringSession | user_id, subject, topic, status, total_turns | active/completed |
| Message | session_id, role, content, turn_number | user/assistant |
| ThoughtAnalysis | message_id(unique), 6 dimensions(0-10), patterns(JSON), stage(1-5), engagement | Per-turn analysis |
| Report | session_id, summary, dimension_scores(JSON) | Auto-generated on session end |
| TokenUsage | session_id, input_tokens, output_tokens, model | Per-call tracking |

### 6-Dimension Thinking Framework (Bloom's Revised Taxonomy)

1. `problem_understanding` (문제 이해) - Bloom: Understand
2. `premise_check` (전제 확인) - Bloom: Remember/Understand
3. `logical_structure` (논리 구조화) - Bloom: Analyze
4. `evidence_provision` (근거 제시) - Bloom: Apply
5. `critical_thinking` (비판적 사고) - Bloom: Evaluate
6. `creative_thinking` (창의적 사고) - Bloom: Create

## API Endpoints (16 total)

### Auth (3)
- `POST /api/auth/register` - Student/Instructor registration
- `POST /api/auth/login` - JWT login
- `POST /api/auth/guest` - Guest 5-turn session

### Sessions (5)
- `POST /api/sessions` - Create session
- `GET /api/sessions` - List my sessions
- `GET /api/sessions/{id}` - Session detail with messages + analyses
- `POST /api/sessions/{id}/messages` - **SSE streaming** (fetch ReadableStream)
- `PATCH /api/sessions/{id}/end` - End session, trigger auto-report

### Reports (2)
- `GET /api/reports/session/{id}` - Session report
- `GET /api/students/{id}/growth` - Growth trend time-series

### Instructor Dashboard (3)
- `GET /api/dashboard/classes` - Instructor's classes
- `GET /api/dashboard/classes/{class_id}/students` - Class students with scores
- `GET /api/dashboard/classes/{class_id}/heatmap` - Thinking heatmap

### Admin Dashboard (3)
- `GET /api/admin/stats` - Total stats (students, sessions, avg scores, active rate)
- `GET /api/admin/classes` - Per-class comparison
- `GET /api/admin/subjects` - Per-subject 6-dimension radar

## Seed Data Specification

### Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Student | student@demo.com | demo1234 |
| Instructor | instructor@demo.com | demo1234 |
| Admin | admin@demo.com | demo1234 |

### Data Volume
- 3 classes: 고등수학 1반, 물리학 기초반, 논술 심화반
- 8 students with distinct profiles (see backend/CLAUDE.md for details)
- 5 sessions per student
- 3 full 8-10 turn conversations (hand-crafted: math/science/essay)

## Implementation Priorities

### P1 - Must Have (Student chat quality is #1)
- Guest trial (5 turns + dedicated prompt)
- Socratic chat (math/science/essay) - **highest quality**
- SSE streaming (non-streaming fallback guaranteed)
- Tool Use 1-tool + text pattern
- Real-time thinking analysis panel
- 5-stage progress bar
- "힌트 더 받기" button
- Session end → auto-report (radar + growth + narrative)
- Instructor dashboard (summary cards + heatmap + replay)
- Demo role switcher (one-click)
- Landing: ChatGPT vs ThinkBridge comparison
- Render cold start prevention
- Token usage tracking
- Mobile responsive (chat minimum)
- Admin dashboard (seed-data, "Demo Data" banner)

### P2 - If Time Permits
- Student home recent stats card
- Session completion confetti animation
- Radar chart real-time animation

### Nice-to-have
- Image upload + Claude Vision
- Curriculum achievement tagging

## Development Schedule

| Day | Backend | Frontend | Milestone |
|-----|---------|----------|-----------|
| Day 1 | Scaffold + DB + Auth + Deploy | — | Backend on Render |
| Day 2 | **AI Engine (non-streaming)** | FE scaffold | Non-streaming AI works |
| Day 3 | SSE API | Auth pages + **Chat UI** | **Chat on live URL** |
| Day 4 | Reports API | Reports UI | Student flow complete |
| Day 5 | Seed data + Prompt tuning | Instructor + Admin dashboard | All 3 roles |
| Day 6 | — | Polish + Mobile + Deploy | Deployed + polished |
| Day 7 | AI Report | AI Report | Submitted |

## Commit Strategy

- Conventional Commits: `feat/fix/docs/chore/perf`
- AI commits highlighted: `feat(ai): implement Tool Use agent pattern`
- Prompt changes separate: `refine(prompt): add few-shot examples for math`
- Target 5-10 commits per day, evenly distributed
- First commit meaningful: `feat: scaffold FastAPI + Next.js with Supabase integration`

## Code Conventions (Project-Specific)

### Python (Backend)
- Async everywhere (async def, await)
- Pydantic for all request/response schemas
- SQLAlchemy 2.0 async style
- Type hints on all function signatures
- Korean comments for business logic, English for technical comments

### TypeScript (Frontend)
- Strict TypeScript (no `any`)
- React Server Components where possible, Client Components only when needed
- shadcn/ui for all UI components
- Tailwind utility classes, no custom CSS unless necessary
- Korean UI text, English variable/function names

### Both
- Follow user's global CLAUDE.md conventions (Java-style naming, brace on new line for C++, etc.)
- Constants extracted to dedicated files
- One class/component per file
- No magic numbers or strings

## Agent Team Configuration

See `.claude/agents.md` for detailed agent team setup.

### Quick Reference
- **backend-agent**: FastAPI, DB models, AI engine, API endpoints
- **frontend-agent**: Next.js, components, pages, SSE client
- **ai-data-agent**: Prompts, seed data, prompt tuning, AI report
- **integration-agent**: Deploy, E2E verification, cross-cutting concerns

## Key Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Deploy failure | Day 1 deploy + UptimeRobot + SSE test endpoint |
| AI response slow | 1-tool + streaming + non-streaming fallback |
| Prompt quality | Few-shot + 2 tuning sessions + guest prompt |
| Dashboard empty | 8 students x 5 sessions rich seed data |
| Judge can't try | Guest 5 turns + one-click demo + warm-up |
| Demo too slow | Tab pre-login + warm-up script |

## Demo Scenario (3 min)

1. **0:00-0:15** Landing → ChatGPT vs ThinkBridge comparison
2. **0:15-1:00** "바로 체험하기" → Guest chat → streaming + analysis panel
3. **1:00-1:45** Tab switch → Student report (radar + growth trend)
4. **1:45-2:40** Tab switch → Instructor dashboard (heatmap + replay)
5. **2:40-3:00** Vision statement

## Work Log Policy

After completing any improvement, bug fix, feature addition, or significant change to the project, you MUST document the work in `docs/work_log/`:

- **Create a new file** or **update an existing file** — whichever is more appropriate.
- Use Markdown format (`.md` files).
- Include: what was changed, why, which files were affected, and any relevant commit hashes.
- For bug fixes: document the symptom, root cause, and fix applied.
- For new features: document the design decision and implementation summary.
- Keep entries concise but thorough enough for another developer to understand the context.
- Naming convention: use descriptive names (e.g., `06_sse_bugfix.md`, `07_mobile_polish.md`) or append to existing topic files.
