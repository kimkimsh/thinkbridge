# AI 응답 미표시 + 주제 표시 수정

> 날짜: 2026-04-09

## 증상
- 채팅에서 질문을 보내면 AI 응답이 표시되지 않음
- 채팅 화면에 현재 대화 주제가 보이지 않음

## 진단 과정

### 1단계: SSE 파싱 확인
- curl로 백엔드 SSE 직접 호출 -> 정상 응답 반환
- CRLF 파싱 수정 코드가 Vercel 빌드에 반영됨 확인
- Node.js로 parseSSEBuffer 시뮬레이션 -> 3개 이벤트 정상 파싱

### 2단계: AI 응답 내용 분석
- Claude가 **text block 없이 tool_use만 호출**하고 끝남
- 결과: `FALLBACK_RESPONSE_TEXT` ("좋은 질문이에요! 조금 더 생각해볼까요?")만 반환
- 폴백 텍스트가 단일 token 이벤트로 전송됨

### 3단계: 프론트엔드 확인
- `streamMessages` 파싱 로직 정상
- `ChatInterface` 이벤트 처리 로직 정상
- 문제는 **AI가 text를 생성하지 않는 것**이 근본 원인

## 근본 원인

Claude API에서 `tool_choice: auto`로 호출 시, 모델이 tool_use 블록만 생성하고 text 블록을 생략하는 경우가 있음. 프롬프트에서 "텍스트와 도구를 동시에 제공하라"는 명시적 지시가 없었음.

## 수정 내용

### 1. 프롬프트 강화 (backend/app/core/prompts.py)
- SOCRATIC_SYSTEM_PROMPT와 GUEST_SOCRATIC_PROMPT 모두에 제4원칙 추가:
  "반드시 텍스트 응답과 도구 호출을 동시에 제공하세요. 도구만 호출하고 텍스트를 생략하지 마세요."

### 2. Non-streaming 재시도 (backend/app/services/ai_engine.py)
- 스트리밍 응답에 text block이 없으면, non-streaming으로 재시도하여 실제 소크라테스 질문을 획득
- 재시도도 실패하면 FALLBACK_RESPONSE_TEXT 사용

### 3. 주제 표시 (frontend)
- ChatInterface에 `topic` prop 추가
- chat/page.tsx에서 `mTopicInput`을 ChatInterface에 전달
- ProgressBar 위 헤더에 과목 배지 옆에 주제 텍스트 표시

## 영향 파일
- backend/app/core/prompts.py
- backend/app/services/ai_engine.py
- frontend/src/components/chat/ChatInterface.tsx
- frontend/src/app/student/chat/page.tsx

## 커밋
- a485683: fix: resolve AI text-only-tool-use bug and add topic display
