# ThinkBridge v2 - AI 소크라테스식 사고력 훈련 & 진단 시스템

> "AI가 답을 주는 시대, 생각하는 법을 가르치는 AI"

## 변경 이력

| 버전 | 변경 내용 | 근거 |
|------|----------|------|
| v1 → v2 | 아키텍처 단순화 (DB → Supabase) | Eng Review: 배포 리스크 감소 |
| v1 → v2 | 게스트 체험 모드 추가 | Competition Review: 심사위원 이탈 방지 |
| v1 → v2 | SSE 스트리밍 응답 추가 | 전원 지적: UX 치명적 문제 |
| v1 → v2 | AI 호출 통합 (2회 → 1회 + Tool Use) | Eng Review: 속도 2배 향상 |
| v1 → v2 | 성장 추이 그래프 MVP 승격 | CEO Review: 핵심 가치 증명 필수 |
| v1 → v2 | 사고력 프레임워크 학술적 근거 추가 | CEO Review: 교육학적 정당성 |
| v1 → v2 | 운영자(admin) 페르소나 유지 (시드 데이터 기반 대시보드) | 3개 역할 완성 = 기획 완성도 어필. 시드 데이터로 공수 최소화 |
| v1 → v2 | Class/Enrollment 모델 유지 (시드 전용, 관리 UI 없음) | 반별 통계에 필요. 시드 데이터로만 생성 |
| v1 → v2 | 온보딩 & 이탈 방지 UX 추가 | Design Review: 치명적 결함 |
| v1 → v2 | 모바일 반응형 (채팅 최소) | Design Review: 심사위원 모바일 접근 가능성 |
| v1 → v2 | 프롬프트 Few-shot + 진화 기록 | Competition Review: AI 리포트 설득력 |
| v1 → v2 | 토큰 효율성 전략 추가 | Competition Review: AI 활용 효율성 점수 |
| v1 → v2 | TDD 제거 → 프롬프트 튜닝 + UI 폴리싱 투자 | Eng Review: 공모전 시간 최적화 |

---

## 1. 프로젝트 개요

### 배경
학생들이 AI에 답을 복붙하는 시대, 사고력은 퇴화하고 있다. 2025년 교사 설문에서 다수가 "AI로 인해 학생의 자기 사고 능력이 저하됐다"고 응답했다. 교육의 본질은 "답을 찾는 것"이 아니라 "생각하는 법을 배우는 것"인데, 현재 AI 교육 도구는 오히려 이를 훼손하고 있다.

### 핵심 컨셉
ThinkBridge는 AI가 절대 정답을 직접 제공하지 않고, 소크라테스식 질문법으로 학생의 사고를 단계적으로 유도하는 1:1 튜터링 시스템이다. 동시에 대화 과정에서 학생의 사고 패턴을 실시간 분석하여, 교강사에게 학생별 사고력 진단 리포트와 수업 개선 제안을 제공한다.

### 경쟁 분석 & 차별화

| 기존 솔루션 | 접근법 | ThinkBridge 차별점 |
|-------------|--------|-------------------|
| ChatGPT/뤼튼 튜터 | 답을 직접 제공 | 답을 절대 주지 않고 사고를 유도 |
| Khanmigo (Khan Academy) | 소크라테스식 대화 | 6차원 사고력 실시간 분석 + 교강사 대시보드 |
| AI 문제 생성기 | 문제 자동 생성 | 사고 과정 자체를 분석/진단 |
| Socratic by Google | 문제 풀이 도우미 | 사고 패턴 추적 + 성장 추이 시각화 |

**ThinkBridge만의 킬러 피처:**
1. 턴별 실시간 6차원 사고력 분석 (대화 옆 패널에서 시각적으로)
2. 교강사용 사고력 히트맵 (반 전체 패턴 즉시 파악)
3. 학생의 사고 과정 자체가 "직접 생각했다"는 증명 (부정행위 방지)

### 공모전 정보
- 주제: AI 활용 차세대 교육 솔루션
- 심사 기준: 기술적 완성도, AI 활용 능력/효율성, 기획력/실무 접합성, 창의성
- 제출 기한: 2026-04-13
- 제출물: GitHub(public), 라이브 URL, AI 리포트

---

## 2. 타겟 사용자 & 시나리오

### 사용자 3인 (v2: 운영자 시드 데이터 기반 대시보드로 3역할 완성)

**수강생 (민수, 고등학생)**
1. ThinkBridge 방문 → "바로 체험하기" 클릭 (회원가입 불필요)
2. 수학 이차방정식에 대해 질문
3. AI가 답 대신 유도 질문 → 민수가 사고 전개 → AI가 다음 단계 질문
4. 채팅 상단 프로그레스 바에서 "전략 유도 단계" 진입 확인
5. 막히면 "힌트 더 받기" 버튼 클릭 → AI가 더 구체적 힌트 질문
6. 스스로 답에 도달 → "사고 여정 완료!" 셀레브레이션 + 자동 리포트 생성
7. 레이더 차트로 6차원 점수 확인, 성장 추이 그래프로 이전 세션과 비교

**교강사 (김 교수, 대학 강의)**
1. 대시보드 접속 → 상단 요약 카드 (학생 수, 평균 세션, 활성률, 평균 점수)
2. 사고력 히트맵에서 "비판적 사고"가 반 전체적으로 취약한 것 발견
3. AI 인사이트 카드: "비판적 사고 영역 강화를 위한 검증 촉진 활동을 권장합니다"
4. 특정 학생 클릭 → 세션 리플레이에서 사고 흐름 타임라인 확인
5. 학생별 성장 추이 그래프로 3회 세션 후 개선 확인

**교육 운영자 (학원 원장) — 시드 데이터 기반**
1. 운영자 대시보드 접속 → 전체 현황 카드 (총 학생, 총 세션, 전체 평균 점수, 활성률)
2. 반별 사고력 평균 비교 차트 (고등수학 1반 vs 물리학 기초반)
3. 과목별 6차원 사고력 레이더 비교 (수학 vs 과학 vs 논술)
4. 월간 활성 학생 추이 그래프
5. 반별 교강사 성과 요약

### 대상 과목
- 1차: 수학, 과학, 논술 (논리적 사고 과정이 명확한 과목)

---

## 3. 사고력 분석 프레임워크 (학술적 근거)

### Bloom's Revised Taxonomy 기반 6차원 매핑

ThinkBridge의 6차원 사고력 프레임워크는 Bloom's Revised Taxonomy(2001, Anderson & Krathwohl)와 Paul-Elder Critical Thinking Model을 참고하여 설계되었다.

| ThinkBridge 차원 | Bloom's 대응 | Paul-Elder 대응 | 설명 |
|-----------------|-------------|----------------|------|
| 문제 이해 (problem_understanding) | 이해(Understand) | Purpose | 문제의 핵심을 정확히 파악하는가 |
| 전제 확인 (premise_check) | 기억/이해(Remember/Understand) | Assumptions | 주어진 조건과 가정을 인식하는가 |
| 논리 구조화 (logical_structure) | 분석(Analyze) | Inference | 단계적으로 사고를 전개하는가 |
| 근거 제시 (evidence_provision) | 적용(Apply) | Evidence | 주장에 대한 근거를 제공하는가 |
| 비판적 사고 (critical_thinking) | 평가(Evaluate) | Point of View | 자신의 답을 검증하고 반례를 고려하는가 |
| 창의적 사고 (creative_thinking) | 창조(Create) | Implications | 다양한 접근법을 시도하는가 |

---

## 4. 시스템 아키텍처 (v2 개선)

### 전체 구조

```
[사용자 브라우저]
       |
       v
[Vercel] -- Next.js Frontend (SSR)
       |
       | REST API + SSE (Streaming)
       v
[Render] -- FastAPI Backend
       |
       |--- Claude API (Anthropic) : Tool Use 기반 통합 호출
       |--- Supabase PostgreSQL    : 관리형 DB (항시 가동)
```

### v1 대비 개선점

| 항목 | v1 | v2 | 개선 이유 |
|------|----|----|----------|
| DB | Railway PostgreSQL | **Supabase PostgreSQL** | 무료 500MB, 항시 가동, Cold start 없음 |
| Backend 배포 | Railway | **Render** | 무료 티어 관대, PostgreSQL 불필요 (Supabase 사용) |
| AI 호출 | 매 턴 2회 (소크라테스 + 분석) 순차 | **1회 통합 호출 (Tool Use)** | 속도 2배 향상, 토큰 절약 |
| 응답 방식 | 전체 응답 후 한번에 표시 | **SSE 스트리밍** | UX 극적 개선 |
| 인증 | 커스텀 JWT만 | 커스텀 JWT + **게스트 체험 모드** | 심사위원 이탈 방지 |
| 인증 스펙 | "NextAuth.js" 기재 | **커스텀 JWT로 통일** | v1 불일치 해소 |

### 핵심 백엔드 모듈 (v2 통합)

| 모듈 | v1 역할 | v2 변경 |
|------|---------|---------|
| Socratic Engine | 별도 Claude API 호출 | **Tool Use 통합 응답** 내에서 소크라테스 질문 생성 |
| Thought Analyzer | 별도 Claude API 호출 | **Tool Use 통합 응답** 내에서 구조화 분석 JSON 반환 |
| Report Generator | 유지 | 유지 + **수업 제안 기능 추가** |

### Tool Use 통합 호출 구조

매 턴 Claude API를 1회만 호출하되, Tool Use를 활용하여 2가지 결과를 동시에 얻는다:

```
Student message → Claude API (1회 호출)
  ├── Tool: analyze_thinking → 6차원 사고력 분석 JSON
  └── Tool: generate_socratic_response → 소크라테스 유도 질문
```

이 구조의 장점:
- 응답 시간 50% 단축 (2회 → 1회)
- 분석과 응답이 동일한 컨텍스트 기반으로 일관성 향상
- Tool Use 활용을 AI 리포트에서 "AI 에이전트 아키텍처"로 어필

### 기술 스택 (v2)

| 영역 | 기술 | v1 대비 변경 |
|------|------|-------------|
| Frontend | Next.js 14 (App Router) + TypeScript | 유지 |
| UI | Tailwind CSS + shadcn/ui | 유지 |
| 차트/시각화 | Recharts + 커스텀 레이더 차트 | 유지 |
| Backend | FastAPI (Python) | 유지 |
| AI | Claude API (Anthropic) + **Tool Use** | Tool Use 추가 |
| DB | **Supabase PostgreSQL** | Railway → Supabase |
| 배포 FE | Vercel | 유지 |
| 배포 BE | **Render** | Railway → Render |
| 인증 | 커스텀 JWT + **게스트 모드** | NextAuth.js 제거, 게스트 추가 |

---

## 5. 핵심 기능 상세 (v2 개선)

### 5.1 게스트 체험 모드 (v2 신규)

- 랜딩 페이지 "바로 체험하기" 버튼 클릭 → 회원가입 없이 즉시 소크라테스 대화 3턴 체험
- 백엔드: 임시 게스트 사용자 생성 (guest_xxx), 3턴 후 "계속하려면 가입하세요" 유도
- 심사위원이 30초 내에 핵심 기능을 체험할 수 있는 최단 경로

### 5.2 소크라테스 대화 엔진 (v2 개선)

**대화 전략 5단계** (v1과 동일):

| 단계 | 이름 | 질문 예시 |
|------|------|----------|
| Stage 1 | 문제 명확화 | "이 문제에서 구하려는 것이 정확히 뭘까?" |
| Stage 2 | 조건 탐색 | "주어진 조건 중에서 아직 사용하지 않은 것이 있을까?" |
| Stage 3 | 전략 유도 | "비슷한 유형의 문제를 풀어본 적 있어? 어떤 방법을 썼지?" |
| Stage 4 | 검증 촉진 | "이 답이 맞는지 다른 방법으로 확인해볼 수 있을까?" |
| Stage 5 | 일반화/확장 | "이 풀이법을 다른 상황에도 적용할 수 있을까?" |

**v2 적응 규칙 강화:**
- 학생이 stuck → 한 단계 아래로 + **"힌트 더 받기" 버튼 UI 노출**
- 학생이 빠르게 진행 → 단계 건너뛰기
- **engagement_level이 "stuck" 2연속** → 백엔드에서 stage를 강제 하향 (AI 판단에만 의존하지 않음)
- 절대 금지: 정답 직접 제시, 풀이 과정 대신 수행

**v2 프롬프트 개선:**
- Few-shot 예시 2-3개 포함 (이상적 대화 패턴)
- 프롬프트 버전 관리 (v1→v2→v3) AI 리포트용 진화 기록 보존

**v2 SSE 스트리밍 세션 흐름:**
```
학생 메시지
  → Backend: Claude API Tool Use 1회 호출 (Streaming)
     ├── Tool Result 1: analyze_thinking (JSON)
     │     → DB 저장 → 프론트 사고 분석 패널 업데이트
     └── Tool Result 2: socratic_response (text)
           → SSE 스트리밍 → 프론트 글자 단위 실시간 표시
  → DB 저장 (메시지 + 분석)
```

### 5.3 실시간 사고 패턴 분석 (v2: Tool Use 통합)

분석 결과 JSON 구조 (v1과 동일):
```json
{
  "problem_understanding": 8,
  "premise_check": 3,
  "logical_structure": 6,
  "evidence_provision": 5,
  "critical_thinking": 2,
  "creative_thinking": 7,
  "detected_patterns": ["logical_leap", "missing_premise"],
  "socratic_stage": 3,
  "engagement_level": "active"
}
```

**v2 변경: Tool Use로 구조화 출력 보장**
- v1: Claude에게 JSON 출력을 요청 → 파싱 실패 가능성
- v2: Tool Use의 input_schema로 JSON 구조 강제 → 파싱 실패 원천 차단

### 5.4 사고력 진단 리포트 (v2 개선)

**세션 리포트 (학생용):**
- 6차원 레이더 차트 (**이번 세션 vs 전체 평균 오버레이** — v2 추가)
- 사고 흐름 타임라인 (**차원별 라인 차트** — v2 시각화 강화)
- AI 코멘트: 격려 + 구체적 개선 방향
- **"이번 세션에서 N번의 사고 전환을 거쳐 스스로 답에 도달했습니다"** (v2 추가)

**학생 종합 리포트 (교강사용):**
- 학생별 6차원 **성장 추이 그래프 (시계열)** — v2: MVP 필수로 승격
- 반 전체 사고력 히트맵
- 자주 발생하는 사고 패턴 오류 랭킹
- **AI 수업 제안** (v2 추가): "이 반은 전제 확인이 약합니다. 다음 수업에서 조건 정리 훈련을 추천합니다"

### 5.5 교강사 대시보드 (v2 개선)

| 뷰 | v1 | v2 추가/변경 |
|----|----|-------------|
| **요약 카드** | 없음 | **추가**: 총 학생, 평균 세션, 이번 주 활성률, 평균 점수 |
| 학생 목록 | 기존 유지 | 유지 |
| 사고력 히트맵 | 테이블 기반 | **AI 인사이트 요약 추가** (취약 차원 자동 감지) |
| 세션 리플레이 | 듀얼 패널 | **첫 번째 학생 메시지 자동 선택** |
| **성장 추이** | Nice-to-have | **MVP 필수**: 학생별 시계열 라인 차트 |

### 5.6 온보딩 & 이탈 방지 UX (v2 신규)

**온보딩 (첫 방문 시):**
- 3단계 인터랙티브 가이드: "일반 AI vs ThinkBridge" 비교 → "대화 방법" → "분석 결과 읽는 법"
- 또는 간단한 모달 가이드 (시간 절약)

**이탈 방지:**
- 채팅 상단 **소크라테스 5단계 프로그레스 바** (크게 표시)
- **"힌트 더 받기" 버튼** (답을 주지 않되, 더 구체적 힌트 질문 유도)
- 단계 전진 시 축하 토스트 알림

**학생용 사고 분석 패널:**
- **기본 접힌 상태** (토글로 열기) — 숫자 점수가 학생에게 부담될 수 있음
- 데모/심사위원용: URL 파라미터로 ?demo=true → 패널 항시 열림

### 5.7 토큰 효율성 전략 (v2 신규)

- **대화 히스토리 윈도우**: 최근 8턴만 전송 (그 이전은 요약)
- **프롬프트 캐싱**: 세션 내 반복 system prompt에 Anthropic prompt caching 적용
- **토큰 사용량 추적**: 매 API 호출의 input/output 토큰을 DB에 기록
- AI 리포트에서 "메시지당 평균 X 토큰, 세션당 평균 Y 토큰" 데이터로 효율성 어필

---

## 6. 데이터 모델 (v2 단순화)

### v1 대비 변경

| 모델 | v1 | v2 |
|------|----|----|
| User | 유지 | 유지 + **is_guest 필드 추가**, role에 admin 유지 |
| ClassRoom | 있음 | **유지 (시드 전용, 관리 UI 없음)** |
| Enrollment | 있음 | **유지 (시드 전용)** |
| TutoringSession | 유지 | 유지 |
| Message | 유지 | 유지 |
| ThoughtAnalysis | 별도 테이블 | 유지 (1:1 관계 유지) |
| Report | 다형성 target_id | **session_id FK로 단순화** |
| **TokenUsage** | 없음 | **추가**: API 호출별 토큰 사용량 추적 |

### 핵심 테이블 (v2)

**User**
- id, email, name, role (student/instructor/admin), hashed_password, is_guest (bool), created_at

**ClassRoom** (시드 데이터 전용 — 관리 UI 없음)
- id, name, subject, instructor_id (FK → User), created_at

**Enrollment** (시드 데이터 전용)
- id, user_id (FK → User), class_id (FK → ClassRoom), role

**TutoringSession**
- id, user_id (FK), subject, topic, status, total_turns, started_at, ended_at

**Message**
- id, session_id (FK), role (user/assistant), content, turn_number, created_at

**ThoughtAnalysis**
- id, message_id (FK, unique), problem_understanding, premise_check, logical_structure, evidence_provision, critical_thinking, creative_thinking, detected_patterns (JSON), socratic_stage, engagement_level

**Report**
- id, session_id (FK), summary (text), dimension_scores (JSON), generated_at

**TokenUsage**
- id, session_id (FK), input_tokens, output_tokens, model, created_at

---

## 7. API 엔드포인트 (v2 정리: 17개 → 15개)

### 인증 (3개)
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/guest — **v2 추가: 게스트 세션 생성**

### 세션 & 대화 (5개)
- POST /api/sessions — 새 소크라테스 세션 시작
- GET /api/sessions — 내 세션 목록
- GET /api/sessions/{id} — 세션 상세 (메시지 + 분석 포함)
- POST /api/sessions/{id}/messages — **SSE 스트리밍 응답** (소크라테스 + 분석 동시)
- PATCH /api/sessions/{id}/end — 세션 종료 + **자동 리포트 생성 트리거**

### 리포트 (1개)
- GET /api/reports/session/{id} — 세션 리포트 조회

### 교강사 대시보드 (3개)
- GET /api/dashboard/classes — 내 반 목록
- GET /api/dashboard/classes/{class_id}/students — 반 학생 목록 + 사고력 요약
- GET /api/dashboard/classes/{class_id}/heatmap — 반 사고력 히트맵

### 운영자 대시보드 (3개) — **v2 복원, 시드 데이터 기반**
- GET /api/admin/stats — 전체 현황 통계 (총 학생, 총 세션, 평균 점수, 활성률)
- GET /api/admin/classes — 반별 사고력 평균 비교 데이터
- GET /api/admin/subjects — 과목별 6차원 사고력 비교 데이터

---

## 8. 배포 전략 (v2 안정화)

| 서비스 | v1 | v2 | 개선 이유 |
|--------|----|----|----------|
| Frontend | Vercel | Vercel | 유지 |
| Backend | Railway | **Render** | 무료 티어 관대, 자동 배포 |
| Database | Railway PostgreSQL | **Supabase PostgreSQL** | 무료 500MB, 항시 가동, Cold start 없음 |
| AI | Claude API | Claude API | 유지 |

**v2 배포 조기 검증 전략:**
- Day 2까지 skeleton 앱을 실제 URL에 배포하여 인프라 문제 조기 발견
- 데모 계정 사전 세팅 (심사위원 즉시 체험 가능)

---

## 9. MVP 스코프 (v2 재정의)

### 반드시 포함 (v2)
- [x] 게스트 체험 모드 (회원가입 없이 3턴) — **v2 추가**
- [x] 학생 소크라테스 대화 (수학/과학/논술)
- [x] SSE 스트리밍 AI 응답 — **v2 추가**
- [x] Tool Use 기반 통합 AI 호출 — **v2 추가**
- [x] 턴별 사고 패턴 실시간 분석
- [x] 6차원 레이더 차트 (이번 세션 vs 평균 오버레이)
- [x] 성장 추이 시계열 그래프 — **v2: Nice-to-have → MVP 승격**
- [x] 교강사 대시보드 (요약 카드 + 학생 목록 + 히트맵 + AI 인사이트)
- [x] 세션 리플레이 뷰
- [x] 세션 종료 시 자동 리포트 생성 — **v2 추가**
- [x] 3가지 역할 인증 (학생/교강사/운영자) + 게스트
- [x] 운영자 대시보드 (시드 데이터 기반: 전체 통계, 반별 비교, 과목별 비교) — **v2 복원**
- [x] 소크라테스 5단계 프로그레스 바 — **v2 추가**
- [x] "힌트 더 받기" 버튼 — **v2 추가**
- [x] 최소 모바일 반응형 (채팅 화면) — **v2 추가**
- [x] 토큰 효율성 추적 — **v2 추가**

### Nice-to-have (시간 여유 시)
- [ ] 이미지 업로드 + Claude Vision (멀티모달)
- [ ] 대시보드 AI 수업 제안 자동 생성
- [ ] 온보딩 인터랙티브 가이드
- [ ] 교육과정 성취기준 태깅
- [ ] 학생 간 사고 경로 비교
- [ ] 사고 분석 레이더 차트 실시간 애니메이션

### v1에서 삭제
- ~~반(Class) 관리 UI~~ (시드 데이터로만 생성, 관리 UI는 불필요)
- ~~과제 배정 기능~~
- ~~다크 모드~~

---

## 10. 데모 시나리오 (v2 강화)

### 사전 세팅
- 게스트 체험 모드 활성화
- 데모 계정: student@demo.com / instructor@demo.com / admin@demo.com (비밀번호: demo1234)
- 반 2개 (고등수학 1반, 물리학 기초반) + 학생 5명 x 세션 5개씩 = 의미 있는 데모 데이터
- 학생별 뚜렷한 패턴 차이 (민수: 창의성 높고 논리 약함, 서연: 전반적 균형, 지호: 소극적)

### 시연 흐름 (3분 기준)

**0:00-0:30 (문제 제기 + 즉시 체험)**
- 랜딩 페이지 → "바로 체험하기" 클릭 → 게스트로 즉시 대화 진입
- "이차방정식을 풀고 싶어요" 입력 → AI가 답 대신 질문으로 유도
- 옆 패널에서 사고 분석이 실시간 변화 + 스트리밍 응답

**0:30-1:30 (학생 경험 데모)**
- 사전 세팅된 학생 계정으로 전환 → 완료된 세션의 리포트 확인
- 6차원 레이더 차트 (이번 세션 vs 평균 비교)
- 성장 추이 그래프 ("3회 사용 후 논리 구조화 점수 40% 향상")

**1:30-2:30 (교강사 대시보드)**
- 교강사 계정 전환 → 대시보드 요약 카드 확인
- 히트맵에서 "비판적 사고 전체적 취약" 패턴 발견
- 특정 학생 세션 리플레이 → 턴별 분석 확인

**2:30-2:50 (운영자 대시보드)**
- admin 계정 전환 → 전체 현황 카드 (총 학생 5명, 총 세션 25회, 평균 6.2점)
- 반별 사고력 비교 차트 (고등수학 1반 vs 물리학 기초반)
- 과목별 6차원 레이더 비교

**2:50-3:00 (비전 + 마무리)**
- "ThinkBridge는 AI가 답을 대신하는 도구가 아니라, 생각하는 법을 가르치는 도구입니다."

---

## 11. AI 리포트 전략 (v2 신규)

### 구조

**1장: AI 도구 & 모델 선택**
- Claude API (Sonnet/Haiku) 선택 이유: 추론 능력, JSON 구조화 출력, 한국어 품질
- Claude Code Max 활용: 전 과정 AI 페어프로그래밍
- 다른 모델과의 비교 테스트 결과

**2장: 프롬프트 아키텍처 & 진화 기록**
- 3개 AI 모듈 프롬프트 설계 철학
- 프롬프트 v1→v2→v3 진화 과정 (무엇을 개선했고 왜)
- Few-shot 예시 설계 전략
- Tool Use를 활용한 에이전트 패턴 설명

**3장: 에이전트 구성 & 데이터 흐름**
- Tool Use 통합 호출 아키텍처 다이어그램
- 적응형 소크라테스 전략 플로우차트
- 대화 컨텍스트 관리 (히스토리 윈도우, 요약)

**4장: 토큰 효율성**
- 메시지당 평균 토큰, 세션당 평균 토큰, 비용 추정
- 프롬프트 캐싱 적용 전후 비교
- 히스토리 윈도우 전략의 효과

**5장: AI 코딩 도구 활용**
- Claude Code를 활용한 개발 프로세스
- 에이전트 병렬 실행으로 개발 속도 향상 사례
- 코드 품질 관리에서의 AI 역할

---

## 12. 구현 로드맵 (v2 재설계)

| 일차 | 작업 | 핵심 목표 |
|------|------|----------|
| Day 1 (4/7) AM | 스캐폴딩, DB(Supabase), 인증 + 게스트 모드 | 기반 완성 |
| Day 1 (4/7) PM | **배포 검증** (빈 앱 실제 URL 동작 확인) | 리스크 조기 차단 |
| Day 2 (4/8) | Socratic Engine + Thought Analyzer (Tool Use 통합) + **프롬프트 1차 튜닝** | 핵심 AI 완성 |
| Day 3 (4/9) | **학생 대화 UI + SSE 스트리밍** (가장 중요한 기능 먼저 완성) | 데모 핵심 완성 |
| Day 4 (4/10) | 사고 분석 패널, 레이더 차트, 성장 추이, 세션 리포트 | 학생 경험 완성 |
| Day 5 (4/11) | 교강사 대시보드 + 히트맵 + 세션 리플레이 + 프롬프트 2차 튜닝 | 교강사 경험 완성 |
| Day 6 (4/12) | 데모 데이터 정교화, UI 폴리싱, 모바일 반응형, 전체 배포 | 완성도 향상 |
| Day 7 (4/13) | AI 리포트 작성, 데모 리허설, 최종 점검, 제출 | 제출 |

**핵심 원칙: Day 3 끝까지 학생 대화 기능이 실제 배포 URL에서 동작해야 한다.**

---

## 13. 커밋 전략

- Conventional Commits 형식 (feat/fix/test/docs/chore/perf)
- 하루 5-10 커밋 균등 분포
- 커밋 메시지에 "왜/어떻게" 포함 (예: "feat: add 5-stage adaptive Socratic dialogue engine")
- 기능별 의미 있는 단위 커밋 (한 번에 2000줄 금지)
- 마지막 날: docs: AI report, chore: final polish
