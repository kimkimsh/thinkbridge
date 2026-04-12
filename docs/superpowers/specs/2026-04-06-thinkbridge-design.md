# ThinkBridge - AI 소크라테스식 사고력 훈련 & 진단 시스템

> "AI가 답을 주는 시대, 생각하는 법을 가르치는 AI"

## 1. 프로젝트 개요

### 배경
학생들이 AI에 답을 복붙하는 시대, 사고력은 퇴화하고 있다. 교육의 본질은 "답을 찾는 것"이 아니라 "생각하는 법을 배우는 것"인데, 현재 AI 교육 도구는 오히려 이를 훼손하고 있다.

### 핵심 컨셉
ThinkBridge는 AI가 절대 정답을 직접 제공하지 않고, 소크라테스식 질문법으로 학생의 사고를 단계적으로 유도하는 1:1 튜터링 시스템이다. 동시에 대화 과정에서 학생의 사고 패턴을 실시간 분석하여, 교강사에게 학생별 사고력 진단 리포트를 제공한다.

### 공모전 정보
- 주제: AI 활용 차세대 교육 솔루션
- 심사 기준: 기술적 완성도, AI 활용 능력/효율성, 기획력/실무 접합성, 창의성
- 제출 기한: 2026-04-13
- 제출물: GitHub(public), 라이브 URL, AI 리포트

## 2. 타겟 사용자 & 시나리오

### 사용자 3인

**수강생 (민수, 고등학생)**
1. 수학 문제를 풀다 막힘 -> ThinkBridge에 질문
2. AI가 답 대신 "이 문제에서 주어진 조건을 정리해볼까?" 같은 유도 질문
3. 민수가 사고를 전개 -> AI가 다음 단계 질문으로 유도
4. 스스로 답에 도달 -> 세션 종료 후 사고 과정 리플레이 & 진단 확인
5. "논리적 비약 2회 발생, 전제 확인 단계에서 취약" 같은 피드백 수령

**교강사 (김 교수, 대학 강의)**
1. 대시보드에서 학생 30명의 사고력 히트맵 확인
2. "논리 구조화" 영역에서 전반적으로 취약한 것을 발견
3. 해당 영역 집중 강화 수업 설계
4. 개별 학생의 세션 기록을 열어 사고 흐름 타임라인 확인
5. 특정 학생에게 맞춤 과제 배정

**교육 운영자 (학원 원장)**
1. 전체 반/과목별 사고력 성장 추이 대시보드 확인
2. AI 튜터링 도입 전후 비교 데이터 확인
3. 효과가 낮은 반의 원인 분석 (세션 참여율, 대화 깊이 등)

### 대상 과목
- 1차: 수학, 과학, 논술 (논리적 사고 과정이 명확한 과목)
- 확장 가능: 사회, 역사 (인과관계 추론), 프로그래밍 (문제 분해)

## 3. 시스템 아키텍처

### 전체 구조

```
[사용자 브라우저]
       |
       v
[Vercel] -- Next.js Frontend (SSR)
       |
       | REST API
       v
[Railway] -- FastAPI Backend + PostgreSQL
       |
       | API 호출
       v
[Anthropic] -- Claude API
```

### 핵심 백엔드 모듈

| 모듈 | 역할 | AI 활용 방식 |
|------|------|-------------|
| Socratic Engine | 학생 대화에서 답을 주지 않고, 사고 단계에 맞는 유도 질문 생성 | Claude API + 소크라테스 전략 프롬프트 체인 |
| Thought Analyzer | 각 대화 턴에서 학생의 사고 패턴을 실시간 분류 | Claude API + 구조화된 분석 출력 (JSON) |
| Report Generator | 세션/학생/반 단위 사고력 진단 리포트 생성 | 분석 데이터 집계 + Claude API 내러티브 생성 |

### 기술 스택

| 영역 | 기술 | 선택 이유 |
|------|------|----------|
| Frontend | Next.js 14 (App Router) + TypeScript | SSR/SSG, Vercel 배포 용이 |
| UI | Tailwind CSS + shadcn/ui | 빠른 개발, 일관된 디자인 |
| 차트/시각화 | Recharts + 커스텀 레이더 차트 | 사고력 6차원 시각화 |
| Backend | FastAPI (Python) | AI 생태계 최적, async 지원 |
| AI | Claude API (Anthropic) | 소크라테스 대화에 최적화된 추론 능력 |
| DB | PostgreSQL + SQLAlchemy | 관계형 데이터, 세션/분석 이력 관리 |
| 배포 FE | Vercel | Next.js 공식 호스팅, 무료 티어, 자동 배포 |
| 배포 BE | Railway | FastAPI + PostgreSQL 한 곳에서, 무료 체험 크레딧 |
| 인증 | NextAuth.js | 소셜 로그인 + 역할 기반 접근 |

## 4. 핵심 기능 상세

### 4.1 소크라테스 대화 엔진

**대화 전략 5단계:**

| 단계 | 이름 | 질문 예시 |
|------|------|----------|
| Stage 1 | 문제 명확화 | "이 문제에서 구하려는 것이 정확히 뭘까?" |
| Stage 2 | 조건 탐색 | "주어진 조건 중에서 아직 사용하지 않은 것이 있을까?" |
| Stage 3 | 전략 유도 | "비슷한 유형의 문제를 풀어본 적 있어? 어떤 방법을 썼지?" |
| Stage 4 | 검증 촉진 | "이 답이 맞는지 다른 방법으로 확인해볼 수 있을까?" |
| Stage 5 | 일반화/확장 | "이 풀이법을 다른 상황에도 적용할 수 있을까?" |

**적응 규칙:**
- 학생이 완전히 막히면 -> 한 단계 아래로 내려가 더 구체적인 힌트성 질문
- 학생이 빠르게 진행하면 -> 단계를 건너뛰고 검증/확장 질문으로 도약
- 절대 금지: 정답 직접 제시, 풀이 과정 대신 수행, "맞아/틀려" 단정적 판정

**세션 흐름:**
```
학생 메시지 -> Socratic Engine (단계 판단 + 질문 생성)
                    | 동시에
              Thought Analyzer (해당 턴 사고 패턴 분류)
                    |
              DB 저장 (메시지 + 분석 결과)
                    |
              AI 응답 반환 (유도 질문)
```

### 4.2 사고력 분석 프레임워크

학생의 사고를 6개 차원으로 분석:

1. **문제 이해 (problem_understanding)** — 문제의 핵심을 정확히 파악하는가
2. **전제 확인 (premise_check)** — 주어진 조건과 가정을 인식하는가
3. **논리 구조화 (logical_structure)** — 단계적으로 사고를 전개하는가
4. **근거 제시 (evidence_provision)** — 주장에 대한 근거를 제공하는가
5. **비판적 사고 (critical_thinking)** — 자신의 답을 검증하고 반례를 고려하는가
6. **창의적 사고 (creative_thinking)** — 다양한 접근법을 시도하는가

**턴별 분석 출력 형식 (JSON):**
```json
{
  "turn_number": 5,
  "thinking_dimensions": {
    "problem_understanding": {"score": 8, "evidence": "문제 조건을 정확히 재진술함"},
    "premise_check": {"score": 3, "evidence": "삼각형 내각의 합 조건을 누락"},
    "logical_structure": {"score": 6, "evidence": "2단계 추론은 맞으나 3단계에서 비약"},
    "evidence_provision": {"score": 5, "evidence": "직관적 답변, 근거 불충분"},
    "critical_thinking": {"score": 2, "evidence": "자기 답 검증 시도 없음"},
    "creative_thinking": {"score": 7, "evidence": "대안적 접근 시도함"}
  },
  "detected_patterns": ["logical_leap", "missing_premise"],
  "socratic_stage": 3,
  "engagement_level": "active"
}
```

### 4.3 사고력 진단 리포트

**세션 리포트 (학생용):**
- 6차원 레이더 차트 (이번 세션 vs 최근 5회 평균)
- 사고 흐름 타임라인 (어느 지점에서 막혔고, 어떻게 돌파했는지)
- AI 코멘트: 격려 + 구체적 개선 방향

**학생 종합 리포트 (교강사용):**
- 학생별 6차원 성장 추이 그래프
- 반 전체 사고력 히트맵 (차원 x 학생 매트릭스)
- 자주 발생하는 사고 패턴 오류 랭킹
- 개별 학생 세션 리플레이 (대화 + 분석 병렬 뷰)

### 4.4 교강사 대시보드

| 뷰 | 내용 |
|----|------|
| 학생 목록 | 각 학생의 최근 사고력 점수, 세션 수, 성장 추이 미니 차트 |
| 사고력 히트맵 | 반 전체를 6차원 x 학생 매트릭스로 시각화 |
| 세션 리플레이 | 특정 세션의 대화 + 턴별 분석을 나란히 표시 |
| 과제 관리 | 특정 사고 차원 강화를 위한 과제 생성 & 배정 |

## 5. 데이터 모델

### 핵심 테이블

**User**
- id (PK), email, name, role (student/instructor/admin), hashed_password, created_at

**Class**
- id (PK), name, subject, instructor_id (FK -> User), created_at

**Enrollment**
- id (PK), user_id (FK -> User), class_id (FK -> Class), role (student/instructor/admin)

**Session**
- id (PK), user_id (FK -> User), subject, topic, status (active/completed), total_turns, started_at, ended_at

**Message**
- id (PK), session_id (FK -> Session), role (user/assistant), content, turn_number, created_at

**ThoughtAnalysis**
- id (PK), message_id (FK -> Message, 1:1), problem_understanding (int 0-10), premise_check (int 0-10), logical_structure (int 0-10), evidence_provision (int 0-10), critical_thinking (int 0-10), creative_thinking (int 0-10), detected_patterns (JSON array), socratic_stage (int 1-5), engagement_level (enum: active/passive/stuck)

**Report**
- id (PK), type (session/student/class), target_id, summary (text, AI 생성), dimension_scores (JSON), generated_at

## 6. API 엔드포인트

### 인증
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

> **SUPERSEDED**: `/me` endpoint was never implemented. Auth endpoints are limited to register/login/guest (3 total). User info is embedded in JWT claims.

### 세션 & 대화
- POST /api/sessions — 새 소크라테스 세션 시작
- GET /api/sessions — 내 세션 목록
- GET /api/sessions/{id} — 세션 상세 (메시지 + 분석 포함)
- POST /api/sessions/{id}/messages — 메시지 전송 (소크라테스 응답 + 분석 반환)
- PATCH /api/sessions/{id}/end — 세션 종료

### 분석 & 리포트
- GET /api/sessions/{id}/analysis — 세션 전체 분석 결과
- POST /api/reports/session/{id} — 세션 리포트 생성
- GET /api/reports/student/{id} — 학생 종합 리포트
- GET /api/reports/class/{id} — 반 리포트

### 교강사 대시보드
- GET /api/dashboard/classes — 내 반 목록
- GET /api/dashboard/classes/{id}/students — 반 학생 목록 + 사고력 요약
- GET /api/dashboard/classes/{id}/heatmap — 사고력 히트맵 데이터
- GET /api/dashboard/students/{id}/sessions — 특정 학생 세션 목록

### 운영자
- GET /api/admin/stats — 전체 통계
- GET /api/admin/classes — 전체 반 관리

## 7. 배포 전략

| 서비스 | 플랫폼 | URL |
|--------|--------|-----|
| Frontend | Vercel | thinkbridge.vercel.app |
| Backend | Railway | thinkbridge-api.railway.app |
| Database | Railway PostgreSQL | (내부) |
| AI | Claude API | (Anthropic) |

## 8. MVP 스코프

### 반드시 포함
- 학생 소크라테스 대화 (수학/과학/논술)
- 턴별 사고 패턴 실시간 분석
- 6차원 레이더 차트 (세션 리포트)
- 교강사 대시보드 (학생 목록 + 히트맵)
- 세션 리플레이 뷰
- 3가지 역할 인증 (학생/교강사/운영자)

### Nice-to-have (시간 여유 시)
- 사고력 성장 추이 그래프 (시계열)
- 교강사 과제 배정 기능
- 운영자 전체 통계 대시보드
- 다크 모드
- 모바일 반응형 최적화

## 9. 데모 시나리오

1. 학생 로그인 -> 수학 문제 "이차방정식의 근의 공식 유도" 질문
2. 소크라테스 대화 진행 -> AI가 질문으로 유도하는 과정을 실시간 시연
3. 사고 분석 패널 -> 대화 옆에서 실시간으로 사고 차원 점수 변화
4. 세션 완료 -> 레이더 차트 + 사고 흐름 타임라인 리포트 생성
5. 교강사 대시보드 전환 -> 학생들의 사고력 히트맵 확인
6. 세션 리플레이 -> 특정 학생의 대화 과정을 분석 결과와 함께 리뷰

## 10. 구현 로드맵

| 일차 | 작업 |
|------|------|
| Day 1 (4/7) | 프로젝트 스캐폴딩, DB 스키마, 인증 시스템, GitHub 레포 |
| Day 2-3 (4/8-9) | Socratic Engine, Thought Analyzer, 학생 대화 UI |
| Day 4-5 (4/10-11) | Report Generator, 교강사 대시보드, 학생 마이페이지 |
| Day 6 (4/12) | 배포, 데모 데이터, E2E 테스트, UI 폴리싱 |
| Day 7 (4/13) | AI 리포트 작성, 최종 점검, 제출 |
