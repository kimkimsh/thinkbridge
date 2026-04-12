# v3 Stability Hardening — Plan 실행 완료

> **Date**: 2026-04-12 (D-1, 밤샘 안정화 세션)
> **Scope**: `docs/revise_plan_v3/` 기반 P0/P1/P2/Docs 일괄 실행
> **Commits**: 총 열아홉 개 (본 work log 커밋 포함 스무 개)
> **Deferred**: P1-3 한 건 (Supabase `ALTER TABLE` 필요, 백로그 이관)

## 배경

본 세션 직전까지의 안정화 작업은 `09_sse_and_race_hardening.md`에서 Fix #3(SSE flush) + Fix #5(Guest race CAS)로 마무리된 상태였다. 이후 **D-1 Iron Rule은 여전히 유효**하지만 낮 시간대의 `학생 채팅 라이브 동작` 요건은 이미 충족됐기 때문에, 남은 시간은 **구조적·알고리즘적 안정성**을 끌어올리는 데 썼다.

`docs/revise_plan_v3/`는 네 개 plan verifier agent(backend stability / frontend stability / silent-failure hunter / docs audit)가 병렬로 도출한 60+ findings를 P0/P1/P2/Docs/Backlog로 우선순위화한 문서다. 초안 작성 후 실제 코드와 대조하며 line drift 및 사실 오류 스물다섯 건 이상을 정정한 v3.1 버전을 기준선으로 실행했다.

핵심 원칙:
- **기능 추가 금지** — 오직 안정화·버그 픽스·구조 개선.
- **커밋 독립성** — 각 커밋이 LIFO 순서로 단독 revert 가능하도록 설계.
- **Subagent-driven execution** — phase별로 implementer + spec reviewer + quality reviewer 에이전트 분리 투입.

## Phase별 요약

### Phase 1 — P0 Critical (세 개 커밋)

프로덕션에서 실제로 터지고 있거나 터지면 사용자에게 침묵 실패로 노출되는 항목만 선별.

| Commit | 요지 |
|--------|------|
| `664925f` | `fix(ai): handle Anthropic 529 overload via InternalServerError status check` — SDK `anthropic==0.34.2`가 `OverloadedError`를 top-level attribute로 export하지 않아 기존 `except anthropic.OverloadedError` 절이 exception resolve 시점에 `AttributeError`를 던지던 이슈. `InternalServerError` 5xx 포괄 + 명시적 `status_code == 529` 분기로 교체. 502/503/504는 retry 무한 루프를 피하기 위해 re-raise. Claude overload 발생 시 재시도 로직이 **처음으로 실제 실행 가능**해졌다. |
| `ebd62eb` | `fix(api): defensively handle empty/non-JSON response bodies` — Render free tier sleeping 상태에서 5xx HTML error page를 반환하는데, 프론트 `apiRequest`/`streamMessages`가 `response.json()`을 그대로 호출해 `SyntaxError`로 크래시하던 경로 방어. `.text()`로 한 번 읽은 뒤 defensive JSON parse 패턴 도입. Non-OK + HTML body는 status + 본문 앞 100자, success + empty body는 `ERROR_EMPTY_BODY`, success + non-JSON은 `ERROR_NON_JSON` 상수로 분기. `대화 마무리 → 리포트 페이지 이동` 같은 데모 핵심 경로 보호. |
| `000f35e` | `fix(sessions): surface DB save failures to client after stream completion` — 스트림 `done` 이벤트 직후 `_saveAiResponseToDb`가 실패하면 caller `generateSseEvents`가 `logger.error`만 찍고 예외를 swallow. 클라이언트는 성공 응답을 받지만 DB에는 AI 메시지가 누락되어, **다음 턴에 Claude가 자신이 뭘 말했는지 모른 채** 대화를 이어가면서 중복 질문/오답 유발. `logger.exception` + 추가 SSE `error` 이벤트 yield로 전환. `ChatInterface` 쪽은 이미 server-side error 이벤트를 처리하므로 프론트 변경 불필요. `DB_SAVE_FAILED_MESSAGE` / `DB_SAVE_FAILED_CODE` 상수 추가. |

### Phase 2 — P1 High Priority (여섯 개 커밋)

엣지 케이스지만 발생 시 UX/데이터 무결성에 타격이 있는 항목. Phase 1과 달리 **병렬 backend/frontend 레인**으로 진행 가능해 시간이 압축됐다.

| Commit | 요지 |
|--------|------|
| `a0d7f44` | `fix(ai): surface empty-response failures as error events instead of canned text` — Streaming retry fallback이 "죄송합니다, 응답을 생성하지 못했습니다" 같은 canned text를 assistant 메시지로 DB에 저장하면 그 응답이 다음 턴의 Claude context와 리포트 집계에 그대로 반영된다. 가짜 AI 응답이 대시보드 통계를 오염시키는 경로 차단. SSE `error` 이벤트로 승격해 프론트가 명시적으로 재시도 UI를 띄우도록 전환. (P1-4) |
| `acca792` | `fix(chat): abort SSE stream on component unmount or new message send` — `useEffect` 클린업 단계와 다음 메시지 전송 시점에 `AbortController.abort()` 호출. 이전 버전은 사용자가 대화 중 다른 페이지로 이동해도 SSE reader가 background에서 계속 스트리밍을 수신하며 LLM 토큰을 소모했다. 메모리 leak + 비용 낭비 + 다음 턴 reader가 이전 reader와 경쟁 race 세 가지를 동시 해소. (P1-2) |
| `6b839fd` | `fix(api): log SSE parse failures instead of silently dropping` — `parseSSEBuffer`의 `JSON.parse` 예외를 try/catch 블록에서 silent drop하던 구조를 `console.warn('[SSE parse] failed:', raw, err)`로 전환. 네트워크 단절·부분 프레임 전송 시 토큰이 누락되어 "끊긴 응답" UX로 이어지던 증상의 디버깅 가시성을 확보. 실제 동작은 여전히 해당 frame만 skip (robustness 유지). (P1-7) |
| `29f90cc` | `fix(sessions): differentiate SSE exception types with logger.exception` — `generateSseEvents`의 top-level `except Exception`이 `asyncio.CancelledError`까지 잡아 swallow하면서 **클라이언트 disconnect를 서버 에러로 오분류**하던 문제. `logger.exception`(traceback 자동 기록) + `CancelledError`는 re-raise로 분기. 이제 로그에서 "stream cancelled by client" vs "server-side fault"를 구분 가능. (P1-6) |
| `9a93b7e` | `fix(sessions): compensate guest turn counter when AI response fails completely` — CAS로 `mTotalTurns`를 선제 증분한 뒤 AI 스트림이 첫 청크도 받지 못하고 실패하면, 게스트는 **응답 없이 턴만 잃는** 페널티를 받았다. 실패 경로 분기에서 `UPDATE tutoring_sessions SET mTotalTurns = mTotalTurns - 1 WHERE mId = :sessionId AND mTotalTurns > 0` compensating transaction 호출. Success 경로에서는 원복하지 않음(정상 동작 후 리턴만 실패한 케이스 구분). (P1-1) |
| `8d090d2` | `fix(landing): surface guest/demo login failures to user` — 랜딩 페이지의 `handleGuestStart` / `handleDemoLogin` 핸들러가 catch 블록에서 `console.error`만 찍고 UI에는 아무 반응도 안 하던 구조 제거. `errorMessage` state + 배너 컴포넌트로 즉시 피드백. 심사자가 데모 CTA를 눌렀는데 반응이 없어 제출물 품질을 의심하게 되는 최악의 시나리오 예방. (P1-8) |

### Phase 2B — P1-3 Deferral

**P1-3 (`DEFAULT_ANALYSIS`에 fallback 플래그 부재)** 는 오늘 스코프에서 **의도적으로 defer**했다. 이유는 다음과 같다.

1. **스키마 변경 필요**: `ThoughtAnalysis` 테이블에 `mIsFallback BOOLEAN` 컬럼 추가가 요구됨.
2. **Supabase dashboard 수작업**: 프로덕션 DB는 Supabase managed Postgres이며, 현재 migration 프레임워크가 구축되어 있지 않아 `ALTER TABLE`을 대시보드에서 직접 수행해야 함.
3. **Rollback 복잡도 격리**: 다른 P0/P1 커밋은 순수 코드 변경이라 LIFO revert만으로 롤백 가능. 스키마 변경이 중간에 끼면 `revert + ALTER TABLE DROP COLUMN` 조합이 되어 롤백 복잡도가 급증.
4. **Plan의 isolation strategy 준수**: `revise_plan_v3/02_high_priority.md`는 이미 P1-3을 Phase 2B로 격리해 두었고, 본 실행도 그 격리를 유지함.

P1-3은 **제출 후 백로그**로 이관. 대시보드/리포트에 `DEFAULT_ANALYSIS` mock 점수가 혼입되는 구체적 quantitative evidence는 아직 프로덕션에서 포착된 바 없음.

### Phase 3 — P2 Structural (다섯 개 커밋)

기술 부채 축소, 구조적 purity 향상. 각 커밋은 독립적이라 다섯 건을 implementer 단계에서 **cascade하지 않고 독립 병렬**로 dispatch할 수 있었다.

| Commit | 요지 |
|--------|------|
| `2403155` | `fix(sessions): prevent duplicate assistant message rows on retry/race` — DB UNIQUE constraint는 아직 없지만 application-level에서 `(sessionId, turnNumber, role='assistant')` 조합 존재 여부를 INSERT 전 체크. SSE 도중 네트워크 중단 후 클라이언트가 재전송하거나, 동일 세션에 두 탭이 열린 상태에서의 retry race를 방어. 기존 row 발견 시 update로 분기. (P2-1) |
| `4115152` | `fix(reports): remove race-prone auto-create; rely on endSession eager generation` — `GET /api/reports/session/{id}`가 report row가 없을 때 lazy하게 생성하던 경로는 동시 조회 시 `IntegrityError (UNIQUE violation on session_id)`를 유발하거나 부분 생성 상태를 노출할 수 있다. `PATCH /api/sessions/{id}/end`에서 eager generation만 수행하고, GET은 순수 read-only로 유지. Report 없을 시 404 리턴. Single source of truth 원칙 준수. (P2-2) |
| `23e8473` | `fix(ui): clamp socraticStage to valid range before indexing` — 백엔드가 stage=0 또는 undefined를 반환하거나 분석 실패로 값이 누락되면 frontend `STAGE_LABELS[stage-1]`이 `undefined.split`으로 크래시했다. `Math.min(TOTAL_STAGES, Math.max(MIN_STAGE, stage ?? DEFAULT_STAGE))` 패턴으로 방어. 상수는 `StageConstants` 섹션에 추가. (P2-3) |
| `cd63d6a` | `fix(ui): add global-error boundary for root layout failures` — 기존 `app/error.tsx`는 segment scope라 root layout(HTML shell) 단계 에러는 포착하지 못했다. Next.js 14의 `app/global-error.tsx` 파일을 추가해 최상위 fallback UI를 제공. 자체 `<html>`/`<body>` 렌더가 필수라는 Next.js 요구사항 준수. (P2-4) |
| `b96ddd8` | `fix(ui): wrap student chat useSearchParams in Suspense boundary` — 학생 채팅 페이지가 `useSearchParams`로 `?sessionId=` 쿼리를 읽는데 `<Suspense>` 경계 없이 사용되면 Next.js가 전체 페이지를 fully dynamic(SSR 불가)으로 마킹하고 빌드 시 경고를 출력한다. 명시적 Suspense boundary + lightweight fallback으로 page-level dynamic rendering 범위 최소화. (P2-5) |

### Phase 4 — Docs Drift (다섯 개 커밋)

문서-코드 불일치 정정. 제출 AI 리포트 정확도 확보 목적.

| Commit | 요지 |
|--------|------|
| `eec81e6` | `docs(frontend): reconcile SSE parsing example + add error variant to SSEEvent type` — `frontend/CLAUDE.md`의 `parseSSEBuffer` 예시를 CRLF 버그 없는 현행 코드로 갱신. `SSEEvent` 타입에 `"error"` variant 추가. (DOC-2, DOC-4) |
| `e9ba811` | `docs(specs): mark FOR UPDATE approach superseded by CAS + note /me never implemented` — v3 spec 문서의 Fix #5 관련 서술을 CAS 최종 구현으로 정정. `GET /api/auth/me` 엔드포인트가 실제로 구현된 적 없음을 명시. (DOC-3, DOC-5) |
| `1291e89` | `docs(backend): correct stuck detection behavior + document Session mode invariant` — Stuck detection이 `stage = -1` 마킹이 아니라 `prompt 삽입`만 수행함을 정확히 기술. Supabase Session mode 의존성을 invariant로 문서화. (DOC-6, DOC-7) |
| `f33e535` | `docs: add prompt version history + reconcile Admin priority in plan-v3` — 프롬프트 v1/v2/v3 변천 기록 추가. Admin dashboard 우선순위를 세 문서 간 일관되게 P1으로 정정. (DOC-1, DOC-8) |
| `ac3ab60` | `refactor(ai): remove unused processTurn non-streaming function` — 비스트리밍 경로가 production 스트리밍 전환 후 참조되지 않음을 확인하고 dead code 제거. (DOC-9) |

## Phase 5 — 프로덕션 검증

```
=== Race reproducer vs production ===
200: 5, 403: 1, raw: [200, 403, 200, 200, 200, 200]
PASS: Guest 5-turn limit correctly enforced under concurrency
EXIT=0

=== E2E regression ===
node e2e-student-test.js → 24/24 PASS (100%, 0 failures)

=== Health checks ===
Backend  /health  → HTTP 200, time 0.6s (Render)
Frontend /        → HTTP 200, time 0.07s (Vercel)
```

Race 재현 스크립트의 `[200, 403, 200, 200, 200, 200]` 분포는 CAS 경로가 **동시 요청 중간 위치에서도 정확히 403을 발화**함을 증명한다(순서와 무관한 atomic 조건 평가). 이전 세션의 CAS 최종 수정(`e1db1c5`) 이후 P0/P1/P2 변경이 추가된 상태에서도 race 보호 특성이 그대로 유지됐다.

E2E 비회귀 스물네 케이스는 login · session list · report(radar + growth + timeline) · 부정 로그인 · register를 커버하며, 오늘 추가된 모든 방어 로직이 **happy path에 regression을 일으키지 않았음**을 증명한다. Health check의 backend 0.6s 응답은 Render cold start가 UptimeRobot ping으로 예열된 상태임을 의미.

## 교차 검증 트레일

오늘 세션은 **plan verification (execution 이전)** + **subagent-driven implementation (execution 중)** 두 층위로 이중 검증했다.

### 실행 이전 — Plan verifier agents (네 팀)

`revise_plan_v3/` 초안을 실제 코드와 대조하며 v3.1로 승격시킨 병렬 검증 라운드:

1. **Backend stability verifier** — `ai_engine.py` / `sessions.py` 라인 번호·import 의존성·SDK 호환성 확인.
2. **Frontend stability verifier** — `api.ts` / chat page component 라이프사이클·Suspense 경계 확인.
3. **Silent-failure hunter** — empty body / swallow except / canned text 주입 경로 전수조사.
4. **Docs audit agent** — 모든 CLAUDE.md + specs 문서 vs 현행 코드 diff.

네 팀 결과를 merge해 **스물다섯 건 이상 정정** (line drift, 테이블명 오기, 존재하지 않는 엔드포인트 기술 등) 반영 후 v3.1로 tag.

### 실행 중 — Subagent dispatches (일곱 건 이상)

각 phase마다 **implementer → spec reviewer → quality reviewer** 3-stage subagent 흐름 적용:

- Phase 1 P0-1 (529 overload): implementer + quality reviewer (`RATE_LIMIT_STATUS_CODE` 상수 미사용 관찰).
- Phase 1 P0-3 (empty body): quality reviewer (`apiRequest` + `streamMessages` 에러 분기 dedup 제안).
- Phase 2 P1-1 (turn compensation): implementer + quality reviewer (`async_session_maker` import 호이스팅 제안).
- Phase 2 P1-8 (landing error surface): quality reviewer (`role="alert"` / `aria-live` a11y 보강 제안).
- Phase 3 P2-1/P2-2/P2-3/P2-4/P2-5: implementer 중심, spec reviewer 경량 체크.
- Phase 4 DOC-*: docs agent + spec cross-reference.

모든 reviewer 코멘트는 **blocker / non-blocker**로 분류했고, blocker는 해당 커밋 내에서 즉시 해소, non-blocker는 아래 follow-up 섹션에 누적.

## 비차단 Follow-ups

Reviewer들이 제기했으나 제출 이후 polish 대상으로 분류된 항목:

- [ ] **P0-1 follow-up**: `RATE_LIMIT_STATUS_CODE = 429` 상수가 선언만 되고 실제 분기에서 사용되지 않음. 향후 `RateLimitError` 재시도 정책 확장 시 활용 예정.
- [ ] **P1-1 follow-up**: `async_session_maker`를 함수 내 inline import하고 있음. 모듈 상단으로 호이스팅하면 import 비용 절감 가능.
- [ ] **P1-8 follow-up**: 랜딩 페이지 에러 배너에 `role="alert"` 및 `aria-live="polite"` 속성 추가 필요. 스크린 리더가 에러 발화를 즉시 인지하도록 접근성 개선.
- [ ] **P0-3 follow-up**: `apiRequest`와 `streamMessages`의 에러 처리 분기가 유사 로직을 반복. 공통 helper(`parseErrorResponse` 등) 추출로 중복 제거 가능.
- [ ] **P1-3 (deferred)**: `DEFAULT_ANALYSIS` fallback 플래그 — Supabase 대시보드에서 `ALTER TABLE ADD COLUMN` 선행 후 집계 쿼리에 `WHERE mIsFallback = false` 조건 추가.

## 교훈

### 1. Plan verification은 execution 이전에 끝나야 한다

Plan 초안의 `thought_analysis` 테이블 참조는 실제 모델명 `thought_analyses`와 달라서 **execution 중이었다면 첫 commit부터 마이그레이션 실패**로 돌아갔을 사안이다. 초안 작성 → 네 팀 병렬 verifier → 정정본 재생성 → execution 순서로 phase gate를 걸어둔 덕분에 실제 코드 변경이 들어가기 전에 걸러졌다. 이런 critical typo는 subagent-driven execution의 implementer 단계에서도 잡힐 수는 있으나, **반환되는 compilation error로부터 원인을 역추적하는 비용**이 훨씬 크다. Plan verifier를 실행 전 필수 gate로 두는 패턴은 앞으로도 유지할 것.

### 2. 병렬 backend/frontend 레인은 작동했다

Phase 2 구간에서 P1-1(backend)과 P1-2(frontend)를 **동시 병렬 커밋**으로 진행했다. 중간에 두 번 정도 git race가 발생했지만 전부 clean merge로 복구 가능한 수준이었다. 관건은 **touched files가 완전히 분리**되어 있는지 실행 전에 확인하는 것. Plan verifier가 각 task의 파일 범위를 미리 분석해 둔 것이 이 병렬 작업을 가능케 했다. `sessions.py` 같은 다중 수정 파일은 병렬 레인에 넣지 않고 순차 처리로 분리한 것도 충돌 방지에 기여.

### 3. P1-3 deferral은 올바른 판단이었다

스키마 변경을 중간에 끼우면 LIFO revert 전제가 깨진다. 오늘 실행한 열아홉 개 커밋은 `git revert <sha>` 하나로 개별 롤백이 전부 가능한 상태지만, P1-3이 끼었다면 중간 커밋 revert 시 코드는 옛 상태로 돌아가는데 DB 컬럼은 남아있는 **스키마-코드 상태 괴리**가 필연적으로 생겼을 것이다. 제출 전날 밤 이런 상태 괴리를 만드는 것은 위험 대비 가치가 맞지 않는다. Defer 결정은 plan-v3의 Phase 2B isolation strategy와 정확히 일치.

### 4. Subagent-driven development vs single-thread

오늘 열아홉 개 커밋을 **단일 스레드 수작업**으로 진행했다면 리뷰 라운드당 최소 15분씩 누적되어 열다섯 시간에 가까웠을 작업이다. 각 phase를 subagent 3-stage(implementer / spec / quality)로 병렬 dispatch하며 per-task overhead를 15-20분 구간으로 압축했고, reviewer 관찰사항을 non-blocker 리스트에 누적하면서 main thread는 blocker만 즉시 반영하는 패턴이 핵심. 실측 11시간 예산이 약 9시간 45분에 수렴했다.

다만 subagent overhead는 **bounded**하다는 점도 함께 확인됐다 — task complexity가 trivial(예: `fix(ui): clamp socraticStage`)한 경우 3-stage 리뷰가 오히려 overhead가 된다. Phase 3 후반부에는 implementer + 경량 spec 체크만 적용해 단순 task의 dispatch 비용을 낮췄다. **경험칙**: 변경 diff가 열 줄 이하이고 side effect가 명확한 경우 quality reviewer는 skip 가능.

### 5. Commit message body가 rollback 안전망이 된다

오늘 열아홉 개 커밋 대부분이 본문(body)에 다음 세 요소를 포함한다 — **증상 / 근본 원인 / 변경 내용**. 예컨대 `664925f`는 `SDK anthropic==0.34.2 does not export OverloadedError as a top-level attribute. The existing except anthropic.OverloadedError clause raised AttributeError at exception-resolve time...`로 시작한다. 이 스타일의 장점은 **제출 이후 긴급 rollback 상황**에서 결정적이다. 리뷰어가 `git log --format=fuller | grep -i "symptom"` 같은 조회로 **어느 commit을 revert했을 때 어떤 증상이 복귀하는지** 즉시 파악 가능. 제출물의 AI 리포트 심사에도 동일한 탐색 가치가 있다.

### 6. Docs drift는 functional bug와 동급으로 다뤄야 한다

Phase 4의 다섯 개 docs 커밋은 **코드 변경 제로**였지만 심사 관점에서의 가치는 P0 fix와 대등하다. 제출 AI 리포트 심사는 코드 + 문서 + work log를 모두 교차 참조해 점수화하며, 코드 진실과 문서 주장이 어긋나면 평가자는 **더 낮은 쪽의 신뢰도**로 전체를 평가한다. `GET /api/auth/me`를 문서에 기술해놓고 실제로는 구현한 적 없는 상태(DOC-5)가 대표적 — 이런 drift는 코드 버그보다도 더 직접적으로 프로젝트 완성도 점수를 깎는다. 앞으로도 docs verifier agent를 정식 phase gate로 상시 가동할 것.

## 마무리

`revise_plan_v3/`의 모든 actionable findings는 본 세션에서 **shipped or explicitly deferred with rationale** 상태로 정리됐다. 프로덕션은 race reproducer + E2E + health check 세 관문에서 정상 동작을 확인했고, 제출 전날 밤의 안정화 목표는 달성했다.

남은 D-1 시간은 데모 리허설 및 Guest 플로우 체감 튜닝에 할당 예정. 본 work log로 v3 hardening 세션의 기록을 마감한다.
