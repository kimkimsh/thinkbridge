# 실행 순서 & 타임라인

> 밤샘 안정화 작업용. 시간 예산 기반 우선순위.
> 각 phase는 독립 검증 가능하며 중단해도 상태 일관성 유지.

## Time Budget (검증 정정 — 2026-04-12)

- **총 예상 시간**: **9-12시간** (원안 6-10h는 실측 대비 낙관. 오늘 오후 Fix #3+#5+CAS 재작업 실측 ~4h 기반 조정)
- **Commit 수**: ~12-15개 (**LIFO 순서 revert 가능** — 같은 파일 stacked commit은 개별 중간 revert 시 conflict 주의)
- **검증 지점**: 4개 (phase 경계마다 `test_guest_race.py` + E2E)
- **Subagent overhead**: per-task ~15-20분 (implementer + spec + quality review) — phase 예산에 반영됨

## Phase 구성 (재조정)

```
Phase 0 (준비):       ~20분
Phase 1 (P0 Critical): ~3시간  — 원안 2h, 실측 대비 낙관이었음. P0-2 downstream 영향 검토 버퍼 포함
Phase 2 (P1 High):     ~3.5시간 — 병렬 레인 활용 시 절감. subagent overhead 반영
Phase 3 (P2 선별):     ~2시간  — P2-2의 프론트 retry 로직 연동 시간
Phase 4 (Docs drift):  ~1시간  — 문서만
Phase 5 (검증·배포):    ~1.5시간 — 프로덕션 verify 재시도 버퍼 (오늘 CAS rework 사례)
Phase 6 (Work log):    ~30분
─────────────────────
합계:                  ~11시간 40분
```

---

## Phase 0: 준비 (20분)

### 0.1 작업 환경 확인
```bash
cd /home/mark-minipc/workspace/thinkbridge
git status --short           # 클린 확인
git log --oneline -5         # HEAD 확인 (43065ff 예상)
./backend/.venv/bin/python --version
node --version
```

### 0.2 Smoke test (현 상태)
```bash
# 현 프로덕션 정상 여부
curl -s https://thinkbridge-api.onrender.com/health
curl -s -o /dev/null -w "HTTP=%{http_code}" https://frontend-manhyeon.vercel.app/
./backend/.venv/bin/python backend/tests/test_guest_race.py  # baseline PASS 기대
```

### 0.3 작업 브랜치 (선택)
```bash
# 안전하게 작업 브랜치 생성 (optional)
git checkout -b hardening/v3-plan
# 또는 main 직접 (플랜에 따라 결정)
```

---

## Phase 1: P0 Critical (2시간)

### 순서 중요도

P0-1 (anthropic 529)이 가장 영향력 크고 스코프 명확 → **먼저**
P0-3 (apiRequest empty body)이 가장 단순 → 병행 가능
P0-2 (save divergence)이 가장 조심스러움 → **마지막**

### 1.1 P0-1: anthropic.OverloadedError Fix (30분)

**파일**: `backend/app/services/ai_engine.py`

작업:
1. `OVERLOAD_STATUS_CODE = 529`, `RATE_LIMIT_STATUS_CODE = 429` 상수 추가
2. `except anthropic.OverloadedError` → `except anthropic.APIStatusError` 분기 교체
3. `RateLimitError`도 동일 retry loop에 포함 (P1-의 일부로 묶어)
4. Logger에 `logger.warning("Claude overload, retry %d/%d, waiting %ds", ...)` 추가

Commit: `fix(ai): handle Anthropic 529 overload via APIStatusError status code`

검증:
- Mock fixture: `anthropic.APIStatusError(message="Overloaded", response=..., body=None)` 주입
- Backend 재시작 후 `/api/auth/guest` → 세션 생성 정상 확인

### 1.2 P0-3: apiRequest Empty Body Defense (20분)

**파일**: `frontend/src/lib/api.ts`

작업:
1. `apiRequest` 내부에서 `response.text()`로 일단 읽고 비어있으면 throw
2. 에러 응답 파싱도 try/catch로 감싸 HTML 응답 처리
3. 새 상수 `API_EMPTY_BODY = "서버 응답이 비어있습니다"`

Commit: `fix(api): defensively handle empty/non-JSON response bodies`

검증:
- DevTools로 `/api/sessions/{id}/end` 응답 override → 에러 메시지 표시되는지
- 정상 flow 영향 없는지 (`npm run build` PASS)

### 1.3 P0-2: _saveAiResponseToDb Error Surfacing (50분)

**파일**: `backend/app/routers/sessions.py`

작업:
1. `_saveAiResponseToDb`의 `except Exception` → `logger.exception` + re-raise
2. `generateSseEvents`에서 save 실패 catch 후 error 이벤트 yield
3. `anthropic` 에러 구체 메시지 포함
4. Phase 2의 P1-1 compensation logic도 같은 파일이니 검토만 하고 해당 phase에서 구현

Commit: `fix(sessions): surface DB save failures to client after stream completion`

검증:
- Supabase 임시 rule로 INSERT 차단
- Race test 재실행 → 여전히 5×200 + 1×403 확인 (정상 경로 미영향)

### 1.4 Phase 1 검증 게이트
```bash
./backend/.venv/bin/python backend/tests/test_guest_race.py  # PASS 기대
node e2e-student-test.js 2>&1 | tail -10  # 24/24 PASS 기대
```
실패 시 Phase 2로 진행하지 말고 디버그.

---

## Phase 2: P1 High Priority (3시간)

### 2.1 P1-2: AbortController (30분)

**파일**: `frontend/src/lib/api.ts`, `frontend/src/components/chat/ChatInterface.tsx`

작업:
1. `streamMessages`에 optional `signal` 파라미터 추가
2. ChatInterface에 `mAbortRef = useRef<AbortController>` 추가
3. `handleSend`에서 새 Controller + signal 전달
4. Cleanup useEffect에서 `abort()`

Commit: `fix(chat): abort SSE stream on component unmount or new message send`

검증:
- DevTools Network 탭에서 메시지 전송 도중 페이지 이동 → request cancelled 확인

### 2.2 P1-5 + P1-6: Exception Handling Refinement (30분)

**파일**: `backend/app/services/ai_engine.py`, `backend/app/routers/sessions.py`

작업:
1. `processTurn` catch-all + `raise tLastError=None` 방어 추가
2. `generateSseEvents`의 `except Exception` → `logger.exception` + `asyncio.CancelledError` 분리
3. 에러 코드 태그 추가 (`AI_API_ERROR`, `STREAM_UNEXPECTED`)

Commit: `fix(streaming): propagate asyncio.CancelledError and preserve error types`

검증:
- Mock으로 CancelledError 주입 → re-raise 확인
- Logger output에 stacktrace 등장 확인

### 2.3 P1-4: Streaming Retry Fallback → Error Event (20분)

**파일**: `backend/app/services/ai_engine.py`

작업:
1. `FALLBACK_RESPONSE_TEXT` yield 제거
2. retry 실패 시 `event: error` yield + return
3. 프론트 에러 처리 확인 (이미 대응 중)

Commit: `fix(ai): surface empty-response failures as error events instead of canned text`

검증:
- Mock으로 tool-only 응답 주입 → 재시도 실패 주입 → error 이벤트 확인
- 프론트 toast 표시 확인

### 2.4 P1-7: parseSSEBuffer Silent Drop Fix (20분)

**파일**: `frontend/src/lib/api.ts`

작업:
1. JSON.parse catch에 `console.warn` + 데이터 preview 로깅
2. 누적 실패 카운터 + 임계치 (`SSE_PARSE_FAILURE_THRESHOLD = 3`) 초과 시 synthetic error event

Commit: `fix(api): log SSE parse failures and escalate after threshold`

검증:
- 손상된 SSE payload mock → console.warn 출력 확인
- 3회 연속 실패 → UI에 에러 toast 등장 확인

### 2.5 P1-8: Guest/Demo Login 에러 Visibility (30분)

**파일**: `frontend/src/app/page.tsx`, `frontend/src/app/login/page.tsx`

작업:
1. `handleGuestTrial` 및 `handleDemoLogin` catch에 setError 추가
2. Sonner toast 또는 인라인 error banner 표시
3. `useState<string | null>(null)` 에러 state

Commit: `fix(landing): surface guest/demo login failures to user`

검증:
- Backend 임시 down → 버튼 클릭 → 에러 메시지 확인

### 2.6 P1-1: Guest Turn Compensation (40분)

**파일**: `backend/app/routers/sessions.py`

작업:
1. `generateSseEvents`에서 `tHasError AND not tCollectedText AND isGuest` 조건
2. 별도 세션으로 `UPDATE mTotalTurns - 1 WHERE mTotalTurns > 0`
3. Orphan user message 표시 변경 (삭제 대신 `[시스템 오류...]` 로 교체, 대안 검토)

Commit: `fix(sessions): compensate guest turn counter on AI response failure`

검증:
- Mock으로 AI 응답 실패 주입 → 게스트 세션 turn count 감소 확인
- 다음 요청 가능 확인

### 2.7 P1-3: DEFAULT_ANALYSIS Fallback Flag (60분, 선택)

**⚠️ 이 항목은 스키마 변경 포함 — 가장 큰 변경량. 시간 부족 시 Phase 3 이후로 미루거나 skip.**

작업:
1. `ThoughtAnalysis` 모델에 `mIsFallback: bool`, `mFallbackReason: str | None` 추가
2. Supabase SQL Editor에서 `ALTER TABLE thought_analysis ADD COLUMN m_is_fallback BOOLEAN DEFAULT FALSE;` 실행
3. `_saveAiResponseToDb`에서 분기 처리
4. 리포트/대시보드 쿼리에서 `.where(m_is_fallback == False)` 필터
5. 관리자 UI에 "fallback 비율" 배지 (선택)

Commit: `feat(analysis): mark fallback analysis rows + exclude from aggregates`
(feat 동사는 예외 — 스키마 변경 포함되므로)

**이 phase는 별도 커밋 시퀀스 + rollback 계획 필수**:
1. 스키마 먼저 (backward compatible: default False)
2. 모델 수정 + save 로직
3. 집계 필터

### 2.8 Phase 2 검증 게이트
```bash
./backend/.venv/bin/python backend/tests/test_guest_race.py  # PASS
node e2e-student-test.js 2>&1 | tail -10  # 24/24 PASS
```
실패 시 Phase 3 진행 금지.

---

## Phase 3: P2 선별 구조 개선 (1.5시간)

### 3.1 P2-3: socraticStage 방어 (15분)

**파일**: `frontend/src/lib/constants.ts`, `ThoughtPanel.tsx`, `ChatInterface.tsx`, `ThoughtTimeline.tsx`

작업:
1. `clampSocraticStage()` 헬퍼 추가
2. 모든 사용처에서 clamp 적용

Commit: `fix(ui): clamp socraticStage to valid range for label lookup`

### 3.2 P2-4: global-error.tsx 생성 (20분)

**파일**: `frontend/src/app/global-error.tsx` (신규)

작업:
1. 기존 `error.tsx` 기반으로 `<html><body>` 래퍼 추가
2. 기존 `error.tsx`는 유지 (segment-level)

Commit: `fix(ui): add global-error boundary for root-level failures`

### 3.3 P2-5: Suspense Boundary (20분)

**파일**: `frontend/src/app/student/chat/page.tsx`

작업:
1. 내부 컴포넌트로 분리 + `<Suspense>` 래핑
2. Fallback skeleton 기존 컴포넌트 재사용

Commit: `fix(ui): wrap useSearchParams client in Suspense boundary`

### 3.4 P2-1: Message Unique Check (15분)

**파일**: `backend/app/routers/sessions.py` (`_saveAiResponseToDb`)

작업:
1. INSERT 전 SELECT로 existing assistant message 확인
2. 존재하면 warning log + skip

Commit: `fix(sessions): prevent duplicate assistant message on retry`

### 3.5 P2-2: getSessionReport Race-Safe (20분)

**파일**: `backend/app/routers/reports.py`

작업:
1. Auto-create 로직 제거 또는 try/except IntegrityError + re-SELECT
2. 프론트에 retry 로직 추가 (`report/[id]/page.tsx`)

Commit: `fix(reports): make session report lookup race-safe`

### 3.6 Phase 3 검증 게이트
```bash
npm run build  # frontend TypeScript strict 확인
./backend/.venv/bin/python backend/tests/test_guest_race.py
node e2e-student-test.js 2>&1 | tail -10
```

---

## Phase 4: Docs Drift (1시간)

각 DOC-N은 독립 commit. 병렬 없이 순차로 빠르게 진행.

### 4.1 DOC-2: frontend CLAUDE.md parseSSEBuffer 교체 (10분)
Commit: `docs(frontend): update parseSSEBuffer example to match CRLF-safe impl`

### 4.2 DOC-4: SSEEvent error variant (5분)
Commit: `docs(frontend): add error variant to SSEEvent type definition`

### 4.3 DOC-7: Session mode invariant (10분)
- `backend/CLAUDE.md` + `database.py` 주석 추가
Commit: `docs(backend): document Supabase Session mode port 5432 invariant`

### 4.4 DOC-1: Admin P1/P2 drift (5분)
Commit: `docs: reconcile Admin priority inconsistency in revise_plan_v2`

### 4.5 DOC-3: CAS supersedes spec (5분)
Commit: `docs(spec): mark FOR UPDATE section superseded by CAS implementation`

### 4.6 DOC-5: /me endpoint 제거 (5분)
Commit: `docs: remove unimplemented GET /api/auth/me references`

### 4.7 DOC-6: Stuck detection docs (5분)
Commit: `docs(backend): correct stuck detection behavior description`

### 4.8 DOC-8 + DOC-9 (10분, 묶음)
- prompts.py docstring + processTurn 주석
Commit: `docs(backend): add prompt version history + mark processTurn non-prod path`

### 4.9 Phase 4 검증
문서만 수정이라 코드 검증 불필요. `git log --oneline` 로 commit 확인.

---

## Phase 5: 종합 검증·배포 (1시간)

### 5.1 로컬 종합 빌드
```bash
cd frontend && npm run build 2>&1 | tail -20
cd ../backend && ./.venv/bin/python -m py_compile app/main.py
```

### 5.2 Git 상태 확인
```bash
git log origin/main..HEAD --oneline   # 10-15 커밋 예상
git status --short                     # clean
```

### 5.3 Push + 배포 모니터링
```bash
git push origin main
# Render: 60-90s 뒤 health check
sleep 90
curl -s https://thinkbridge-api.onrender.com/health
```

### 5.4 프로덕션 종합 검증
```bash
# Race test (P0-2 confirm)
./backend/.venv/bin/python backend/tests/test_guest_race.py
# E2E regression (P0-1 ~ P2 전반)
node e2e-student-test.js 2>&1 | tee /tmp/final-e2e.log | tail -40
# Manual chat smoke test (SSE 경로 확인)
# - 브라우저로 `/student/chat` 접속
# - 메시지 전송 → streaming + analysis + done 정상
# - AbortController 테스트: 스트리밍 중 뒤로가기 → Network 탭에서 cancelled 확인
```

### 5.5 AI 리포트 수집
각 phase별로:
- 변경된 파일 개수
- 수정된 이슈 개수
- 예상 영향 (positive)
- rollback 히스토리

### 5.6 Phase 5 Go/No-Go 결정
모든 검증 PASS → Phase 6으로.
Regression 발생 → 원인 특정 + rollback (git revert) → 다시 검증.

---

## Phase 6: Work Log 작성 (30분)

**파일**: `docs/work_log/10_v3_stability_hardening.md`

내용:
- Phase 0-5 요약
- 각 P0/P1/P2 수정의 before/after 증거
- 반영한 Agent 피드백 (4팀 findings 중 몇 개 반영)
- Defer된 항목 (backlog.md 링크)
- 운영 영향 (Render/Vercel/Supabase)
- 사용한 commit SHA 목록

Commit: `docs(work_log): add v3 stability hardening session log`

---

## Rollback 전략

각 phase별 rollback point:

| Phase | Revert 대상 | 명령어 |
|-------|-----------|--------|
| P0 (3 커밋) | 최신 3개 | `git revert HEAD~3..HEAD` (**검증 정정: `HEAD~2..HEAD`는 2개만 포함**) |
| P1 (~7 커밋) | 최신 ~7개 | `git revert <P1 시작>..<P1 끝>` |
| P2 (~5 커밋) | 최신 ~5개 | `git revert <P2 시작>..<P2 끝>` |
| Docs (~8 커밋) | 문서만이라 revert 간단 | 개별 revert |

**주의 1**: P1-3 (fallback flag)은 DB 스키마 변경 포함이라 단순 revert로는 부족. Supabase에서 `ALTER TABLE ... DROP COLUMN` 별도 필요. → 이 항목은 **Phase 2B로 격리** 권장 (아래 병렬 레인 참조).

**주의 2 (검증 정정)**: "각 commit 독립 revert 가능"은 **오도** — 같은 파일을 여러 commit이 수정하는 경우 conflict 가능. 실제 의미는 **"LIFO 순서 revert 가능"**:
```
ai_engine.py: P0-1, P1-4, P1-5 (3 commits stacked)
sessions.py:  P0-2, P1-1, P1-6, P2-1, P2-2 (5 commits stacked)
api.ts:       P0-3, P1-2, P1-7 (3 commits stacked)
```
중간 commit만 개별 revert하면 conflict 가능 — 이 경우 manual merge 또는 LIFO 전체 revert.

## 긴급 중단 지점 (검증 정정)

다음 조건이 **2회 연속 재현** 되면 즉시 중단 + rollback (WAN flake / cold start 일시적 이슈 방어):
- `test_guest_race.py` FAIL (race 재발) — **2회 연속만 신뢰**
- E2E 24/24 → 22/24 이하 regression — 2회 연속
- Production `/health` 타임아웃 — 2회 연속 (cold start 제외)
- 프론트 build 실패 — 1회로 충분 (deterministic)

**오탐 사례** (오늘 work_log/09에 기록):
- 한국↔Supabase WAN 지연으로 `MESSAGE_TIMEOUT_SECONDS=90` 초과 → 500 → "FAIL"로 오분류
- Render cold start 후 첫 POST가 여전히 cold path 해소 중

**비용 관리**: `test_guest_race.py`는 실행당 Claude API 최소 6회 호출. Phase 1/2/3/5 경계 각 1회 × 4 phases = 24 API 호출/세션. Phase 재실행 시 6회 추가.

## 의존성 지도 (검증 정정 — 누락 의존성 반영)

```
P0-1 (anthropic 529) ──┐
P0-3 (apiRequest)      ├── Phase 1 완료
P0-2 (save failure) ────┘
                        │
                        ▼
P1-1 (guest compensation) ← depends on P0-2
P1-1                      ← depends on P1-3 [NEW: compensation 판단 기준 = fallback flag 존재?]
P1-4 (streaming retry)    ← depends on P0-1
P1-4                      ← depends on P1-3 [NEW: retry 성공 저장 시 fallback 플래그]
P1-2 (AbortController) — frontend-only, 병렬 가능
P1-6 (exception) — backend, independent
P1-7 (parseSSEBuffer log) — frontend-only, 병렬 가능
P1-8 (guest login error) — frontend-only, 병렬 가능
P1-3 (fallback flag) — 독립이나 스키마 변경 → Phase 2B로 격리 권장
P1-5 (processTurn) — DOC-9와 통합 (dead code 삭제)
                        │
                        ▼
P2-3 (socraticStage) — frontend-only, 병렬 가능
P2-4 (global-error) — frontend-only, 병렬 가능
P2-5 (Suspense) — frontend-only, 병렬 가능
P2-1 (Message dup)        ← depends on P0-2
P2-2 (report race)        ← depends on P0-2 [NEW: 동일 에러 처리 패턴 간섭]
                        │
                        ▼
DOC all — independent
                        │
                        ▼
Work log
```

### 병렬 레인 (Frontend-only, Phase 1/2/3 중 병렬 수행 가능)
- P1-2 (AbortController) ∥ P1-7 (parseSSEBuffer log) ∥ P1-8 (guest login error)
- P2-3 (socraticStage) ∥ P2-4 (global-error) ∥ P2-5 (Suspense)

Backend implementer가 P0/P1 순차 진행 중, 별도 implementer에 위 frontend 항목 병렬 dispatch → wall-clock 30-40분 절감.

### Phase 2B 격리 — P1-3 (DB 스키마)
- 스키마 변경(ALTER TABLE) 포함 → 원자적 단위 보호
- Phase 5 verify에서 별도 smoke (fallback flag 집계 제외 확인)
- Rollback 시 `ALTER TABLE DROP COLUMN` 추가 단계 필요

## 중단 시 복구 포인트

각 phase 끝에서 `git log --oneline -N`으로 현재 위치 확인. 중단하고 재개 시:
1. `git log` 확인
2. 마지막 완료 phase 파악
3. 해당 phase 문서 참조하여 다음 phase 시작

## 성공 기준

- [ ] 모든 P0 3건 해결 (Phase 1)
- [ ] P1 선별 7건 이상 해결 (Phase 2)
- [ ] P2 선별 3건 이상 해결 (Phase 3)
- [ ] DOC 7건 이상 해결 (Phase 4)
- [ ] `test_guest_race.py` PASS
- [ ] E2E 24/24 PASS
- [ ] 프로덕션 smoke test PASS
- [ ] `docs/work_log/10_v3_stability_hardening.md` 작성 완료
- [ ] Backlog 명확히 문서화 (`05_backlog.md`)

## 타임 박싱

실제 소요가 예산 초과 시:
- P1-3 (스키마 변경) 스킵 고려 (가장 큰 변경)
- P2 항목 중 3-5개 선별 (전부 시도하지 말고)
- DOC 5-6개만 필수, 나머지 post-submission

"완벽보다 안정" — 실행 중 추가 버그 발견해도 기존 계획 우선 완수 후 별도 처리.
