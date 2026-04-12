# 2-1. 이 프로젝트에서 사용할 AI 도구·모델은 무엇이며, 선택한 이유는 무엇인가요?

## 한 줄 답변

> **개발은 Claude Code + Claude Opus 4.6(1M context) / Sonnet 4.6 / Haiku 4.5 조합, 프로덕션 튜터링은 Claude Sonnet 4. 모두 Anthropic 생태계로 통일하여 Tool Use·스트리밍·한국어·Agent 워크플로우의 일관성을 확보했다.**

## 사용한 AI 도구·모델 전체 표

| 레이어 | 도구 / 모델 | 역할 |
|--------|------------|------|
| **개발 도구** | **Claude Code** (Anthropic 공식 CLI) | 터미널 기반 페어 프로그래밍, 서브에이전트 실행 환경 |
| **개발 지원 모델** | **Claude Opus 4.6** (1M context) | 시니어 페르소나 — 아키텍처 설계, 코드 리뷰, 대규모 리팩터링 |
| **개발 지원 모델** | **Claude Sonnet 4.6** | 균형형 — 일반 코딩, 문서 작성, 디버깅 |
| **개발 지원 모델** | **Claude Haiku 4.5** | 경량 — 단순 변환, 스크립트, 빠른 조회 |
| **프로덕션 AI** | **Claude Sonnet 4** (`claude-sonnet-4-20250514`) | 학생과 직접 대화하는 튜터링 AI |

## Claude Code 선택 이유 (개발 도구)

### 1. 서브에이전트 아키텍처 공식 지원
- `Explore`, `Plan`, `code-reviewer`, `silent-failure-hunter`, `type-design-analyzer` 등 **역할 전문 에이전트를 병렬 실행**
- 본 프로젝트에서 **4-페르소나 병렬 리뷰**(CEO/Eng/Design/Competition) 기법의 기반
- 단일 인스턴스로는 수 시간 걸리는 다각 분석을 **1명령/수 분 내** 완료

### 2. Skills 시스템 (재사용 워크플로우)
- `brainstorming`, `debugging` 등 공식 스킬 + 사용자 정의 스킬 혼합
- 매 세션 프롬프트 엔지니어링을 다시 할 필요 없음 → **검증된 워크플로우 재생**

### 3. 파일 시스템 수준의 메모리 (auto memory)
- `~/.claude/projects/<proj>/memory/` 에 `MEMORY.md` 계층
- 사용자 선호(Java-style naming, 상수 추출 원칙 등)를 세션 간 보존
- **병렬 Claude 인스턴스 운용 패턴**까지 학습하여 재현성 확보

### 4. 1M 토큰 맥락 창 (Opus 4.6)
- 프로젝트 전체(`CLAUDE.md` + `docs/` + 핵심 코드)를 **한 번에 로드**
- 프로젝트 맥락을 매 세션 복기할 필요 없음 → 토큰·시간 모두 절감

### 5. 다중 터미널 병렬 실행
- 동일 워킹트리에서 여러 Claude Code 인스턴스 동시 운영
- 본 프로젝트에서 백엔드/프론트엔드 담당 인스턴스 분리 운영 (실증됨)

## 모델별 선택 이유

### Claude Opus 4.6 (개발 시니어 페르소나)
- **1M context**: 프로젝트 전체 파일을 동시 로드
- **추론 깊이**: 아키텍처 트레이드오프 다각 비교
- **사용 장면**: 3차례의 `revise_plan_vN`, 본 AI 리포트 작성, 복잡 버그 근본 원인 분석

### Claude Sonnet 4.6 (개발 주력)
- 속도·품질 균형
- **사용 장면**: 매일의 기능 구현, 일반 리팩터링, 테스트 작성

### Claude Haiku 4.5 (경량 배치)
- 비용·지연 최소화
- **사용 장면**: 단순 포맷 변환, 커밋 메시지 1줄 요약

### Claude Sonnet 4 — `claude-sonnet-4-20250514` (프로덕션 AI)
- **한국어 품질**: 교육 도메인 필수 조건 (소크라테스 톤 자연스러움)
- **Tool Use 공식 지원**: 1-tool + text 패턴 구현의 전제
- **스트리밍 + 구조화 출력 동시**: 학생 실시간 UX와 내부 분석 양립
- **비용 효율**: 학원 규모(수천 세션/월) 스케일에서 Opus 대비 합리적
- **API 성숙도**: 529 Overload, 스트림 재시도 등 **fallback 설계 가능**

## 모델 선택의 트레이드오프 (검토했으나 선택하지 않은 대안)

| 후보 | 장점 | 탈락 이유 |
|------|------|---------|
| Claude Opus 4 (프로덕션) | 추론 깊이 최고 | 비용·지연 과다. 튜터링은 **빠른 왕복 반복**이 품질보다 우선 |
| Claude Sonnet 3.5 | 레거시 안정성 | Tool Use 개선된 Sonnet 4로 교체 |
| GPT-4 / o3 | 수학 추론 강점 | ① 한국어 소크라테스 톤 한계 ② Tool Use 동작 방식 차이로 학습 곡선 ③ 본 프로젝트는 **Anthropic 생태계 일관성** 전략 |
| Cursor / Copilot | IDE 통합 | ① 서브에이전트 병렬 실행 미지원 ② 계획 수립 워크플로우(brainstorming → plan → implementation) 부재 ③ Skills 시스템 없음 |

## "왜 Anthropic 생태계로 통일했는가"

1. **Tool Use 동일 API**: 개발 중 테스트한 프롬프트가 프로덕션에서 그대로 동작
2. **에이전트 워크플로우 일관성**: Claude Code의 Explore/Plan/Review가 그대로 계획 문서·리포트 생성에도 사용됨
3. **한국어 품질의 일관성**: 개발 문서 한국어 주석·커밋 메시지와 프로덕션 튜터링 응답의 톤이 통일
4. **Skills + Memory의 복리 효과**: 프로젝트 내 학습이 `MEMORY.md`로 누적 → 세션 거듭할수록 효율 상승

## 한 장 요약

> **개발은 Claude Code + Opus 4.6으로 설계·구현·리뷰를, 프로덕션 튜터링은 Sonnet 4로 한국어 · Tool Use · 스트리밍을 한 번에 해결. 에이전트 병렬 실행으로 계획 수립 자체를 AI화.**

## 근거 위치

- `CLAUDE.md` → "Tech Stack" 섹션
- `backend/app/services/ai_engine.py` → `CLAUDE_MODEL = "claude-sonnet-4-20250514"` 상수
- `.claude/agents.md` → 에이전트 팀 구성 파일
- `~/.claude/projects/<proj>/memory/MEMORY.md` → 사용자 선호 보존 인덱스
