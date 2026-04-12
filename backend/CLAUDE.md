# ThinkBridge Backend - FastAPI Implementation Guide

## Overview

FastAPI async backend serving REST API + SSE streaming. Python 선택 이유: AI 생태계 활용 깊이를 심사위원에게 어필.

## Tech Stack

- **FastAPI** with async/await everywhere
- **SQLAlchemy 2.0** async (asyncpg driver)
- **Supabase PostgreSQL** (always-on, no cold start)
- **Pydantic v2** for schemas
- **Anthropic SDK** for Claude API (Tool Use + Streaming)
- **sse-starlette** for SSE endpoints
- **python-jose** for JWT
- **passlib[bcrypt]** for password hashing
- **Render** for deployment + **UptimeRobot** 5-min ping

## Directory Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app, CORS, lifespan, router mounting
│   ├── config.py                # Pydantic Settings (DATABASE_URL, ANTHROPIC_API_KEY, etc.)
│   ├── database.py              # async engine, session maker, Base
│   ├── models/
│   │   ├── __init__.py          # Re-export all models
│   │   ├── user.py              # User (role: student/instructor/admin, is_guest)
│   │   ├── class_room.py        # ClassRoom (seed-only)
│   │   ├── enrollment.py        # Enrollment (seed-only)
│   │   ├── session.py           # TutoringSession
│   │   ├── message.py           # Message
│   │   ├── thought_analysis.py  # ThoughtAnalysis (6 dimensions)
│   │   ├── report.py            # Report (session_id FK)
│   │   └── token_usage.py       # TokenUsage
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py              # UserRegister, UserLogin, UserResponse, TokenResponse, GuestResponse
│   │   ├── session.py           # SessionCreate, SessionResponse, SessionDetail
│   │   ├── message.py           # MessageCreate, MessageResponse, MessageWithAnalysis, ThoughtAnalysisResponse
│   │   └── report.py            # ReportResponse, HeatmapEntry, HeatmapResponse, StudentSummary, GrowthTrendEntry
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py              # POST register, login, guest
│   │   ├── sessions.py          # CRUD + SSE POST /sessions/{id}/messages
│   │   ├── reports.py           # GET session report, growth trend
│   │   ├── dashboard.py         # Instructor: classes, students, heatmap
│   │   └── admin.py             # Admin: stats, class comparison, subject radar
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ai_engine.py         # CORE: 1-tool + text, streaming + non-streaming
│   │   └── report_generator.py  # Report narrative generation
│   └── core/
│       ├── __init__.py
│       ├── security.py          # JWT creation/verification, password hash, get_current_user
│       └── prompts.py           # SOCRATIC_SYSTEM_PROMPT, GUEST_SOCRATIC_PROMPT, tool definition
├── seed_data.py                 # Rich demo data (8 students, 3 classes, 40 sessions)
├── requirements.txt
└── Dockerfile
```

## Model Details

### User
```python
# Fields: id, email, name, role, hashed_password, is_guest, created_at
# role: Enum("student", "instructor", "admin")
# is_guest: Boolean (guest users get 5-turn limit)
```

### TutoringSession
```python
# Fields: id, user_id(FK), subject, topic, status, total_turns, started_at, ended_at
# subject: Enum("math", "science", "essay")
# status: Enum("active", "completed")
```

### ThoughtAnalysis (CRITICAL)
```python
# Fields: id, message_id(FK, unique), 6 dimension scores (Integer 0-10):
#   problem_understanding, premise_check, logical_structure,
#   evidence_provision, critical_thinking, creative_thinking
# detected_patterns: JSON array (e.g., ["logical_leap", "missing_premise"])
# socratic_stage: Integer 1-5
# engagement_level: Enum("active", "passive", "stuck")
```

### TokenUsage
```python
# Fields: id, session_id(FK), input_tokens, output_tokens, model, created_at
# Track every Claude API call for AI report data
```

## AI Engine Implementation (MOST CRITICAL)

### Tool Definition
```python
ANALYZE_THINKING_TOOL = {
    "name": "analyze_thinking",
    "description": "Analyze the student's thinking patterns in the current turn",
    "input_schema": {
        "type": "object",
        "properties": {
            "problem_understanding": {"type": "integer", "minimum": 0, "maximum": 10},
            "premise_check": {"type": "integer", "minimum": 0, "maximum": 10},
            "logical_structure": {"type": "integer", "minimum": 0, "maximum": 10},
            "evidence_provision": {"type": "integer", "minimum": 0, "maximum": 10},
            "critical_thinking": {"type": "integer", "minimum": 0, "maximum": 10},
            "creative_thinking": {"type": "integer", "minimum": 0, "maximum": 10},
            "detected_patterns": {
                "type": "array",
                "items": {"type": "string"}
            },
            "socratic_stage": {"type": "integer", "minimum": 1, "maximum": 5},
            "engagement_level": {"type": "string", "enum": ["active", "passive", "stuck"]}
        },
        "required": [
            "problem_understanding", "premise_check", "logical_structure",
            "evidence_provision", "critical_thinking", "creative_thinking",
            "detected_patterns", "socratic_stage", "engagement_level"
        ]
    }
}
```

### Non-Streaming Flow (Implement FIRST)
```python
async def process_turn(session_history, user_message, subject, is_guest):
    """
    Single Claude API call → text block (Socratic response) + tool_use block (analysis)
    """
    # 1. Build messages (last 8 turns only, summarize older)
    # 2. Select prompt (GUEST_SOCRATIC_PROMPT if is_guest, else SOCRATIC_SYSTEM_PROMPT)
    # 3. Call Claude API with 1 tool defined
    # 4. Parse response: extract text blocks → response, tool_use blocks → analysis
    # 5. Pydantic validate tool result, fallback to defaults on failure
    # 6. Return (socratic_response, analysis_dict, token_usage)
```

### Streaming Flow (Add AFTER non-streaming works)
```python
async def process_turn_streaming(session_history, user_message, subject, is_guest):
    """
    Yields SSE events:
      - {"type": "token", "data": "text chunk"}       ← text block delta
      - {"type": "analysis", "data": {analysis_json}}  ← tool_use complete
      - {"type": "done", "data": {}}                   ← stream finished
    """
    # Use client.messages.stream() with Tool Use
    # content_block_start(text) → start streaming tokens
    # content_block_delta(text) → yield "token" event
    # content_block_start(tool_use) → start buffering JSON
    # content_block_delta(partial_json) → buffer
    # content_block_stop(tool_use) → parse JSON → yield "analysis" event
```

### Prompt Strategy
```python
# SOCRATIC_SYSTEM_PROMPT:
# - Never give direct answers
# - Always respond with guiding questions
# - Follow 5-stage Socratic progression
# - Call analyze_thinking tool for every response
# - Include 2-3 few-shot ideal dialogue examples
# - Subject-specific strategies (math: formula derivation, science: hypothesis, essay: argument)

# GUEST_SOCRATIC_PROMPT:
# - Compressed 5-turn experience: Stage 1→3
# - Turn 1: Stage 1 (문제 명확화) - quick pass
# - Turn 2-3: Stage 2 (조건 탐색) - core guidance
# - Turn 4-5: Stage 3 (전략 유도) - "aha" moment
# - Goal: judge feels "이 AI는 답을 안 주지만 내가 생각하게 만든다" in 5 turns
```

### Stuck Detection
If engagement_level == "stuck" for 2 consecutive turns (detected via `_detectStuckState`):
  → Prepend STUCK_DETECTION_INSTRUCTION to the next user prompt sent to Claude
  → Claude re-interprets context and provides more concrete hint
  (Stage value is NOT forcibly decremented — relies on Claude's judgment after the instruction)
This is backend logic in `sessions.py:473-478`, not dependent on AI tool output alone.

### History Windowing
```python
# Send only last 8 turns to Claude
# Older turns → summarized as single system message
# Reduces token usage ~50% per session
```

## SSE Streaming Endpoint

```python
# POST /api/sessions/{id}/messages
# Content-Type: text/event-stream

from sse_starlette.sse import EventSourceResponse

async def send_message(session_id: int, message: MessageCreate, user: User):
    # 1. Save user message to DB
    # 2. Stream AI response:
    async def event_generator():
        async for event in ai_engine.process_turn_streaming(...):
            yield {"event": event["type"], "data": json.dumps(event["data"])}
    # 3. After stream completes: save AI message + ThoughtAnalysis + TokenUsage
    return EventSourceResponse(event_generator())
```

## Router Patterns

### Auth Router
```python
# POST /api/auth/register → UserResponse + TokenResponse
# POST /api/auth/login → TokenResponse
# POST /api/auth/guest → create guest user (is_guest=True), return token
#   Guest users: no password, auto-generated email, 5-turn limit
```

### Session Router
```python
# POST /api/sessions → create (subject, topic required)
# GET /api/sessions → list my sessions (paginated)
# GET /api/sessions/{id} → detail with messages + analyses joined
# POST /api/sessions/{id}/messages → SSE streaming (see above)
# PATCH /api/sessions/{id}/end → set completed, trigger report_generator
#   Guest check: if is_guest and total_turns >= 5, reject with 403
```

### Dashboard Router (Instructor)
```python
# GET /api/dashboard/classes → instructor's classes
# GET /api/dashboard/classes/{class_id}/students → students with avg scores
# GET /api/dashboard/classes/{class_id}/heatmap → students x 6 dimensions matrix + AI insight
```

### Admin Router (Seed-data based)
```python
# GET /api/admin/stats → aggregated: total students, sessions, avg scores, active rate
# GET /api/admin/classes → per-class 6-dimension averages (for BarChart)
# GET /api/admin/subjects → per-subject 6-dimension averages (for RadarChart overlay)
# All data aggregated from existing DB tables — no separate admin tables needed
```

## Report Generator

```python
# generate_session_report(session_id):
#   1. Load all ThoughtAnalysis for session
#   2. Aggregate scores, detect patterns
#   3. Call Claude for narrative summary (Korean)
#   4. Save Report with dimension_scores JSON
#   5. Include "N번의 사고 전환을 거쳐 스스로 답에 도달했습니다" summary

# get_student_growth_trend(student_id):
#   1. Load all sessions for student, ordered by date
#   2. Per-session average of 6 dimensions
#   3. Return time-series data for GrowthTrendChart
```

## Seed Data Requirements

### 8 Student Profiles (distinct patterns)
| Name | Characteristics | Pattern |
|------|----------------|---------|
| 김민수 | 창의성 높고 논리 약함 | creative_thinking 8, logical_structure 4 |
| 이서연 | 전반적 균형 | all 6-7 |
| 박지호 | 소극적 참여 | engagement: passive, all 3-5 |
| 정하윤 | 비판적 사고 강함 | critical_thinking 8, premise_check 7 |
| 최준서 | 빠른 성장 | session 1: low → session 5: high |
| 한소율 | 문제 이해 강함, 근거 약함 | problem_understanding 8, evidence_provision 4 |
| 윤도현 | 전체적 중간, 창의적 접근 | all 5-6, creative_thinking 7 |
| 강예은 | 논리 구조화 강함, 창의성 약함 | logical_structure 8, creative_thinking 3 |

### Full Conversations (3 hand-crafted)
- 수학: 이차방정식 근의 공식 유도 (8-10 turns)
- 과학: 뉴턴 운동법칙 (8-10 turns)
- 논술: 인과관계 논증 (8-10 turns)
- Natural score progression per turn (early low → mid improvement → late breakthrough)

## Deployment

### Render Configuration
- Web Service, Docker deployment
- Environment variables: DATABASE_URL, ANTHROPIC_API_KEY, SECRET_KEY, CORS_ORIGINS
- **UptimeRobot**: 5-min ping on `/health` to prevent cold start (Render free tier sleeps after 15min)

### Supabase Pooler Configuration (CRITICAL)
- **DATABASE_URL must use port 5432** (Session mode pooler)
- Transaction mode (port 6543) causes:
  - asyncpg prepared statement cache collisions
  - Broken SELECT FOR UPDATE semantics
  - Silent data inconsistency under concurrency
- See `docs/work_log/03_deployment.md` Issue 3 for incident history

### Health Endpoint
```python
@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
```

### SSE Test Endpoint (Day 1 verification)
```python
@app.get("/api/test-sse")
async def test_sse():
    async def generate():
        for i in range(5):
            yield {"data": json.dumps({"count": i})}
            await asyncio.sleep(0.5)
    return EventSourceResponse(generate())
```

## Dependencies (requirements.txt)

```
fastapi
uvicorn[standard]
sqlalchemy[asyncio]
asyncpg
pydantic-settings
python-jose[cryptography]
passlib[bcrypt]
anthropic
python-multipart
httpx
sse-starlette
```

## Testing Strategy

- **No TDD** (공모전 속도 우선)
- Manual testing with curl/httpie
- AI engine: test script that sends message and prints response + analysis
- SSE: `curl -N -X POST ...` to verify streaming
- Deploy verification after each major task
