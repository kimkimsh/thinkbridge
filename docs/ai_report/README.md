# ThinkBridge — AI 빌딩 리포트 답변 초안

이 폴더는 `docs/③ 2026 KIT 바이브코딩 공모전_팀명(개인은 이름)_AI리포트.docx`의 각 항목에 대한 답변 초안이다. 각 파일은 docx의 한 섹션에 대응한다.

## 사용 방법
1. 각 파일 내용을 읽고, 필요하면 톤·길이 조정
2. docx의 해당 섹션 표에 붙여넣기
3. 본 폴더는 git에 커밋하여 심사위원이 근거 자료로 확인 가능하도록 유지

## 제출용 기본 정보 (docx 첫 표에 기재)

| 항목 | 내용 |
|------|------|
| 팀명 (개인의 경우 이름) | **[본인 입력]** |
| 휴대폰번호 (대표자) | **[본인 입력]** |
| 프로젝트명 | **ThinkBridge — AI 소크라테스 튜터링 시스템** |

## 섹션별 답변 초안

### 1. 기획
- [01 — 설정한 사용자와 해결하려는 문제](./01_planning_users_and_problem.md)
- [02 — 솔루션의 핵심 기능](./02_planning_core_features.md)
- [03 — 도입 시 기대되는 개선점](./03_planning_expected_improvements.md)

### 2. AI 활용 전략
- [04 — AI 도구/모델 선택과 이유](./04_ai_tools_and_models.md)
- [05 — 도구별 활용 전략 (페르소나 · 에이전트 · 데이터 흐름)](./05_ai_strategy_per_tool.md)
- [06 — 토큰 효율 · 유지보수성 · 재현성](./06_token_efficiency.md)

## 답변의 근거 자료 위치

본 답변들은 다음 **실제 산출물**에 기반한다 (주장-근거 대응 관계 유지):

| 근거 자료 | 내용 |
|-----------|------|
| `CLAUDE.md`, `backend/CLAUDE.md`, `frontend/CLAUDE.md` | 프로젝트 설계·구현 가이드 (계층 구조) |
| `docs/revise_plan_v1~v3/` | 3차례 계획 수정 이력 (4-페르소나 리뷰 기록) |
| `docs/work_log/01~17` | 매일 쓴 작업 기록 17건 |
| `docs/bug_fix/` | 버그 근본 원인 분석 |
| `backend/app/services/ai_engine.py` | Tool Use 1-tool + text 구현체 |
| `backend/app/core/prompts.py` | 프롬프트 v1/v2/v3 이력 (주석 보존) |
| `.claude/agents.md` | 본 프로젝트 에이전트 팀 정의 |
| `~/.claude/projects/.../memory/` | 세션 간 선호 메모리 계층 |

## 정량 지표 (본 프로젝트 전반)

| 항목 | 수치 |
|------|------|
| 개발 기간 | 7일 (2026-04-06 ~ 2026-04-12) |
| 총 커밋 수 | 96 |
| 계획 수정 사이클 | 3회 (v1 → v2 → v3) |
| 매일 작성 work log | 17건 |
| 처리한 P0/P1/P2 findings | 60+ |
| 자동 테스트 시나리오 | 113 |
| 핵심 아키텍처 패턴 | Tool Use 1-tool + text (1회 호출로 응답 + 분석) |
