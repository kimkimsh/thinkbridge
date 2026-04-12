# ThinkBridge Revise Plan v3 — Overview

> **Scope**: 안정화·구조적/알고리즘적 보완·버그 픽스 (기능 추가 금지)
> **Date**: 2026-04-12 (D-1 제약 해제, 밤샘 안정화 작업)
> **Status**: ✅ **검증 완료 (v3.1, 2026-04-12)** — 초안 작성 후 4팀 plan verifier agent로 실제 코드 대조. 25+ 정정 사항 반영 (line drift, 사실 오류, 의존성 누락 등).
> **Context**: v1(초기 설계), v2(공모전 대응 재설계) 거쳐 구현·배포 완료. 프로덕션 실측 버그 다수 발견.
> **Prior work**: SSE flush(Fix #3, `2e8f627`) + Guest race CAS(Fix #5, `e1db1c5`) 완료. 본 문서는 그 다음 라운드.

## TL;DR

4팀 에이전트 병렬 분석(backend stability / frontend stability / silent-failure hunter / docs audit) 결과 **60+ findings** 도출. 엄선·분류 후 실행 우선순위화.

- **P0 (Critical — 즉시 수정 필수)**: 3 items. 프로덕션에서 실제로 터지고 있거나, 터지면 사용자에게 침묵 실패로 노출.
- **P1 (High — 안정성 중요)**: 8 items. 엣지 케이스지만 발생 시 UX/데이터 무결성 타격.
- **P2 (Moderate — 구조 개선)**: 7 items. 기술 부채. 추후 리팩터 대상이나 오늘 범위에 일부 포함 가능.
- **Docs (Drift)**: 10 items. 문서-코드 불일치. 제출 AI 리포트 정확도를 위해 필요.
- **Backlog (Post-submission)**: 7 items. 의도적 defer.

## 파일 구성

| 파일 | 내용 |
|------|------|
| `00_overview.md` | 본 문서 — 요약·결정 프레임워크·우선순위 |
| `01_critical_fixes.md` | P0 — 즉시 수정 필수 (프로덕션 리스크) |
| `02_high_priority.md` | P1 — 안정성·silent failure·리소스 leak |
| `03_structural.md` | P2 — 알고리즘·구조 개선 후보 |
| `04_docs_drift.md` | 문서 inconsistency + 누락된 runbook |
| `05_backlog.md` | Post-submission 기술 부채 |
| `06_execution_order.md` | 시간 예산 기반 실행 순서·의존성·rollback |

## 핵심 발견 요약

### 🚨 즉시 수정 필수 (P0)

| # | 항목 | 파일:라인 | 영향 |
|---|------|----------|------|
| P0-1 | `anthropic.OverloadedError` SDK에 존재 안 함 → 529 수신 시 AttributeError로 스트리밍 즉사 | `ai_engine.py:368` | Claude overload 시 사용자는 정체불명 에러만 봄. 재시도 로직 **절대 실행 안 됨** |
| P0-2 | `_saveAiResponseToDb` 실패 시 침묵 → 클라이언트는 성공 응답, DB는 누락 → 세션 상태 괴리 | `sessions.py:559-568` | 다음 턴에 Claude가 누락된 AI 응답을 모른 상태로 대화 → 중복 질문/오답 |
| P0-3 | 프론트 `apiRequest` empty body 응답에 `response.json()` → SyntaxError 크래시 | `frontend/src/lib/api.ts:124` | "대화 마무리" → 리포트 페이지 이동 실패 가능 (데모 핵심 플로우 차단) |

### ⚠️ 안정성 중요 (P1)

| # | 항목 | 요지 |
|---|------|------|
| P1-1 | CAS 증가 후 예외 → 게스트 턴 보상 감소 없음 | AI 응답 실패 시 게스트가 1턴 손해 |
| P1-2 | SSE AbortController 미사용 → unmount 후 stream 계속 | 메모리 leak + LLM 비용 낭비 |
| P1-3 | `DEFAULT_ANALYSIS`에 fallback 플래그 없음 | 리포트/히트맵이 mock 점수 집계 |
| P1-4 | Streaming retry fallback이 canned text 주입 | 대시보드에 가짜 AI 응답 집계 |
| P1-5 | `processTurn` non-streaming `raise tLastError=None` 가능 | TypeError로 원본 에러 마스킹 |
| P1-6 | `generateSseEvents` bare `except Exception` | `CancelledError` 포함 모든 타입 정보 유실 |
| P1-7 | 프론트 `parseSSEBuffer` JSON.parse 실패 silent | 토큰 누락 → 끊긴 응답 UX |
| P1-8 | Guest/Demo 로그인 에러 silent → 사용자 재시도 불가 | 데모 CTA 침묵 실패 |

### 🛠️ 구조 개선 (P2, 선별 적용)

- `Message (sessionId, turnNumber, role)` unique constraint 부재
- `endSession` + report gen 분리된 트랜잭션 경계 (404/IntegrityError 리스크)
- `RateLimitError` 재시도 없음 (P0-1 수정 후 자연스럽게 포함 가능)
- `socraticStage` 0/undefined 방어 부족 → UI 인덱싱 오류
- `app/error.tsx` → `app/global-error.tsx` 승격 (root 에러 포착)
- Hint 버튼이 user 메시지 inflate → guest 턴 낭비
- `useSearchParams` Suspense boundary 누락

### 📝 문서 drift (중요)

- Admin P1 vs P2 상반 기술 (3개 파일 간 충돌)
- `frontend/CLAUDE.md`의 `parseSSEBuffer` 예시 코드가 CRLF 버그 있는 구버전
- v3 spec 문서가 실제 배포된 CAS가 아닌 FOR UPDATE 접근법을 기술
- `SSEEvent` 타입에 `"error"` variant 누락
- `GET /api/auth/me` 문서에 기술되나 실제 존재 안 함
- Stuck detection이 "stage -1"이 아니라 "prompt 삽입"만 수행 — docs 거짓 기술

## 결정 프레임워크

기능 추가 금지 원칙 하에 각 finding은 다음 기준으로 분류:
- **수정 시 코드 변경량** (S: <10줄, M: 10-50줄, L: >50줄)
- **프로덕션 버그 재현 확인** (YES / 논리적 추론 / 이론)
- **기능 추가 여부** (YES인 경우 defer)

P0 선정 기준: "프로덕션에서 실제 터지거나 터질 확률 높음" AND "수정 S 또는 M" AND "기능 추가 아님".
P1: "터지면 심각" AND "수정 S 또는 M"
P2: "구조 개선"
Backlog: "기능 추가 성격" OR "수정 L"

## 다음 단계

1. `01_critical_fixes.md` 부터 순서대로 읽어 실행 가능성 판단
2. `06_execution_order.md`의 타임라인 검토
3. 사용자 승인 후 subagent-driven development로 단계별 구현
4. 구현 시 각 commit은 독립 롤백 가능해야 함
