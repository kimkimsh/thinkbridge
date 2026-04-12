# 2-2. 각 AI 도구별 활용 전략 (페르소나 · 에이전트 구성 · 데이터 흐름)

## 한 줄 요약

> **계획은 4-페르소나 병렬 리뷰로, 구현은 서브에이전트 병렬 파이프라인으로, 튜터링은 Tool Use 단일 호출로, 모든 단계의 근거는 문서로.**

---

## 전략 1. 계획 단계 — 4-페르소나 병렬 리뷰 패턴

### 전략
v1 초안을 작성한 후, **동일 산출물을 4개 서로 다른 페르소나 에이전트에게 독립 리뷰** 시킨다. 각 페르소나는 서로의 결론을 보지 못하므로 **상호 오염 없는 다각적 검토**가 된다.

### 페르소나 구성

| 에이전트 | 페르소나 | 핵심 관점 | 대표 지적 |
|---------|---------|---------|----------|
| **CEO Reviewer** | 제품 비전가 | 차별화, 시장 포지셔닝, 핵심 가치 증명 | "성장 추이 그래프가 핵심 가치 증명 자산" |
| **Eng Reviewer** | 시니어 엔지니어 | 아키텍처 리스크, 배포 복잡도, 기술 부채 | "AI 응답 지연 90% 리스크 → Tool Use로 해결" |
| **Design Reviewer** | UX 디자이너 | 사용자 흐름, 시각화, 데모 임팩트 | "온보딩 부재 + 모바일 미지원은 치명적" |
| **Competition Reviewer** | 공모전 심사 시뮬레이터 | 채점 기준 갭, 심사위원 체험 최적화 | "게스트 모드 = 심사위원 이탈 방지 최우선" |

### 데이터 흐름

```
[초안 v1]
    ↓ 동일 문서를 4벌 복제
[CEO 리뷰] [Eng 리뷰] [Design 리뷰] [Competition 리뷰]   (병렬 · 독립)
    ↓ 각각 10+ findings + 위험도 정량화(% 추정) + 점수 추정
[통합 리뷰 요약 (review-summary.md)]
    ↓ 공통 지적 = 최우선 / 분기 지적 = 트레이드오프 분석
[v2 초안 작성]
    ↓ 재검토
[Eng + Competition 2차 리뷰 (review-summary-v2.md)]
    ↓
[v3 최종 확정 (thinkbridge-plan-v3.md)]
```

### 이 패턴이 드라이브한 실제 결정

| 원안 (v1) | 지적 | 최종 (v3) |
|----------|------|---------|
| Claude API 3회 호출 (Socratic/Analyzer/Reporter 각각) | Eng: "지연 중첩, 토큰 중복" | **1회 Tool Use 통합 (1-tool + text)** |
| Railway + NextAuth | Eng: "배포 실패율 60%" | **Supabase + 커스텀 JWT + Render** |
| 게스트 3턴 | Competition: "Stage 2까지밖에 못 감" | **게스트 5턴 + 전용 압축 프롬프트** |
| 성장 추이 = Nice-to-have | CEO: "핵심 가치 증명" | **MVP 승격, 전용 API 엔드포인트** |
| EventSource SSE | Eng: "POST 미지원" | **fetch + ReadableStream** |
| TDD 포함 | Eng: "공모전 시간 낭비" | **TDD 제거 → 프롬프트 튜닝·UI 폴리시에 재투자 (~5시간 확보)** |

### 제약 사항
- 4-페르소나는 **반드시 동시 병렬** 실행 (상호 오염 방지)
- 각 페르소나에 **역할을 구체적으로 프롬프트**해야 함 ("CEO 입장에서" 만으로는 부족, "제품 차별화 3개 + 시장 리스크 3개 + 점수 추정"과 같은 구조화 요청)

---

## 전략 2. 구현 단계 — 서브에이전트 병렬 파이프라인

### 전략
메인 Claude Code 인스턴스는 **오케스트레이터**로 동작하고, 실제 탐색·분석·검증은 **Explore / Plan / code-reviewer 서브에이전트에게 병렬 위임**한다.

### 에이전트 구성

| 에이전트 | 용도 |
|---------|------|
| `Explore` | 코드베이스를 넓게 탐색 (quick/medium/very-thorough 3단계 깊이) |
| `Plan` | 구현 전략 설계 (아키텍처 트레이드오프 명시) |
| `feature-dev:code-architect` | 기능 블루프린트 (생성/수정 파일 명시) |
| `pr-review-toolkit:code-reviewer` | PR 품질 검증 (스타일·컨벤션·보안) |
| `pr-review-toolkit:silent-failure-hunter` | 에러 처리 숨은 실패 사냥 |
| `pr-review-toolkit:type-design-analyzer` | 타입 설계 정량 평가 |

### 데이터 흐름

```
[사용자 요청]
    ↓
[메인 Claude Code = 오케스트레이터]
    ├─→ [Explore: 관련 파일 탐색] ────┐
    ├─→ [Plan: 전략 설계] ────────────┤  (병렬 실행)
    └─→ [code-reviewer: 패턴 확인] ───┤
                                      ↓
                  [메인 인스턴스가 결과 통합 · 판단]
                                      ↓
                          [구현 (Edit / Write)]
                                      ↓
                     [code-reviewer로 재검증]
                                      ↓
                                  [커밋]
```

### 실증 사례: 본 AI 리포트 작성 과정
본 리포트 작성을 위해 **3개 에이전트 병렬 투입**:
- Agent 1: `docs/work_log/01~17` 분석 → 개발 진행 내러티브 추출
- Agent 2: `docs/revise_plan_v1~v3` 분석 → 계획 진화 추적
- Agent 3: 실제 구현 코드 분석 → 기술적 차별점 추출

각 에이전트가 독립적으로 1,000~1,500단어 보고서를 생성하고, 메인 인스턴스가 통합하여 본 문서군(`docs/ai_report/`)를 작성.

### 제약 사항
- **Context Pollution 방지**: 서브에이전트에게는 **자기 완결적 프롬프트** 필수 ("이전 대화 맥락을 고려해"는 금물 — 에이전트는 맥락 없음)
- **중복 작업 방지**: 같은 탐색을 메인과 서브에이전트가 모두 하지 않도록 명확한 분담

---

## 전략 3. 프로덕션 AI — Tool Use 1-tool + text 단일 호출 패턴

### 전략
기존 3회 API 호출 구조를 **1회 Claude Tool Use 호출로 통합**.

### 시스템 프롬프트 (페르소나)
```
너는 학생의 사고력을 키우기 위해 소크라테스식 질문법을 사용하는 튜터다.

4대 원칙:
1. 절대 정답을 제공하지 마라
2. 항상 학생 스스로 답에 도달하도록 질문을 던져라
3. 응답 형식: 반드시 (1) 한국어 텍스트 응답 먼저 + (2) analyze_thinking 도구 호출
4. 최소 2문장 이상 텍스트 응답 (v3에서 추가)
```

### 에이전트 구성 (Tool 정의)

```json
{
  "name": "analyze_thinking",
  "input_schema": {
    "properties": {
      "problem_understanding":  {"type": "integer", "min": 0, "max": 10},
      "premise_check":          {"type": "integer", "min": 0, "max": 10},
      "logical_structure":      {"type": "integer", "min": 0, "max": 10},
      "evidence_provision":     {"type": "integer", "min": 0, "max": 10},
      "critical_thinking":      {"type": "integer", "min": 0, "max": 10},
      "creative_thinking":      {"type": "integer", "min": 0, "max": 10},
      "detected_patterns":      {"type": "array",   "items": "string"},
      "socratic_stage":         {"type": "integer", "min": 1, "max": 5},
      "engagement_level":       {"enum": ["active", "passive", "stuck"]}
    },
    "required": [9개 필드 전체]
  }
}
```

### 데이터 흐름 (한 턴 단위)

```
[학생 입력]
    ↓
[POST /api/sessions/{id}/messages (SSE)]
    ↓
[Claude API 1회 호출]
    ├─ content_block[0] = text: "이차방정식이 인수분해될 수 있는지..."
    │      ↓ delta.text 청크
    │     [SSE "token" × N] → Frontend 타이핑 애니메이션
    │
    └─ content_block[1] = tool_use: {partial JSON chunks}
           ↓ (content_block_stop까지 buffer)
          [JSON 파싱 · 검증]
           ↓
          [SSE "analysis" 1회] → Frontend ThoughtPanel + ProgressBar
    ↓
[DB: Message + ThoughtAnalysis + TokenUsage 저장]
    ↓
[SSE "done" (token_usage 포함)] → Frontend 입력 재활성화
```

### 제약 사항과 대응

**제약 1 · `tool_choice=auto` 불안정성**
- 현상: Claude가 때로 텍스트 생략하고 tool만 호출 → UX 파괴
- 대응: 
  - 시스템 프롬프트 원칙 3번에 **"텍스트 없이 도구만 호출 금지"** 명시
  - 원칙 4 "최소 2문장 이상" (v3에서 추가 보강)
  - 그래도 실패 시 **non-streaming retry** (tool 파라미터 제거)로 텍스트만 강제 생성

**제약 2 · 응답 지연**
- 현상: 4~10초 대기 시 사용자 이탈
- 대응: text block **스트리밍**으로 1초 내 타이핑 시작 → 체감 지연 0

**제약 3 · JSON 파싱 실패**
- 현상: tool_use의 partial JSON 손상
- 대응: **3단계 fallback**
  - Stage 1: Tool 미호출 시 → default 분석 (모든 점수 5)
  - Stage 2: JSON 파싱 실패 → default 분석 + 로그 기록
  - Stage 3: 전체 실패 → 1회 non-streaming retry → 그래도 실패 시 **정직한 에러 이벤트**(`AI_EMPTY_RESPONSE`) (가짜 응답 생성 금지)

---

## 전략 4. 컨텍스트 엔지니어링 — CLAUDE.md 계층 구조

### 전략
프로젝트 맥락을 **계층적 `CLAUDE.md`**로 분리 → Claude Code가 필요 시점에만 해당 레이어 로드.

```
/CLAUDE.md                   ← 프로젝트 전체 (아키텍처, 스택, 원칙, 일정)
/backend/CLAUDE.md           ← 백엔드 상세 (Tool Use, SSE, DB 스키마)
/frontend/CLAUDE.md          ← 프론트 상세 (컴포넌트, UI 스펙)
/~/.claude/CLAUDE.md         ← 사용자 전역 코딩 규칙 (Java-style naming, 상수 원칙 등)
```

### 효과
- 관심사 분리(SoC)를 AI 맥락 창에 적용
- 세션 시작 시 **필요 레이어만** 로드 → 토큰 절감

---

## 전략 5. 프롬프트 버전 히스토리와 투명성

### 전략
- 프롬프트 파일(`backend/app/core/prompts.py`)에 **v1/v2/v3 이력 주석 보존**
- 매일 `docs/work_log/NN_*.md` 기록 (D+7 마감 직전 급조 금지)
- 계획 수정은 `docs/revise_plan_vN/` 폴더로 **동결**

### 왜 이것이 AI 활용 전략인가
- AI는 버전 관리를 자동으로 해주지 않음
- **사람이 프레임(폴더 구조, 주석 규칙, 커밋 컨벤션)을 씌워줘야** 재현성 확보
- 17개 work log = **17개의 AI 협업 사례**를 심사위원이 검증 가능한 증거

---

## 전략 6. 안전 장치 — Silent Failure 방지

### 원칙
> "AI 스트림 실패 시 fallback 텍스트를 만들지 않는다. **정직한 에러 이벤트**를 발생시킨다."

### 왜 이 원칙인가
- 가짜 성공은 **분석 DB를 오염**시킨다 (6차원 점수가 쓰레기 데이터)
- 사용자 신뢰 훼손 (AI가 엉뚱한 말 하면 제품 신뢰도 급락)

### 구현
```python
if not tHasText:
    yield {
        "type": "error",
        "data": {"code": "AI_EMPTY_RESPONSE", "message": "..."}
    }
    # 가짜 텍스트 생성 금지
```

### 추가 안전 장치
- Guest 턴이 AI 실패로 소모됐다면 **자동 환불** (CAS UPDATE 패턴)
- DB 저장 실패 시 **프론트에 에러 이벤트 전파** (숨기지 않음)
- 중복 INSERT 방지 (이미 저장된 턴 재호출 시 skip)

---

## 전략 요약 매트릭스

| 전략 | 목적 | 도구·패턴 |
|------|------|---------|
| 4-페르소나 병렬 리뷰 | 계획의 다각 검증 | 서브에이전트 병렬 + 독립 프롬프트 |
| 서브에이전트 파이프라인 | 구현의 분업 | Explore/Plan/Review 병렬 |
| 1-tool + text 단일 호출 | 프로덕션 효율 | Tool Use + 스트리밍 |
| CLAUDE.md 계층 | 맥락 분리 | 파일 시스템 |
| 프롬프트 버전 주석 | 재현성 | 코드 주석 + work log |
| Silent Failure 방지 | 안정성 | 정직한 에러 이벤트 |

## 근거 위치
- `docs/revise_plan_v1/review-summary.md` — 4-페르소나 리뷰 실증
- `docs/revise_plan_v2/review-summary-v2.md` — 2차 리뷰
- `backend/app/services/ai_engine.py` — Tool Use 구현체 + 3단계 fallback
- `backend/app/core/prompts.py` — 프롬프트 v1/v2/v3 이력 주석
- `backend/app/routers/sessions.py` — Stuck 감지, CAS 패턴, SSE 에러 이벤트
- `frontend/src/lib/api.ts` — SSE 클라이언트 (CRLF 호환 파싱)
- `.claude/agents.md` — 에이전트 팀 정의
- `docs/work_log/06_ai_response_fix.md`, `08_prompt_engineering.md` — 프롬프트 진화 기록
