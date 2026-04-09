# ThinkBridge 아키텍처 및 주요 설계 결정

## 시스템 아키텍처

```
[Browser]
    |
    | HTTPS
    v
[Vercel: Next.js 14 Frontend]
    |
    | REST API + SSE (fetch ReadableStream, POST method)
    v
[Render: FastAPI Backend]  <--- UptimeRobot 5min ping
    |
    +--- [Claude API: Tool Use]     1-tool + text 패턴
    |        text block      --> 소크라테스식 유도 질문 (실시간 스트리밍)
    |        tool_use block  --> 6차원 사고 분석 JSON (완료 시 파싱)
    |
    +--- [Supabase PostgreSQL]      8 tables, Session Mode Pooler
```

---

## 핵심 설계 결정

### 1. AI 호출 패턴: 1-Tool + Text

**결정**: 1회 Claude API 호출로 응답(text) + 분석(tool_use)을 동시에 획득

**대안 고려**:
- 2회 순차 호출 (v1): 응답 먼저, 분석 별도 → 느림, 비용 2배
- 2-tool 패턴 (v2): respond + analyze 두 도구 → 복잡, 스트리밍 어려움

**선택 이유**:
- 1회 호출 = 비용 절반 + 응답 속도 향상
- text block은 실시간 스트리밍 가능
- tool_use block은 완료 시점에 파싱 → 프론트엔드 분석 패널 업데이트
- 가장 단순한 구조

### 2. SSE 스트리밍: fetch + ReadableStream

**결정**: EventSource 대신 fetch + ReadableStream 사용

**이유**:
- EventSource는 GET만 지원 → 메시지 전송에 POST 필요
- fetch ReadableStream은 POST + 커스텀 헤더 + JWT 인증 지원
- 수동 SSE 파싱 필요하지만 제어력이 높음

**주의점**: SSE 라인 엔딩이 CRLF/LF/CR 모두 가능 → 모든 형식 지원 필수

### 3. 6차원 사고 분석 프레임워크

**결정**: Bloom의 개정판 분류체계 기반 6차원

| 차원 | Bloom 단계 | 측정 내용 |
|------|-----------|----------|
| 문제 이해 | Understand | 핵심 파악 |
| 전제 확인 | Remember | 조건 검토 |
| 논리 구조화 | Analyze | 체계적 사고 |
| 근거 제시 | Apply | 주장 뒷받침 |
| 비판적 사고 | Evaluate | 가정 의심 |
| 창의적 사고 | Create | 독창적 접근 |

**이유**: 교육학적 근거 + 시각화 적합성 (레이더 차트 6축)

### 4. 게스트 모드: 5턴 체험

**결정**: 회원가입 없이 5턴 무료 체험

**설계**:
- Guest 전용 프롬프트 (압축된 5단계: 1→2→3 빠르게 진행)
- UUID 기반 자동 이메일 생성 (guest_xxxx@thinkbridge.ai)
- 5턴 제한 후 "가입하세요" CTA
- 심사위원이 30초 안에 핵심 가치를 느끼도록 최적화

### 5. 프로그래매틱 리포트 생성

**결정**: Claude API 호출 없이 프로그래밍으로 한국어 서사 생성

**이유**:
- 속도: 추가 API 호출 없음 (비용/시간 절약)
- 안정성: AI 호출 실패 시에도 리포트 생성 보장
- 결정론적: 같은 데이터 → 같은 리포트 (디버깅 용이)
- 추후 Claude 기반 서사 추가 가능 (레이어드 아키텍처)

### 6. 필드명 3중 매핑

**매핑 체인**: AI Engine (snake_case) → DB Model (mPascalCase) → API Response (camelCase)

| 레이어 | 예시 | 이유 |
|--------|------|------|
| AI Engine | problem_understanding | Claude Tool Use 출력 형식 |
| DB Model | mProblemUnderstanding | CLAUDE.md 코딩 컨벤션 (멤버 변수) |
| API Response | problemUnderstanding | 프론트엔드 JavaScript 컨벤션 |

**구현**: 각 라우터에 명시적 매핑 헬퍼 함수 (자동 매핑보다 디버깅 용이)

### 7. Supabase Session Mode Pooler

**결정**: Direct connection도 Transaction mode pooler도 아닌, Session mode pooler 사용

**이유**:
- Direct: Supabase가 IPv6 전용 → Render Free tier 접근 불가
- Transaction mode: pgbouncer가 prepared statement 미지원 → asyncpg 충돌
- Session mode: prepared statement 지원 + IPv4 접근 가능 (pooler 경유)

### 8. NullPool (앱 측 풀링 비활성화)

**결정**: SQLAlchemy의 connection pool 대신 NullPool 사용

**이유**: pgbouncer가 이미 connection pooling을 담당. 앱 측에서 추가 풀링하면 "pool of pools" 문제 발생. NullPool은 매 요청마다 새 연결을 생성하고 pgbouncer가 실제 풀링을 관리.

---

## 데이터 모델 (8 Tables)

```
User (1) --- (*) TutoringSession (1) --- (*) Message (1) --- (0..1) ThoughtAnalysis
  |                    |
  |                    +--- (0..1) Report
  |                    +--- (*) TokenUsage
  |
  +--- (*) ClassRoom (via Enrollment)
```

---

## API 설계 (16 Endpoints)

| 그룹 | Method | Path | 설명 |
|------|--------|------|------|
| Auth | POST | /api/auth/register | 회원가입 |
| Auth | POST | /api/auth/login | 로그인 |
| Auth | POST | /api/auth/guest | 게스트 체험 |
| Sessions | POST | /api/sessions | 세션 생성 |
| Sessions | GET | /api/sessions | 세션 목록 |
| Sessions | GET | /api/sessions/{id} | 세션 상세 |
| Sessions | POST | /api/sessions/{id}/messages | SSE 메시지 전송 |
| Sessions | PATCH | /api/sessions/{id}/end | 세션 종료 |
| Reports | GET | /api/reports/session/{id} | 세션 리포트 |
| Reports | GET | /api/students/{id}/growth | 성장 추이 |
| Dashboard | GET | /api/dashboard/classes | 강사 반 목록 |
| Dashboard | GET | /api/dashboard/classes/{id}/students | 반 학생 목록 |
| Dashboard | GET | /api/dashboard/classes/{id}/heatmap | 사고력 히트맵 |
| Admin | GET | /api/admin/stats | 전체 통계 |
| Admin | GET | /api/admin/classes | 반별 비교 |
| Admin | GET | /api/admin/subjects | 과목별 비교 |
