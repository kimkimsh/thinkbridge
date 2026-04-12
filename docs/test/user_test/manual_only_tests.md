# 사용자 수동 검증 필수 항목

> **Why this file**: Claude가 Playwright로 자동 검증했으나 근본적으로 Playwright로 대체할 수 없는 항목들을 모음.
> **병행 문서**:
> - `comprehensive_test_scenarios.md` — 전체 113개 시나리오
> - `automated_test_report.md` — 자동 검증 완료 17개 결과 (참고용)
> - 본 파일 — **수동 검증 필수 96개**

## 🚫 Claude가 Playwright로 못 하는 이유 (범주별)

| 범주 | 이유 |
|------|-----|
| **시각적 품질 판단** | 애니메이션 timing, stagger, opacity curve, 그라디언트 톤 — "자연스러움" 평가 |
| **실제 기기** | iPhone/iPad 실물, iOS Safari gesture, Android Chrome |
| **다른 브라우저** | Firefox/Safari/Edge (Playwright Chromium 단일) |
| **DevTools 조작** | Network throttling, Request Block, 정확한 Offline 시뮬레이션 |
| **외부 요인** | Claude API 실제 529 overload, Render cold start 정확 재현 |
| **접근성 실사용** | 스크린 리더(NVDA/VoiceOver) 실제 발화, 키보드만 조작 UX |
| **성능 체감** | 첫 토큰 TTFB 체감, 애니메이션 부드러움, bundle 로드 시간 |
| **다크모드/테마** | 시스템 설정 기반 전환 (미구현이라 관찰만) |

---

## 📋 Mandatory Manual Checklist (96 scenarios)

각 시나리오는 `comprehensive_test_scenarios.md`의 S.N 번호와 동일. Claude가 자동 검증 **못한** 항목만 수록.

### §1. Landing + Guest (수동 12개)

#### L.2 — Hero 섹션 애니메이션 + 주요 문구 (시각 판단)
- [ ] 페이지 로드 직후 0.1초 이내: "AI 소크라테스식 1:1 튜터링" 뱃지 → "AI가 답을 주는 시대," → 그라디언트 "생각하는 법을 가르치는 AI" 순차 fade-in (**각 200ms stagger** 체감 확인)
- [ ] 그라디언트 텍스트 (인디고→퍼플→인디고) 색감 확인
- [ ] 4-5 단계 stagger가 자연스러운지 판단
- [ ] CTA 호버 시 더 짙은 인디고 + shadow-xl 부드럽게 전환
- [ ] Hero 하단 미니 채팅 목업 (학생/AI 4턴 광합성 대화) 렌더
- [ ] 배경 데코 (인디고/퍼플/앰버 블러 원 + radial-gradient 도트)

#### L.3 — 스크롤 fade-in 애니메이션 (IntersectionObserver)
- [ ] 빠른 스크롤 다운 — "기존 AI와 무엇이 다른가요?" 섹션 진입 시 **800ms ease-out** fade-up 체감
- [ ] ChatGPT 카드 `translateX(-24px→0)`, ThinkBridge 카드 `translateX(24px→0)` **150ms stagger**
- [ ] Feature / Demo 섹션 순차 fade-up
- [ ] **재스크롤 시 재애니메이션 없음** (observer.unobserve 1회성)

#### L.4 — ChatGPT vs ThinkBridge 비교 (상세 시각 판단)
- [ ] 좌측 ChatGPT 카드 빨강 테두리 + X 아이콘 뱃지 + "답 제공" 빨간 뱃지
- [ ] 학생 질문 `x² - x - 6 = 0` 유니코드 ² 정상
- [ ] 응답 6줄 (2개 해 x=3, x=-2)
- [ ] 하단 경고 밴드 "학생은 답만 받고, 사고 과정은 없음"
- [ ] 중앙 원형 VS 디바이더 (데스크톱만)
- [ ] 우측 ThinkBridge 카드 인디고 테두리 + CheckCircle + blur glow
- [ ] 응답 3개 유도 질문
- [ ] 하단 긍정 밴드 "질문으로 스스로 사고하도록 유도"
- [ ] 모바일 <768px 세로 스택 + 작은 원형 VS

#### L.7 — 푸터 및 모바일 반응형 (해상도 토글 필요)
- [ ] 푸터 좌측 로고 + 중앙 "2026 KIT 바이브코딩 공모전 출품작" + 우측 "AI 소크라테스식 튜터링 시스템"
- [ ] **DevTools Device Toolbar iPhone 14 Pro (390×844)** 전환
- [ ] 모바일 Hero text-4xl 축소 + CTA 2개 세로 스택 + full-width
- [ ] **767px ↔ 768px 경계 토글**: 비교 카드 세로↔가로 즉시 전환

#### L.9 — 게스트 로그인 실패 에러 배너 (v3 Fix P1-8)
**DevTools 사용 필수**
- [ ] Network Throttling → **"Offline"** 전환 (또는 `*/api/auth/guest` Block)
- [ ] "바로 체험하기" 클릭
- [ ] 우측 상단 빨간 배너 (fixed right-4 top-20) + AlertCircle + "게스트 체험 시작에 실패했습니다..." + "닫기"
- [ ] 버튼 상태 "준비 중..." → "바로 체험하기" 복귀
- [ ] Console `console.error("Guest login failed", Error)` 로그
- [ ] "닫기" 클릭 → 배너 사라짐
- [ ] Throttling 해제 후 재시도 → 정상 로그인

#### L.15 — 세션 종료 → 리포트 이동
- [ ] 게스트로 2-3턴 진행 후 입력창 우측 빨간 "종료" Square 버튼 클릭
- [ ] Network `PATCH /api/sessions/{id}/end` 200
- [ ] URL `/student/report/{sessionId}` 자동 이동
- [ ] 페이지 로드: 스켈레톤 → Radar + 성장 + 내러티브 전환 확인

#### L.16 — 스트리밍 중 페이지 이탈 (v3 Fix P1-2)
**DevTools Network 탭 사용**
- [ ] EventStream 필터 또는 `/messages` 필터
- [ ] 긴 질문 전송 → `pending` 상태 확인
- [ ] 3-5개 토큰 도착 후 뒤로가기 or 다른 URL 이동
- [ ] Network 상태 → **`(cancelled)`** 확인
- [ ] Console AbortError 관련 경고 **없음**

#### L.17 — AI 응답 실패 시 턴 보상 (관찰 중심)
- [ ] DevTools Slow 3G throttling으로 타임아웃 유도 시도
- [ ] 4턴째 전송 시 에러 박스 "AI 서비스 일시 오류..." 확인
- [ ] 에러 후 배지 여전히 (3/5) 유지 or 감소 (보상 감소 동작)
- [ ] "다시 시도" → 성공 시 (4/5)

#### L.18 — ThoughtPanel 모바일 Sheet 드로어
- [ ] DevTools iPhone 14 Pro (390×844) 전환 + 활성 세션에서 첫 분석 완료
- [ ] 우측 사이드바 숨김 (`hidden lg:block`)
- [ ] 우측 하단 `fixed bottom-20 right-4` 원형 Brain 버튼
- [ ] 클릭 → Sheet 하단 슬라이드 업 (`max-h-70vh`)
- [ ] SheetHeader "사고력 분석"
- [ ] Sheet 외부 클릭/드래그 닫기

#### L.19 — Navbar 드롭다운 로그아웃 (게스트)
- [ ] 우측 드롭다운 (User + "체험 사용자 XXXX" + "게스트" 뱃지 + ChevronDown) 클릭
- [ ] 드롭다운 내부: 이메일 + Separator + "로그아웃"
- [ ] "로그아웃" 클릭 → localStorage clear → `/` redirect
- [ ] `/student/chat` 재접근 → `/login` redirect

#### L.20 — 게스트 세션 중 새로고침
- [ ] 2-3턴 후 F5 새로고침
- [ ] AuthProvider가 user 복원 but sessionId state 유실 → "새 대화 시작" 카드 재표시
- [ ] 이전 대화 유실 (의도된 제약)
- [ ] GET `/api/sessions`로 이전 세션 DB에 존재 확인

---

### §2. Student (수동 28개)

#### ST.1 — 랜딩 초기 로딩 (이미 L.1로 커버되었으나 학생 경로 특화 확인)
- [ ] Hero 2줄 페이드인 stagger
- [ ] 스크롤 시 비교 / 피처 3개 / 데모 순차 페이드인

#### ST.2 — 회원가입 필드 유효성
- [ ] `/register` 이름/이메일/비밀번호/역할 4섹션
- [ ] 모든 필드 빈 채 → "모든 항목을 입력해주세요."
- [ ] 비밀번호 5자 → "비밀번호는 6자 이상이어야 합니다."
- [ ] 역할 "학생" 기본 → "교강사" 클릭 시 emerald 전환
- [ ] Input focus ring 인디고-200

#### ST.3 — 회원가입 성공 + 자동 로그인
- [ ] 신규 이메일(`testuser_{ts}@qa.com`) + "testpass123" + "학생" → "가입하기"
- [ ] "가입 중..." + disabled
- [ ] 성공 → `/student/chat` redirect + Navbar 이름
- [ ] localStorage `thinkbridge_token` / `thinkbridge_user`
- [ ] 동일 이메일 재시도 → "이미 등록된 이메일입니다"

#### ST.6 — Guest 트라이얼 진입 (랜딩 vs 로그인 페이지)
- [ ] `/` "바로 체험하기" → 게스트 뱃지 + "5턴 체험 중"
- [ ] 로그아웃 후 `/login` "회원가입 없이 체험하기" → 동일
- [ ] Offline 시 배너 노출 (P1-8)

#### ST.7 — 데모 원클릭 (Landing 3버튼)
- [ ] 3개 버튼 각각 click → 해당 role dashboard 도착
- [ ] Offline 상태에서 버튼 클릭 시 에러 배너

#### ST.9 — Mobile 햄버거 Sheet
- [ ] iPhone 12 (390×844) 전환
- [ ] Sidebar 숨김 + 우측 하단 `fixed bottom-4 right-4` 파란 햄버거
- [ ] 클릭 → 좌측 `w-64` Sheet 슬라이드인
- [ ] "세션 목록" 클릭 → Sheet 자동 close + 이동

#### ST.10 — Navbar 사용자 드롭다운
- [ ] Navbar 우측 User 아이콘 + 이름 + 뱃지 + ChevronDown
- [ ] 클릭 → 드롭다운 "로그아웃"
- [ ] "로그아웃" → localStorage clear + `/` redirect
- [ ] 재접근 → `/login` redirect

#### ST.11 — 새 대화 카드 (과목 3개 + 주제 + Enter)
- [ ] 과목 테마 스위칭 (파랑/emerald/purple) 시각 확인
- [ ] placeholder 과목별 변경
- [ ] Enter 단축키 세션 생성 트리거
- [ ] 256자 초과 → "주제는 255자 이내로 입력해주세요."

#### ST.12-13 — 세션 생성 로딩 + 실패
- [ ] "대화 시작하기" 스피너 + "세션 생성 중..." + input disabled
- [ ] `/api/sessions` block → 빨간 error 박스

#### ST.14 — ChatInterface 초기 렌더
- [ ] Welcome 카드 Sparkles + "안녕하세요!" + 3 tips
- [ ] 진행바 Stage 1 current (9×9, gradient, ring + ping pulse)
- [ ] 우측 ThoughtPanel placeholder
- [ ] Send/힌트/종료 3 버튼

#### ST.15 — SSE 스트리밍 상세 (visual)
- [ ] 3 bouncing dots 타이핑 indicator (150ms stagger)
- [ ] 토큰 2개씩 30ms 타이핑 애니메이션 + `█` 블링크
- [ ] 분석 패널 6차원 bar **500ms cubic-bezier** transition

#### ST.16 — 입력 validation
- [ ] 빈 상태 Send disabled
- [ ] 공백만 disabled
- [ ] 5001자 붙여넣기 + Send → 400 에러
- [ ] Textarea auto-resize 4 rows 제한

#### ST.17 — 5턴 진행 + Stage 전환 시각 확인
- [ ] Past stage: checkmark + indigo-400
- [ ] Current: 크기 9→10 + ping
- [ ] Future: border + gray
- [ ] 연결선 100% gradient 채움

#### ST.18 — 힌트 요청 (P2-6 제약)
- [ ] "힌트" 버튼 클릭 → `[힌트 요청] <마지막 발화>` 형태
- [ ] AI 응답이 일반보다 구체적
- [ ] 게스트 턴 소모됨 (1/5 → 2/5)

#### ST.19 — 대화 마무리
- [ ] "종료" 버튼 disabled 여부 (0턴 시 disabled)
- [ ] PATCH `/api/sessions/{id}/end` 200
- [ ] `/student/report/{id}` 자동 이동
- [ ] 실패 시 에러 박스 + 재시도

#### ST.20 — 게스트 5턴 한도 (이미 L.13 커버)
- [ ] 다른 경로 (예: 로그인 페이지 guest button)로 한 번 더 검증
- [ ] "회원가입하기" → `/register` 이동

#### ST.21 — SSE 중 이탈 (L.16과 동일)
- [ ] Sidebar 이동 시 fetch cancelled

#### ST.22 — SSE 에러 이벤트 (P0-1/P0-2/P1-6) — **DevTools 필수**
- [ ] Network Throttling Slow 3G
- [ ] 에러 코드별 메시지 구분 (AI_API_ERROR / DB_SAVE_FAILED / STREAM_UNEXPECTED)
- [ ] 게스트 완전 실패 시 턴 보상 감소

#### ST.23 — 서버 HTML 에러 페이지 (P0-3) — **관찰 중심**
- [ ] Render 15분+ idle 후 cold start 재현
- [ ] 메시지 전송 → 502/503 HTML
- [ ] 에러 박스 "HTTP 502: <!DOCTYPE html...`" 표시
- [ ] React 크래시 없음, Console SyntaxError 없음

#### ST.24 — 모바일 ThoughtPanel Sheet (L.18과 동일)

#### ST.26 — 세션 목록 API 실패
- [ ] `/api/sessions` block → 스켈레톤 → 빨간 에러 박스

#### ST.27 — 채팅 재개
- [ ] 진행 중 세션 카드 클릭 → `/student/chat?sessionId={id}`
- [ ] subject 재로드, 과목 선택 스킵
- [ ] **현 구현 제약**: 이전 메시지 로드 안 함

#### ST.28 — 리포트 정상 렌더링
- [ ] 병렬 API 3개 호출
- [ ] Radar + AI 요약 (Clock + narrative) + Growth (6선) + Timeline (턴별 dot + 뱃지)
- [ ] "N번의 사고 전환..." 문구
- [ ] 하단 2버튼

#### ST.29 — 리포트 미준비 상태 (P2-2)
- [ ] 세션 종료 직후 리포트 접근 → 404 "리포트가 아직 준비되지 않았습니다..."
- [ ] Auto-create 없음
- [ ] 새로고침 수동 재시도

#### ST.30 — NaN id 가드
- [ ] `/student/report/abc` → `/student/sessions` redirect

#### ST.31 — 리포트 403/500
- [ ] 다른 학생 세션 id 접근 → 에러 박스

#### ST.32 — JWT 만료
- [ ] localStorage token 삭제
- [ ] `/student/chat` 재접근 → `/login` redirect
- [ ] 토큰 변조 → 첫 API 실패 → 에러 배너 (자동 logout 훅 미구현 — follow-up)

#### ST.33 — Segment error boundary
- [ ] `/student/report/999999` 잘못된 id → `app/error.tsx` 폴백
- [ ] AlertTriangle + "문제가 발생했습니다" + "다시 시도" / "홈으로"

#### ST.34 — Root layout global-error.tsx
- [ ] `app/global-error.tsx` 파일 존재 확인
- [ ] UI "심각한 오류가 발생했습니다" 확인 (실제 발동은 어려움, 코드 리뷰로 대체)

#### ST.35 — 네트워크 불안정 종합
- [ ] Slow 3G 메시지 전송 + 타이핑 indicator 오래
- [ ] 스트리밍 중 Offline → 에러 박스
- [ ] 복구 후 재시도

---

### §3. Instructor (수동 13개)

#### IN.2 — 학생 guard 시각 확인
- [ ] `student@demo.com` 로그인 상태
- [ ] `/instructor/dashboard` 직접 입력 → 보라 스피너 → `/` redirect **1 tick flicker** 관찰
- [ ] `/instructor/replay/1` 동일

#### IN.3 — 로그아웃 후 재접근
- [ ] Navbar 로그아웃 → `/` 또는 랜딩
- [ ] DevTools Application: token/user 제거
- [ ] `/instructor/dashboard` 재입력 → `/login`
- [ ] 뒤로가기로도 로그인 페이지

#### IN.5 — SummaryCards 상세
- [ ] 4개 카드 아이콘 색상 (Users 파랑 / BookOpen 초록 / Activity 주황 / TrendingUp 보라)
- [ ] 고등수학 1반: 총 학생 5명, 평균 세션 5.0±0.5회, 활성률 100%, 전체 평균 5-7점
- [ ] 학생 0명 반 (있다면): 모두 0 값

#### IN.6 — HeatmapChart 시각 확인
- [ ] 6차원 X축 라벨 정확 순서
- [ ] Y축 학생 sticky left-0
- [ ] Cell 색상 3단계 (빨강 0-3 / 노랑 4-6 / 초록 7-10)
- [ ] Row 호버 효과
- [ ] Row 클릭 → replay 이동
- [ ] AI 인사이트 박스 문구

#### IN.7 — StudentList 뱃지
- [ ] 그리드 반응형 (1/2/3열)
- [ ] 점수 뱃지 색상 (<4 빨강 / 4-6.99 노랑 / ≥7 초록)
- [ ] 호버 shadow-md
- [ ] 클릭 → replay 이동

#### IN.8 — 반 변경 시 재패칭
- [ ] 드롭다운 반 전환 → 스켈레톤 → 새 데이터
- [ ] 3개 반 모두 전환 확인

#### IN.9 — 에러 재시도 버튼
- [ ] Offline 토글 + 반 변경 → 에러 배너
- [ ] "다시 시도" 버튼 정상 동작

#### IN.10 — Empty state
- [ ] StudentList 0명 → 점선 박스
- [ ] Heatmap 0건 → "분석할 데이터가 없습니다."

#### IN.11-13 — 세션 리플레이
- [ ] 학생 카드 클릭 → `/instructor/replay/{studentId}`
- [ ] 좌측 세션 목록 + 중앙 메시지 + 우측 ThoughtPanel
- [ ] 첫 세션 자동 선택
- [ ] 세션/메시지 클릭 시 동기화
- [ ] NaN/존재하지 않는 id 에러 처리
- [ ] "대시보드로 돌아가기" → 복귀 + 선택 반 보존

#### IN.14 — 반응형 레이아웃
- [ ] 375px (iPhone SE): SummaryCards 2열 + 히트맵 가로 스크롤
- [ ] 768px 태블릿: StudentList 2열
- [ ] 1024px+: StudentList 3열

---

### §4. Admin (수동 4개)

#### AD.6 — 데이터 일관성 교차 검증
- [ ] 고등수학 1반 scores vs 학생 5명 평균 상관 확인
- [ ] 논술 심화반 `critical_thinking` 높음 (정하윤 8, 강예은 포함)
- [ ] 과목별 3개 엔트리 정확
- [ ] totalStudents / totalSessions 카드 표시와 일치

#### AD.7 — 에러 처리 + 빈 상태
- [ ] `/api/admin/stats` Block → 새로고침 → 에러 배너
- [ ] "다시 시도" 동작
- [ ] localStorage token 조작 → 401 → redirect 또는 에러
- [ ] Console recharts 경고 없음

#### AD.8 — 반응형
- [ ] 375px 카드 2×2
- [ ] BarChart 가로 스크롤
- [ ] 768px 풀폭
- [ ] RadarChart 한글 라벨 안 잘림

#### AD.9 — 로그아웃 + 역할 전환
- [ ] Navbar 로그아웃 → `/login` or 랜딩
- [ ] localStorage 완전 제거
- [ ] `/admin/dashboard` 재입력 → redirect
- [ ] 다른 계정 로그인 → 데이터 섞임 없음

---

### §5. Cross-cutting (수동 35개 / 자동 1개)

#### X.1 — P0-1 Anthropic 529 Overload 관찰
- [ ] Console `[SSE parse] failed` 또는 `Claude overload, retry` 10분 관찰
- [ ] Network `/api/sessions/{id}/messages` 응답에 `event: error, code: AI_API_ERROR`
- [ ] UI "AI 서비스 일시 오류입니다. 잠시 후 다시 시도해주세요."

#### X.2 — P0-2 DB Save Failure
- [ ] Network Throttling Slow 3G
- [ ] 메시지 전송 → done 후 추가 `event: error, code: DB_SAVE_FAILED`
- [ ] 토스트 "응답을 저장하지 못했습니다..."

#### X.3 — P0-3 Render Cold Start HTML
- [ ] 15분+ idle 확보
- [ ] "바로 체험하기" → 502/503 HTML
- [ ] 에러 배너 "HTTP 502: <!DOCTYPE html..." preview
- [ ] Console SyntaxError 없음

#### X.4 — P1-1 게스트 턴 보상
- [ ] 4턴 후 5번째 직전 Offline
- [ ] 실패 → 복구 후 재전송 → 배지 (4/5) 유지

#### X.5 — P1-2 AbortController (이미 L.16 커버)

#### X.6 — P1-4 Canned Text 제거
- [ ] 장시간 20세션+ 다양 질문
- [ ] "좋은 질문이에요! 조금 더 생각해볼까요?" 문자열 **단 한 번도 표시 안 됨** 확인

#### X.7 — P1-6 Exception Differentiation
- [ ] 3가지 code 분기 (`AI_API_ERROR` / `DB_SAVE_FAILED` / `STREAM_UNEXPECTED`) 모두 확인

#### X.8 — P1-7 parseSSEBuffer Log
- [ ] Console `SSE event JSON parse failed` + eventType + dataPreview

#### X.9 — P1-8 Landing Error Visibility
- [ ] Offline 시 게스트/데모 버튼 모두 에러 배너 표시

#### X.10 — P2-1 Duplicate Message (Render logs)
- [ ] Render dashboard → Logs `"Assistant message already exists"` 관찰

#### X.11 — P2-2 Report Race
- [ ] 세션 종료 → 동일 URL 새 탭 2개 → 둘 다 200

#### X.12 — P2-3 socraticStage Clamp
- [ ] ThoughtPanel "단계" 라벨 undefined 없음
- [ ] 비정상 stage 값 시 UI 크래시 없음

#### X.13 — P2-4 global-error.tsx
- [ ] `/student/report/99999999` → segment error
- [ ] "문제가 발생했습니다" + "다시 시도" / "홈으로"
- [ ] root layout 에러 (강제 트리거 어려움) — 코드 리뷰로 대체

#### X.14 — P2-5 Suspense
- [ ] `/student/chat?sessionId=123` + "Disable cache"
- [ ] 0.1~0.5s Suspense fallback → ChatInterface

#### X.16 — Tablet 768-1024px
- [ ] iPad Mini (768×1024)
- [ ] 강사 SummaryCards 2×2
- [ ] StudentList 2열
- [ ] ThoughtPanel sidebar 없음 (lg:block 미달)

#### X.17 — Desktop >1024px
- [ ] 브라우저 최대화
- [ ] 채팅: 좌측 메시지 + 우측 ThoughtPanel 고정
- [ ] Sidebar 좌측 고정

#### X.18 — 모바일 Orientation
- [ ] iPhone 14 Pro 가로(844×390) 전환
- [ ] ThoughtPanel sidebar 없음, bottom Sheet 유지

#### X.19 — 키보드 네비게이션
- [ ] 마우스 없이 Tab 순환
- [ ] focus ring (indigo outline)
- [ ] Enter로 CTA 활성화
- [ ] 채팅 Shift+Enter 줄바꿈, Enter 전송
- [ ] Esc로 Sheet 닫기

#### X.20 — Label / aria-label
- [ ] Login/Register form label 연결
- [ ] 채팅 Textarea aria-label **없음** (알려진 follow-up)

#### X.21 — 색상 대비 WCAG AA
- [ ] DevTools Elements → Accessibility → Contrast 4.5:1 이상

#### X.22 — aria-live 에러 발화
- [ ] 에러 배너 `role="alert"` / `aria-live` **미적용** 확인 (알려진 follow-up)

#### X.23 — Chrome 최신 (전체 플로우)
- [ ] 게스트 5턴 + 리포트 전체

#### X.24 — Firefox 최신
- [ ] Firefox 120+ SSE ReadableStream 정상
- [ ] Network `text/event-stream` 확인

#### X.25 — Safari (macOS)
- [ ] Safari 17+ SSE 정상
- [ ] AbortController + signal cancel
- [ ] CSS Grid/Flex/backdrop-blur 일관성

#### X.26 — Edge
- [ ] Edge 120+ Chrome 동등 동작

#### X.27 — Mobile Safari (iOS)
- [ ] 실기기 또는 BrowserStack iOS 17+
- [ ] 백그라운드 탭 → 복귀 시 스트리밍 동작
- [ ] 가상 키보드 올라올 때 Textarea + Send 가려짐 여부
- [ ] Sheet iOS gesture 충돌 없음

#### X.29-X.30 — 성능 관찰
- [ ] 15분+ idle 후 cold start TTFB
- [ ] Warm TTFB <200ms
- [ ] SSE 첫 토큰 1.5-3초

#### X.31 — 다수 턴 누적
- [ ] 100+ 턴 시 React reconciliation 성능 관찰 (실제로는 불가능, 언급만)

#### X.32 — JWT 만료
- [ ] localStorage token jwt.io payload 확인 (exp 24h)
- [ ] 토큰 1글자 변조 → 서명 실패 → 401 → 현재 자동 logout 미구현

#### X.33 — localStorage 삭제
- [ ] Storage Clear → 보호 페이지 → `/login` redirect

#### X.34 — 멀티 탭
- [ ] 탭 A 로그아웃 → 탭 B 즉시 반응 없음 (Storage event 미구독)
- [ ] 탭 B 다음 fetch → 401 → 에러 배너

#### X.35 — 다크모드 미구현
- [ ] 시스템 dark 전환 → 라이트 모드 강제 유지
- [ ] `dark:` variants 미사용 확인

---

## 🧭 테스트 실행 권장 순서

### Phase 1 (필수, 30분) — 데모 블로커 방지
- L.2, L.4, L.7, L.15, L.19 — 랜딩/세션 핵심
- ST.11, ST.14, ST.15, ST.17, ST.19, ST.28 — 학생 golden path
- IN.5, IN.6, IN.11 — 강사 핵심
- AD.6, AD.9 — 관리자 핵심

### Phase 2 (우선, 1시간) — 심사 품질
- L.9 (P1-8 제공), L.18, L.20
- ST.9, ST.10, ST.16, ST.18, ST.22, ST.29-31
- IN.2, IN.3, IN.8, IN.9, IN.14
- AD.7, AD.8
- X.4 (P1-1), X.11 (P2-2), X.14 (P2-5), X.19, X.21

### Phase 3 (선택, 2-3시간) — 완벽 제출
- 나머지 v3 fix 검증 (X.1, X.2, X.3, X.6, X.7, X.8, X.10, X.12, X.13)
- 브라우저 호환성 (X.23-X.27)
- 접근성 (X.20, X.22)
- 성능 관찰 (X.29-X.30)
- Edge case (X.32-X.34)

---

## 📝 발견 이슈 기록 양식

```
### 이슈 #N — [시나리오 번호 + 간단 제목]
- **일시**: YYYY-MM-DD HH:MM
- **브라우저/OS**: Chrome 123 / macOS 14
- **시나리오**: L.9 / ST.22 / ...
- **증상**: 무엇이 보였는가
- **기대**: 무엇이 보여야 했는가
- **스크린샷**: (경로)
- **Console 로그**: (있으면)
- **Network 응답**: (있으면 status + body)
- **재현 가능성**: 100% / 간헐적 / 1회
- **심각도**: Blocker / High / Medium / Low
```

발견 이슈는 `docs/work_log/` 에 새 파일로 정리 or 본 파일 하단에 append 권장.

---

## ✅ 최종 Sign-off

테스트 완료 시 다음 항목 채우기:

- [ ] 테스터 이름: __________
- [ ] 테스트 일시: __________ ~ __________
- [ ] 브라우저 / OS: __________
- [ ] Phase 1 완료: __ / 14
- [ ] Phase 2 완료: __ / 19
- [ ] Phase 3 완료: __ / 63
- [ ] 발견된 블로커: __________
- [ ] 추가 이슈 건수: __________
- [ ] 제출 준비 상태: ☐ Ready ☐ Needs fix ☐ Blocker

---

## 📎 참고

- 전체 시나리오: `comprehensive_test_scenarios.md`
- 자동 검증 결과: `automated_test_report.md`
- 스크린샷: `screenshots/`
- v3 Fix 변경 내역: `docs/work_log/10_v3_stability_hardening.md`
- 알려진 제약 목록: `docs/revise_plan_v3/05_backlog.md`
