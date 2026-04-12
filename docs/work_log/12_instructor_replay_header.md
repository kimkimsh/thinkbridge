# Instructor Replay Header — 학생/세션 컨텍스트 표시

> **Date**: 2026-04-12
> **Scope**: User test finding B.5
> **Issue**: `/instructor/replay/{studentId}` 진입 시 헤더가 "세션 리플레이" 고정 문구만 표시되어, 어떤 학생의 어떤 세션을 검토 중인지 불분명했음.

## 변경 내용

### (1) Dashboard 네비게이션에 `?name=` query param 추가

대시보드에서 리플레이로 이동하는 두 경로 모두 학생 이름을 URL에 포함하도록 수정.

- `frontend/src/components/dashboard/StudentList.tsx` — 학생 카드 `onClick`
- `frontend/src/components/dashboard/HeatmapChart.tsx` — 히트맵 row `onClick`

`encodeURIComponent` 로 이름을 안전하게 인코딩한다. 한글 학생명도 문제없이 처리됨.

### (2) Replay 페이지 헤더 개선

`frontend/src/app/instructor/replay/[sessionId]/page.tsx`:

- `useSearchParams` 로 `name` query param 수신, 누락/빈 문자열 시 `"학생"` fallback.
- 헤더에 `<User>` 아이콘 + 학생 이름 + 과목 레이블 + 주제 + 세션 ID 표시.
  - 예시: `홍길동 · 수학 · 이차방정식의 근의 공식 · 세션 #12`
- 과목 레이블은 `SUBJECT_LABELS[subject] ?? subject` 로 fallback.
- 뒤로가기 버튼은 우측으로 정렬, 제목·메타 정보는 좌측에 배치.

### (3) Suspense 처리

`useSearchParams` 는 Next.js 14 에서 Suspense boundary 내부에서 사용해야 CSR 바인딩 에러를 피할 수 있다. 기존 replay 페이지에는 Suspense 가 없었으므로, `student/chat/page.tsx` 의 패턴을 그대로 따라:

- 내부 컴포넌트를 `InstructorReplayPageInner` 로 분리.
- `InstructorReplayPageSkeleton` fallback 추가.
- 기본 export 를 `Suspense` 래퍼로 교체.

## 검증

- `npx tsc --noEmit` → 0 errors.
- `grep -n "instructor/replay" frontend/src` → 수정 대상 두 건 확인, 그 외 참조(예: replay 페이지 자체의 `router.push("/instructor/dashboard")`)는 back-nav 이므로 제외.

## 참고

URL path param 이름 `[sessionId]` 는 실제로는 studentId 를 담는 leftover 이며, 본 수정은 이 drift 를 해결하지 않는다. 제출 이후 rename 대상 (`docs/revise_plan_v3/03_structural.md` P2-16 참조).
