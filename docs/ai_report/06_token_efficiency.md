# 2-3. 토큰 낭비 최소화 + 유지보수성 + 재현성 전략

## 한 줄 답변

> **AI 호출 수를 줄이고(3회→1회), 호출당 입력을 줄이고(8턴 rolling), 동일 작업을 반복하지 않는다(계층 메모리 · 버전 주석 · 상수 추출 · 에이전트 역할 고정).**

---

## 1. 토큰 효율 — API 수준

### 1-1. 3회 호출 → 1회 Tool Use 호출 (약 50% 절감)

v1 초기 설계의 3회 호출:
- Call 1: 소크라테스 질문 생성
- Call 2: 6차원 사고 분석
- Call 3: 패턴 감지 및 단계 판정

v3 아키텍처는 **1회 Tool Use 호출로 통합**:
- Text block = Socratic question
- Tool use block = 구조화 분석 (6차원 + 패턴 + 단계 + engagement)

**효과**:
- 시스템 프롬프트 중복 제거 (3회 → 1회)
- 네트워크 왕복 제거 (응답 지연 감소)
- 토큰 약 **50% 절감** (중복 컨텍스트 제거)

### 1-2. 8-턴 Rolling Window (히스토리 요약 압축)

```python
MAX_HISTORY_TURNS = 8  # 최근 8턴만 full context
# 8턴 초과분은 한 줄 요약으로 압축해 1개 메시지로 prepend
```

**효과**:
- 세션이 20턴이 되어도 입력 토큰 linear 증가 방지
- 10~15턴 세션 기준 **약 50% 입력 토큰 절감**

### 1-3. `max_tokens` 명시 상한
- `max_tokens = 2048` (응답 + 분석을 담는 최소 범위)
- 무제한 생성 방지 → **예산 한계 예측 가능**

### 1-4. Guest 전용 압축 프롬프트
- 게스트는 5턴 제한 → **5턴 안에 "aha moment" 유도**하는 별도 압축 프롬프트
- 일반 프롬프트 대비 시스템 프롬프트 약 30% 짧음

---

## 2. 유지보수성 — 코드 수준

### 2-1. Magic Number/String 제로 (상수 추출 원칙)

사용자 전역 원칙(`~/.claude/CLAUDE.md`):
> "**Zero tolerance for magic numbers and magic strings**: every literal value must be declared as a named constant"

본 프로젝트 적용:
```python
MAX_HISTORY_TURNS    = 8
GUEST_MAX_TURNS      = 5
CLAUDE_MODEL         = "claude-sonnet-4-20250514"
DEFAULT_ANALYSIS_SCORE = 5
STUCK_DETECTION_WINDOW = 2
MAX_RETRY_COUNT      = 1
```

**효과**:
- 값 변경 시 한 곳만 수정
- 의미 있는 이름으로 가독성 증가 (`5` → `GUEST_MAX_TURNS`)

### 2-2. 계층적 CLAUDE.md (관심사 분리)
```
CLAUDE.md          — 전역 아키텍처 · 원칙 · 스케줄
backend/CLAUDE.md  — 백엔드 상세 (Tool Use, SSE, DB 스키마)
frontend/CLAUDE.md — 프론트 컴포넌트 스펙, UI 가이드
```

**효과**:
- 새 세션 시 해당 레이어만 로드
- 수정 영향 범위 명확
- AI 에이전트가 "어디를 봐야 하는지" 자동 판단

### 2-3. 프롬프트 버전 이력 주석
`backend/app/core/prompts.py`:
```python
# v1 (2026-04-07): 기본 3원칙
# v2 (2026-04-08): analyze_thinking tool 추가
# v3 (2026-04-09): "텍스트 없이 tool만" 실패 방지 원칙 4 추가
# v3.1 (2026-04-10): Stuck 감지 자동 주입
```

**효과**:
- 프롬프트 변경의 **why**가 코드에 남음
- 회귀 시 이전 버전으로 돌릴 수 있는 참조점

### 2-4. One Class per File + 명시적 클래스 레이아웃
- 멤버 → 생성자 → public → private 순서 강제
- 기능·역할별 파일 분리 (`services/ai_engine.py`, `services/report_generator.py`)
- Java-style 네이밍 (`tValue` 로컬, `mValue` 멤버, camelCase 함수)

---

## 3. 재현성 — 프로세스 수준

### 3-1. 매일 Work Log 17건

`docs/work_log/01~17_*.md`:
- 01: 백엔드 스캐폴드
- 02: DB 모델 + CheckConstraint 추가
- 03: 배포 (Render + Supabase + Vercel)
- 04: QA 테스트 체계
- 05: 아키텍처 확정
- 06: AI 응답 버그 수정 (CRLF SSE 이슈)
- 07: UI 재디자인 (indigo-purple identity)
- 08: 프롬프트 엔지니어링 (v2 → v3)
- 09: SSE 및 race condition hardening
- 10: v3 안정화 (P0/P1/P2 findings 20건 처리)
- 11: Nested git repo 정리
- 12: Instructor Replay 헤더
- 13: 랜딩 auth navbar 수정
- 14: 세션 resume 복원
- 15: 진행 표시 + UI 폴리시
- 16: 튜토리얼 오버레이 코어
- 17: 튜토리얼 통합

**효과**:
- "이 결정은 왜 했나"를 **사후 추적** 가능
- AI 리포트를 마감 직전 급조하지 않음 → 진정성 있는 기술 문서

### 3-2. Conventional Commits (96 커밋 / 7일)

```
feat(ai): implement Tool Use agent pattern
fix(sse): handle CRLF event boundaries correctly
refine(prompt): add few-shot for essay subject
docs(work_log): add v3 stability hardening session log
chore(repo): remove nested frontend/.git
```

**효과**:
- `git log`만 읽어도 개발 흐름 복원
- PR·디버깅 시 관련 커밋 즉시 탐색

### 3-3. 계획 수정 아카이브
`docs/revise_plan_v1/` → `v2/` → `v3/` 는 **각 단계 문서를 그대로 동결**한다:
- v1을 수정하지 않고 v2 폴더를 신규 작성
- **번복된 결정**의 이유가 review-summary에 기록됨
- 공모전 후에도 "이 팀은 어떻게 생각했는가"를 재구성 가능

### 3-4. `.claude/agents.md` — 에이전트 역할 고정
본 프로젝트 에이전트 팀:
- **backend-agent**: FastAPI, DB models, AI engine, API endpoints
- **frontend-agent**: Next.js, components, SSE client, UI
- **ai-data-agent**: Prompts, seed data, prompt tuning, AI report
- **integration-agent**: Deploy, E2E verification, cross-cutting

**효과**:
- 누가 어떤 영역을 담당하는지 명시 → 재세션 시에도 역할 유지
- 에이전트 간 작업 경계 분쟁 방지

### 3-5. Memory 시스템 (세션 간 선호 보존)

`~/.claude/projects/<proj>/memory/MEMORY.md` 인덱스 + 개별 메모 파일:
- `project_thinkbridge.md` — 프로젝트 맥락
- `reference_docs_location.md` — 문서 위치
- `user_parallel_claude_instances.md` — 병렬 Claude 인스턴스 운영 패턴

**효과**:
- 매 세션 "사용자가 Java-style naming을 선호한다" 같은 사실을 다시 학습하지 않음
- **대화당 토큰 수십 줄 절감**, 수십 세션 누적 시 큰 차이

### 3-6. 테스트 시나리오 문서화
- `docs/test/` — 113개 체크리스트 (자동 / 수동 구분)
- `e2e-student-test.js`, `test_suite3.js` — 실행 가능 재현 스크립트

---

## 4. 배포 수준 — 비용과 안정성

### 4-1. UptimeRobot 5분 Ping (콜드스타트 방지)
- Render Free tier는 15분 inactive 시 sleep → 다음 요청 30초+ 지연
- UptimeRobot이 `/health`를 5분마다 호출 → **항상 따뜻**

### 4-2. 모델 선택의 비용 계산
- Sonnet 4 (`claude-sonnet-4-20250514`) = Opus 4 대비 **약 1/5 비용**
- 한국어 품질 충분 → 스케일 시 월 수백 달러 차이

### 4-3. Supabase Session Mode Pooler
- Transaction mode(6543) 사용 시 prepared statement 충돌 → 무한 재시도 → **토큰 낭비**
- Session mode(5432)로 전환하여 안정화
- `docs/work_log/03_deployment.md`에 근본 원인 기록

---

## 5. 에러 처리 정책 — "가짜 성공 금지"

### 원칙
> AI 스트림 실패 시 fallback 텍스트를 **만들지 않는다**. 정직한 에러 이벤트를 발생시킨다.

### 이유
- 가짜 성공은 **6차원 분석 DB를 오염** (쓰레기 점수가 누적되면 히트맵·성장 추이가 거짓 신호)
- 사용자 신뢰 훼손

### 구현
```python
if not tHasText:
    yield {"type": "error", "data": {"code": "AI_EMPTY_RESPONSE", ...}}
    # 가짜 텍스트 생성 금지
```

---

## 6. 정량 지표 요약

| 항목 | 수치 |
|------|------|
| AI 호출 감소 | **3회 → 1회** (Tool Use 1-tool + text) |
| 입력 토큰 절감 | 약 **50%** (8턴 rolling + 이전 요약) |
| 개발 기간 | **7일** (96 commits) |
| Work log 문서 | **17건** (매일) |
| 계획 수정 사이클 | **3회** (v1 → v2 → v3) |
| 4-페르소나 리뷰 | 회당 **10+ findings** |
| P0/P1/P2 findings 처리 | **60+ 건** (v3 안정화) |
| 자동 테스트 시나리오 | **113** |
| 커밋당 평균 개발 시간 | **약 1.75시간** (7일 × 24h / 96 커밋) |

---

## 한 줄 철학

> **"AI는 빠르지만 맹목적이다. 사람이 프레임(상수·버전·문서·에이전트 역할·메모리)을 씌워야 비로소 재현 가능한 시스템이 된다."**

---

## 근거 위치

| 근거 | 내용 |
|------|------|
| `backend/app/services/ai_engine.py` | `MAX_HISTORY_TURNS`, 8턴 윈도우, 3단계 fallback |
| `backend/app/core/prompts.py` | 프롬프트 버전 이력 주석 |
| `~/.claude/CLAUDE.md` | Magic number 제로 원칙 |
| `docs/work_log/01~17` | 17건 매일 개발 일지 |
| `.claude/agents.md` | 에이전트 역할 정의 |
| `~/.claude/projects/.../memory/MEMORY.md` | 사용자 선호 보존 인덱스 |
| `docs/revise_plan_v1/review-summary.md`, `v2/review-summary-v2.md` | 4-페르소나 리뷰 증거 |
| `docs/work_log/03_deployment.md` | Supabase Session Mode 전환 기록 |
| `docs/work_log/10_v3_stability_hardening.md` | P0/P1/P2 findings 처리 |
