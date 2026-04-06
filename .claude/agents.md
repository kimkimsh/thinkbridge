# ThinkBridge Agent Team Configuration

## Team Overview

ThinkBridge는 4개 에이전트 팀으로 병렬 개발한다. 각 에이전트는 자신의 도메인 CLAUDE.md를 참조하고, 루트 CLAUDE.md의 아키텍처/우선순위를 공유한다.

## Agent Definitions

### 1. backend-agent (백엔드 에이전트)

**Role**: FastAPI 백엔드 전체 구현
**Domain**: `backend/` 디렉토리
**Reference**: `backend/CLAUDE.md`

**Responsibilities:**
- FastAPI 앱 스캐폴딩 (main.py, config.py, database.py)
- SQLAlchemy 모델 정의 (8 tables)
- Pydantic 스키마 작성
- Auth 시스템 (JWT + Guest mode)
- AI Engine (1-tool + text pattern) — **CRITICAL**
- SSE 스트리밍 엔드포인트
- Report Generator
- Dashboard API (instructor + admin)
- Dockerfile + Render 배포 설정

**Task Assignment:**
- Day 1: Task 1 (Scaffold + Deploy) + Task 2 (Models) + Task 3 (Schemas + Auth)
- Day 2: **Task 4 (AI Engine)** ← CRITICAL PATH
- Day 3: Task 5 (Session API + SSE)
- Day 4: Task 6 (Reports + Dashboard API)

**Critical Constraints:**
- Non-streaming AI engine MUST work before streaming is attempted
- SSE endpoint must be tested with curl after deploy
- All async functions, no sync database calls
- Token usage must be tracked for every Claude API call

**Dependencies:**
- Produces: API endpoints, SSE stream format, auth tokens
- Consumed by: frontend-agent (API client), ai-data-agent (AI engine interface)

---

### 2. frontend-agent (프론트엔드 에이전트)

**Role**: Next.js 14 프론트엔드 전체 구현
**Domain**: `frontend/` 디렉토리
**Reference**: `frontend/CLAUDE.md`

**Responsibilities:**
- Next.js 14 App Router 프로젝트 설정
- shadcn/ui 컴포넌트 설치 및 설정
- TypeScript 인터페이스 정의
- API 클라이언트 (REST + SSE ReadableStream)
- Auth 시스템 (AuthProvider, route guards)
- Landing page (ChatGPT 비교, demo mode, warm-up)
- **Student Chat Interface** ← 80% OF DEMO
- Student Report pages (radar, growth, timeline)
- Instructor Dashboard (heatmap, replay)
- Admin Dashboard (seed-data stats)
- Layout (Navbar, Sidebar with mobile hamburger)
- Mobile responsive

**Task Assignment:**
- Day 2: Task 7 (FE scaffold + types + API client)
- Day 3: Task 8 (Auth pages + Layout + Landing) + **Task 9 (Chat Interface)** ← CRITICAL
- Day 4: Task 10 (Reports + Charts)
- Day 5: Task 11 (Instructor Dashboard) + Task 15 (Admin Dashboard)
- Day 6: Task 14 (Mobile + Polish)

**Critical Constraints:**
- Chat Interface is THE most important component — allocate maximum time
- SSE must use fetch + ReadableStream (NOT EventSource — doesn't support POST)
- ThoughtPanel default collapsed for students, open for ?demo=true
- Skeleton UI for loading states, never plain text "로딩 중..."
- Demo mode buttons must auto-login and redirect instantly

**Dependencies:**
- Depends on: backend-agent (API endpoints must exist for integration)
- Can start independently: scaffold, types, UI components, mock data
- Integration point: Day 3 (backend SSE + frontend streaming client)

---

### 3. ai-data-agent (AI/데이터 에이전트)

**Role**: 프롬프트 엔지니어링, 시드 데이터, AI 리포트
**Domain**: `backend/app/core/prompts.py`, `backend/seed_data.py`, AI report document

**Responsibilities:**
- SOCRATIC_SYSTEM_PROMPT 작성 (few-shot 예시 2-3개 포함)
- GUEST_SOCRATIC_PROMPT 작성 (5턴 압축 경험)
- analyze_thinking 도구 정의 (6 dimensions schema)
- 프롬프트 v1→v2→v3 진화 기록 보존 (AI 리포트용)
- 시드 데이터 생성 (8 students, 3 classes, 40 sessions, 3 full conversations)
- 프롬프트 튜닝 (5 scenarios 테스트)
- AI 리포트 초안 (매일 기록 → Day 7 편집)
- 다른 모델(GPT-4 등) 비교 테스트

**Task Assignment:**
- Day 2: Prompts 초안 작성 (with Task 4 backend AI engine)
- Day 5: Task 12 (Seed Data) + Task 13 (Prompt Tuning)
- Day 7: Task 17 (AI Report)

**Critical Constraints:**
- 프롬프트는 반드시 "AI가 절대 답을 주지 않음"을 보장해야 함
- Guest 프롬프트: 5턴 안에 Stage 1→3 진행되어야 함
- 시드 데이터의 8명 학생은 뚜렷하게 다른 패턴을 가져야 함 (히트맵 시각 밀도)
- Few-shot 예시는 실제 교과 내용(수학/과학/논술)에 맞아야 함
- AI 리포트는 매일 기록 (Day 7에 급조하지 않음)

**Dependencies:**
- Depends on: backend-agent (AI Engine 인터페이스가 완성되어야 프롬프트 테스트 가능)
- Produces: prompts.py, seed_data.py, AI report document
- Integration point: Day 5 (seed data loaded → dashboard verification)

---

### 4. integration-agent (통합/배포 에이전트)

**Role**: 배포, 검증, 크로스-커팅 이슈 해결
**Domain**: 프로젝트 전체

**Responsibilities:**
- Supabase 프로젝트 생성 및 연결 문자열 설정
- Render 배포 설정 (환경 변수, Docker)
- Vercel 배포 설정
- UptimeRobot 5분 ping 설정
- SSE 테스트 엔드포인트 배포 검증
- 시드 데이터 프로덕션 DB 적용
- E2E 검증 (4개 flow: guest, student, instructor, admin)
- 모바일 브라우저 테스트
- README 작성 (screenshots, live URL, demo accounts, architecture diagram)
- warm-up 스크립트 작성
- 배포 버그 수정

**Task Assignment:**
- Day 1: Supabase 설정, Render 배포, UptimeRobot 설정
- Day 3: SSE 배포 검증
- Day 5-6: Task 16 (Final Deploy + Verification)
- Day 7: README, screenshots

**Critical Constraints:**
- Day 1 끝까지 `/health` 엔드포인트가 Render에서 동작해야 함
- Day 1에 SSE 테스트 엔드포인트도 배포 검증 필요
- 프로덕션 환경 변수: DATABASE_URL, ANTHROPIC_API_KEY, SECRET_KEY, CORS_ORIGINS
- Cold start 방지: UptimeRobot은 Day 1에 설정

**Dependencies:**
- Depends on: all agents (통합 검증은 각 에이전트의 결과물이 필요)
- Produces: deployed URLs, verified E2E flows, README

---

## Parallelization Schedule

```
Day 1:
  backend-agent  → Task 1 (Scaffold + Deploy) + Task 2 (Models) + Task 3 (Auth)
  integration-agent → Supabase setup + Render deploy + UptimeRobot

Day 2:
  backend-agent  → Task 4 (AI Engine — non-streaming) ★ CRITICAL
  frontend-agent → Task 7 (FE scaffold + types + API client)
  ai-data-agent  → Prompts draft (SOCRATIC + GUEST prompts)

Day 3:
  backend-agent  → Task 5 (SSE API)
  frontend-agent → Task 8 (Auth + Layout + Landing) + Task 9 (Chat UI) ★ CRITICAL
  integration-agent → SSE deploy verification
  ────────────────────────────────────────────────────
  IRON RULE: Day 3 ends → chat MUST work on live URL
  ────────────────────────────────────────────────────

Day 4:
  backend-agent  → Task 6 (Reports + Dashboard API)
  frontend-agent → Task 10 (Reports + Charts)

Day 5:
  ai-data-agent  → Task 12 (Seed Data) + Task 13 (Prompt Tuning)
  frontend-agent → Task 11 (Instructor Dashboard) + Task 15 (Admin Dashboard)

Day 6:
  frontend-agent → Task 14 (Mobile + Polish)
  integration-agent → Task 16 (Final Deploy + Full Verification)

Day 7:
  ai-data-agent  → Task 17 (AI Report)
  integration-agent → README + screenshots
```

## Critical Integration Points

### Day 2-3: Backend SSE ↔ Frontend Streaming
- **Contract**: SSE events follow `{event: "token"|"analysis"|"done", data: JSON}`
- Backend-agent produces SSE stream, frontend-agent consumes with ReadableStream
- Must test on deployed URL, not just localhost

### Day 5: Seed Data ↔ Dashboard Display
- ai-data-agent loads seed data → frontend-agent verifies dashboard renders correctly
- 8 students must create visually dense heatmap
- Growth trend data must show clear progression patterns

### Day 6: Full E2E Verification
- integration-agent runs 4 complete flows on live URL:
  1. Guest: landing → 체험 → 5 turns → signup prompt
  2. Student: login → chat → stream → end → report
  3. Instructor: dashboard → heatmap → replay
  4. Admin: stats → class comparison → subject radar

## Agent Communication Protocol

### Shared Artifacts
- API endpoint contracts (defined in root CLAUDE.md)
- TypeScript interfaces (frontend/src/types/index.ts)
- SSE event format (defined in both backend/ and frontend/ CLAUDE.md)
- Demo account credentials (defined in root CLAUDE.md)

### Dependency Signals
When an agent completes a blocking task, it should commit with a clear message:
- `feat(api): SSE streaming endpoint ready for frontend integration`
- `feat(ai): non-streaming Tool Use engine verified`
- `data: seed data loaded to production DB`

### Conflict Resolution
- If backend API changes → backend-agent updates root CLAUDE.md API section
- If frontend discovers API issue → create issue, backend-agent fixes as priority
- If AI engine response format changes → both agents coordinate via SSE event contract

## Claude Code Execution Commands

### Starting backend-agent work:
```bash
cd backend && claude --chat "You are the backend-agent for ThinkBridge. Read backend/CLAUDE.md and start with Task N."
```

### Starting frontend-agent work:
```bash
cd frontend && claude --chat "You are the frontend-agent for ThinkBridge. Read frontend/CLAUDE.md and start with Task N."
```

### Starting ai-data-agent work:
```bash
claude --chat "You are the ai-data-agent for ThinkBridge. Focus on prompts.py and seed_data.py. Read backend/CLAUDE.md for AI engine details."
```

### Starting integration-agent work:
```bash
claude --chat "You are the integration-agent for ThinkBridge. Verify deployments and run E2E tests."
```

## Using Claude Code Max (Parallel Agents)

Claude Code Max의 5개 병렬 에이전트를 최대 활용하려면:

```
Session 1 (Main): Orchestration + integration-agent
Session 2: backend-agent (Task 1→2→3→4→5→6)
Session 3: frontend-agent (Task 7→8→9→10→11→14→15)
Session 4: ai-data-agent (prompts→seed data→prompt tuning→AI report)
Session 5: Reserved for hotfix / critical path unblocking
```

### Subagent-Driven Development
각 세션에서 `superpowers:subagent-driven-development` 스킬을 사용하면:
- 태스크별 서브에이전트가 자동 생성
- 독립적인 태스크는 병렬 실행
- 의존성 있는 태스크는 순차 실행
- 진행 상황 자동 추적
