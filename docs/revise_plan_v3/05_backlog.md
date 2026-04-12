# Backlog — Post-Submission 기술 부채

> 오늘 밤 범위 밖. 제출 후 개선 대상으로 기록.
> 각 항목이 왜 defer되는지, 언제 다시 볼지 명시.

## B-1: 매핑 3단계 통일 (snake ↔ mPascal ↔ camel)

### 현재 상태
- AI 엔진 출력: snake_case (`problem_understanding`, `socratic_stage` 등)
- SQLAlchemy 모델: mPascalCase (`mProblemUnderstanding`, `mSocraticStage`)
- API 응답 / Frontend: camelCase (`problemUnderstanding`, `socraticStage`)

3단계 변환이 3곳에 open-coded:
- `backend/app/routers/sessions.py:82-92` (`ANALYSIS_FIELD_MAPPING`)
- `backend/app/routers/sessions.py:156-166` (`_mapAnalysisToModel`)
- `frontend/src/lib/api.ts:52-62` (`ANALYSIS_KEY_MAP`)

### 왜 Defer
- 수정 L 사이즈 (**50줄+**)
- 3곳 동기 수정 필요 + 테스트 커버리지 부족
- 현재 작동 중 (배포 확인)
- 공모전 기한에 리팩터 도중 실수 시 Iron Rule 위반

### 언제 다시 볼지
제출 후, Supabase 마이그레이션 도구 도입 시점에 동시 진행. 후보:
- 모든 레이어를 snake_case로 통일 (Pythonic + JSON 컨벤션)
- 또는 Pydantic `alias_generator`로 자동 camelCase 변환 도입

### Reference
`docs/revise_plan_v2/` 및 Agent 2 (code analysis) report — "매핑 3단계 변환" 섹션.

---

## B-2: Guest User DB Cleanup Job

### 현재 상태
Guest user가 생성되면 삭제되지 않음. 매 `POST /api/auth/guest` 호출마다:
- `User` 로우 1개
- `TutoringSession` 로우 1개 이상
- `Message`, `ThoughtAnalysis`, `TokenUsage` 여러 로우

### 영향
- 공모전 기간엔 문제 없음 (수십~수백 명)
- 장기 운영 시 DB bloat, 집계 쿼리 느려짐
- `/api/admin/stats`의 "총 학생 수"에 게스트 포함되어 왜곡

### 왜 Defer
- 기능 추가 성격 (cleanup job, cron 또는 `/api/admin/cleanup`)
- 공모전 심사 기간 동안에는 guest 누적이 오히려 "활동 증거"

### 제안 (Post-submission)

**Option A — Lazy cleanup**:
- `/api/auth/guest` 호출 시 `created_at > 7 days ago` 게스트 삭제 트리거 (cascade)

**Option B — Scheduled job**:
- Render cron job 또는 Supabase pg_cron
- 매일 새벽 3시: `DELETE FROM users WHERE is_guest = TRUE AND created_at < NOW() - INTERVAL '7 days'`

**Option C — Stats 쿼리만 수정**:
- `admin/stats`에서 `WHERE is_guest = FALSE` 필터만 추가 (cleanup 대신 숨김)

---

## B-3: JWT Refresh Token 도입

### 현재 상태
JWT 만료: 24시간. Refresh token 없음. 만료되면 재로그인.

### 왜 Defer
- 기능 추가 성격 명확
- 24시간 세션은 공모전 데모에 충분
- Refresh 구현은 로그인 플로우 전체 수정 필요

### 제안 (Post-submission)
- Access token: 1시간 (짧게)
- Refresh token: 30일 (localStorage 대신 httpOnly cookie)
- `/api/auth/refresh` 엔드포인트 추가

---

## B-4: `lazy="selectin"` 기본값 변경

### 현재 상태
모든 relationship에 `lazy="selectin"`:
- `User.mClassRooms`, `User.mEnrollments`, `User.mSessions`
- `TutoringSession.mMessages`, `Message.mThoughtAnalysis`
- `ClassRoom.mEnrollments` 등

### 문제
- `getCurrentUser` 한 번 호출에 불필요한 3-4개 추가 SELECT
- `NullPool`과 결합 시 connection 사용량 증가
- `/api/auth/login` 응답 한 번에 여러 서브쿼리

### 왜 Defer
- 모든 relationship의 lazy 기본값을 일괄 변경 = 리스크 큼
- 필요한 곳마다 `options(selectinload(...))` 추가 필요 (변경량 L)
- 현재 프로덕션 성능 허용 범위 내

### 언제 다시 볼지
사용자 수 증가 시. Render 대시보드에서 DB 커넥션 peak 확인 필요.

---

## B-5: Admin Stats SQL 집계로 전환

### 현재 상태
`backend/app/routers/admin.py:167-169` — 모든 `ThoughtAnalysis` 로우를 메모리에 로드 후 Python으로 평균 계산.

### 문제
- seed 87개는 문제 없음
- 실사용자 1000+ 세션 누적 시 느려짐 + 메모리 부담

### 왜 Defer
- 현재 데이터 규모로 문제 없음
- SQL aggregation (`AVG()`, `GROUP BY`) 수정은 쿼리 재작성 + 테스트

### 제안
```sql
-- 예시
SELECT
    AVG(m_problem_understanding) AS problem_understanding,
    AVG(m_premise_check) AS premise_check,
    -- ...
FROM thought_analysis
WHERE m_is_fallback = FALSE;  -- P1-3 적용 후
```

---

## B-6: Hint 버튼 별도 Endpoint (`POST /sessions/{id}/hint`)

### 현재 상태 (P2-6 참조)
Hint 요청이 user 메시지를 inflate + turn 소모.

### 왜 Defer
- 새 엔드포인트 추가 = 기능 추가
- 프론트 UI/UX 흐름 재설계 필요

### 제안 (Post-submission)
```
POST /api/sessions/{id}/hint
Response: { "hint": "추가 힌트 내용" }  (턴 소모 없음)
```

Claude에 별도 프롬프트:
```
사용자가 힌트를 요청했습니다. 현재 맥락에서 더 구체적인 힌트를 제공하되,
정답은 주지 말고 방향만 제시하세요.
```

---

## B-7: ChatInterface 상태 머신 리팩터

### 현재 상태
`frontend/src/components/chat/ChatInterface.tsx` 705라인, 9개 useState 플래그 혼재:
- `mIsStreaming`, `mIsEnding`, `mIsSessionEnded`
- `mErrorMessage`, `mStreamingText`, `mTurnCount`
- etc.

### 문제
- 불가능한 상태 조합 가능 (e.g., `isStreaming=true && isSessionEnded=true`)
- 버그 발생 가능성 높음

### 왜 Defer
- `useReducer` + state enum 전환은 많은 코드 수정
- 현재 E2E 통과 중
- D-day 내 리팩터는 Iron Rule 위반 가능성

### 제안 (Post-submission)
```typescript
type ChatState =
    | { kind: "idle" }
    | { kind: "streaming", partialText: string, turnNumber: number }
    | { kind: "ending" }
    | { kind: "ended", reportId: number }
    | { kind: "error", message: string };

const [state, dispatch] = useReducer(chatReducer, { kind: "idle" });
```

상태 전이 다이어그램 먼저 그리고 리팩터.

---

## B-8: SSE 이벤트 `\r\n\r\n` 지원 Constant

### 현재 상태
P0/P1 수정의 `SSE_STREAM_END_BOUNDARY = "\n\n"`. Agent 2 (SSE spec agent)는 `\r\n\r\n`도 지원하도록 constant 확장 제안했음.

### 왜 Defer
- 현재 `parseSSEBuffer` 내부 regex가 `/\r\n\r\n|\r\r|\n\n/` 포함하여 tolerated
- 새 boundary constant만 `\n\n`이지만 parser 단계에서 무관

### 제안
Document only — Agent 2 comment를 DOC-2 수정 시 inline 설명으로 포함.

---

## B-9: `/api/admin/stats` Guest 제외

### 현재 상태 (B-2와 관련)
`admin.py`가 `User.is_guest=True`도 학생 수에 포함.

### 왜 Defer
- B-2 (guest cleanup)와 함께 처리
- 공모전 심사엔 큰 수 자체가 어필

### 제안
```python
# admin/stats
tStudentCount = await db.execute(
    select(func.count(User.mId))
    .where(User.mRole == UserRole.STUDENT)
    .where(User.mIsGuest == False)  # 신규 필터
)
```

---

## B-10: Accessibility 전면 audit

### 현재 상태
- 채팅 Textarea에 `aria-label` 없음
- Keyboard navigation 일부 미지원
- Screen reader 지원 부족

### 왜 Defer
- WCAG AA 완전 준수는 큰 작업
- 공모전 심사 기준에 명시되지 않음

### 제안
Post-submission: `docs/runbooks/accessibility_audit.md` 작성 후 단계별 개선.

---

## B-11: `ChatInterface` & chart 컴포넌트 Bundle Size 최적화

### 현재 상태
Recharts는 큰 라이브러리. ChatInterface도 705라인. 번들 크기 측정 안 됨.

### 왜 Defer
- 측정 먼저 필요 (`@next/bundle-analyzer`)
- 공모전 데모에 큰 영향 없음

### 제안
Post-submission: bundle analyzer 실행 후 큰 chunk 식별 → code splitting 검토.

---

## Backlog 관리 원칙

- 본 문서는 **살아있는 TODO**. 제출 후에도 유지.
- 각 항목이 해결되면 checkmark + commit SHA 기록.
- 새 기술 부채 발견 시 본 문서에 추가.
- 분기별 (혹은 사용자 증가 트리거 시) backlog triage 권장.

## 우선순위 (Post-submission)

제출 직후 1주 내:
- B-1 (매핑 통일) — 가장 큰 구조 개선
- B-7 (ChatInterface 리팩터) — 향후 버그 감소

제출 후 1개월 내:
- B-2, B-9 (Guest cleanup & stats)
- B-3 (JWT refresh)

장기 관찰:
- B-4 (lazy selectin)
- B-5 (SQL aggregation)
- B-10, B-11 (a11y, bundle)
