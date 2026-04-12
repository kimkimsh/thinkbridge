# 수정 사항 검증 테스트 시나리오 — v3.1 UX Fix Batch

> **Date**: 2026-04-12 (v3.1 UX 수정 배치 — 사용자 테스트 피드백 대응 + D.1 튜토리얼 추가)
> **Commits (UX Fix 12건)**: `d8ff223`, `7a95eaf`, `790ac33`, `36dd331`, `c995d25`, `ee8849d` (6 commits, 12 issues)
> **Commits (Tutorial D.1)**: `e16fec7` (Phase 2 core), `514d190` (work log), `5badfb7` (Phase 3 integration)
> **Target URL**: 로컬 전용 (`docs/LIVE_ACCESS.md` 참조) — 라이브 URL은 개인 튜터링 컨텐츠 보호를 위해 비공개
> **총 시나리오 수**: **25개** (§1 에러/진행률 4 · §2 네비/복원 6 · §3 UI 폴리시 2 · §4 튜토리얼 10 · §5 통합 3)

---

## 📋 Test Setup

### 사전 준비

1. **브라우저**: Chrome 최신 (주 지원). 일부 정규화 메시지 시나리오는 Firefox/Safari에서도 재확인 권장.
2. **DevTools 열기** (F12)
   - Network 탭: "Preserve log" 체크, Throttling 토글 준비
   - Console 탭: `console.error` 출력 관찰 (A.1 시나리오용)
   - Application 탭: LocalStorage 검증 (`thinkbridge_token`, `thinkbridge_user`)
3. **시크릿 창(Incognito)** 사용 권장 — 세션/토큰 간섭 방지
4. **Render Cold Start 인식**: free tier는 15분 idle 후 슬립. UptimeRobot ping 활성 시 대부분 warm.

### 데모 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|---------|
| 학생 | `student@demo.com` | `demo1234` |
| 강사 | `instructor@demo.com` | `demo1234` |
| 관리자 | `admin@demo.com` | `demo1234` |
| 게스트 | (랜딩 "바로 체험하기" 원클릭) | — |

### 사전 상태 요구

- `student@demo.com` 계정에 **active 세션 1개 + 2-3턴 진행 완료 + 아직 종료되지 않음** 상태가 있어야 V.7/V.13 에서 재개 플로우를 확인할 수 있음.
- 없다면 시나리오 시작 전에 학생 계정으로 로그인 → 세션 생성 → 2-3턴 전송 후 로그아웃하여 준비한다.

---

## 📊 수정 사항 매핑

| 이슈 ID | 요약 | Commit | 시나리오 ID | 검증 난이도 |
|--------|------|-------|------------|------------|
| A.1 / L.9 | Hero CTA 아래 inline 에러 배너 + top-right 배너 동시 표시 | `d8ff223` | V.1 | Easy (Offline 토글) |
| A.2 | 세션 종료 시 전체 화면 오버레이 + 스피너 | `36dd331` | V.2 | Easy (대화 + 종료 클릭) |
| A.3 | `normalizeErrorMessage` — "Failed to fetch" → 한국어 | `d8ff223` | V.3 | Easy (Offline + Console) |
| A.4 | 리포트 페이지 5회 × 2초 retry + 진행 카운터 | `c995d25` | V.4 | Medium (Network override 필요) |
| B.1 | 로그인 상태 Hero CTA 역할별 분기 | `d8ff223` | V.5 | Easy (로그인 후 `/` 재진입) |
| B.2 | Navbar 로고 `getHomePathForRole` | `d8ff223` | V.6 | Easy (로고 클릭) |
| B.3 | 진행중 세션 재개 시 메시지/분석/턴/stage 복원 (CRITICAL) | `790ac33` | V.7 / V.8 | Medium (활성 세션 사전 필요) |
| B.4 | 세션 목록 completed 카드 "리포트" 명시 버튼 | `d8ff223` | V.9 | Easy (세션 목록 방문) |
| B.5 | 강사 리플레이 헤더 학생명/과목/주제/세션 ID | `7a95eaf` | V.10 | Easy (대시보드 → 학생 클릭) |
| C.1 | 종료 버튼 4-state (base/hover/active/disabled) | `36dd331` | V.11 | Medium (여러 상태 전환) |
| C.2 | 모바일 햄버거 `/student/chat`에서만 좌하단 | `ee8849d` | V.12 | Easy (Device Toolbar 390px) |
| **D.1** | **채팅 튜토리얼 오버레이 (7 steps, auto + ? re-launch)** | `e16fec7` / `5badfb7` | V.16 | Medium (동적 타겟 + localStorage) |
| **D.1** | 세션 목록 튜토리얼 (3 steps, 첫 카드 하이라이트) | `e16fec7` / `5badfb7` | V.17 | Easy |
| **D.1** | 강사 대시보드 튜토리얼 (4 steps) | `e16fec7` / `5badfb7` | V.18 | Easy |
| **D.1** | 관리자 대시보드 튜토리얼 (4 steps) | `e16fec7` / `5badfb7` | V.19 | Easy |
| **D.1** | TutorialButton (?) 재실행 — 4 페이지 공통 | `e16fec7` / `5badfb7` | V.20 | Easy |
| **D.1** | localStorage 완료 플래그 영속성 | `e16fec7` | V.21 | Medium (Application 탭 필요) |
| **D.1** | 키보드 네비게이션 (Esc / Enter / Arrow) | `e16fec7` | V.22 | Easy |
| **D.1** | 모바일 뷰포트 center fallback (< 768px) | `e16fec7` | V.23 | Easy (Device Toolbar) |
| **D.1** | 동적 타겟 `waitForTarget` 5s timeout → center fallback | `e16fec7` | V.24 | Medium (chat pre-session 진입) |
| **D.1** | z-[80] 상위 레이어링 + 글로벌 disable 키 | `e16fec7` | V.25 | Medium (다른 오버레이와 충돌 검증) |

> **주 1**: 이슈 A.1 / L.9 는 동일 증상에 대한 이중 배너 수정이므로 V.1 한 시나리오로 커버한다.
> **주 2**: D.1 튜토리얼은 10개 세부 시나리오(V.16-V.25)로 쪼개 검증한다. 4개 페이지 × (auto-trigger + 콘텐츠 + re-launch + 영속성 + 키보드 + 모바일 + 동적 + 레이어링) 축으로 조합되어 개별 축 문제의 원인 격리를 쉽게 한다.

---

## 📑 목차

| 섹션 | 범위 | 시나리오 수 |
|------|-----|------------|
| [§1. 에러 처리 + 진행률 검증 (A.x)](#1-에러-처리--진행률-검증-ax) | V.1 – V.4 | 4 |
| [§2. 네비게이션 + 상태 복원 (B.x)](#2-네비게이션--상태-복원-bx) | V.5 – V.10 | 6 |
| [§3. UI 폴리시 (C.x)](#3-ui-폴리시-cx) | V.11 – V.12 | 2 |
| [§4. 튜토리얼 오버레이 (D.1)](#4-튜토리얼-오버레이-d1) | V.16 – V.25 | 10 |
| [§5. 통합 시나리오](#5-통합-시나리오) | V.13 – V.15 | 3 |
| [§6. 최종 체크리스트](#6-최종-체크리스트) | — | — |

---

## §1. 에러 처리 + 진행률 검증 (A.x)

> 공통 전제: 시크릿 창, DevTools Network/Console 열림, URL = 로컬 프론트엔드

### V.1 — A.1 + L.9 + A.3: Guest 로그인 실패 시 한국어 친화 에러 배너 (inline + top-right)

**목적**: 게스트 로그인 실패 시 Hero CTA 아래 inline 배너와 top-right 배너가 **동시에** 표시되고, 에러 메시지는 `normalizeErrorMessage`로 한국어화되는지 확인
**선행 조건**: 시크릿 창, 비로그인 상태
**이전 버그**:
- 에러 배너가 top-right fixed 위치에만 표시되어 Hero CTA에 집중된 사용자에게 쉽게 놓침 (L.9)
- 브라우저 원문 "Failed to fetch" 등 영어 메시지가 사용자에게 노출됨 (A.3)

**기대 결과**: Offline 상태에서 "바로 체험하기" 클릭 시 인라인 + 상단 우측 두 위치에 "네트워크 연결을 확인해 주세요." 배너 동시 표시

- [ ] 단계 1: 로컬 프론트엔드 URL 진입 후 DevTools Network 탭 → Throttling 드롭다운 → **Offline** 선택
  - 기대: 상태 표시 "Offline"
- [ ] 단계 2: Hero 영역 "바로 체험하기" 버튼 클릭
  - 기대: 버튼이 "준비 중..."으로 잠시 변경됐다가 다시 "바로 체험하기"로 복귀 (`disabled=false`)
- [ ] 단계 3: Hero CTA 직하단 inline 에러 배너 확인
  - 기대: `rounded-lg border border-red-200 bg-red-50 px-4 py-3` 스타일 박스 + `AlertCircle` 아이콘 + "네트워크 연결을 확인해 주세요." 텍스트 + 밑줄 "닫기" 링크 (`text-red-500 underline`)
- [ ] 단계 4: 상단 우측 고정 에러 배너도 **동시에** 확인
  - 기대: `fixed right-4 top-20 z-50 max-w-sm rounded-lg border border-red-200 bg-red-50 p-3 shadow-lg` 박스 + 동일 메시지 + "닫기" 버튼 (플레인 텍스트, 밑줄 없음)
- [ ] 단계 5: Console 확인
  - 기대: `Guest login failed`와 함께 에러 객체가 `console.error`로 출력됨 (grep: "Guest login failed")
- [ ] 단계 6: inline 배너의 "닫기" 링크 클릭
  - 기대: **두 배너 모두** 즉시 사라짐 (공통 `mError` state 관리)
- [ ] 단계 7: 다시 "바로 체험하기" 클릭 → 양쪽 배너 재표시 → top-right 배너의 "닫기" 버튼 클릭
  - 기대: **두 배너 모두** 즉시 사라짐
- [ ] 단계 8: DevTools Throttling → **No throttling** 복귀 + "바로 체험하기" 재클릭
  - 기대: 게스트 로그인 성공 → `/student/chat` 이동 + 배너 자동 사라짐 (`setError(null)` 호출)

**합격 기준**: 8개 중 7개 이상 통과
**비고**:
- `console.error("Guest login failed", tError)` 로그는 debugging을 위한 것이며 프로덕션에서도 유지된다.
- "닫기" 버튼과 "닫기" 링크는 둘 다 동일한 `setError(null)` 호출을 트리거한다.

---

### V.2 — A.2: 세션 종료 시 전체 화면 오버레이

**목적**: "종료" 클릭 → 리포트 페이지 도착 사이의 대기 시간(최대 10초) 동안 전체 화면 스피너 + 한국어 안내 문구 표시
**선행 조건**: 학생 또는 게스트 로그인 상태에서 채팅 세션 생성 + 최소 1턴 진행 완료
**이전 버그**: "종료" 버튼만 `disabled=true`로 변하고 시각적 피드백이 없어 사용자가 "먹통인가?" 의심
**기대 결과**: 종료 즉시 전체 화면 오버레이 (z-70) + spinner + "사고 과정을 분석하고 있어요" + "리포트 생성까지 최대 10초가 걸릴 수 있습니다"

- [ ] 단계 1: 게스트로 `/student/chat` 진입 → 수학 과목 + 임의 주제 → 2-3턴 진행
  - 기대: 메시지 배열에 user/assistant 메시지 추가됨
- [ ] 단계 2: 입력창 우측 "종료" 버튼 클릭 (`mMessages.length > 0` 이므로 활성)
  - 기대: 클릭 즉시 (1-2 frame 내) 전체 화면 오버레이 등장
- [ ] 단계 3: 오버레이 스타일 확인
  - 기대: `fixed inset-0 z-[70] flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm animate-in fade-in duration-200`
- [ ] 단계 4: 오버레이 내용 확인
  - 기대: 중앙 인디고 spinner (`h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent`) → 아래 `text-sm font-semibold text-gray-800` "사고 과정을 분석하고 있어요" → 그 아래 `text-xs text-gray-500` "리포트 생성까지 최대 10초가 걸릴 수 있습니다"
- [ ] 단계 5: 오버레이 등장 중 사이드바 햄버거 (모바일) / Sheet 열기 시도
  - 기대: z-70이 Sidebar Sheet(z-50)보다 상위이므로 **사이드바 조작 불가** (오버레이가 가림)
- [ ] 단계 6: 오버레이 등장 중 ThoughtPanel 모바일 플로팅 버튼 (z-40) 클릭 시도
  - 기대: 마찬가지로 **조작 불가**
- [ ] 단계 7: 5-10초 이내에 `/student/report/{sessionId}` 이동 완료
  - 기대: 오버레이가 다음 페이지 전환과 함께 자연스럽게 사라짐 (언마운트)
- [ ] 단계 8: 접근성 확인 — DevTools Elements에서 오버레이 `<div>` 의 `role="status"` + `aria-live="polite"` 속성 확인
  - 기대: 스크린 리더에 "사고 과정을 분석하고 있어요" 가 자동 읽힘

**합격 기준**: 7/8 이상
**비고**:
- 리포트 생성 실제 소요 시간은 Render warm 상태에서 2-5초, cold start 시 10초 초과 가능.
- "최대 10초" 문구는 A.4의 retry 5회 × 2초 = 10초 상한과 일치.

---

### V.3 — A.3: 네트워크 에러 메시지 정규화 (`normalizeErrorMessage`)

**목적**: 브라우저 원문 영어 메시지가 `ERROR_MESSAGE_MAP`을 통해 한국어로 치환되는지 확인
**선행 조건**: DevTools Console 열림
**이전 버그**: "Failed to fetch" (Chrome), "Load failed" (Safari), "NetworkError when attempting to fetch resource." (Firefox)가 그대로 사용자에게 노출됨
**기대 결과**: 세 종류의 원문 모두 "네트워크 연결을 확인해 주세요."로 치환됨

- [ ] 단계 1: 로컬 프론트엔드 진입 → Network → Throttling → **Offline** → 로그인 페이지 이동
  - 기대: `/login` 페이지 렌더
- [ ] 단계 2: 이메일/비밀번호 임의 입력 → "로그인" 제출
  - 기대: 로그인 form error 또는 페이지 error 영역에 "네트워크 연결을 확인해 주세요." 표시 (원문 "Failed to fetch" 노출되지 않음)
- [ ] 단계 3: Console 출력 확인
  - 기대: 원본 Error 객체는 Console에는 노출되지만 UI에는 정규화된 한국어만 표시됨
- [ ] 단계 4: Offline 유지한 채 `/student/sessions` 직접 URL 진입 (로그인된 상태가 있다면)
  - 기대: 세션 목록 API 실패 → 빨간 에러 박스에 정규화 메시지 (파일 구현상 `error.message`를 그대로 쓰므로 여기서는 raw 메시지일 수 있음 — **note**)
- [ ] 단계 5: `/student/chat` → 주제 입력 → "대화 시작하기" 클릭 (Offline 유지)
  - 기대: 에러 박스에 `normalizeErrorMessage(error)` 결과 "네트워크 연결을 확인해 주세요." 표시
- [ ] 단계 6: Throttling → No throttling 복귀 + 재시도
  - 기대: 정상 세션 생성
- [ ] 단계 7 (선택): Safari 또는 Firefox에서 동일 플로우 반복
  - 기대: 브라우저별로 원문이 다르더라도 사용자에게는 동일한 한국어 메시지 표시

**합격 기준**: 5/7 이상 (브라우저별 재확인은 선택)
**비고**:
- `normalizeErrorMessage` 적용 위치: `frontend/src/app/page.tsx`(게스트/데모 로그인 catch), `frontend/src/app/student/chat/page.tsx`(createSession + getSessionDetail catch), `frontend/src/app/student/report/[id]/page.tsx`(리포트 로드 catch).
- `/student/sessions/page.tsx`는 아직 `normalizeErrorMessage`를 적용하지 않음 (발견된 inconsistency — 단계 4 비고 참조).

---

### V.4 — A.4: 리포트 페이지 retry + 진행 메시지 (5회 × 2초)

**목적**: 리포트 생성이 완료되기 전 페이지 로드 시 404 에러 대신 "분석 중..." 진행 메시지 표시 + 자동 재시도
**선행 조건**: 세션 1개가 **방금 종료되어 리포트 생성 중** 상태 (또는 Network override로 404 강제)
**이전 버그**: `getSessionReport`가 HTTP 404 "리포트가 아직 준비되지 않았습니다." 반환 시 즉시 에러 박스 노출 → 사용자는 재시도를 스스로 해야 함
**기대 결과**: 최대 5회까지 2초 간격 자동 재시도 + 진행 메시지 카운터 (1/5 → 2/5 → ...) + 스켈레톤 위 `bg-white/80 backdrop-blur-sm` 오버레이

- [ ] 단계 1 (자연 시나리오): 세션 2-3턴 진행 후 "종료" 클릭 → 리포트 페이지 자동 이동
  - 기대: 대부분의 경우 리포트가 이미 생성되어 있어 즉시 정상 렌더 (재시도 관찰 어려움)
- [ ] 단계 2 (강제 시나리오): DevTools Network 탭 → `/api/reports/session/` 우클릭 → **Block request URL**
  - 기대: 블록 규칙 활성
- [ ] 단계 3: 리포트 페이지 새로고침
  - 기대: 스켈레톤 (ReportSkeleton) 렌더 + 그 위에 `absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm` 오버레이
- [ ] 단계 4: 오버레이 내용 확인
  - 기대: `h-8 w-8` 인디고 spinner + `mt-3 text-sm font-medium text-gray-700` "사고 과정을 분석하고 있어요... (1/5)" + `mt-1 text-xs text-gray-500` "잠시만 기다려 주세요"
- [ ] 단계 5: 2초 간격으로 카운터 증가 관찰
  - 기대: 약 2초 후 "(2/5)" → 4초 후 "(3/5)" → ... → "(5/5)"
- [ ] 단계 6: 5회 전부 실패 시 오버레이 사라지고 에러 박스 표시
  - 기대: `rounded-lg border border-red-200 bg-red-50 px-4 py-3` "리포트를 불러오지 못했습니다." 또는 `normalizeErrorMessage` 결과
- [ ] 단계 7: Block request URL 해제 후 페이지 새로고침
  - 기대: 1/5 시도에서 200 OK → 오버레이 사라지고 Radar + Growth + Timeline 정상 렌더
- [ ] 단계 8 (접근성): 오버레이 `<div>` 에 `role="status"` + `aria-live="polite"` 확인
  - 기대: 스크린 리더에 진행 메시지 자동 업데이트
- [ ] 단계 9 (언마운트): 오버레이 표시 중 세션 목록으로 뒤로가기
  - 기대: `tIsCancelled` 플래그로 retry loop가 조용히 종료 (Network 탭에 추가 요청 없음)

**합격 기준**: 7/9 이상
**비고**:
- `REPORT_RETRY_ATTEMPTS = 5` × `REPORT_RETRY_INTERVAL_MS = 2000` = 10초 상한 (A.2 overlay 메시지와 일치)
- "아직 준비" / "리포트가 아직" / "HTTP 404" 세 패턴으로 not-ready 판별 (`NOT_READY_MARKER_JSON/HEADER/STATUS`)

---

## §2. 네비게이션 + 상태 복원 (B.x)

### V.5 — B.1: 로그인 상태 Hero CTA 역할별 분기

**목적**: 로그인된 사용자가 `/`에 접근하면 Hero CTA가 역할에 맞는 단일 CTA로 전환되는지 확인
**선행 조건**: 랜딩 진입 직전 테스트할 역할로 로그인 완료
**이전 버그**: 로그인된 사용자도 "바로 체험하기 / 로그인" 두 버튼을 봐야 했고, 게스트 설명 캡션이 계속 노출됨
**기대 결과**: `user.role`에 따라 다음 중 하나 CTA 표시
- student: "대화 계속하기 →" (게스트면 "체험 계속하기 →")
- instructor: "강사 대시보드로 →"
- admin: "관리자 대시보드로 →"

- [ ] 단계 1: 시크릿 창 + `/` → 비로그인 상태 CTA 확인 (기준선)
  - 기대: "바로 체험하기" + "로그인" 두 버튼 + "회원가입 없이 5턴 무료 체험" 캡션 표시
- [ ] 단계 2: `student@demo.com` 로그인 → 리다이렉트된 `/student/chat`에서 브라우저 주소창에 `/` 입력 + Enter
  - 기대: 랜딩 페이지 재렌더
- [ ] 단계 3: Hero 영역 CTA 확인
  - 기대: 단일 버튼 "대화 계속하기 →" (`user.isGuest === false`이므로 "체험 계속하기"가 아님)
- [ ] 단계 4: "바로 체험하기" + "로그인" 버튼 **표시되지 않음** 확인
  - 기대: Hero CTA 영역에 버튼 1개만 존재
- [ ] 단계 5: "회원가입 없이 5턴 무료 체험" 캡션 **표시되지 않음** 확인
  - 기대: 캡션 `<p>` 가 `!user` 가드로 숨겨짐
- [ ] 단계 6: "대화 계속하기" 클릭
  - 기대: `handleContinue()` → `getHomePathForRole("student")` = `/student/chat` 이동
- [ ] 단계 7: 로그아웃 (Navbar 드롭다운 → 로그아웃) → `/` 재방문
  - 기대: 기본 CTA (게스트 + 로그인) 복귀
- [ ] 단계 8: `instructor@demo.com` 로그인 → `/` 재방문
  - 기대: Hero CTA "강사 대시보드로 →" 단일 버튼
- [ ] 단계 9: 강사 CTA 클릭 → `/instructor/dashboard` 이동
  - 기대: 강사 대시보드 렌더
- [ ] 단계 10: `admin@demo.com` 로그인 → `/` 재방문
  - 기대: Hero CTA "관리자 대시보드로 →" 단일 버튼
- [ ] 단계 11: 관리자 CTA 클릭 → `/admin/dashboard` 이동
  - 기대: 관리자 대시보드 렌더
- [ ] 단계 12: 게스트 체험 진입 (비로그인 → "바로 체험하기") → `/` 재방문
  - 기대: Hero CTA "체험 계속하기 →" (`user.isGuest === true`)

**합격 기준**: 10/12 이상
**비고**:
- `getContinueCtaLabel()` 로직: role이 instructor/admin이면 고정 라벨, student이면 `isGuest`에 따라 분기.
- 하단 "다른 역할 체험" 데모 섹션은 로그인 상태에서도 유지 (역할 전환 데모 용도).

---

### V.6 — B.2: Navbar 로고 `getHomePathForRole` 적용

**목적**: Navbar 좌상단 ThinkBridge 로고가 로그인 상태에서 역할별 홈으로 링크되는지 확인
**선행 조건**: 각 역할로 로그인 후 다양한 내부 페이지에서 로고 클릭
**이전 버그**: 로고 `href`가 항상 `/` 이었음 → 로그인된 사용자가 실수로 랜딩으로 돌아가 재진입 혼란 경험
**기대 결과**: `user ? getHomePathForRole(user.role) : "/"` 로직대로 동작

- [ ] 단계 1: 비로그인 상태 + `/login` 페이지 → 로고 클릭
  - 기대: `/` 이동
- [ ] 단계 2: `student@demo.com` 로그인 → `/student/sessions` 이동 → 로고 클릭
  - 기대: `/student/chat` 이동 (HOME_PATH_STUDENT)
- [ ] 단계 3: `/student/report/{id}` (아무 completed 리포트) 진입 → 로고 클릭
  - 기대: `/student/chat` 이동
- [ ] 단계 4: 로그아웃 → `/` → 로고 클릭
  - 기대: `/` 유지 (이미 `/`)
- [ ] 단계 5: `instructor@demo.com` 로그인 → `/instructor/dashboard` → 학생 카드 클릭하여 `/instructor/replay/{id}?name=...` 진입 → 로고 클릭
  - 기대: `/instructor/dashboard` 이동 (HOME_PATH_INSTRUCTOR)
- [ ] 단계 6: `admin@demo.com` 로그인 → `/admin/dashboard` → 로고 클릭
  - 기대: `/admin/dashboard` 유지 (HOME_PATH_ADMIN)
- [ ] 단계 7: DevTools Elements에서 로고 `<a>` 의 `href` 속성 직접 확인
  - 기대: 로그인 시 `/student/chat` (또는 역할별 경로), 비로그인 시 `/`

**합격 기준**: 6/7 이상
**비고**:
- `HOME_PATH_STUDENT = "/student/chat"`, `HOME_PATH_INSTRUCTOR = "/instructor/dashboard"`, `HOME_PATH_ADMIN = "/admin/dashboard"` 상수는 `frontend/src/lib/auth.tsx`에서 export.
- Navbar 로고는 Next.js `<Link>` 컴포넌트 사용이므로 클라이언트 사이드 네비게이션 (전체 페이지 리로드 없음).

---

### V.7 — B.3 (CRITICAL): 진행중 세션 재개 시 메시지/분석/턴/stage 복원

**목적**: 학생이 세션 목록에서 Active 세션 카드를 클릭해 재개할 때 이전 대화가 복원되는지 확인
**선행 조건**: `student@demo.com` 로그인 + 이 계정에 active 세션 + 2-3턴 이상 진행된 상태가 존재 (Setup 섹션 참조)
**이전 버그**:
- 이전 메시지가 렌더되지 않고 "안녕하세요!" 환영 카드가 표시됨
- 턴 카운트가 0으로 초기화되어 guest `5/5` 제한 계산이 깨짐
- ThoughtPanel이 비어있어 이전 분석 결과가 사라짐
- ProgressBar가 항상 Stage 1 표시

**기대 결과**: 재개 시 이전 메시지 전부 복원 + `initialTurnCount` + `initialAnalysis` + `initialStage`가 DB 상태와 일치

- [ ] 단계 1: `/student/sessions` 진입
  - 기대: 세션 목록 렌더, active 세션 카드에 초록 "진행 중" 뱃지
- [ ] 단계 2: Active 세션 카드 클릭
  - 기대: URL이 `/student/chat?sessionId={id}` 로 변경
- [ ] 단계 3: 이동 중 로딩 뷰 확인
  - 기대: 중앙 정렬 `flex min-h-[calc(100vh-4rem)] items-center justify-center` 내 인디고 spinner (`h-10 w-10 animate-spin`) + "이전 대화를 불러오고 있어요..." + "잠시만 기다려 주세요"
- [ ] 단계 4: 로딩 완료 (일반적으로 500ms-2초) 후 ChatInterface 렌더
  - 기대: `mIsLoadingSession = false` → ChatInterface 마운트
- [ ] 단계 5: 이전 사용자/AI 메시지가 **모두 렌더**되는지 확인
  - 기대: `convertDetailMessagesToChatMessages`로 변환된 turnNumber 오름차순 메시지 배열 (같은 턴이면 user → assistant 순)
- [ ] 단계 6: 상단 뱃지 턴 카운트 확인 (게스트의 경우)
  - 기대: "체험 중 (N/5)" 에서 N은 DB의 `totalTurns` 값 (0이 아님)
- [ ] 단계 7: Welcome 카드 "안녕하세요!" **표시되지 않음** 확인
  - 기대: `mMessages.length === 0 && !mIsStreaming && !initialMessages` 가드에서 `!initialMessages` 분기로 숨겨짐
- [ ] 단계 8: ThoughtPanel 분석 결과 확인
  - 기대: 가장 최근 assistant 턴의 6차원 점수 + socraticStage + engagementLevel 표시
- [ ] 단계 9: ProgressBar 현재 stage 확인
  - 기대: `initialStage = getLastStageFromAnalyses()` 결과가 1이 아닌 진행된 단계 (e.g., 2-3)
- [ ] 단계 10: 추가 메시지 전송
  - 기대: 기존 대화 이어지고 SSE streaming 정상 동작 + 턴 카운트가 N+1로 증가
- [ ] 단계 11: DevTools Network 탭에서 `/api/sessions/{id}` GET 호출 1회 확인
  - 기대: `getSessionDetail` 1회 호출, 응답에 `messages` 배열 + `totalTurns` 포함
- [ ] 단계 12: DevTools Console에서 에러 없음 확인
  - 기대: `Failed to load session` 로그 없음

**합격 기준**: 10/12 이상 (CRITICAL — 최소 9개는 반드시 통과해야 함)
**비고**:
- `getLastAssistantAnalysis` 은 messages 배열을 역순 순회하여 `analysis != null`인 마지막 assistant 턴을 찾음.
- `DEFAULT_SOCRATIC_STAGE = 1` 은 분석이 하나도 없을 때만 fallback.
- 로딩 뷰는 단계 3의 플래시 방지용 — `mIsLoadingSession = true` 일 때 "새 대화 시작" 카드 대신 렌더.

---

### V.8 — B.3 추가: Completed 세션은 리포트로 자동 리다이렉트

**목적**: URL 조작 또는 stale history로 completed 세션의 chat URL에 접근 시 리포트 페이지로 자동 이동
**선행 조건**: `student@demo.com` 로그인 + completed 세션 1개 이상 존재
**이전 버그**: 종료된 세션을 chat 페이지에서 "계속" 작성하려 하면 backend 제약으로 오류 발생 가능
**기대 결과**: `router.replace`로 `/student/report/{id}` 이동 (브라우저 히스토리에 chat URL 남지 않음)

- [ ] 단계 1: `/student/sessions`에서 completed 세션 ID 확인 (DevTools Network 탭 → `/api/sessions` 응답 JSON 에서 `status === "completed"` 엔트리의 `id`)
  - 기대: 예를 들어 ID `42`
- [ ] 단계 2: 주소창에 직접 `/student/chat?sessionId=42` 입력 + Enter
  - 기대: 로딩 뷰 잠깐 표시 → 감지 후 리포트로 리다이렉트
- [ ] 단계 3: URL 이 `/student/report/42` 로 변경되는지 확인
  - 기대: `tDetail.status === SESSION_STATUS_COMPLETED` → `router.replace(/student/report/{id})`
- [ ] 단계 4: 브라우저 뒤로가기 버튼 클릭
  - 기대: `/student/sessions` 로 이동 (replace 사용이므로 chat URL은 히스토리에 없음)
- [ ] 단계 5: 리포트 페이지 정상 렌더 확인
  - 기대: Radar + Summary + Growth + Timeline 모두 표시

**합격 기준**: 4/5 이상
**비고**:
- `SESSION_STATUS_COMPLETED = "completed"` 은 백엔드 `SessionStatus.value` 값과 일치.
- 완료된 세션 편집 방지가 주 목적 — SSE 전송 시도하기 전에 early return 하도록 early redirect.

---

### V.9 — B.4: 세션 목록 completed 카드 "리포트" 명시 CTA

**목적**: 완료된 세션 카드에 "리포트" 버튼이 명시적으로 노출되어 사용자가 리포트 접근 경로를 즉시 인지
**선행 조건**: `student@demo.com` 로그인 + completed + active 세션 모두 존재
**이전 버그**: 카드 클릭만으로 리포트 이동 — 사용자는 "완료"된 세션에서 리포트를 볼 수 있다는 것을 즉시 알지 못함
**기대 결과**: completed 카드에만 `<Button size="sm" variant="outline">` "리포트" 버튼 (FileText 아이콘) 표시

- [ ] 단계 1: `/student/sessions` 진입
  - 기대: 세션 카드 목록 렌더
- [ ] 단계 2: Completed 뱃지 (파란색 `CheckCircle2`) 카드의 우측 영역 확인
  - 기대: 상태 뱃지 다음에 `variant="outline"` "리포트" 버튼 표시. `FileText` 아이콘 + "리포트" 텍스트 (`REPORT_CTA_LABEL`)
- [ ] 단계 3: Active 뱃지 (초록 `Clock`) 카드 확인
  - 기대: 상태 뱃지 다음에 리포트 버튼 **없음** (completed 가드)
- [ ] 단계 4: Completed 카드의 "리포트" 버튼 클릭
  - 기대: `/student/report/{id}` 이동
- [ ] 단계 5: 뒤로가기 후 Completed 카드의 **body 영역** 클릭 (아이콘 + 제목 영역)
  - 기대: 동일한 `/student/report/{id}` 이동 (버튼 click 이 부모 카드 onClick으로 버블링)
- [ ] 단계 6: DevTools Elements에서 "리포트" 버튼과 카드의 이벤트 구조 확인
  - 기대: 버튼에 `stopPropagation` 없음 — 의도적인 bubble

**합격 기준**: 5/6 이상
**비고**:
- 버튼 클릭 시 `stopPropagation`을 하지 않은 것은 기존 카드 router push 로직을 재활용하기 위함 (중복 route 로직 제거).

---

### V.10 — B.5: 강사 리플레이 헤더에 학생·세션 정보 표시

**목적**: `/instructor/replay/{studentId}?name=...` 에서 헤더가 "세션 리플레이" 단독 문구 대신 학생 이름 + 과목 + 주제 + 세션 ID 메타 정보 노출
**선행 조건**: `instructor@demo.com` 로그인 + 해당 강사의 반에 학생 데이터 존재
**이전 버그**: 헤더가 "세션 리플레이" 고정 문구만 표시 → 강사가 어떤 학생의 어떤 세션을 보는지 불분명
**기대 결과**: `?name=` query param 수신 + 헤더에 학생 이름 표시 + 세션 detail 로드 후 과목·주제·세션 ID 추가

- [ ] 단계 1: `instructor@demo.com` 로그인 → `/instructor/dashboard` 진입
  - 기대: 반 선택기 + 통계 카드 + 히트맵 + 학생 목록 렌더
- [ ] 단계 2: StudentList에서 학생 카드 하나 클릭 (예: "김민수")
  - 기대: URL이 `/instructor/replay/{studentId}?name=%EA%B9%80%EB%AF%BC%EC%88%98` (encoded 한글)로 변경
- [ ] 단계 3: 헤더 영역 확인
  - 기대: 상단 제목 "세션 리플레이" + 그 아래 메타 라인 — `<User>` 아이콘(`h-4 w-4`) + "**김민수**" (`font-medium text-gray-700`) + "·" 구분자
- [ ] 단계 4: 첫 번째 세션 자동 선택되면서 `mSessionDetail` 로드
  - 기대: 메타 라인에 추가로 과목 (`SUBJECT_LABELS[subject]` 또는 raw) + "·" + 주제 (`truncate max-w-xs`) + "·" + "세션 #{id}"
- [ ] 단계 5: 전체 메타 라인 예시 확인
  - 기대: "`User icon` **김민수** · 수학 · 이차방정식의 근의 공식 · 세션 #12"
- [ ] 단계 6: 대시보드 뒤로가기 후 HeatmapChart에서 다른 학생 row 클릭 (예: "이서연")
  - 기대: URL `?name=%EC%9D%B4%EC%84%9C%EC%97%B0` + 헤더 "이서연" (HeatmapChart의 `router.push` 도 동일한 encodeURIComponent 적용)
- [ ] 단계 7: `?name` query param 없이 URL 직접 진입 (예: `/instructor/replay/5`)
  - 기대: fallback `UNKNOWN_STUDENT_LABEL = "학생"` 표시, 크래시 없음
- [ ] 단계 8: `?name=` 빈 문자열 (예: `/instructor/replay/5?name=`) 진입
  - 기대: 동일하게 "학생" fallback
- [ ] 단계 9: "대시보드로 돌아가기" 버튼 확인
  - 기대: 헤더 우측 정렬 (`ml-auto` 또는 `justify-between`), 클릭 시 `/instructor/dashboard` 이동

**합격 기준**: 7/9 이상
**비고**:
- Next.js 14 `useSearchParams` 를 사용하므로 `InstructorReplayPageInner` 가 `Suspense` 경계 안에서 렌더됨.
- URL path param 이름 `[sessionId]` 는 실제로는 studentId leftover — 제출 이후 rename 대상 (docs/revise_plan_v3/03_structural.md P2-16).

---

## §3. UI 폴리시 (C.x)

### V.11 — C.1: 종료 버튼 4-state (base / hover / active / disabled)

**목적**: `variant="outline"` + 명시적 상태 클래스로 종료 버튼이 각 상태에서 시각적으로 뚜렷이 구분됨
**선행 조건**: 채팅 세션 진행 중
**이전 버그**: `variant="ghost"` — 테두리 없음 + 활성/비활성 배경 차이 미미 → 사용자가 클릭 가능 여부 판단 어려움
**기대 결과**: 4-state 뚜렷한 시각 차이 + 150ms transition

- [ ] 단계 1: 게스트로 채팅 진입 → 주제 선택 + 세션 시작 → **아직 메시지 없음** 상태에서 종료 버튼 확인
  - 기대: **disabled** 상태 — `border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed` (회색 톤) + `<Square>` 아이콘 `text-gray-300`
  - 비고: 이 단계는 원래 초기 화면(ChatInterface 첫 진입)이 아니라 Welcome 카드 상태. 종료 버튼은 `mMessages.length === 0` 가드로 disabled.
- [ ] 단계 2: 메시지 1개 전송 후 종료 버튼 재확인
  - 기대: **base (active)** 상태 — `border-red-300 bg-white text-red-600` (흰 배경 + 빨강 테두리/텍스트)
- [ ] 단계 3: 마우스를 종료 버튼 위에 호버
  - 기대: **hover** 상태 — `border-red-500 bg-red-50 text-red-700` (더 짙은 빨강 + 연한 빨강 배경) + `transition-colors duration-150` 매끄러운 전환
- [ ] 단계 4: 종료 버튼을 마우스 클릭 (누르고 있는 상태)
  - 기대: **active (pressed)** 상태 — `bg-red-100` (hover보다 더 짙은 배경, 짧게 표시됨)
- [ ] 단계 5: 마우스 떼고 클릭 완료 → 종료 중 상태 (`mIsEnding = true`) 진입
  - 기대: 다시 disabled 스타일 (회색) + 오버레이 등장
- [ ] 단계 6: 스트리밍 중 종료 버튼 상태 확인
  - 기대: `mIsStreaming = true` 동안 `disabled` 속성으로 **disabled 스타일** 표시
- [ ] 단계 7: 접근성 확인
  - 기대: 버튼에 `aria-label="대화 종료"` + `title="대화 종료"` 속성 → 스크린 리더 / hover tooltip 지원
- [ ] 단계 8: DevTools Elements에서 클래스 토큰 확인
  - 기대: `variant="outline"` + 다음 클래스 체인 존재 — `border-red-300 bg-white text-red-600 hover:border-red-500 hover:bg-red-50 hover:text-red-700 active:bg-red-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-300 transition-colors duration-150`
- [ ] 단계 9: 아이콘/텍스트 가시성 확인
  - 기대: `<Square>` 아이콘 (`h-3.5 w-3.5`) 항상 표시, "종료" 텍스트는 `hidden sm:inline` (sm 이상 뷰포트에서만)

**합격 기준**: 7/9 이상
**비고**:
- 힌트 버튼(amber)은 이 pass에서 변경 없음 — 시각적으로 이미 send/end와 구분되어 있다고 판단.
- 클릭 중 `active:bg-red-100` 은 브라우저/OS에 따라 매우 짧아 관찰이 어려울 수 있음 (마우스 다운-업 200ms 이하).

---

### V.12 — C.2: 모바일 햄버거 `/student/chat`에서만 좌하단 배치

**목적**: 채팅 페이지의 입력 바 우측 Send/종료 버튼과 모바일 햄버거가 겹치지 않도록 위치 조건부 변경
**선행 조건**: 학생 로그인 + DevTools Device Toolbar 모바일 뷰포트
**이전 버그**: 모바일 채팅 페이지에서 햄버거(`bottom-4 right-4`)와 입력 바 Send/종료 버튼이 겹쳐 터치 불가
**기대 결과**: `/student/chat` 에서만 `bottom-4 left-4` (좌하단), 그 외 페이지는 기본 `bottom-4 right-4` (우하단)

- [ ] 단계 1: DevTools → Device Toolbar (Ctrl+Shift+M) → **iPhone 14 Pro (390×844)** 선택
  - 기대: 뷰포트가 390px 폭으로 축소
- [ ] 단계 2: 학생 로그인 후 `/student/chat` 진입 (주제 선택 카드 or ChatInterface)
  - 기대: 페이지 렌더
- [ ] 단계 3: 햄버거 버튼 위치 확인
  - 기대: `fixed z-50 md:hidden bottom-4 left-4` (좌하단) — `HAMBURGER_CHAT_POSITION`
- [ ] 단계 4: 입력창 우측의 Send / 종료 / 힌트 버튼 클러스터와 **겹치지 않음** 확인
  - 기대: 햄버거는 좌측 하단, 버튼 클러스터는 우측 입력바 내부 — 시각적으로 격리됨
- [ ] 단계 5: 햄버거 클릭 → Sheet 슬라이드인
  - 기대: 좌측에서 `w-64` Sheet 등장 (`SheetContent side="left"`) — 네비 아이템 렌더
- [ ] 단계 6: Sheet의 "세션 목록" 클릭 → `/student/sessions` 이동
  - 기대: 세션 목록 페이지 렌더
- [ ] 단계 7: 세션 목록에서 햄버거 위치 확인
  - 기대: `fixed bottom-4 right-4 z-50 md:hidden` (우하단) — `HAMBURGER_DEFAULT_POSITION`
- [ ] 단계 8: `/student/report/{id}` 진입 (완료 세션에서 리포트 버튼) → 햄버거 위치 확인
  - 기대: 우하단 `bottom-4 right-4`
- [ ] 단계 9: Device Toolbar 해제 (데스크톱 뷰포트 복귀)
  - 기대: 햄버거 숨김 (`md:hidden` → md 이상에서 숨겨짐), 데스크톱 사이드바 표시
- [ ] 단계 10: DevTools Elements 에서 햄버거 컨테이너 클래스 확인
  - 기대: `cn("fixed z-50 md:hidden", tHamburgerPositionClass)` — pathname에 따라 `bottom-4 left-4` 또는 `bottom-4 right-4`

**합격 기준**: 8/10 이상
**비고**:
- `CHAT_PAGE_PATH = "/student/chat"` 정확 비교 (`pathname === CHAT_PAGE_PATH`) — subpath는 매칭 안됨.
- 좌하단 선택 이유: 채팅 입력 바가 하단 strip을 우측에만 차지하므로 좌하단은 엄지 터치 범위 내 + 시각 밸런스.

---

## §4. 튜토리얼 오버레이 (D.1)

> 구현 구조 요약 (참고):
> - **Provider**: `frontend/src/lib/tutorial.tsx` — `TutorialProvider` + `useTutorial()` + `useAutoStartTutorial(id, ready)` + `waitForTarget(selector, timeoutMs)`
> - **Overlay**: `frontend/src/components/tutorial/TutorialOverlay.tsx` — `createPortal(..., document.body)` + SVG mask spotlight + 4 placements (top/bottom/left/right) + center fallback
> - **Button**: `frontend/src/components/tutorial/TutorialButton.tsx` — `?` (HelpCircle) 아이콘, props `tutorialId`
> - **Constants**: `frontend/src/lib/tutorialConstants.ts` — `TUTORIAL_OVERLAY_Z_INDEX = 80`, `TUTORIAL_WAIT_DEFAULT_TIMEOUT_MS = 5000`, `TUTORIAL_MOBILE_BREAKPOINT_PX = 768`, `TUTORIAL_BACKDROP_OPACITY = 0.55`, storage prefix `thinkbridge_tutorial_`, version suffix `_v1`, disable key `thinkbridge_tutorial_disabled`
> - **Steps**: `frontend/src/lib/tutorialSteps.ts` — 4 튜토리얼 × 18 steps
>   - chat: 7 steps (`chat-intro`, `chat-topic`, `chat-start`, `chat-progress`, `chat-analysis`, `chat-hint`, `chat-end`)
>   - sessions: 3 steps (`sessions-new`, `sessions-card`, `sessions-report`)
>   - instructor: 4 steps (`instructor-class`, `instructor-summary`, `instructor-heatmap`, `instructor-students`)
>   - admin: 4 steps (`admin-banner`, `admin-stats`, `admin-bar`, `admin-radar`)
> - **Auto-start 게이팅 조건** (각 페이지마다 다름):
>   - chat: `!mIsLoadingSession`
>   - sessions: `!mIsLoading && mSessions.length > 0` (세션 0개면 auto-trigger 안 함)
>   - instructor: `!mIsLoadingData && !!mHeatmap`
>   - admin: `!mIsLoading && !!mStats`

### V.16 — D.1 chat: 채팅 튜토리얼 auto-trigger + 7 steps + 동적 타겟

**목적**: 게스트 또는 신규 학생이 `/student/chat` 최초 진입 시 7단계 튜토리얼이 auto-trigger되고, 세션 시작 전/후 타겟이 모두 올바르게 스포트라이트 처리되는지 확인
**선행 조건**:
- 시크릿 창 (localStorage 비어있어야 함)
- DevTools Application 탭 → LocalStorage 에서 `thinkbridge_tutorial_chat_v1` 키 **존재하지 않음** 사전 확인
- 게스트 또는 학생 계정으로 `/student/chat` 진입

**이전 버그**: 기능 부재 — 신규 사용자는 화면 요소의 역할 안내를 받지 못해 "어디를 눌러야 하지?" 혼란

**기대 결과**: `mIsLoadingSession === false` 조건 충족 직후 튜토리얼 1단계 오버레이 자동 등장 → 7단계 순차 진행 → 마지막 "완료" 클릭 시 localStorage에 완료 플래그 기록

- [ ] 단계 1: 시크릿 창 + 게스트/학생 로그인 → `/student/chat` 진입
  - 기대: 페이지 로드 완료 직후 (500ms-1s) 전체 화면 반투명 백드롭(`rgba(0,0,0,0.55)`) + 첫 스텝 타겟 `[data-tutorial-id='chat-subject-selector']` 에 SVG mask 스포트라이트 (주변만 어둡고 해당 영역만 선명)
- [ ] 단계 2: 툴팁 카드 내용 확인 (step 1/7)
  - 기대: 제목 "과목을 선택하세요" + 설명 "수학·과학·논술 중 오늘 대화할 주제 영역을 고릅니다..." + X 닫기 아이콘 + 스텝 카운터 "1/7" + "건너뛰기" + "다음" 버튼 (이전 버튼은 첫 스텝이므로 숨김/비활성)
- [ ] 단계 3: "다음" 클릭 → step 2 전환
  - 기대: 스포트라이트가 `[data-tutorial-id='chat-topic-input']` 로 이동 (input 영역) + 제목 "주제를 입력하세요" + 카운터 "2/7"
- [ ] 단계 4: "다음" 클릭 → step 3 전환
  - 기대: `[data-tutorial-id='chat-start-button']` ("대화 시작하기" 버튼) 하이라이트 + 제목 "대화 시작" + placement `top` (버튼 위쪽 툴팁)
- [ ] 단계 5: **이 시점에 "다음" 클릭 — 세션 아직 시작 전**이므로 step 4 타겟 `[data-tutorial-id='chat-progress-bar']`는 DOM에 없음
  - 기대 A (정상): `waitForTarget` 5초 polling — 이 시점에 사용자가 튜토리얼을 일시 중지한 상태로 "대화 시작하기" 클릭 → ChatInterface 마운트되면서 progress bar 생성 → 튜토리얼이 타겟을 찾아 step 4 하이라이트
  - 기대 B (5초 초과 시): `waitForTarget` 타임아웃 → placement = `center` fallback (툴팁 중앙 배치, 스포트라이트 없음) → 사용자는 "다음"으로 넘어가거나 "건너뛰기"
  - **참고**: 본 시나리오는 기대 A 플로우로 진행. 기대 B 는 V.24에서 별도 검증.
- [ ] 단계 6: 튜토리얼 일시 진행 중에 "대화 시작하기" 실제 클릭 → 세션 생성 → ChatInterface 렌더
  - 기대: progress bar + hint 버튼 + end 버튼 + thought panel 모두 DOM에 마운트 → 튜토리얼이 이를 감지하여 step 4 `[data-tutorial-id='chat-progress-bar']` 하이라이트 전환 (자연스러운 transition)
- [ ] 단계 7: "다음" × 4회 → step 5 (thought panel), step 6 (hint), step 7 (end) 순차 진행
  - 기대: 각 step 의 올바른 target + title + placement
  - 비고: step 5 placement = `left` (ThoughtPanel 우측에 있으므로), step 6/7 = `top`
- [ ] 단계 8: 마지막 스텝 (7/7) 에서 "다음" 버튼 라벨 확인
  - 기대: `TUTORIAL_BTN_FINISH = "완료"` 로 전환됨 (더 이상 다음 스텝 없으므로)
- [ ] 단계 9: "완료" 클릭
  - 기대: 오버레이 사라짐 + 포커스 복원 (`TUTORIAL_FOCUS_RESTORE_MS = 50ms`) + localStorage 에 `thinkbridge_tutorial_chat_v1 = "true"` 저장
- [ ] 단계 10: 페이지 새로고침 (F5)
  - 기대: localStorage 플래그 때문에 튜토리얼 **auto-trigger 안 됨** (정상 채팅 UI만 표시)
- [ ] 단계 11: DevTools Application → LocalStorage 직접 확인
  - 기대: `thinkbridge_tutorial_chat_v1` 키에 `"true"` 값

**합격 기준**: 9/11 이상
**비고**:
- Step 1-3 (pre-session) 은 `ChatPage` 상단 주제 선택 영역, step 4-7 (post-session) 은 `ChatInterface` 내부로 DOM 위치가 다름. 스포트라이트 좌표는 viewport 기준 실시간 계산되므로 scrollIntoView + `TUTORIAL_SCROLL_STABILIZE_MS = 150ms` 딜레이 뒤 측정.
- 7 steps 중간에 페이지 이탈 (예: Sidebar 클릭) 시 튜토리얼은 건너뛴 것으로 간주되지 않음 — completion 플래그 미저장 상태로 남음 → 재진입 시 재시작 가능.

---

### V.17 — D.1 sessions: 세션 목록 튜토리얼 (3 steps, 첫 카드만 하이라이트)

**목적**: `/student/sessions` 첫 방문 시 3단계 튜토리얼이 auto-trigger되고, 첫 번째 / 첫 번째 완료 카드에만 `data-tutorial-id` 가 조건부로 부여되는지 확인
**선행 조건**:
- `student@demo.com` 로그인 (세션 여러 개 보유)
- localStorage `thinkbridge_tutorial_sessions_v1` 키 **없음** (Application 탭 삭제)
- 적어도 active 1 + completed 1 카드 존재

**이전 버그**: 없음 (D.1 신규 기능)

**기대 결과**:
- `useAutoStartTutorial("sessions", !mIsLoading && mSessions.length > 0)` 게이팅 → 로딩 완료 + 세션 ≥ 1 일 때 auto-trigger
- step 2 타겟 `sessions-card-first` 는 **첫 번째 카드** 에만 attribute 존재 (`isFirst ? "..." : undefined`)
- step 3 타겟 `sessions-report-cta` 는 **첫 번째 completed 카드의 리포트 버튼** 에만 존재 (`isFirstCompleted ? "..." : undefined`)

- [ ] 단계 1: `/student/sessions` 진입
  - 기대: 세션 목록 로드 → 약 500ms 이내 튜토리얼 오버레이 등장 (step 1/3)
- [ ] 단계 2: step 1 타겟 확인
  - 기대: 상단 "새 대화 시작하기" 버튼 (`[data-tutorial-id='sessions-new-chat']`) 스포트라이트 + 제목 "새 대화 시작" + placement `bottom`
- [ ] 단계 3: "다음" → step 2 전환
  - 기대: **첫 번째** 세션 카드만 스포트라이트 — DevTools Elements에서 확인: 첫 카드에 `data-tutorial-id="sessions-card-first"` 존재, 나머지 카드에는 없음
- [ ] 단계 4: "다음" → step 3 전환
  - 기대 A: **첫 번째 completed 카드**의 "리포트" 버튼 (FileText 아이콘) 스포트라이트 + 제목 "리포트 보기" + placement `left`
  - 기대 B (edge): completed 세션 0개인 경우 → `waitForTarget` 5초 타임아웃 → center fallback (본 시나리오는 completed ≥ 1 전제)
- [ ] 단계 5: "완료" 클릭 → 오버레이 종료
  - 기대: localStorage 에 `thinkbridge_tutorial_sessions_v1 = "true"` 저장 + 포커스 복원
- [ ] 단계 6: 페이지 새로고침
  - 기대: 튜토리얼 auto-trigger **안 됨**
- [ ] 단계 7: 첫 카드가 active이고 두 번째 카드부터 completed인 경우 DevTools Elements 검증
  - 기대: 첫 카드에 `sessions-card-first` 존재, 두 번째 카드(첫 completed)에 `sessions-report-cta` 존재 — 두 attribute가 서로 다른 카드에 있어도 정상 (step 3 이 별개 카드 타겟)
- [ ] 단계 8 (edge): localStorage 클리어 + 세션 **0개** 상태 (신규 학생 가정) 로 진입
  - 기대: `mSessions.length > 0` 조건 실패 → auto-trigger 안 됨 → 세션 생성 후 재방문 시에만 trigger

**합격 기준**: 6/8 이상
**비고**:
- 첫 카드가 "첫 번째 completed" 가 아닐 수도 있음 (가장 최근 세션이 active 일 때). 실제 attribute 할당 로직은 `isFirst = index === 0`, `isFirstCompleted = session === firstCompletedSession` 로 분리되어 있음.
- 세션 0개 edge는 정상 동작 — 튜토리얼은 "보여줄 카드 없음" 상태에서 스킵되고, 첫 세션 생성 후 다시 `/student/sessions` 방문 시 뜬다.

---

### V.18 — D.1 instructor: 강사 대시보드 튜토리얼 (4 steps)

**목적**: `/instructor/dashboard` 첫 방문 시 4단계 튜토리얼이 heatmap 로드 후 auto-trigger
**선행 조건**:
- `instructor@demo.com` 로그인
- localStorage `thinkbridge_tutorial_instructor_v1` 키 **없음**
- 해당 강사의 반에 학생 데이터 존재 (히트맵 렌더 가능해야 함)

**기대 결과**:
- 게이팅: `!mIsLoadingData && !!mHeatmap` → 히트맵 데이터 로드 완료 후 trigger
- 4 steps: 반 선택 → 요약 카드 → 히트맵 → 학생 목록

- [ ] 단계 1: `/instructor/dashboard` 진입
  - 기대: 반 선택기 + 통계 카드 + 히트맵 + 학생 목록 렌더 → 히트맵 완료 직후 튜토리얼 step 1/4 오버레이 등장
- [ ] 단계 2: step 1 타겟 확인
  - 기대: `[data-tutorial-id='instructor-class-selector']` 스포트라이트 + 제목 "반 선택" + placement `bottom`
- [ ] 단계 3: "다음" → step 2
  - 기대: `[data-tutorial-id='instructor-summary-cards']` (4 카드 컨테이너 전체) 스포트라이트 + 제목 "반 요약 통계"
- [ ] 단계 4: "다음" → step 3
  - 기대: `[data-tutorial-id='instructor-heatmap']` 스포트라이트 + 제목 "사고력 히트맵" + placement `top` + 설명에 "AI 인사이트" 언급 포함
- [ ] 단계 5: "다음" → step 4
  - 기대: `[data-tutorial-id='instructor-student-list']` 스포트라이트 + 제목 "학생 목록" + placement `top`
- [ ] 단계 6: "완료" → 종료
  - 기대: localStorage `thinkbridge_tutorial_instructor_v1 = "true"` 저장
- [ ] 단계 7: 페이지 새로고침 → 재진입
  - 기대: auto-trigger **안 됨**
- [ ] 단계 8: DevTools Network → `/api/dashboard/classes/{id}/heatmap` 응답 인위적 지연 (Slow 3G) 후 페이지 로드
  - 기대: 히트맵 로딩 중에는 튜토리얼 **표시 안 됨** (게이팅 조건 미충족) → 히트맵 도착 후에야 trigger

**합격 기준**: 6/8 이상
**비고**:
- 반이 여러 개면 ClassSelector 로 다른 반을 선택해도 튜토리얼은 처음 1회만 뜬다 (storageKey 단위).
- heatmap 로드 실패(500 에러 등) 시 `mHeatmap` 이 null 로 남아 auto-trigger 안 됨 — 정상 동작 (에러 상태에서 튜토리얼 강요하지 않음).

---

### V.19 — D.1 admin: 관리자 대시보드 튜토리얼 (4 steps)

**목적**: `/admin/dashboard` 첫 방문 시 4단계 튜토리얼이 stats 로드 후 auto-trigger
**선행 조건**:
- `admin@demo.com` 로그인
- localStorage `thinkbridge_tutorial_admin_v1` 키 **없음**

**기대 결과**:
- 게이팅: `!mIsLoading && !!mStats` → 통계 API 응답 완료 후 trigger
- 4 steps: Demo 배너 → 통계 카드 → 반별 bar → 과목별 radar

- [ ] 단계 1: `/admin/dashboard` 진입
  - 기대: 통계 + 2개 차트 렌더 완료 후 튜토리얼 step 1/4 등장
- [ ] 단계 2: step 1 타겟 확인
  - 기대: `[data-tutorial-id='admin-demo-banner']` (상단 "데모 데이터입니다..." 안내 배너) 스포트라이트 + 제목 "데모 데이터 안내" + placement `bottom`
- [ ] 단계 3: "다음" → step 2
  - 기대: `[data-tutorial-id='admin-stats-cards']` (4 카드 컨테이너) 스포트라이트 + 제목 "전체 통계"
- [ ] 단계 4: "다음" → step 3
  - 기대: `[data-tutorial-id='admin-bar-chart']` (Card 컨테이너) 스포트라이트 + 제목 "반별 사고력 비교" + placement `top`
- [ ] 단계 5: "다음" → step 4
  - 기대: `[data-tutorial-id='admin-radar-chart']` 스포트라이트 + 제목 "과목별 6차원 레이더" + placement `top`
- [ ] 단계 6: "완료" → 종료
  - 기대: localStorage `thinkbridge_tutorial_admin_v1 = "true"` 저장
- [ ] 단계 7: 재진입 시 auto-trigger 안 됨
  - 기대: 정상 대시보드만 표시

**합격 기준**: 6/7 이상
**비고**:
- 4 step 의 스포트라이트 사이즈가 요소 크기에 맞춰 각각 다름 — Card/BarChart 는 큰 영역, demo banner 는 가로로 긴 영역.
- `mStats === null` 로딩 중에는 튜토리얼 안 뜸 (V.18과 동일 패턴).

---

### V.20 — D.1 공통: TutorialButton (?) 재실행 — 4 페이지

**목적**: 완료 플래그가 저장된 이후에도 `?` 아이콘 버튼으로 언제든 튜토리얼 재실행 가능
**선행 조건**:
- 4개 페이지의 튜토리얼을 모두 1회 이상 완료한 상태 (localStorage 에 4개 키 모두 존재)
- 또는 V.16-V.19 직후 연속 실행

**이전 버그**: 없음 — 재학습 경로 제공이 기능 목표

**기대 결과**: 각 페이지 상단에 `HelpCircle` 아이콘(`?`) + "튜토리얼 보기" `aria-label` + `title` 툴팁 → 클릭 시 해당 페이지 튜토리얼 처음부터 재시작

- [ ] 단계 1: `/student/chat` 진입 (튜토리얼 완료 상태)
  - 기대: auto-trigger 없음 (기존 완료 플래그) + 페이지 상단(`line 365` 부근, "새 대화 시작" 카드 헤더) 에 `?` 아이콘 존재
- [ ] 단계 2: `?` 아이콘 hover
  - 기대: `title` 툴팁 표시 (브라우저 기본 tooltip) + cursor pointer
- [ ] 단계 3: `?` 클릭
  - 기대: `startTutorial("chat")` 호출 → step 1/7 오버레이 등장 (완료 플래그 무시)
- [ ] 단계 4: 튜토리얼 "건너뛰기" 버튼으로 종료 → 완료 플래그 업데이트 여부 확인
  - 기대: "건너뛰기" 도 완료로 간주 (내부적으로 `completeTutorial`) — 플래그 유지 또는 재저장
  - 비고: 일부 튜토리얼 엔진은 skip ≠ complete 로 구분 — 본 프로젝트는 동일 취급이 의도.
- [ ] 단계 5: `/student/sessions` 이동 → `?` 아이콘 클릭
  - 기대: sessions 튜토리얼 재실행 (step 1/3)
- [ ] 단계 6: 오버레이 X 닫기 버튼 (우상단) 클릭
  - 기대: 즉시 종료 + 포커스 복원
- [ ] 단계 7: `/instructor/dashboard` → `?` 클릭 → step 1/4 재실행
  - 기대: 반 선택기 하이라이트
- [ ] 단계 8: `/admin/dashboard` → `?` 클릭 → step 1/4 재실행
  - 기대: demo 배너 하이라이트
- [ ] 단계 9: 접근성 — DevTools Elements 에서 `?` 버튼 속성 확인
  - 기대: `aria-label="튜토리얼 보기"` (또는 유사 한국어) + `title` 속성 + `<button type="button">` (form submit 방지)

**합격 기준**: 7/9 이상
**비고**:
- 4 페이지 모두 동일 `TutorialButton` 컴포넌트 재사용 — 일관된 UX.
- `?` 버튼의 위치는 페이지마다 상단 헤더 영역 (오른쪽 끝, 다른 액션 버튼 옆).

---

### V.21 — D.1 공통: localStorage 완료 플래그 영속성

**목적**: 완료 플래그가 브라우저 세션 간에 유지되어 사용자가 반복적으로 튜토리얼을 보지 않도록 보장
**선행 조건**: 시크릿 창 or 깨끗한 localStorage
**기대 결과**: 각 튜토리얼 1회 완료 시 `thinkbridge_tutorial_{id}_v1 = "true"` 저장. 브라우저 재시작/탭 close/reopen 후에도 유지.

- [ ] 단계 1: 시크릿 창 + `/student/chat` 진입 → 튜토리얼 step 1 등장 → "건너뛰기" 클릭
  - 기대: `thinkbridge_tutorial_chat_v1 = "true"` 저장 (DevTools Application 탭에서 확인)
- [ ] 단계 2: 같은 세션에서 페이지 새로고침 (F5)
  - 기대: auto-trigger **안 됨**
- [ ] 단계 3: 탭 닫고 동일 시크릿 창에서 새 탭으로 `/student/chat` 재진입
  - 기대: auto-trigger **안 됨** (localStorage 는 시크릿 창 동일 세션 내 유지)
- [ ] 단계 4: DevTools Application → LocalStorage → `thinkbridge_tutorial_chat_v1` 우클릭 → Delete
  - 기대: 키 제거
- [ ] 단계 5: 페이지 새로고침
  - 기대: auto-trigger **재개** (step 1/7 오버레이 등장)
- [ ] 단계 6: 4개 튜토리얼 모두 완료 후 4개 키 모두 존재 확인
  - 기대: `thinkbridge_tutorial_chat_v1`, `_sessions_v1`, `_instructor_v1`, `_admin_v1` 모두 `"true"`
- [ ] 단계 7: 시크릿 창 닫고 새 시크릿 창으로 동일 플로우 시도
  - 기대: 새 시크릿 창은 별도 storage partition → 모든 튜토리얼이 다시 auto-trigger (정상)
- [ ] 단계 8 (버전 호환): 미래에 `TUTORIAL_STORAGE_KEY_VERSION` 이 `_v2` 로 bump 되면 `_v1` 키는 무시되고 튜토리얼이 다시 등장해야 함
  - 기대: 현재 구현은 key 이름 자체가 version suffix 를 포함하므로 자동 invalidation 된다 (`_v2` 키 체크 → 없음 → auto-trigger)
  - 검증: DevTools 에서 수동으로 `thinkbridge_tutorial_chat_v2` 키 추가 후 새로고침 → auto-trigger 안 됨

**합격 기준**: 6/8 이상
**비고**:
- localStorage 는 동일 origin (protocol + host + port) 내에서 공유 — `localhost:3000` / `127.0.0.1:3000` 은 별개로 취급됨 (브라우저 보안 모델).
- 사용자가 "튜토리얼을 절대 보지 않겠다" 고 결정한 경우 V.25 의 글로벌 disable 키 사용.

---

### V.22 — D.1 공통: 키보드 네비게이션

**목적**: 마우스 없이도 키보드만으로 튜토리얼 완료/취소 가능
**선행 조건**: 임의의 튜토리얼 오버레이 열린 상태 (`?` 버튼으로 trigger)
**이전 버그**: 없음
**기대 결과**:
- `Esc` → 튜토리얼 즉시 닫기 (완료로 간주, 플래그 저장)
- `Enter` or `ArrowRight` → 다음 스텝 (마지막 스텝에서는 "완료" 트리거)
- `ArrowLeft` → 이전 스텝 (첫 스텝에서는 no-op)
- 포커스 관리: 오버레이 열릴 때 툴팁 내 첫 focusable 요소로 포커스 이동, 닫힐 때 원래 포커스 복원

- [ ] 단계 1: `/student/sessions` 튜토리얼 재실행 (`?` 클릭) → step 1/3 등장
  - 기대: 오버레이 내 포커스가 툴팁 카드 영역 (예: "다음" 버튼)으로 이동
- [ ] 단계 2: `ArrowRight` 키 누름
  - 기대: step 2/3 으로 전환 (스포트라이트 이동 + 카운터 업데이트)
- [ ] 단계 3: `Enter` 키 누름
  - 기대: step 3/3 으로 전환
- [ ] 단계 4: `ArrowLeft` 키 누름
  - 기대: step 2/3 으로 복귀
- [ ] 단계 5: 첫 스텝으로 복귀 (`ArrowLeft` × 1) → 다시 `ArrowLeft` 누름
  - 기대: **no-op** (이미 첫 스텝 — 오류 없이 무시)
- [ ] 단계 6: `Esc` 키 누름
  - 기대: 오버레이 즉시 닫힘 + localStorage 플래그 저장 + 포커스 이전 위치로 복원
- [ ] 단계 7: Tab 키로 포커스 순환 검증 (다시 오버레이 열고)
  - 기대: Tab 순서 — X 닫기 → 건너뛰기 → 이전 → 다음 (step 에 따라 활성/비활성) → X 로 순환 (focus trap)
- [ ] 단계 8: 스크린 리더 (NVDA/VoiceOver) 으로 오버레이 접근성 확인 (선택)
  - 기대: `role="dialog"` 또는 유사 역할 + `aria-modal="true"` + `aria-labelledby` (툴팁 제목) + `aria-describedby` (설명) 속성 — 스크린 리더가 "튜토리얼 1 / 7" 등으로 읽음

**합격 기준**: 6/8 이상 (8단계는 스크린 리더 환경 없으면 skip 가능)
**비고**:
- Focus trap 은 `TutorialOverlay.tsx` 내부에서 키 이벤트로 구현됨 — 일반적인 `<dialog>` focus trap 과는 다른 custom 구현.
- `Esc` 는 skip 과 동일 취급 — completion 플래그 저장 (재학습은 `?` 버튼으로).

---

### V.23 — D.1 공통: 모바일 뷰포트 center fallback (< 768px)

**목적**: 모바일 뷰포트에서 툴팁 placement 가 target 옆이 아닌 화면 중앙으로 fallback 되어 작은 화면에서도 가독성 유지
**선행 조건**: DevTools Device Toolbar, 임의 튜토리얼 trigger 가능 상태
**이전 버그**: 없음 (사전 예방 설계)
**기대 결과**: `matchMedia("(max-width: ${TUTORIAL_MOBILE_BREAKPOINT_PX - 1}px)")` 매칭 시 모든 step 의 placement 를 `center` 로 강제 (스포트라이트는 유지, 툴팁만 중앙)

- [ ] 단계 1: DevTools Device Toolbar → iPhone 14 Pro (390px 폭)
  - 기대: 뷰포트 모바일 브레이크포인트 < 768px
- [ ] 단계 2: `/student/chat` → `?` 버튼 클릭 (튜토리얼 재실행)
  - 기대: step 1 오버레이 등장 — 스포트라이트는 `[data-tutorial-id='chat-subject-selector']` 에 정상 렌더 + 툴팁은 **화면 중앙**에 배치 (placement=`bottom` 무시)
- [ ] 단계 3: "다음" × 여러 번 → 각 스텝마다 툴팁 위치 확인
  - 기대: 모든 스텝에서 툴팁 `position: fixed` 중앙 + 스포트라이트는 각 타겟에 정상
- [ ] 단계 4: Device Toolbar 해제 → 데스크톱 뷰포트 복귀 → 튜토리얼 재실행
  - 기대: 툴팁 placement 가 각 step 의 원래 설정값 (top/bottom/left/right) 로 복원
- [ ] 단계 5: Device Toolbar iPad (768px 폭 정확히) 시뮬레이션
  - 기대: `matchMedia` 기준 `max-width: 767px` 이므로 768px 는 데스크톱으로 처리 — 원래 placement 유지
- [ ] 단계 6: 767px 직접 지정 (Custom size) → 재확인
  - 기대: center fallback 활성
- [ ] 단계 7: 오버레이 열린 상태에서 Device Toolbar 토글 (모바일 → 데스크톱)
  - 기대: 리사이즈 리스너(`resize` event) 가 placement 재계산 → 툴팁이 원래 위치로 re-position (애니메이션 transition 300ms)

**합격 기준**: 5/7 이상
**비고**:
- `TUTORIAL_MOBILE_BREAKPOINT_PX = 768` 상수. 변경 시 `matchMedia` 쿼리도 자동 반영.
- 툴팁의 `max-width: TUTORIAL_TOOLTIP_MAX_WIDTH_PX (360px)` 때문에 390px 뷰포트에서는 좌우 여백 15px 가량 확보됨 — 포털 내부에서 중앙 정렬.

---

### V.24 — D.1 chat: 동적 타겟 `waitForTarget` 5s timeout → center fallback

**목적**: 채팅 튜토리얼의 post-session step (progress bar / thought panel / hint / end) 타겟이 아직 DOM에 없을 때, 5초 polling 후 center fallback 으로 전환되는지 확인
**선행 조건**:
- localStorage `thinkbridge_tutorial_chat_v1` 삭제
- `/student/chat` 신규 진입 (세션 시작 전)

**이전 버그**: 없음 (사전 예방 설계)

**기대 결과**:
- `waitForTarget(selector, TUTORIAL_WAIT_DEFAULT_TIMEOUT_MS = 5000)` 이 selector 를 못 찾으면 reject
- 상위 코드는 reject 를 catch 하여 step placement 를 `center` 로 강제 + 스포트라이트는 "target null" 상태로 전체 백드롭만 렌더
- 사용자는 중앙 툴팁에서 "다음/건너뛰기/완료" 선택 가능

- [ ] 단계 1: `/student/chat` 진입 → 튜토리얼 auto-trigger step 1/7 (chat-subject-selector)
  - 기대: 정상 하이라이트
- [ ] 단계 2: "다음" × 2회 → step 3/7 (chat-start-button) 도달
  - 기대: "대화 시작하기" 버튼 하이라이트 (이 시점에서는 아직 세션 시작 안 함)
- [ ] 단계 3: "다음" 클릭 → step 4/7 (chat-progress-bar) 로 전환 시도
  - 기대 A: `waitForTarget("[data-tutorial-id='chat-progress-bar']", 5000)` polling 시작 — 100ms 간격으로 `document.querySelector` 반복
  - 기대 B: 5초 내에 progress bar 가 DOM 에 나타나지 않음 (세션 시작 안 함)
- [ ] 단계 4: 5초 대기 (polling timeout) 관찰
  - 기대: 5000ms 경과 후 Promise reject → 툴팁이 **화면 중앙** 으로 이동 + 스포트라이트 제거 (또는 null region) + 제목 "5단계 소크라테스 진행" + 설명은 유지
- [ ] 단계 5: Console 에 경고 로그 확인 (선택)
  - 기대: `console.warn("Tutorial target not found: [data-tutorial-id='chat-progress-bar']")` 또는 유사 (구현 세부 — 없을 수도 있음)
- [ ] 단계 6: "다음" 클릭 → step 5 (thought panel) 로 진행
  - 기대: 동일 원리로 center fallback
- [ ] 단계 7: 끝까지 "완료" 클릭
  - 기대: localStorage 저장 + 오버레이 종료
- [ ] 단계 8 (대안 플로우): 재실행 (`?` 클릭) → step 3 에서 "다음" 클릭 전에 **다른 탭에서 대화 시작하기** 를 실제 클릭 → progress bar DOM 생성
  - 기대: `waitForTarget` polling 이 5초 이내에 target 발견 → center fallback 없이 정상 하이라이트 전환

**합격 기준**: 6/8 이상
**비고**:
- `TUTORIAL_WAIT_POLL_INTERVAL_MS = 100ms` → 5초 timeout 내 최대 50회 polling. DOM 변화 감지는 MutationObserver 가 아닌 polling (구현 단순성 우선).
- 세션 진행 후 다시 pre-session step 1-3 을 보여주려면 페이지 새로고침 필요 (세션이 이미 활성이면 ChatInterface 가 pre-session 카드를 가림).

---

### V.25 — D.1 공통: z-[80] 상위 레이어링 + 글로벌 disable 키

**목적**:
- 튜토리얼 오버레이가 다른 모든 UI 오버레이 (end-session z-[70], Sheet sidebar z-50, ThoughtPanel floating button z-40) 보다 상위에 렌더되는지 확인
- `thinkbridge_tutorial_disabled` localStorage 키로 모든 튜토리얼 auto-trigger 완전 억제 가능 (데모 day / 강의 녹화 등 상황)

**선행 조건**: localStorage 튜토리얼 관련 키 모두 삭제 + 4개 페이지 방문 가능한 계정

**이전 버그**: 없음

**기대 결과**:
- 튜토리얼 오버레이는 `z-[80]` — 가장 상위
- `thinkbridge_tutorial_disabled = "true"` 설정 시 `useAutoStartTutorial` 이 no-op → auto-trigger 안 됨. 단, `?` 버튼 수동 실행은 별도 (disable 키 우회).

- [ ] 단계 1: 채팅 세션 2-3턴 진행 후 "종료" 버튼 클릭
  - 기대: end-session 오버레이 (z-[70]) + "사고 과정을 분석하고 있어요..." 등장
- [ ] 단계 2: 이 상태에서 URL 수동으로 `/student/chat` 재진입 (튜토리얼 플래그 없는 상태 가정) — 리포트 페이지 이동 전에 튜토리얼 triggered 된다면
  - 기대: 실질적으로 리포트로 이동하므로 본 step 은 edge case — 대신 아래 단계 3 으로 대체
- [ ] 단계 3 (대체): `?` 버튼으로 튜토리얼 수동 실행 → 채팅 중 "종료" 누름과 동시에 타이밍 시도
  - 기대: 튜토리얼 오버레이 (z-[80]) 가 종료 오버레이 (z-[70]) 위에 렌더 → 튜토리얼 보이고 종료 오버레이는 가려짐 (정상 — 튜토리얼은 모달성 최상위)
- [ ] 단계 4: 모바일 뷰포트 + `/student/chat` + 튜토리얼 오버레이 열린 상태에서 햄버거 클릭 시도
  - 기대: Sheet (z-50) 가 튜토리얼 (z-[80]) 아래에 렌더 → **사이드바 조작 불가** (튜토리얼이 모달이므로 의도적)
- [ ] 단계 5: ThoughtPanel floating 버튼 (모바일, z-40) 클릭 시도
  - 기대: 마찬가지로 튜토리얼 아래 → 조작 불가
- [ ] 단계 6: DevTools Application → LocalStorage → `thinkbridge_tutorial_disabled` 키 수동 추가 + 값 `"true"`
  - 기대: 키 생성됨
- [ ] 단계 7: 4개 페이지 순회 (`/student/chat`, `/student/sessions`, `/instructor/dashboard`, `/admin/dashboard`) + 각 페이지의 localStorage 완료 플래그 삭제 후 방문
  - 기대: **auto-trigger 완전 억제** (disable 키 우선) → 페이지 정상 UI 만 표시
- [ ] 단계 8: 각 페이지에서 `?` 버튼 수동 클릭
  - 기대: 튜토리얼 **실행되지 않음** — disable 키는 **auto-trigger + 수동 실행 모두 차단**하는 "글로벌 OFF 스위치" 역할 (2026-04-12 라이브 테스트로 확인된 실제 구현)
  - 참고: 최초 시나리오 작성 시에는 "수동 실행은 허용" 을 기대했으나 자동 테스트에서 차단이 의도된 동작임이 확인됨 (`fix_verification_automated_results.md` §4 V.25 참조)
- [ ] 단계 9: `thinkbridge_tutorial_disabled` 키 제거 후 완료 플래그도 삭제 + 페이지 재방문
  - 기대: auto-trigger 재활성화

**합격 기준**: 7/9 이상
**비고**:
- z-index 계층: `z-40` (ThoughtPanel 플로팅) < `z-50` (Sidebar Sheet) < `z-[70]` (end-session overlay) < `z-[80]` (Tutorial). Tailwind `z-[80]` 은 임의 값 지원 (`class="z-[80]"`).
- 단계 8 **검증 결과**: 자동 테스트에서 disable 키가 `?` 수동 실행도 차단함이 확인됨. 시나리오 가정이 실제 구현에 맞게 정정됨 (2026-04-12). Disable 키 목적은 "demo day 에서 튜토리얼을 완전히 숨기기" 용도 — 강사가 필요 시 localStorage 에서 키를 제거하는 것이 공식 경로.

---

## §5. 통합 시나리오

각 통합 시나리오는 여러 개별 fix를 하나의 사용자 플로우에서 연속 검증한다. 개별 시나리오를 먼저 통과한 후 시행 권장.

### V.13 — 전체 게스트 플로우 End-to-End (Fix 다수 검증)

**목적**: 게스트 사용자 실제 사용 플로우에서 다음 fix가 연속으로 작동하는지 검증 — **V.5, V.7, V.9, V.12, V.2, V.4, V.6**
**선행 조건**: 시크릿 창, DevTools Device Toolbar = iPhone 14 Pro

- [ ] 단계 1: 시크릿 창 + `/` 진입 (비로그인)
  - 기대: Hero CTA "바로 체험하기" + "로그인" 두 버튼 (V.5 반대 케이스: `!user`)
- [ ] 단계 2: "바로 체험하기" 클릭 → 게스트 로그인 → `/student/chat` 이동
  - 기대: Welcome 카드 + 새 대화 시작 카드
- [ ] 단계 3: 수학 과목 + 주제 입력 + "대화 시작하기" 클릭
  - 기대: ChatInterface 렌더 + 상단 "체험 중 (0/5)" 뱃지
- [ ] 단계 4: 모바일 뷰포트에서 좌하단 햄버거 버튼 확인 (V.12)
  - 기대: `bottom-4 left-4` 위치
- [ ] 단계 5: 2턴 진행 (질문 전송 + AI 응답 대기 완료 × 2)
  - 기대: 턴 카운트 "(2/5)"
- [ ] 단계 6: 햄버거 → "세션 목록" 이동
  - 기대: `/student/sessions` 페이지, 햄버거 위치가 우하단으로 복귀 (V.12 반대 케이스)
- [ ] 단계 7: 방금 생성한 Active 세션 카드 클릭 (V.9 — Active 카드는 리포트 버튼 없음 확인)
  - 기대: 카드에 초록 "진행 중" 뱃지 + 리포트 버튼 없음
- [ ] 단계 8: Active 카드 클릭 → 로딩 스피너 관찰 (V.7)
  - 기대: "이전 대화를 불러오고 있어요..." 표시
- [ ] 단계 9: 로드 완료 후 ChatInterface 확인
  - 기대: 이전 2개 user + 2개 AI 메시지 복원 + 턴 카운트 "(2/5)" + ThoughtPanel에 마지막 분석 표시
- [ ] 단계 10: 3턴 더 진행해서 5/5 도달
  - 기대: "체험 (5/5)" 뱃지 + guest limit 경고 문구 + "회원가입하기" 버튼
- [ ] 단계 11: 입력창 우측 "종료" 버튼 클릭 (V.2)
  - 기대: 전체 화면 오버레이 즉시 등장 + "사고 과정을 분석하고 있어요" + 스피너
- [ ] 단계 12: 오버레이 상태로 5-10초 대기 → `/student/report/{id}` 이동
  - 기대: 리포트 페이지 정상 렌더 (또는 V.4 retry 중 "(1/5)" 진행 메시지)
- [ ] 단계 13: 리포트 정상 렌더 확인
  - 기대: Radar + Growth + Timeline
- [ ] 단계 14: 데스크톱 뷰포트로 전환 + Navbar 로고 클릭 (V.6)
  - 기대: `/student/chat` 이동 (`getHomePathForRole("student")` = `/student/chat`, 게스트도 student role)

**합격 기준**: 12/14 이상
**비고**:
- 게스트는 `role === "student"` + `isGuest === true` 이므로 `getHomePathForRole` 결과는 `/student/chat`.
- 5턴 도달 후 `tIsGuestLimitReached` 가드로 종료 버튼만 활성, 입력창은 disabled.

---

### V.14 — 학생 로그인 + Navigation 일관성

**목적**: 학생 계정에서 다양한 페이지 간 네비게이션이 fix들의 조합으로 일관되게 동작 — **V.5, V.6, V.9**
**선행 조건**: `student@demo.com` 로그인 + completed 세션 1개 이상

- [ ] 단계 1: `student@demo.com` 로그인 → 자동 리다이렉트 `/student/chat`
  - 기대: 학생 home (`HOME_PATH_STUDENT`) 진입
- [ ] 단계 2: Navbar 로고 클릭
  - 기대: `/student/chat` (이미 home이므로 이동 없음 또는 현재 위치 유지)
- [ ] 단계 3: 주소창에 `/` 입력 → 랜딩 진입
  - 기대: Hero CTA "대화 계속하기 →" 단일 버튼 (V.5) + 게스트 캡션 숨김
- [ ] 단계 4: "대화 계속하기" 클릭 → `/student/chat` 이동
  - 기대: 학생 chat page
- [ ] 단계 5: 햄버거 또는 데스크톱 사이드바 → "세션 목록" 이동
  - 기대: `/student/sessions`, completed 카드에 "리포트" 버튼 표시 (V.9)
- [ ] 단계 6: Completed 카드의 "리포트" 버튼 직접 클릭
  - 기대: `/student/report/{id}` 이동 (버튼 click 이 카드 onClick으로 버블)
- [ ] 단계 7: 리포트 페이지 → Navbar 로고 클릭
  - 기대: `/student/chat` 이동 (V.6 — `HOME_PATH_STUDENT`)
- [ ] 단계 8: 로그아웃 → `/` 도달
  - 기대: 기본 Hero CTA (비로그인) + 로고 href `/`

**합격 기준**: 7/8 이상
**비고**:
- 학생 demo 계정은 `isGuest === false` 이므로 CTA 라벨은 "대화 계속하기" (게스트의 "체험 계속하기"와 구분).

---

### V.15 — 강사 로그인 + Replay 학생 정보 일관성

**목적**: 강사가 여러 학생의 리플레이를 순차 탐색하며 헤더 학생 정보 + Navbar 로고 동작이 일관적인지 확인 — **V.6, V.10**
**선행 조건**: `instructor@demo.com` 로그인 + 반에 3명 이상 학생 + 각 학생에 세션 1개 이상

- [ ] 단계 1: `instructor@demo.com` 로그인 → `/instructor/dashboard` 자동 이동
  - 기대: `HOME_PATH_INSTRUCTOR`
- [ ] 단계 2: 학생 목록에서 첫 번째 학생 카드 클릭
  - 기대: `/instructor/replay/{id1}?name={encoded_name_1}` + 헤더에 학생명 1
- [ ] 단계 3: "대시보드로 돌아가기" → 두 번째 학생 카드 클릭
  - 기대: `/instructor/replay/{id2}?name={encoded_name_2}` + 헤더에 학생명 2 (이전 학생명과 다름)
- [ ] 단계 4: 세 번째 학생은 HeatmapChart row 클릭으로 접근
  - 기대: 동일하게 `?name=` 쿼리 + 헤더 학생명 3
- [ ] 단계 5: 세 리플레이 모두에서 헤더 메타 라인 구조 동일 확인
  - 기대: `User icon + 이름 + · + 과목 + · + 주제 + · + 세션 #N`
- [ ] 단계 6: 임의 리플레이 페이지에서 Navbar 로고 클릭
  - 기대: `/instructor/dashboard` 이동 (V.6 — `HOME_PATH_INSTRUCTOR`)
- [ ] 단계 7: 대시보드 복귀 후 다시 학생 카드 클릭하여 리플레이 진입
  - 기대: 브라우저 히스토리 자연스러움, 뒤로가기 시 대시보드 → 리플레이 순 복귀

**합격 기준**: 6/7 이상
**비고**:
- 관리자 계정의 경우 `/admin/dashboard` 가 home이 되지만 별도 리플레이 페이지는 없음 — 이 시나리오에서 다루지 않음.

---

## §6. 최종 체크리스트

각 이슈별로 테스터가 최종 합격 여부를 기록.

### 이슈별 Pass / Fail / Skip

| 이슈 ID | 시나리오 | Pass | Fail | Skip | 비고 |
|--------|---------|------|------|------|------|
| **A.1** (inline 에러 배너) | V.1 | ☐ | ☐ | ☐ | |
| **A.2** (종료 오버레이) | V.2 | ☐ | ☐ | ☐ | |
| **A.3** (에러 정규화) | V.3 | ☐ | ☐ | ☐ | |
| **A.4** (리포트 retry) | V.4 | ☐ | ☐ | ☐ | Network override 필요 |
| **B.1** (Hero CTA 분기) | V.5 | ☐ | ☐ | ☐ | |
| **B.2** (로고 href) | V.6 | ☐ | ☐ | ☐ | |
| **B.3** (세션 재개 복원) | V.7 | ☐ | ☐ | ☐ | **CRITICAL** |
| **B.3 추가** (completed redirect) | V.8 | ☐ | ☐ | ☐ | |
| **B.4** (리포트 CTA) | V.9 | ☐ | ☐ | ☐ | |
| **B.5** (강사 리플레이 헤더) | V.10 | ☐ | ☐ | ☐ | |
| **C.1** (종료 버튼 4-state) | V.11 | ☐ | ☐ | ☐ | |
| **C.2** (모바일 햄버거 위치) | V.12 | ☐ | ☐ | ☐ | Device Toolbar 필요 |
| **L.9** (top-right 배너 유지) | V.1 (공유) | ☐ | ☐ | ☐ | A.1과 동일 시나리오 |
| **D.1 chat** (7 steps auto+동적) | V.16 | ☐ | ☐ | ☐ | 신규 — localStorage 클리어 필수 |
| **D.1 sessions** (3 steps first-card) | V.17 | ☐ | ☐ | ☐ | active+completed 각 1개 필요 |
| **D.1 instructor** (4 steps) | V.18 | ☐ | ☐ | ☐ | 히트맵 데이터 필요 |
| **D.1 admin** (4 steps) | V.19 | ☐ | ☐ | ☐ | stats API warm 권장 |
| **D.1 re-launch** (? 버튼) | V.20 | ☐ | ☐ | ☐ | 4 페이지 공통 |
| **D.1 localStorage** (영속성) | V.21 | ☐ | ☐ | ☐ | Application 탭 필요 |
| **D.1 keyboard** (Esc/Enter/Arrow) | V.22 | ☐ | ☐ | ☐ | 스크린 리더는 선택 |
| **D.1 mobile fallback** (< 768px) | V.23 | ☐ | ☐ | ☐ | Device Toolbar 필요 |
| **D.1 waitForTarget timeout** | V.24 | ☐ | ☐ | ☐ | 5초 대기 필요 |
| **D.1 z-layering + disable 키** | V.25 | ☐ | ☐ | ☐ | |

### 통합 시나리오 Pass / Fail / Skip

| 통합 | 시나리오 | Pass | Fail | Skip | 비고 |
|------|---------|------|------|------|------|
| 게스트 E2E | V.13 | ☐ | ☐ | ☐ | 14단계 |
| 학생 네비 일관성 | V.14 | ☐ | ☐ | ☐ | 8단계 |
| 강사 Replay 일관성 | V.15 | ☐ | ☐ | ☐ | 7단계 |

### 최종 Sign-off

- [ ] 모든 CRITICAL 시나리오 (V.7) 통과
- [ ] 모든 §1-§3 개별 시나리오 12개 중 10개 이상 통과
- [ ] 모든 §4 튜토리얼 시나리오 10개 중 **8개 이상** 통과 (V.16-V.25)
- [ ] 모든 §5 통합 시나리오 3개 모두 합격 기준 충족
- [ ] Console 에러 누적 없음 (정상 동작 중 unhandled rejection / React warning 없음)
- [ ] 스크린샷 캡처 — 수동 테스트 시 주요 결과물을 `docs/test/user_test/screenshots/fix_V{N}_{description}.png` 경로에 저장 (튜토리얼은 스포트라이트 + 툴팁 카드가 모두 보이는 프레임)

테스터: ___________________
날짜: ___________________
결과: ☐ 전체 합격 ☐ 조건부 합격 ☐ 재시도 필요

---

## 📎 Appendix: Fix 간 Inconsistency / 미검증 영역

조사 중 발견된 사항. 후속 PR 또는 신규 시나리오로 반영 여부 판단 필요.

1. **세션 목록 페이지 에러 메시지 미정규화** (V.3 단계 4 참조)
   - `frontend/src/app/student/sessions/page.tsx` 의 `loadSessions()` catch 블록은 `error.message`를 그대로 사용 — `normalizeErrorMessage` 미적용.
   - 영향: Offline 상태로 `/student/sessions` 진입 시 사용자에게 "Failed to fetch" 그대로 노출 가능.
   - 권장: 다음 polish pass에서 `normalizeErrorMessage`로 교체.

2. **리플레이 페이지 URL path param 이름**
   - `[sessionId]` 라우트 세그먼트가 실제로 studentId를 담는 leftover — `docs/revise_plan_v3/03_structural.md` P2-16.
   - 본 시나리오는 drift 를 그대로 수용하며 기능 검증만 수행.

3. **A.4 retry 중 언마운트 시 요청 취소 여부**
   - `tIsCancelled` 플래그는 retry 다음 iteration만 방어 — 이미 in-flight인 `Promise.all` fetch는 abort 되지 않음.
   - 영향: 미미 (응답 도착 시 `tIsCancelled` 가드로 state set 스킵).
   - 권장: AbortController 도입 여부는 후속 리팩토링에서 판단.

4. **C.1 hint 버튼은 ghost 유지**
   - 힌트 버튼은 변경 없이 `variant="ghost"` + amber 토큰 유지 — 해당 pass 의도 스코프 밖.
   - 사용자 테스트에서 hint 버튼도 별도 피드백 있을 경우 동일 outline 패턴 적용 권장.

5. **V.1/V.4의 Offline 검증은 실제 네트워크 계층만 테스트**
   - 백엔드 500 에러, DB 장애 등 서버 측 에러에 대한 normalize는 `ERROR_MESSAGE_MAP` 에 매핑되지 않음.
   - 원문이 "HTTP 500: ..." 형태이므로 raw message 노출 — 한국어 친화 message는 네트워크 실패 케이스만 커버.

6. **V.7 (B.3) 에서 guest 5/5 도달 상태 재개 edge case**
   - 게스트가 5턴을 모두 사용한 active 세션을 다른 페이지로 벗어났다가 재진입 시, `initialTurnCount = 5` 로 seed 되어 즉시 guest limit 경고가 표시됨.
   - 현재 구현은 이 경로를 명시적으로 다루지 않음 (UI는 정상 동작하지만 UX 상 "왜 이미 막혀 있지?" 느낌 가능).
   - 권장: 후속 pass에서 "이전 체험이 종료되었습니다. 회원가입하시겠어요?" 전환 문구 고려.

7. **V.10 (B.5) 에서 한글이 아닌 학생 이름 (특수문자 포함) edge case**
   - `encodeURIComponent` 는 RFC 3986에 안전한 인코딩을 수행하므로 한글/이모지/공백 모두 안전.
   - 단, 헤더 레이아웃의 `truncate max-w-xs` 는 주제 필드에만 적용됨 — 매우 긴 학생 이름(예: 50자 초과)은 flex-wrap 아래로 내려가 레이아웃 깨짐 가능.
   - 권장: 이름에도 `truncate max-w-[12rem]` 추가 고려.

8. **V.12 (C.2) 에서 `/student/chat?sessionId=...` 재개 URL의 햄버거 위치**
   - `pathname === CHAT_PAGE_PATH` 정확 비교이므로 `/student/chat` 기본 경로 + `/student/chat?sessionId=...` 둘 다 동일하게 좌하단 적용됨 (query string은 pathname에 포함 안 됨).
   - 의도한 동작 — 재개 중에도 chat 입력 바와 햄버거 충돌 회피.

---

## 🚀 빠른 스모크 테스트 (5분 체크)

제출 직전 또는 배포 후 빠른 회귀 검증용. 모든 시나리오를 돌리기엔 시간이 부족할 때 사용.

### Step 1: 게스트 로그인 실패 에러 (V.1 축약)
1. 시크릿 창 + `/` 진입
2. DevTools Network → Offline
3. "바로 체험하기" 클릭
4. **체크**: 두 위치(inline + top-right)에 "네트워크 연결을 확인해 주세요." 한글 메시지 표시
5. Network → No throttling

### Step 2: 세션 재개 복원 (V.7 축약)
1. 학생 로그인 → 채팅 1-2턴 진행 → 사이드바로 세션 목록 이동
2. 방금 생성된 Active 카드 클릭
3. **체크**: 로딩 스피너 "이전 대화를 불러오고 있어요..." 표시 → ChatInterface 렌더 시 이전 메시지 모두 복원 + 턴 카운트 이전 값 유지

### Step 3: 종료 오버레이 + 리포트 retry (V.2 + V.4 축약)
1. 위 재개된 세션에서 "종료" 버튼 클릭
2. **체크**: 전체 화면 오버레이 즉시 등장 + spinner + "사고 과정을 분석하고 있어요"
3. 리포트 페이지 이동 후 정상 렌더 (retry 관찰은 선택)

### Step 4: Navbar 로고 역할별 이동 (V.6 축약)
1. 학생 로그인 → 세션 목록 → 로고 클릭
2. **체크**: `/student/chat` 이동 (기본 `/` 아님)
3. 강사 계정으로 전환 → 같은 확인

### Step 5: 모바일 햄버거 위치 (V.12 축약)
1. Device Toolbar → iPhone 14 Pro
2. `/student/chat` 햄버거 위치 = 좌하단, `/student/sessions` = 우하단
3. **체크**: 채팅 페이지에서 Send/종료 버튼과 햄버거가 겹치지 않음

### Step 6: 튜토리얼 auto-trigger + ? 재실행 (V.16/V.20 축약)
1. DevTools Application → LocalStorage → `thinkbridge_tutorial_chat_v1` 삭제
2. `/student/chat` 재진입 → step 1/7 오버레이 등장 확인
3. "건너뛰기" → localStorage 플래그 저장 확인
4. 페이지 상단 `?` 아이콘 클릭 → 튜토리얼 재실행 확인
5. **체크**: auto-trigger + completion 저장 + `?` 재실행 모두 동작

6가지 모두 통과 시 **빠른 스모크 합격** — 상세 시나리오 생략 가능 (판단 재량).

---

## 🌐 브라우저 호환성 노트

### Chrome (주 지원)
- 모든 시나리오는 Chrome 최신 버전에서 검증됨
- `"Failed to fetch"` 원문 메시지 (V.3 매핑 대상)

### Firefox
- `"NetworkError when attempting to fetch resource."` 원문 메시지 (V.3 매핑 대상)
- V.2 의 `backdrop-blur-sm` 는 Firefox 103+ 에서 정상 렌더 (이전 버전은 단순 반투명 배경)

### Safari
- `"Load failed"` 원문 메시지 (V.3 매핑 대상)
- iOS Safari 16+ 에서 SSE streaming 정상 동작 (V.7 재개 후 추가 메시지 시 확인)

### Edge
- Chromium 기반이므로 Chrome과 동일 동작 예상
- 별도 edge case 없음

### 공통 제약
- V.7 의 localStorage 기반 auth 복원은 모든 모던 브라우저 지원
- V.12 의 DevTools Device Toolbar는 Chrome DevTools 전용 — Firefox/Safari는 각자의 반응형 모드 사용

---

## 🛠️ 트러블슈팅 가이드

테스터가 시나리오 실행 중 예상치 못한 동작을 만났을 때 참고.

### Q1: V.1 에서 배너가 top-right 에만 표시되고 inline 은 안 보임
- **원인 후보**: Hero 영역 viewport 밖에서 클릭했을 수 있음 (예: 스크롤 내림 상태)
- **조치**: 페이지 상단으로 스크롤 후 Hero CTA 재클릭 → inline 배너는 CTA 버튼 직하단에 렌더됨

### Q2: V.7 에서 이전 메시지가 복원되지 않고 Welcome 카드가 표시됨
- **원인 후보 A**: Active 세션이 아니라 completed 세션 클릭 → V.8 (리포트 리다이렉트)로 동작
- **원인 후보 B**: DB 응답이 비어있거나 SessionDetail API 가 404 반환 → `normalizeErrorMessage(error)` 표시됨
- **조치**: DevTools Network 탭에서 `/api/sessions/{id}` 응답 JSON 의 `messages` 배열 길이 확인. 0이면 백엔드 이슈.

### Q3: V.2 오버레이가 보이지 않고 바로 리포트 페이지로 이동
- **원인 후보**: Render backend가 warm 상태 + 리포트 생성이 매우 빨라 (1-2초 이내) 오버레이가 거의 flash 처럼 스쳐감
- **조치**: DevTools Network → Throttling → Slow 3G 로 설정하여 지연 인위적 주입 후 재시도

### Q4: V.4 retry 카운터가 (1/5) 표시 후 즉시 에러 박스로 넘어감
- **원인 후보**: Block request URL 이 적용되지 않았거나, 다른 종류의 에러(500, DNS 실패 등)가 반환되어 not-ready 마커 3개에 매칭 안 됨
- **조치**: Network 탭에서 `/api/reports/session/` 요청이 실제로 404 (detail: "리포트가 아직 준비되지 않았습니다.") 반환하는지 확인

### Q5: V.11 종료 버튼이 disabled 상태에서도 클릭 됨
- **원인 후보**: 메시지 0개 상태가 아니라 메시지가 이미 1개 이상 존재 (다른 세션 잔여)
- **조치**: `mMessages.length` 확인 — ChatInterface 최초 마운트 직후 (`initialMessages` 없을 때) 체크

### Q6: V.12 에서 햄버거 위치가 바뀌지 않음
- **원인 후보**: pathname 비교가 정확 일치이므로 `/student/chat?sessionId=...` 는 쿼리 포함이라 pathname 자체는 `/student/chat` → 정상 동작. 만약 다른 학생 경로(`/student/sessions`)에서도 좌하단이 보인다면 브라우저 캐시 문제
- **조치**: Hard refresh (Ctrl+Shift+R) 후 재확인

### Q7: V.10 에서 헤더 학생명이 "학생"으로 표시됨
- **원인 후보 A**: 대시보드가 아닌 URL 직접 입력으로 리플레이 진입 → `?name=` 누락
- **원인 후보 B**: `encodeURIComponent` 결과가 빈 문자열 (매우 드문 케이스)
- **조치**: URL 주소창에서 `?name=...` 파라미터 유무 확인

---

## 🗺️ 시나리오 의존성 다이어그램 (참고)

```
V.1 ──────── V.3 (에러 정규화 공유)
              │
              ├── V.4 (retry + 에러 정규화)
              │
              └── V.13 (통합 — V.2/V.4/V.7 재사용)

V.5 ──── V.6 ──── V.14 (학생 네비 일관성)
 │        │
 │        └── V.15 (강사 네비 일관성 + V.10)
 │
 └── V.13 (로그인 상태 CTA 일부 재사용)

V.7 ──── V.8 ──── V.13 (재개 플로우 전체)
 │
 └── V.14 (간접 — 완료 세션에서 리포트)

V.9 ──── V.13, V.14 (completed 카드 리포트 CTA)

V.2 ──── V.4 ──── V.13 (종료 → retry 흐름)
 │
 └── V.11 (종료 버튼 상태 일부 겹침)

V.10 ──── V.15 (강사 리플레이 헤더)

V.11 (독립)

V.12 ──── V.13 (모바일 뷰포트 부분)

V.16 (chat auto+동적) ────┐
V.17 (sessions first-card) ├── V.20 (? 재실행 공통)
V.18 (instructor 4 steps) ─┤
V.19 (admin 4 steps) ──────┤
                           ├── V.21 (localStorage 영속성 — 4 튜토리얼 공통)
                           ├── V.22 (키보드 네비 — 4 튜토리얼 공통)
                           ├── V.23 (모바일 center fallback — 4 튜토리얼 공통)
                           ├── V.24 (waitForTarget timeout — chat 특화)
                           └── V.25 (z-[80] 레이어링 + disable 키)
```

**권장 실행 순서**:
1. **§1-§3 개별 fix**: V.1 → V.3 → V.5 → V.6 → V.9 → V.2 → V.11 → V.12 → V.4 → V.7 → V.8 → V.10
2. **§4 튜토리얼**: V.21(영속성 선 셋업) → V.16 → V.17 → V.18 → V.19 → V.20(재실행) → V.22(키보드) → V.23(모바일) → V.24(타임아웃) → V.25(레이어링)
3. **§5 통합**: V.13 → V.14 → V.15

§4 튜토리얼은 localStorage 상태에 의존적이므로 V.21 (영속성 동작 원리) 을 먼저 이해한 후 V.16-V.19 실행 시 플래그 삭제를 체계적으로 수행하면 혼란이 적다.

---

## 📝 변경 이력

| 날짜 | 변경 사항 | 작성자 |
|------|----------|-------|
| 2026-04-12 | v1.0 최초 작성 — 12 이슈 × 15 시나리오 (A.1-A.4 / B.1-B.5 / C.1-C.2 + 통합 3) | ThinkBridge Team |
| 2026-04-12 | v1.1 — 튜토리얼 D.1 (10 시나리오 V.16-V.25) 추가. commits `e16fec7` (Phase 2 core) + `514d190` (work log) + `5badfb7` (Phase 3 integration). 총 시나리오 25개. §4 신설, 기존 §4/§5 → §5/§6 로 renumber. 최종 체크리스트 + 스모크(Step 6) + 의존성 다이어그램 + 권장 실행 순서 업데이트. | ThinkBridge Team |
| 2026-04-12 | v1.2 — Playwright 자동 테스트 반영. V.25 단계 8 `?` 버튼 동작이 **disable 키 존중 (차단)** 으로 정정 (자동 테스트 결과 실 구현과 원시나리오 가정 불일치 발견). 결과 보고서 `fix_verification_automated_results.md` + 잔여 수동 체크리스트 `fix_verification_manual_remaining.md` 추가. | ThinkBridge Team |

후속 fix batch가 있다면 별도 `fix_verification_scenarios_v2.md` 로 작성하거나 본 문서에 이어붙이기.
