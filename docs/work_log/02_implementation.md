# ThinkBridge 구현 과정

> 17개 태스크를 Subagent-Driven Development 패턴으로 순차 실행.
> 각 태스크마다 2단계 리뷰 (스펙 준수 → 코드 품질) 적용.

## 개발 방법론

- **Subagent-Driven Development**: 태스크마다 독립 서브에이전트 배치 → 구현 → 스펙 리뷰 → 품질 리뷰
- **Conventional Commits**: `feat:`, `fix:`, `data:`, `test:`, `chore:` 접두사 사용
- **2단계 리뷰**: 스펙 준수 리뷰 (요구사항 충족 확인) + 코드 품질 리뷰 (보안, 패턴, 유지보수성)

---

## Phase 1: Backend (Task 1~6)

### Task 1: Backend Scaffolding + Deploy Skeleton
- **커밋**: `d20004c` feat: scaffold FastAPI backend
- **내용**: FastAPI 앱, config.py (Pydantic Settings), database.py (async SQLAlchemy), main.py (CORS, health, SSE test), Dockerfile, .gitignore, README.md
- **리뷰 수정** (`c9eb0e8`):
  - pydantic v1 `Config` → v2 `SettingsConfigDict`
  - `SECRET_KEY` 기본값 제거 (fail-fast)
  - CORS origins 빈 문자열 필터링
  - Dockerfile에 `EXPOSE 8000` 추가

### Task 2: Database Models (8 tables)
- **커밋**: `20b4016` feat: add 8 SQLAlchemy models
- **내용**: User, ClassRoom, Enrollment, TutoringSession, Message, ThoughtAnalysis (6차원), Report, TokenUsage
- **리뷰 수정** (`850a2be`):
  - `CheckConstraint` 추가 (점수 0-10, 단계 1-5 범위 강제)
  - 중복 `SubjectType`/`SessionSubject` enum 통합
  - `Enrollment.mUser`에 `back_populates` 추가
  - `Report.mSessionId`에 `unique=True` 추가

### Task 3: Schemas + Auth + Guest Mode
- **커밋**: `c78d6a6` feat: add Pydantic schemas, JWT auth, and guest mode
- **내용**: 14개 Pydantic 스키마, JWT 보안 (hashPassword, verifyPassword, createAccessToken, getCurrentUser), Auth 라우터 (register, login, guest)
- **리뷰 수정** (`0565136`):
  - JWT `sub` 클레임 `int()` 변환 안전성 추가
  - `SessionDetail.messages` 타입을 `MessageWithAnalysis`로 변경

### Task 4: AI Engine — 1-Tool + Text Pattern ★ CRITICAL
- **커밋**: `93db5cf` feat(ai): implement Tool Use agent with 1-tool+text streaming architecture
- **내용**:
  - `prompts.py`: 소크라테스 시스템 프롬프트 (few-shot 3개, 과목별 전략, 5단계 진행), 게스트 프롬프트 (5턴 압축), `analyze_thinking` 도구 정의
  - `ai_engine.py`: `processTurn()` (비스트리밍), `processTurnStreaming()` (SSE), 3단계 폴백, 히스토리 윈도잉 (8턴)
- **리뷰 수정** (`dec4801`):
  - Anthropic 클라이언트 싱글톤 패턴
  - `DEFAULT_ANALYSIS` deepcopy 적용
  - 폴백 텍스트 상수화
  - 스트리밍 재시도 제거 (부분 데이터 중복 방지)

### Task 5: Session API + SSE Streaming
- **커밋**: `abf316f` feat: add Session API with SSE streaming
- **내용**: 5개 엔드포인트 (CRUD + SSE POST), 게스트 5턴 제한, 정체 감지, 힌트 요청 처리, 필드명 매핑 (snake_case → mPascalCase → camelCase)
- **리뷰 수정** (`359ce27`):
  - 힌트 요청 접두사 감지 + 제거 구현
  - `mTotalTurns` 업데이트를 사용자 메시지 저장 시점으로 이동 (레이스 조건 방지)

### Task 6: Report Generator + Dashboard API
- **커밋**: `4d30575` feat: add report generator, reports API, and instructor dashboard API
- **내용**: 프로그래매틱 리포트 생성 (Claude API 미사용), 성장 추이 API, 강사 대시보드 API (반 목록, 학생 목록, 히트맵 + AI 인사이트)

---

## Phase 2: Frontend (Task 7~11, 14~15)

### Task 7: Frontend Scaffolding
- **커밋**: `15550e9` feat: scaffold Next.js 14 frontend
- **내용**: Next.js 14 프로젝트, shadcn/ui 12개 컴포넌트, `types/index.ts` (19개 인터페이스), `api.ts` (REST + SSE ReadableStream), `auth.tsx` (AuthProvider), `constants.ts`

### Task 8: Auth Pages + Layout + Landing
- **커밋**: `79c7265` feat: add auth pages, landing page, and role-based layouts
- **내용**: 랜딩 페이지 (ChatGPT 비교, 게스트 CTA, 데모 모드), 로그인/회원가입, Navbar, Sidebar (모바일 Sheet), 역할별 레이아웃 (auth guard)

### Task 9: Student Chat Interface ★ MOST CRITICAL
- **커밋**: `d8f1797` feat: add student Socratic chat with SSE streaming
- **내용**:
  - `ProgressBar.tsx`: 5단계 소크라테스 진행 바
  - `MessageBubble.tsx`: 사용자/AI 메시지 버블 + 스트리밍 커서
  - `ThoughtPanel.tsx`: 접이식 6차원 분석 패널 (애니메이션 바)
  - `ChatInterface.tsx`: SSE 스트리밍 (token/analysis/done/error), 힌트 버튼, 세션 종료
  - `chat/page.tsx`: 과목 선택, 주제 입력, 게스트 배지

### Task 10: Student Report + Charts
- **커밋**: `95f933a` feat: add student report page with radar, growth, and timeline charts
- **내용**: RadarChart (6차원 + 비교 오버레이), GrowthTrendChart (시계열), ThoughtTimeline (턴별 분석), 세션 목록, 리포트 페이지

### Task 11: Instructor Dashboard
- **커밋**: `bfd5e4c` feat: add instructor dashboard with heatmap and session replay
- **내용**: SummaryCards, ClassSelector, StudentList, HeatmapChart (학생×6차원 + AI 인사이트), 세션 리플레이 (듀얼 패널)

### Task 14: Mobile Responsive + UI Polish
- **커밋**: `51720d3` feat: add mobile responsive design and UI polish
- **내용**: ThoughtPanel 모바일 Sheet 드로어, 히트맵 가로 스크롤, 리플레이 세로 스택, error.tsx 글로벌 에러 바운더리

### Task 15: Admin Dashboard
- **커밋**: `7da7519` feat: add admin dashboard with stats, class comparison, and subject radar
- **내용**: Backend admin API 3개, 관리자 대시보드 (통계 카드 4개, BarChart 반별 비교, RadarChart 과목별 비교, Demo Data 배너)

---

## Phase 3: Data + Deploy (Task 12, 16)

### Task 12: Seed Data
- **커밋**: `f27d2bd` data: add rich seed data
- **내용**: 10 users, 3 classes, 40 sessions, 203 messages, 87 analyses, 40 reports. 3개 수작업 소크라테스 대화 (수학/과학/논술 8-10턴)

### Task 16: Deploy Configuration
- **커밋**: `0279c55` feat: add deploy config
- **내용**: next.config.mjs (standalone output), .env.example, warmup.sh, README 업데이트
