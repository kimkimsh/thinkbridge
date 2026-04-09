# ThinkBridge QA 테스트 및 버그 수정

> 190개 API 시나리오 + 프론트엔드 코드 분석 + 라이브 시스템 테스트

## 테스트 방법론

1. **자동화 API 테스트** (190개 시나리오) — backend/tests/test_api_scenarios.py
2. **프론트엔드 코드 분석** — 모든 소스 파일 정적 분석
3. **라이브 시스템 E2E** — curl 기반 프로덕션 엔드포인트 검증
4. **SSE 스트리밍 진단** — 실제 AI 응답 흐름 추적

---

## API 테스트 결과 (190개)

### 카테고리별 결과

| 카테고리 | 테스트 수 | 통과 | 실패 |
|----------|-----------|------|------|
| Auth (인증) | 29 | 29 | 0 |
| Sessions (세션) | 31 | 31 | 0 |
| Reports (리포트) | 18 | 18 | 0 |
| Dashboard (대시보드) | 27 | 27 | 0 |
| Admin (관리자) | 25 | 25 | 0 |
| SSE (스트리밍) | 8 | 8 | 0 |
| Edge Cases (엣지) | 31 | 30 | 1 |
| Guest Limit (게스트) | 5 | 5 | 0 |
| Health/Utility | 7 | 7 | 0 |
| Data Integrity | 9 | 9 | 0 |
| **합계** | **190** | **189** | **1** |

### 유일한 실패 (수정 완료)
- **테스트**: Very long topic -> accepted or rejected gracefully
- **증상**: 5000자 토픽 전송 시 HTTP 500 반환
- **원인**: mTopic 컬럼이 String(255)인데 길이 검증 없음
- **수정**: Pydantic 스키마에 max_length=255, 라우터에 방어적 검증 추가

---

## 프론트엔드 분석 결과

### 발견된 버그 (총 16개 -> 12개 수정)

#### Critical (2개 - 모두 수정)

| # | 파일 | 버그 | 수정 |
|---|------|------|------|
| 1 | lib/api.ts | SSE 파싱 실패: parseSSEBuffer가 LF만 처리하고 CRLF 미지원. AI 응답이 아예 표시 안 됨 | CRLF/CR/LF 모두 지원하는 regex로 교체 |
| 2 | student/sessions/page.tsx | 활성 세션 재진입 불가: 활성 세션 클릭 시 세션 ID 미전달 | sessionId 파라미터 전달 + chat 페이지에서 세션 복원 |

#### Important (4개 - 모두 수정)

| # | 파일 | 버그 | 수정 |
|---|------|------|------|
| 3 | ChatInterface.tsx | 스트리밍 메시지 중복 위험: state updater 내 side effect | useRef 패턴으로 전환 |
| 4 | instructor/dashboard | 에러 시 재시도 불가 | 다시 시도 버튼 추가 |
| 5 | admin/dashboard | 동일: 관리자 대시보드도 재시도 불가 | 다시 시도 버튼 추가 |
| 6 | instructor/replay | 빈 메시지 미처리 | 빈 상태 안내 메시지 추가 |

#### Minor (6개 - 모두 수정)

| # | 파일 | 버그 | 수정 |
|---|------|------|------|
| 7 | report/[id] | 단계 전환 횟수 1개 초과 카운트 | tPrevStage=-1로 변경 |
| 8 | MessageBubble | 영어 역할 라벨 | 나/AI 튜터로 변경 |
| 9 | report/[id] | 라우트 파라미터 NaN 미검증 | NaN 체크 + 리다이렉트 |
| 10 | replay/[sessionId] | 라우트 파라미터 NaN 미검증 | NaN 체크 + 리다이렉트 |
| 11 | schemas/session.py | 토픽 길이 미검증 (500 에러) | max_length=255 검증 추가 |
| 12 | schemas/message.py | 메시지 내용 미검증 | min_length=1, max_length=5000 |

---

## 수정 커밋 이력

| 커밋 | 내용 |
|------|------|
| 14a8382 | 프론트엔드 QA 분석 기반 버그 수정 (useRef 패턴, NaN 검증) |
| b9a5e5c | 백엔드 입력 검증 추가 (토픽 길이, 메시지 내용) |
| 3682121 | 190개 API 테스트 스위트 추가 |
| 08437a8 | SSE 파싱 CRLF 호환 수정 (채팅 핵심 버그) |
| bf08062 | 프론트엔드 UX 버그 수정 (세션 재진입, 재시도 버튼, 빈 상태) |

---

## SSE 스트리밍 진단 상세

### 문제
채팅에서 질문을 입력해도 AI 응답이 화면에 표시되지 않음.

### 진단 과정
1. curl로 백엔드 SSE 직접 호출 -> 정상 응답 확인
2. 응답 형식 분석: sse-starlette가 CRLF로 이벤트 구분
3. 프론트엔드 parseSSEBuffer 코드 분석 -> indexOf LF+LF 사용 발견
4. CRLF는 LF+LF를 포함하지 않음 -> 이벤트 경계 감지 실패

### 근본 원인
sse-starlette (Python 라이브러리)는 SSE 이벤트를 CRLF로 구분하여 전송.
프론트엔드의 parseSSEBuffer는 LF+LF만 이벤트 경계로 인식.
결과: 버퍼가 무한 축적되고 파싱된 이벤트는 0개.

### 수정
SSE 스펙에 따라 CRLF, CR+CR, LF+LF 세 가지 모두를 이벤트 경계로 처리하는 regex 적용.
라인 분리도 동일하게 모든 줄바꿈 형식 지원으로 변경.
