# ThinkBridge v3 (Final) - AI 소크라테스식 사고력 훈련 & 진단 시스템

> "AI가 답을 주는 시대, 생각하는 법을 가르치는 AI"

## v2 → v3 변경 이력

| 변경 | 근거 | 영향 |
|------|------|------|
| Tool Use 1-tool + text 패턴으로 단순화 | Eng v2: 2-tool은 순서 비보장, 구현 복잡 | 구현 난이도 대폭 감소 |
| SSE 수신 = fetch ReadableStream 확정 | Eng v2: EventSource는 POST 미지원 | 기술 결정 명확화 |
| 게스트 3턴 → 5턴 + 전용 압축 프롬프트 | CEO/Design v2: 3턴은 Stage 2에서 끝남 | 심사위원 체험 품질 향상 |
| 데모 역할 전환: 원클릭 스위처 추가 | Design v2: 3분 데모에서 로그인 3번 불가 | 데모 실행 가능성 보장 |
| Admin 대시보드 → P1 유지 (시드 데이터 기반) | 3역할 완성 = 기획 완성도 어필, 시드 데이터로 공수 최소화 |
| 시드 데이터 8명 학생, 3개 반 | Design v2: 5명은 히트맵이 빈약 | 시각적 밀도 향상 |
| Render cold start 방지 (UptimeRobot) | Eng v2: 30초 로딩은 치명적 | 배포 안정성 보장 |
| 성장 추이 API 엔드포인트 추가 | Eng v2: 프론트 차트에 데이터 소스 없음 | 스펙-플랜 정합성 |
| Non-streaming fallback 우선 구현 | Eng v2: 스트리밍 실패해도 데모 가능 | 리스크 완화 |
| 랜딩에 ChatGPT vs ThinkBridge 비교 | CEO/Comp v2: 창의성 +1, 구현 1시간 | 차별화 극대화 |
| AI 리포트 매일 기록 (Day 7 작성 아님) | Competition v2: 날것의 기록이 가장 설득적 | 리포트 품질 향상 |
| 프롬프트 캐싱 삭제 (Nice-to-have에서도 제거) | CEO v2: beta 기능, 복잡도 대비 효과 미미 | 스코프 축소 |

---

## 1. 프로젝트 개요

### 배경
학생들이 AI에 답을 복붙하는 시대, 사고력은 퇴화하고 있다. 교육의 본질은 "답을 찾는 것"이 아니라 "생각하는 법을 배우는 것"인데, 현재 AI 교육 도구는 오히려 이를 훼손하고 있다.

### 핵심 컨셉
ThinkBridge는 AI가 절대 정답을 제공하지 않고, 소크라테스식 질문법으로 학생의 사고를 유도하는 1:1 튜터링 시스템이다. 대화 과정에서 학생의 사고 패턴을 6차원으로 실시간 분석하여, 교강사에게 학생별 사고력 진단 리포트를 제공한다.

### 경쟁 분석 & 차별화

| 기존 솔루션 | 접근법 | ThinkBridge 차별점 |
|-------------|--------|-------------------|
| ChatGPT/뤼튼 튜터 | 답을 직접 제공 | 답을 절대 주지 않고 사고를 유도 |
| Khanmigo (Khan Academy) | 소크라테스식 대화 | 6차원 사고력 실시간 분석 + 교강사 대시보드 |
| AI 문제 생성기 | 문제 자동 생성 | 사고 과정 자체를 분석/진단 |

**ThinkBridge 킬러 피처:**
1. 턴별 실시간 6차원 사고력 분석 (대화 옆 패널)
2. 교강사용 사고력 히트맵 (반 전체 패턴 즉시 파악)
3. 학생의 사고 과정 = "직접 생각했다"는 증명 (부정행위 방지)

---

## 2. 타겟 사용자 & 시나리오

### 핵심 사용자 2인 + 확장 사용자 1인

**수강생 (민수, 고등학생) — 핵심**
1. "바로 체험하기" 클릭 → 5턴 게스트 체험 (Stage 1→3 압축 경험)
2. AI가 답 대신 유도 질문 → 채팅 상단 프로그레스 바에서 단계 진행 확인
3. 막히면 "힌트 더 받기" 버튼 → AI가 더 구체적 힌트 질문
4. 스스로 답에 도달 → 자동 리포트 생성 + 레이더 차트 + 성장 추이

**교강사 (김 교수) — 핵심**
1. 대시보드 → 요약 카드 + 사고력 히트맵에서 취약 차원 발견
2. 특정 학생 세션 리플레이 → 턴별 사고 흐름 분석
3. 성장 추이 그래프로 개선 확인

**교육 운영자 (학원 원장) — 시드 데이터 기반**
1. 전체 현황 통계 카드 (총 학생, 총 세션, 평균 점수, 활성률)
2. 반별 사고력 평균 비교 차트
3. 과목별 6차원 레이더 비교
4. "Demo Data" 배너로 확장 비전 명시

---

## 3. 사고력 분석 프레임워크 (학술적 근거)

### Bloom's Revised Taxonomy + Paul-Elder Critical Thinking Model 기반

| ThinkBridge 차원 | Bloom's 대응 | 설명 |
|-----------------|-------------|------|
| 문제 이해 (problem_understanding) | 이해(Understand) | 문제의 핵심을 정확히 파악하는가 |
| 전제 확인 (premise_check) | 기억/이해 | 주어진 조건과 가정을 인식하는가 |
| 논리 구조화 (logical_structure) | 분석(Analyze) | 단계적으로 사고를 전개하는가 |
| 근거 제시 (evidence_provision) | 적용(Apply) | 주장에 대한 근거를 제공하는가 |
| 비판적 사고 (critical_thinking) | 평가(Evaluate) | 자신의 답을 검증하고 반례를 고려하는가 |
| 창의적 사고 (creative_thinking) | 창조(Create) | 다양한 접근법을 시도하는가 |

---

## 4. 시스템 아키텍처 (v3 확정)

### 전체 구조

```
[사용자 브라우저]
       |
       v
[Vercel] -- Next.js Frontend (SSR)
       |
       | REST API + SSE (fetch ReadableStream)
       v
[Render] -- FastAPI Backend ← UptimeRobot 5분 핑 (cold start 방지)
       |
       |--- Claude API (Tool Use: 1 tool + text block)
       |--- Supabase PostgreSQL (항시 가동)
```

### AI 호출 아키텍처 (v3 확정: 1-tool + text 패턴)

v2에서 2개 tool을 정의했으나, Eng v2 리뷰에서 **순서 비보장, 구현 복잡도** 문제를 지적.

**v3 확정 패턴:**
```
System prompt: 소크라테스식 응답 규칙 + "반드시 analyze_thinking tool을 호출하라"

Claude 응답:
  [text block] → 소크라테스 유도 질문 (스트리밍 가능)
  [tool_use block] → analyze_thinking JSON (완성 후 파싱)
```

장점:
- text block은 즉시 글자 단위 스트리밍 → 실시간 타이핑 효과
- tool_use block은 완성 후 한번에 파싱 → JSON 구조 보장
- 순서 의존성 없음 (text가 먼저 오든 tool이 먼저 오든 프론트에서 분기 처리)
- 1회 API 호출로 분석 + 응답 동시 획득

### Tool Use Fallback 3단계 (v3 신규)

| 실패 시나리오 | 감지 방법 | Fallback |
|-------------|----------|----------|
| Tool 미호출 (text만 반환) | response에 tool_use block 없음 | text를 소크라테스 응답으로 사용, 분석은 기본값(5점) |
| JSON 파싱 실패 | Pydantic validation 실패 | 기본 분석값 사용, 에러 로그 |
| API 타임아웃 (30초+) | httpx/anthropic timeout | 프론트에 "다시 시도" SSE 이벤트, 재시도 1회 |
| Rate limit (429) | status code 429 | 2초 대기 후 재시도, 실패 시 "잠시 후 다시" 안내 |

### Non-streaming Fallback (v3 핵심 전략)

**Day 2: Non-streaming Tool Use로 전체 플로우 먼저 완성**
**Day 3: Streaming 레이어 추가**

→ 스트리밍 구현이 실패해도 non-streaming 버전으로 데모 가능. 최악의 경우에도 "동작하는 앱" 보장.

### 기술 스택 (v3 확정)

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| 차트 | Recharts (RadarChart, BarChart, LineChart) |
| Backend | FastAPI (Python) |
| AI | Claude API + Tool Use (1-tool + text) |
| DB | Supabase PostgreSQL |
| 배포 FE | Vercel |
| 배포 BE | Render + UptimeRobot 핑 |
| 인증 | 커스텀 JWT + 게스트 모드 |
| SSE 수신 | fetch + ReadableStream (POST 지원) |

---

## 5. 핵심 기능 상세 (v3)

### 5.1 게스트 체험 모드 (v3: 5턴 + 전용 프롬프트)

- 랜딩 "바로 체험하기" → 5턴 체험 (v2의 3턴에서 상향)
- **게스트 전용 압축 프롬프트**: 5턴 안에 Stage 1→3을 경험하도록 설계
  - 1턴: Stage 1 (문제 명확화) — 빠르게 통과
  - 2-3턴: Stage 2 (조건 탐색) — 핵심 유도
  - 4-5턴: Stage 3 (전략 유도) — "아하" 모먼트 유도
- 5턴 후: "계속하려면 가입하세요" + 지금까지의 사고 분석 미니 요약 표시
- **목적**: 심사위원이 5턴 안에 "이 AI는 답을 안 주지만 내가 생각하게 만든다"를 느끼게

### 5.2 소크라테스 대화 엔진

**대화 전략 5단계** (v2와 동일):
Stage 1(문제 명확화) → Stage 2(조건 탐색) → Stage 3(전략 유도) → Stage 4(검증 촉진) → Stage 5(일반화/확장)

**v3 적응 규칙:**
- stuck 2연속 → 백엔드에서 stage 강제 하향 (AI 판단에만 의존하지 않음)
- "힌트 더 받기" 버튼 클릭 → 프롬프트에 "더 구체적 힌트 질문을 해줘" 지시 추가

**v3 프롬프트 전략:**
- Few-shot 예시 2-3개 포함 (이상적 소크라테스 대화 패턴)
- 게스트 전용 프롬프트 (GUEST_SOCRATIC_PROMPT) 별도 정의
- 프롬프트 v1→v2→v3 진화 기록 보존 (AI 리포트용)

**v3 SSE 스트리밍 흐름:**
```
학생 메시지 → Backend
  → Claude API (1-tool + text, streaming)
     → content_block_start(text) → 글자 단위 SSE "token" 이벤트 전송
     → content_block_start(tool_use) → JSON delta 버퍼링
     → content_block_stop(tool_use) → 완성된 JSON 파싱 → SSE "analysis" 이벤트
  → DB 저장 (메시지 + 분석)
  → SSE "done" 이벤트
```

프론트엔드:
```
fetch POST /api/sessions/{id}/messages
  → ReadableStream reader
     → "token" 이벤트 → 채팅에 글자 추가 (타이핑 효과)
     → "analysis" 이벤트 → ThoughtPanel 업데이트, ProgressBar 갱신
     → "done" 이벤트 → DB 저장 완료, UI 최종 상태
```

### 5.3 사고 분석 패널 UX

- **학생 모드**: 기본 접힌 상태 (토글로 열기). 숫자 점수 대신 정성적 표현 고려.
- **데모 모드** (`?demo=true`): 패널 항시 열림, 숫자 점수 표시
- 분석 업데이트 시 바 애니메이션 트랜지션

### 5.4 세션 종료 & 리포트 (v3: 흐름 명확화)

**세션 종료 트리거:**
- 사용자가 "대화 마무리" 버튼 클릭 (항시 표시)
- AI가 Stage 5 도달 시 → "리포트를 확인해볼까요?" 버튼 자동 노출

**리포트 생성 흐름:**
- 세션 종료 → 자동 리포트 생성 트리거 (동기, MVP)
- 전환 중 로딩: 레이더 차트 스켈레톤 + "사고 과정을 분석 중입니다..." 메시지
- 완료 후: 레이더 차트 + 성장 추이 + AI 내러티브 + "N번의 사고 전환을 거쳐 스스로 답에 도달했습니다"

### 5.5 교강사 대시보드

| 요소 | 내용 |
|------|------|
| 요약 카드 4개 | 총 학생, 평균 세션, 이번 주 활성률, 평균 점수 |
| 반 선택기 | 내 반 목록 (시드 데이터) |
| 사고력 히트맵 | 학생 x 6차원 매트릭스 + AI 인사이트 텍스트 |
| 학생 목록 | 이름, 세션 수, 평균 점수 배지 |
| 세션 리플레이 | 듀얼 패널 (대화 + 턴별 분석, 첫 메시지 자동 선택) |

### 5.6 데모 역할 전환 메커니즘 (v3 신규 — 필수)

3분 데모에서 로그아웃/로그인은 불가능. **원클릭 역할 전환 필수.**

**구현 방식**: 랜딩 페이지 하단에 "데모 모드" 섹션:
```
[학생으로 체험] [교강사로 체험] [운영자로 체험]
```
각 버튼 클릭 → 해당 데모 계정 토큰 즉시 발급 → 해당 대시보드로 리다이렉트

**대안**: 3개 브라우저 탭을 미리 열어놓고 탭 전환

### 5.7 토큰 효율성 전략

- 대화 히스토리 윈도우: 최근 8턴만 전송
- 토큰 사용량 추적: TokenUsage 테이블에 매 호출 기록
- AI 리포트 목표 수치:
  - Tool Use 통합으로 턴당 토큰 30% 절감 목표
  - 히스토리 윈도우로 세션당 총 토큰 50% 절감 목표
- ~~프롬프트 캐싱~~ (v3 삭제: beta 기능, 복잡도 대비 효과 미미)

---

## 6. 데이터 모델 (v3)

### 핵심 테이블

**User** — id, email, name, role (student/instructor/admin), hashed_password, is_guest, created_at

**ClassRoom** (시드 전용) — id, name, subject, instructor_id FK, created_at

**Enrollment** (시드 전용) — id, user_id FK, class_id FK, role

**TutoringSession** — id, user_id FK, subject, topic, status (active/completed), total_turns, started_at, ended_at

**Message** — id, session_id FK, role (user/assistant), content, turn_number, created_at

**ThoughtAnalysis** — id, message_id FK (unique), 6 dimension scores (int 0-10), detected_patterns (JSON), socratic_stage (1-5), engagement_level (active/passive/stuck)

**Report** — id, session_id FK, summary (text), dimension_scores (JSON), generated_at

**TokenUsage** — id, session_id FK, input_tokens, output_tokens, model, created_at

---

## 7. API 엔드포인트 (v3: 16개)

### 인증 (3개)
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/guest — 게스트 5턴 세션

### 세션 & 대화 (5개)
- POST /api/sessions
- GET /api/sessions
- GET /api/sessions/{id}
- POST /api/sessions/{id}/messages — **SSE 스트리밍 (fetch ReadableStream)**
- PATCH /api/sessions/{id}/end — **자동 리포트 생성**

### 리포트 & 성장 추이 (2개)
- GET /api/reports/session/{id}
- GET /api/students/{id}/growth — **v3 추가: 성장 추이 시계열 데이터**

### 교강사 대시보드 (3개)
- GET /api/dashboard/classes
- GET /api/dashboard/classes/{class_id}/students
- GET /api/dashboard/classes/{class_id}/heatmap

### 운영자 대시보드 (3개)
- GET /api/admin/stats — 전체 현황 (총 학생, 총 세션, 평균 점수, 활성률)
- GET /api/admin/classes — 반별 사고력 평균 비교
- GET /api/admin/subjects — 과목별 6차원 비교

---

## 8. 배포 전략 (v3: cold start 대응 추가)

| 서비스 | 플랫폼 | 비고 |
|--------|--------|------|
| Frontend | Vercel | 무료, SSR |
| Backend | Render | 무료 + **UptimeRobot 5분 핑** (cold start 방지) |
| Database | Supabase | 무료 500MB, 항시 가동 |
| 모니터링 | UptimeRobot | /health 5분 간격 핑 → cold start 원천 차단 |

**추가 대응:**
- 프론트 랜딩 페이지 로드 시 `useEffect`로 백엔드 `/health` warm-up 호출
- 데모 직전 warm-up 스크립트 실행 (제출물에 포함)

---

## 9. MVP 스코프 (v3 최종)

### P1 — 반드시 포함 (학생 채팅 품질에 올인)
- [x] 게스트 체험 모드 (5턴 + 전용 프롬프트)
- [x] 학생 소크라테스 대화 (수학/과학/논술) — **최고 품질**
- [x] SSE 스트리밍 AI 응답 (non-streaming fallback 보장)
- [x] Tool Use 1-tool + text 패턴
- [x] 턴별 사고 패턴 실시간 분석 (접힌 패널, 데모 시 열림)
- [x] 소크라테스 5단계 프로그레스 바
- [x] "힌트 더 받기" 버튼
- [x] 세션 종료 → 자동 리포트 (레이더 차트 + 성장 추이 + AI 내러티브)
- [x] 교강사 대시보드 (요약 카드 + 히트맵 + 세션 리플레이)
- [x] 데모 역할 전환 메커니즘
- [x] 랜딩 페이지 ChatGPT vs ThinkBridge 비교 섹션
- [x] Render cold start 방지
- [x] 토큰 효율성 추적
- [x] 모바일 반응형 (채팅 최소)
- [x] 운영자 대시보드 (시드 데이터 기반, "Demo Data" 배너 포함)

### P2 — Day 6 여유 시
- [ ] 학생 홈 최근 성과 요약 카드
- [ ] 세션 종료 축하 애니메이션 (canvas-confetti)
- [ ] 레이더 차트 실시간 애니메이션

### Nice-to-have (시간 매우 여유 시)
- [ ] 이미지 업로드 + Claude Vision
- [ ] 교육과정 성취기준 태깅

---

## 10. 데모 시나리오 (v3: 역할 전환 해결)

### 사전 세팅
- 게스트 체험 활성화
- 데모 계정: student@demo.com / instructor@demo.com / admin@demo.com (demo1234)
- **3개 브라우저 탭 사전 로그인** 또는 랜딩 원클릭 전환 버튼
- 8명 학생 x 5세션, 3개 반 시드 데이터
- **데모 직전 warm-up 스크립트 실행** (Render 인스턴스 깨우기)

### 시연 흐름 (3분)

**0:00-0:15 (문제 제기)**
- 랜딩 페이지 → "ChatGPT vs ThinkBridge" 비교 섹션 보여주기
- "일반 AI는 답을 줍니다. ThinkBridge는 생각하게 합니다."

**0:15-1:00 (게스트 체험)**
- "바로 체험하기" 클릭 → 즉시 대화 진입
- 질문 1개 입력 → AI 스트리밍 응답 (답 안 줌, 질문으로 유도)
- 사고 분석 패널 열기 → 실시간 점수 변화 확인

**1:00-1:45 (학생 리포트) — 탭 전환**
- 사전 로그인된 학생 탭 전환 (0초 소요)
- 완료된 세션 리포트: 레이더 차트 + 성장 추이 그래프
- "3회 사용 후 논리 구조화 점수 40% 향상" 데이터 확인

**1:45-2:40 (교강사 대시보드) — 탭 전환**
- 사전 로그인된 교강사 탭 전환 (0초 소요)
- 요약 카드 → 히트맵 → "비판적 사고 전체 취약" 패턴 발견
- 특정 학생 세션 리플레이 → 턴별 분석 확인

**2:40-3:00 (비전)**
- "ThinkBridge는 AI가 답을 대신하는 도구가 아니라, 생각하는 법을 가르치는 도구입니다."

---

## 11. AI 리포트 전략 (v3: 매일 기록)

### 서술 핵심 원칙
**"AI를 얼마나 잘 아는가"가 아니라 "AI를 통해 무엇을 해결했는가"**

### 매일 기록할 것 (Day 1부터 30분/일)
- 오늘 한 프롬프트 수정과 그 이유
- Tool Use 구현 중 만난 문제와 해결 방법
- Claude Code 활용 로그 (구체적 프롬프트와 결과)
- 토큰 사용량 데이터

### 5장 구조

**1장: AI 도구 & 모델 선택**
- Claude API 선택 이유 + 다른 모델 비교 테스트 결과

**2장: 프롬프트 아키텍처 & 진화**
- "문제→가설→실험→결과" 패턴으로 서술
- v1→v2→v3 diff + 각 수정 이유 + 정량적 개선
- Few-shot 설계 전략

**3장: AI 에이전트 아키텍처**
- Tool Use 1-tool + text 패턴 설명
- "왜 2-tool에서 1-tool로 변경했는가" 서사
- 3단계 fallback 설계
- 데이터 흐름 다이어그램

**4장: 토큰 효율성**
- 실측 데이터: 턴당 평균 토큰, 세션당 평균 토큰
- 히스토리 윈도우 전/후 비교
- 비용 추정: "학생 100명 기준 월 N원"

**5장: AI 코딩 도구 활용 (Claude Code)**
- 병렬 에이전트 개발 전략
- 프롬프트 디버깅 (Claude Code에게 학생 역할 시킨 사례)
- 정량적 기여: "AI 활용으로 개발 시간 N% 절감"

### 핵심 키워드
- AI 에이전트 아키텍처, 프롬프트 엔지니어링 이터레이션, AI-in-the-loop 개발, 토큰 경제성, 구조화 출력 보장, 적응형 AI

---

## 12. 시드 데이터 사양 (v3: 확대)

### 데모 계정
| 역할 | 이메일 | 비밀번호 |
|------|--------|---------|
| 학생 데모 | student@demo.com | demo1234 |
| 교강사 데모 | instructor@demo.com | demo1234 |
| 운영자 데모 | admin@demo.com | demo1234 |

### 시드 데이터 규모
- **반 3개**: 고등수학 1반, 물리학 기초반, 논술 심화반
- **학생 8명** (뚜렷한 패턴 차이):
  - 김민수: 창의성 높고 논리 약함
  - 이서연: 전반적 균형
  - 박지호: 소극적 참여 (engagement: passive)
  - 정하윤: 비판적 사고 강함
  - 최준서: 빠른 성장 패턴 (session 1: 낮음 → session 5: 높음)
  - 한소율: 문제 이해 강하지만 근거 제시 약함
  - 윤도현: 전체적으로 중간, 창의적 접근 시도
  - 강예은: 논리 구조화 매우 강함, 창의성 약함
- **학생당 5개 세션** + **8-10턴 완전한 대화** 3개 (수학/과학/논술)
- 자연스러운 점수 변화 패턴 (초반→중반→후반 성장)

---

## 13. 구현 로드맵 (v3 최종)

| 일차 | 작업 | 핵심 목표 |
|------|------|----------|
| Day 1 AM | 스캐폴딩, Supabase DB, 인증 + 게스트 5턴 | 기반 완성 |
| Day 1 PM | **배포 검증** + SSE dummy 엔드포인트 배포 테스트 | 인프라 확정 |
| Day 2 | AI Engine (Non-streaming Tool Use 먼저 완성) + 프롬프트 1차 | **핵심 AI 동작 확인** |
| Day 3 | **학생 채팅 UI + Streaming 추가** | **데모 핵심 완성** |
| Day 4 | 리포트 + 성장 추이 + 학생 페이지 완성 | 학생 경험 완성 |
| Day 5 | 교강사 대시보드 + 프롬프트 2차 튜닝 | 교강사 경험 완성 |
| Day 6 | 시드 데이터 + UI 폴리싱 + 모바일 + (P2: admin) + 전체 배포 | 완성도 향상 |
| Day 7 | AI 리포트 편집 + README 스크린샷 + 데모 리허설 + 제출 | 제출 |

**핵심: Day 3 끝까지 학생 채팅이 라이브 URL에서 동작해야 한다.**

---

## 14. 커밋 전략

- Conventional Commits (feat/fix/docs/chore/perf)
- 하루 5-10 커밋 균등 분포
- AI 관련 커밋 별도 강조: `feat(ai): implement Tool Use agent pattern`
- 프롬프트 변경 별도 커밋: `refine(prompt): add few-shot examples for math domain`
- **첫 커밋부터 의미 있게**: "feat: scaffold FastAPI + Next.js with Supabase integration"

---

## 15. README 요구사항 (v3 신규)

심사위원이 GitHub에서 첫 3초에 봐야 할 것:
1. **프로젝트 한줄 설명** + 라이브 URL (볼드)
2. **데모 계정 테이블** (학생/교강사/운영자)
3. **스크린샷 4장** (채팅, 레이더, 히트맵, 대시보드)
4. **기술 스택 뱃지** (Next.js, FastAPI, Claude API, Supabase)
5. 아키텍처 다이어그램
6. AI 활용 하이라이트 요약
