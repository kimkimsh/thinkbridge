# 1-2. 문제를 해결하기 위한 솔루션의 핵심 기능은 무엇인가요?

## 솔루션 한 줄 정의

> **AI가 절대 정답을 제공하지 않고, 소크라테스식 질문법으로 학생의 사고를 유도하며, 그 과정을 실시간 6차원으로 분석·리포트화하는 1:1 튜터링 시스템.**

## 기능 설계 원칙 (Iron Rule)

> **"학생 채팅 1개 기능의 완벽함 > 기능 10개의 존재"**
> — `CLAUDE.md`에 명시된 원칙

이 원칙에 따라 기능을 **학생 경로 완성도에 집중**하고, 교강사·관리자·심사 체험을 보조 축으로 배치했다.

## 핵심 기능 맵

### A. 학생 경로 (최우선, Iron Rule 대상)

#### 1. 소크라테스 대화 엔진 (핵심 중의 핵심)
- **Claude API + Tool Use 1-tool + text 패턴**: 1회 API 호출로 "텍스트 응답 + 구조화 분석"을 동시에 획득
- **절대 정답 금지 원칙**을 시스템 프롬프트 4대 원칙 첫 줄에 명시
- **과목별 대응**: 수학 / 과학 / 논술 (각 과목별 few-shot 예시 내장)
- **5단계 소크라테스 진행**: 명확화 → 탐색 → 유도 → 검증 → 확장

#### 2. 실시간 6차원 사고력 분석 (Bloom's Revised Taxonomy 기반)

| 차원 | Bloom 대응 | 의미 |
|------|-----------|------|
| 문제 이해 | Understand | 문제 범위·제약 파악 |
| 전제 확인 | Remember/Understand | 주어진 조건 검증 |
| 논리 구조화 | Analyze | 체계적 추론 |
| 근거 제시 | Apply | 구체 예시·증명 |
| 비판적 사고 | Evaluate | 가정 도전 |
| 창의적 사고 | Create | 새로운 접근 |

- 각 차원 0~10점을 학생 응답 **매 턴마다** 실시간 산출
- DB 레벨 `CheckConstraint`로 범위 강제 (도메인 무결성)
- `ThoughtPanel`에 막대그래프로 즉시 시각화

#### 3. SSE 실시간 스트리밍
- `fetch` + `ReadableStream` 기반 (POST 지원 위해 EventSource 배제 — v3에서 확정)
- **Character-by-character 타이핑 효과**
- **3단계 fallback 체인**: tool 미호출 → JSON 파싱 실패 → 스트림 실패 각 경우 처리
- CRLF/LF 이벤트 경계 regex로 모든 변종 처리 (`\r\n\r\n | \r\r | \n\n`)

#### 4. 게스트 5턴 체험 (회원가입 장벽 제거)
- 별도 **게스트 전용 압축 프롬프트** (5턴 안에 "aha moment" 유도)
- DB 레벨 **CAS(Compare-And-Swap) 패턴**으로 동시성 보장
- AI 실패 시 턴 자동 환불 (정당한 체험 보장)

#### 5. 힌트 더 받기 + Stuck 자동 감지
- 직전 2턴의 `engagement_level == "stuck"` 감지 시 시스템 프롬프트에 **더 구체적 힌트 지시** 자동 주입
- 여전히 **정답은 주지 않음** (원칙 유지)

#### 6. 세션 종료 → 자동 리포트
- 6차원 레이더 차트 (세션별 vs 학생 평균 overlay)
- 성장 추이 그래프 (최근 N 세션의 시계열)
- AI 생성 한국어 내러티브: "N번의 사고 전환을 거쳐 스스로 답에 도달했습니다"

### B. 교강사 경로

#### 7. 교강사 대시보드
- 반 요약 카드 4종 (총 학생·평균 세션·활성률·평균 사고력)
- **사고력 히트맵**: 학생 × 6차원 색상 매트릭스 (빨강=낮음, 녹색=높음)
- AI 자동 생성 인사이트 텍스트: "전체 학생의 N%가 비판적 사고에서 4점 이하"
- 학생 클릭 → **세션 Replay**(좌측 메시지, 우측 턴별 분석)

### C. 관리자 경로

#### 8. 관리자 대시보드
- 학원 전체 현황 4종 카드
- 반별 사고력 비교 (BarChart, 3개 반 × 6차원)
- 과목별 레이더 (수학·과학·논술 overlay)
- "Demo Data" 배너 (실제 운영 시 전체 학원 데이터 표시)

### D. 심사 체험 최적화

#### 9. One-Click Demo Role Switcher
- 랜딩에서 학생/교강사/관리자 중 선택 → 자동 로그인 → 해당 대시보드
- **3분 데모 내에 3역할 모두 체험** 가능하도록 한 필수 UX 장치

#### 10. 온보딩 튜토리얼 오버레이 (자체 구현)
- 페이지별 첫 방문 시 가이드 투어 (SVG mask + React portal)
- 제3자 라이브러리 미사용 (React Context 자체 구현) → Tailwind 완전 제어 + SSR 안전성 확보

## 데이터 흐름 (한 턴 단위)

```
[학생 입력]
    ↓
[POST /api/sessions/{id}/messages] (SSE 엔드포인트)
    ↓
[Claude API: Tool Use 1-tool + text 단일 호출]
    ├─ text block → SSE "token" 이벤트 × N → ChatInterface 타이핑 효과
    └─ tool_use block → (content_block_stop까지 JSON buffer) 
                      → SSE "analysis" 이벤트 1회 
                      → ThoughtPanel 막대 갱신 + ProgressBar 단계 갱신
    ↓
[DB: Message + ThoughtAnalysis + TokenUsage 저장]
    ↓
[세션 종료 시: report_generator → Report 테이블 → 리포트 페이지]
    ↓
[교강사/관리자 대시보드 집계 뷰]
```

## 각 기능이 각 사용자 문제에 매칭되는 방식

| 사용자 문제 | 대응 기능 |
|-----------|----------|
| 학생 "사고 스킵" | 1 (소크라테스 엔진) + 2 (6차원 실시간) + 5 (Stuck 감지) |
| 학생 진입 장벽 | 4 (게스트 5턴) + 9 (Demo 전환) |
| 교강사 "블라인드 지도" | 7 (히트맵 + Replay) |
| 학원 "차별화 증명" | 6 (성장 추이) + 8 (관리자 대시보드) |
| 심사위원 "빠른 이해" | 9 (원클릭) + 10 (튜토리얼) + 4 (Guest) |

## 근거 위치

- `backend/app/core/prompts.py` → 5단계 소크라테스 진행 프롬프트 본문
- `backend/app/services/ai_engine.py` → Tool Use 구현, 3단계 fallback
- `backend/app/routers/sessions.py` → SSE 엔드포인트, Stuck 감지, Guest CAS 패턴
- `frontend/src/components/chat/ChatInterface.tsx` → 학생 UI 중심 컴포넌트
- `frontend/src/components/charts/` → 레이더·히트맵·성장 추이 차트
- `docs/work_log/16_tutorial_overlay_core.md`, `17_tutorial_overlay_integration.md` → 튜토리얼 구현 기록
