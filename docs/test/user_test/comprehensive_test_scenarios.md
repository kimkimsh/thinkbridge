# ThinkBridge 최종 사용자 테스트 시나리오 — 전수 체크리스트

> **Version**: 1.0 (2026-04-12, v3 안정화 직후)
> **Target**: `https://frontend-manhyeon.vercel.app` (Vercel) + `https://thinkbridge-api.onrender.com` (Render)
> **Scope**: 4개 역할 전체 플로우 + v3 fix 검증 + 반응형/접근성/호환성/성능
> **총 시나리오 수**: **113개** (Landing/Guest 20 · Student 35 · Instructor 14 · Admin 9 · Cross-cutting 35)

---

## 📋 Test Setup

### 사전 준비

1. **브라우저**: Chrome 최신 (주 지원), Firefox / Safari / Edge (호환성 섹션에서 별도 확인)
2. **DevTools 열기** (F12)
   - Network 탭: "Preserve log" 체크
   - Console 탭: 경고/에러 관찰
   - Application 탭: LocalStorage 검증
3. **시크릿 창(Incognito)** 사용 권장 — 세션/토큰 간섭 방지
4. **Render Cold Start 인식**: free tier는 15분 idle 후 슬립. 첫 요청에 30-60초 지연 가능 (UptimeRobot ping 활성 시 대부분 warm)

### 데모 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|---------|
| 학생 | `student@demo.com` | `demo1234` |
| 강사 | `instructor@demo.com` | `demo1234` |
| 관리자 | `admin@demo.com` | `demo1234` |
| 게스트 | (랜딩 "바로 체험하기" 원클릭) | — |

### 검증 포맷

각 시나리오:
- **S.N — [제목]**
- **목적**: 무엇을 확인
- **선행 조건**: 전제 상태
- 체크박스 단계 (동작 + 기대)
- **합격 기준**: 몇 개 통과 시 합격
- **비고**: 알려진 제약

---

## 📑 목차

| 섹션 | 범위 | 시나리오 수 |
|------|-----|------------|
| [§1. 랜딩 + 게스트 5턴 체험](#1-랜딩--게스트-5턴-체험) | L.1-L.20 | 20 |
| [§2. 학생 역할](#2-학생-역할--회원가입부터-리포트까지) | ST.1-ST.35 | 35 |
| [§3. 강사 역할](#3-강사-역할--대시보드부터-세션-재생까지) | IN.1-IN.14 | 14 |
| [§4. 관리자 역할](#4-관리자-역할--전체-통계--반과목-비교) | AD.1-AD.9 | 9 |
| [§5. 교차 관심사 (v3 + 반응형 + 접근성 + 호환성)](#5-교차-관심사--v3-변경-검증--반응형--접근성--호환성) | X.1-X.35 | 35 |
| [§6. 최종 Sign-off Checklist](#6-최종-sign-off-checklist) | — | — |

---

## §1. 랜딩 + 게스트 5턴 체험

> 공통 전제: 시크릿 창, DevTools Network/Console 열림, URL = `https://frontend-manhyeon.vercel.app`

### L.1 — 페이지 초기 진입 + Warm-up fetch

**목적**: 랜딩 첫 로드 시 백엔드 warm-up 요청 발사 + Hero 영역 렌더링
**선행 조건**: 시크릿 창

- [ ] URL 입력 후 Enter — 1.5초 이내 첫 paint (Vercel CDN 캐시 히트 기준)
- [ ] Network 탭에서 `/health` 필터 → `thinkbridge-api.onrender.com/health` GET 1건 관찰 (warm-up)
- [ ] Noto Sans KR 폰트 로드 (Google Fonts CDN)
- [ ] 상단 Navbar: Brain 아이콘 + "ThinkBridge" 로고 + "로그인" ghost 버튼 + 파란 "회원가입" 버튼
- [ ] 페이지 수직 스크롤 가능 (Hero → 비교 → 기능 → 데모 → 푸터)

**합격 기준**: 5/5 통과
**비고**: warm-up 실패해도 UX 영향 없음 (의도된 동작)

### L.2 — Hero 섹션 애니메이션 + 주요 문구

**목적**: Hero stagger fade-in + 카피 품질

- [ ] 로드 직후 0.1초 이내: "AI 소크라테스식 1:1 튜터링" 뱃지 → "AI가 답을 주는 시대," → 그라디언트 "생각하는 법을 가르치는 AI" → 부제 → CTA 순차 등장 (200ms stagger)
- [ ] 그라디언트 텍스트: 인디고(#4338CA) → 퍼플 → 인디고
- [ ] 서브카피: "ThinkBridge는 절대 정답을 알려주지 않습니다." + "소크라테스식 질문으로 학생 스스로 답에 도달하도록 이끕니다."
- [ ] "바로 체험하기" 버튼: 인디고 배경 + 흰색 텍스트 + → 화살표 + shadow-lg. 호버 시 더 짙은 인디고 + shadow-xl
- [ ] "로그인" outline 버튼: 호버 시 인디고 테두리 + 인디고-50 배경
- [ ] 보조 캡션: "회원가입 없이 5턴 무료 체험" (text-gray-400)
- [ ] Hero 하단 미니 채팅 목업: "ThinkBridge 튜터" 헤더 + "과학" 뱃지 + 4개 학생/AI 버블 + 입력바 모형
- [ ] 배경 데코: 인디고/퍼플/앰버 블러 원 3개 + radial-gradient 도트 패턴 (opacity 0.03)

**합격 기준**: 7/8 이상

### L.3 — 스크롤 fade-in 애니메이션 (useScrollFadeIn)

**목적**: IntersectionObserver 기반 섹션 fade-up

- [ ] 빠른 스크롤 다운 — "기존 AI와 무엇이 다른가요?" 제목 viewport 진입 시 opacity 0→1, translateY(32px→0) 트랜지션 (800ms ease-out)
- [ ] ChatGPT 카드는 translateX(-24px→0), ThinkBridge 카드는 translateX(24px→0), 150ms stagger
- [ ] "핵심 기능" 섹션 3카드 순차 fade-up (150ms × index)
- [ ] "데모 모드" 3카드 순차 fade-up
- [ ] 재스크롤 시 재애니메이션 없음 (`observer.unobserve` 1회성)

**합격 기준**: 5/5

### L.4 — ChatGPT vs ThinkBridge 비교 섹션

**목적**: 부정/긍정 카드의 시각적 대비

- [ ] 좌측 ChatGPT 카드: 빨강 테두리(border-red-200), 빨강→흰 그라디언트, 빨간 X 아이콘 원형 뱃지
- [ ] 헤더 "기존 AI 챗봇" + 빨간 "답 제공" 뱃지
- [ ] 학생 질문: "이차방정식 x² - x - 6 = 0 풀어줘" (² 유니코드 정상)
- [ ] ChatGPT 응답 6줄 (x² - x - 6 = 0을 풀겠습니다 / (x - 3)(x + 2) = 0 / 따라서 x = 3 또는 x = -2)
- [ ] 좌측 하단 경고 밴드: X 아이콘 + "학생은 답만 받고, 사고 과정은 없음"
- [ ] 데스크톱(≥768px) 두 카드 사이 원형 VS 디바이더 (회색 테두리 2px, "VS" 볼드)
- [ ] 우측 ThinkBridge 카드: 인디고 테두리, emerald CheckCircle, blur glow
- [ ] ThinkBridge 응답 3개 질문 라인 ("좋은 질문이에요! 이 식을 보면 어떤 형태의 방정식인지..." 등)
- [ ] 우측 하단 긍정 밴드: emerald CheckCircle + "질문으로 스스로 사고하도록 유도"
- [ ] 모바일(<768px): 두 카드 세로 스택 + 작은 VS 원형

**합격 기준**: 9/10

### L.5 — Feature Cards (3개)

**목적**: 핵심 기능 3개 카드 검증

- [ ] 섹션 제목 "ThinkBridge의 핵심 기능" + 부제 "단순한 챗봇이 아닌, 사고력 성장 플랫폼"
- [ ] 카드 1 (소크라테스식 대화): 인디고 MessageSquare 아이콘 + 설명
- [ ] 카드 2 (실시간 사고력 분석): emerald BarChart3 + "블룸의 인지적 영역 6단계 기반..."
- [ ] 카드 3 (교강사 대시보드): purple Users + "학생별 사고력 히트맵, 성장 추세..."
- [ ] 호버: `-translate-y-1` + shadow-lg 300ms
- [ ] 모바일 세로 스택 (grid-cols-1)
- [ ] 데스크톱 가로 나열 (md:grid-cols-3)

**합격 기준**: 7/7

### L.6 — 데모 모드 3 버튼 (학생/교강사/운영자)

**목적**: 데모 섹션 3카드 외관 + 버튼 구분

- [ ] 헤더 "데모 모드" + 앰버 Lightbulb 아이콘
- [ ] 부제 "원클릭으로 각 역할을 체험해보세요. 시드 데이터가 준비되어 있습니다."
- [ ] 학생 카드: 인디고 테두리, GraduationCap, "채팅 + 사고력 분석", 인디고 솔리드 버튼
- [ ] 교강사 카드: purple 테두리, Users, "대시보드 + 리플레이", purple outline
- [ ] 운영자 카드: slate 테두리, BarChart3, "전체 통계 + 분석", slate outline
- [ ] 호버: `-translate-y-1` + 색상별 shadow
- [ ] 모바일 세로 스택
- [ ] Tab 키 순서: 학생 → 교강사 → 운영자

**합격 기준**: 7/8 (학생 카드만 solid — 주요 데모 경로 시각화)

### L.7 — 푸터 + 모바일 반응형

**목적**: 푸터 + 모바일 뷰포트 전환 검증

- [ ] 푸터 좌측: 인디고 원 Brain + "ThinkBridge" 텍스트
- [ ] 푸터 중앙: "2026 KIT 바이브코딩 공모전 출품작" (gray-500)
- [ ] 푸터 우측: "AI 소크라테스식 튜터링 시스템" (gray-400)
- [ ] iPhone 14 Pro (390×844) 전환: Hero text-4xl 축소, CTA 2개 세로 스택 + full-width
- [ ] 모바일 Navbar: 사용자 이름 숨김 (`hidden sm:inline`)
- [ ] 모바일 미니 채팅 목업: max-w-lg 유지, 학생 우측/AI 좌측
- [ ] 767px ↔ 768px 토글: 비교 카드 세로↔가로 즉시 전환

**합격 기준**: 7/7

### L.8 — "바로 체험하기" CTA 정상 경로

**목적**: 게스트 로그인 → JWT 수신 → `/student/chat` 리다이렉트

- [ ] "바로 체험하기" 클릭 — 버튼 "준비 중..." + disabled
- [ ] Network: `POST /api/auth/guest` 201 관찰
- [ ] Response: `{ accessToken, user: { email: "guest_XXXXXXXX@thinkbridge.ai", name, role: "student", isGuest: true }, maxTurns: 5 }`
- [ ] localStorage: `thinkbridge_token` 또는 유사 키에 JWT 저장
- [ ] URL → `/student/chat` 자동 redirect
- [ ] Navbar: User 아이콘 + "체험 사용자 XXXX" + 앰버 "게스트" 뱃지 + ChevronDown
- [ ] 카드 상단: "5턴 체험 중" 앰버 뱃지

**합격 기준**: 7/7
**비고**: Cold start 시 이 전체가 30-60초 걸릴 수 있음

### L.9 — 게스트 로그인 실패 에러 배너 (v3 Fix P1-8)

**목적**: 백엔드 불가 시 에러 visibility (이전엔 silent)

- [ ] Network Throttling → Offline (또는 `*/api/auth/guest` 차단)
- [ ] "바로 체험하기" 클릭 — 잠시 후 우측 상단 빨간 배너 등장 (fixed right-4 top-20)
- [ ] 배너: AlertCircle + "게스트 체험 시작에 실패했습니다..." + "닫기"
- [ ] 버튼 상태: "준비 중..." → "바로 체험하기" 복귀, disabled 해제
- [ ] Console: `console.error("Guest login failed", Error)` 로그
- [ ] "닫기" 버튼 → 배너 사라짐
- [ ] Throttling 해제 후 재시도 → 정상 로그인

**합격 기준**: 7/7
**비고**: v3 P1-8 (`8d090d2`). a11y `role="alert"` 추가는 follow-up

### L.10 — 과목 선택 + 주제 입력

**목적**: 채팅 시작 전 선행 폼

- [ ] 카드 헤더: 인디고→purple 그라디언트 Sparkles + "새 대화 시작" + 서브텍스트
- [ ] 과목 3버튼: 수학(BookOpen, 인디고) / 과학(FlaskConical, emerald) / 논술(PenLine, purple)
- [ ] 기본 "수학" 선택 상태 (인디고 border/bg + ring)
- [ ] "과학" 클릭 → emerald 테마 (200ms transition)
- [ ] "논술" 클릭 → purple 테마
- [ ] 논술 placeholder: "예: 기본소득제 찬반 논증"
- [ ] 수학 placeholder: "예: 이차방정식의 근의 공식"
- [ ] 주제 빈 상태 — "대화 시작하기" disabled (그라디언트 해제)
- [ ] 주제 "광합성의 원리" 입력 — 버튼 활성 (그라디언트 + shadow)

**합격 기준**: 9/9

### L.11 — 세션 생성 + 턴 1 SSE 스트리밍

**목적**: 첫 메시지 전송 → SSE → 타이핑 애니메이션 → 분석/진행바 업데이트

- [ ] "대화 시작하기" 클릭 — "세션 생성 중..." + 스피너, POST `/api/sessions`
- [ ] ChatInterface 전환: 상단 진행바(1단계 "명확화" 활성), 우측 "사고력 분석" 카드(placeholder), 하단 입력창
- [ ] Welcome 카드: Sparkles + "안녕하세요!" + "오늘은 어떤 주제로 함께 생각해볼까요?" + 3개 tips
- [ ] 상단 뱃지 3개: "수학" 인디고 outline + 주제 + 앰버 "체험 중 (0/5)"
- [ ] 입력창에 "이차방정식을 어떻게 풀어야 할지 모르겠어요" + Enter
- [ ] 사용자 버블 즉시 표시 (오른쪽, 인디고 그라디언트, "나" + User 아이콘)
- [ ] POST `/api/sessions/{id}/messages` pending (`text/event-stream`)
- [ ] 3개 바운싱 도트 타이핑 인디케이터 (150ms stagger)
- [ ] 첫 토큰 도착 시 타이핑 애니메이션 (CHARS_PER_FRAME=2, 30ms 간격) + ▓ 블링킹 커서
- [ ] analysis 이벤트 수신 시 ThoughtPanel 업데이트 (6차원 바 + 평균 + engagement 뱃지)
- [ ] 진행바 stage 업데이트 (활성 단계 인디고 그라디언트 + ring-indigo-200 ping)
- [ ] "done" 이벤트 후 입력창 복귀, 배지 "체험 중 (1/5)"
- [ ] placeholder: "질문을 입력하세요... (Shift+Enter: 줄바꿈)"

**합격 기준**: 11/12
**비고**: 첫 AI 응답 2-5초

### L.12 — 턴 2-4 연속 전송 + 분석 점수 변화

**목적**: 여러 턴 연속 진행 시 ThoughtPanel 변화

- [ ] 2턴 전송 — "일단 x를 구해야 한다는 건 알겠어요"
- [ ] 분석 패널 6차원 바 width 애니메이션 (500ms cubic-bezier, 7+ emerald / 4- 빨강 / 중간 회색)
- [ ] Stage 2로 전진 — 1단계 Check 아이콘(과거), 2단계 활성 ring, 연결선 100% 채움
- [ ] 배지 "체험 중 (2/5)"
- [ ] 3턴 전송 — "근의 공식을 쓰면 될 것 같은데..."
- [ ] "체험 중 (3/5)" + stage 3(유도) 가능
- [ ] 분석 패널 "소크라테스 단계": 1→2→3 원형 아이콘 인디고-200(과거) + 3 활성 ring-indigo-300 + "현재: 유도 단계"
- [ ] 감지된 패턴 뱃지 1-3개 (있는 경우)
- [ ] 4턴 전송 — 배지 "체험 중 (4/5)"
- [ ] 힌트 버튼 활성 (앰버 Lightbulb)
- [ ] 종료 버튼 활성 (빨간 Square)

**합격 기준**: 9/11

### L.13 — 턴 5 전송 + 입력 비활성 (한도 도달)

**목적**: 5턴 완료 후 입력 잠금

- [ ] 5턴째 전송 — "x = (-b ± √(b²-4ac)) / 2a 인가요?"
- [ ] 배지 "체험 중 (5/5)"
- [ ] 입력창 placeholder "체험이 종료되었습니다" + disabled
- [ ] Send 버튼 disabled (opacity 낮아짐)
- [ ] 힌트 버튼 disabled
- [ ] 안내 박스: 앰버 border + "체험 5턴이 모두 사용되었습니다." + "계속하려면 회원가입이 필요합니다." + 인디고 "회원가입하기"
- [ ] Stage 5 도달 시 추가 emerald 박스 "대화가 완료되었습니다!" + "리포트 확인" (조건부)
- [ ] Console 강제 입력 시도 — 불가

**합격 기준**: 7/8

### L.14 — 6번째 전송 강제 시도 (서버 403 방어)

**목적**: UI 우회 6번째 시도 시 CAS 거부

- [ ] DevTools Console: sessionId 확인
- [ ] localStorage에서 JWT 복사
- [ ] Console fetch:
  ```js
  fetch(`https://thinkbridge-api.onrender.com/api/sessions/SESSION_ID/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${TOKEN}` },
    body: JSON.stringify({ content: "6번째 시도" })
  }).then(r => r.json().then(j => console.log(r.status, j)))
  ```
- [ ] 응답: HTTP 403 + `{ detail: "체험 모드의 최대 대화 횟수(5턴)에 도달했습니다..." }`
- [ ] Network 탭: POST 403 + `Content-Type: application/json`
- [ ] DB는 선증분 안 됨 (CAS의 `UPDATE ... WHERE mTotalTurns < 5` match 실패)

**합격 기준**: 5/5
**비고**: `work_log/09` CAS 패턴 (Fix #5, `e1db1c5`)

### L.15 — 세션 종료 → 리포트 이동

**목적**: 체험 중 대화 마무리 + 리포트 페이지 진입

- [ ] "종료" 빨간 버튼 클릭 — `handleEndSession` 호출
- [ ] Network: PATCH `/api/sessions/{id}/end` 200 + `{ status: "completed", endedAt }`
- [ ] 서버 `generateSessionReport` 자동 실행
- [ ] URL → `/student/report/{sessionId}` redirect
- [ ] 페이지 로드: "사고 과정을 분석 중..." 스켈레톤 또는 RadarChart/성장/내러티브

**합격 기준**: 5/5

### L.16 — 스트리밍 중 페이지 이탈 (v3 Fix P1-2)

**목적**: SSE 진행 중 이탈 시 fetch abort

- [ ] Network 탭 "EventStream" 필터
- [ ] 긴 질문 전송 → 스트리밍 시작 (`pending`)
- [ ] 3-5개 토큰 도착 후 뒤로가기 or 다른 URL 이동
- [ ] useEffect cleanup에서 `mAbortRef.current?.abort()` 호출
- [ ] Network 상태 "cancelled" (또는 "(canceled)")
- [ ] `/student/chat?sessionId=X` 복귀 시 진행 중이던 턴 복구 안 됨 (AbortError silent 처리)
- [ ] Console: AbortError 관련 경고 없음

**합격 기준**: 6/6
**비고**: v3 P1-2 (`acca792`)

### L.17 — AI 응답 실패 시 턴 보상 감소 (v3 Fix P1-1)

**목적**: CAS 선증분 후 AI 실패 시 턴 카운트 -1 보상 (관찰)

- [ ] 재현 어려움. Console에서 fetch 실패 로그 수집
- [ ] Network `Slow 3G` throttling으로 타임아웃 유도
- [ ] 4턴째 메시지 전송
- [ ] 에러 박스 "AI 서비스 일시 오류..." 또는 "스트리밍 중 예상치 못한 오류..."
- [ ] 에러 후 배지 여전히 "체험 중 (3/5)" (보상 감소)
- [ ] "다시 시도" → 성공 시 (4/5)
- [ ] 백엔드 로그 (접근 가능 시): "Compensated guest turn decrement..."

**합격 기준**: 4/6 이상 (실패 시뮬레이션 난이도 높음)

### L.18 — ThoughtPanel 모바일 Sheet 드로어

**목적**: <1024px에서 floating button + Sheet

- [ ] iPhone 14 Pro (390×844) 전환
- [ ] 우측 사이드바 숨김, 좌측 메시지 full-width
- [ ] 우측 하단 floating button (`fixed bottom-20 right-4 z-40 lg:hidden`): 인디고→purple 그라디언트 원형 + Brain 아이콘 + shadow-indigo
- [ ] Floating 클릭 → Sheet 하단에서 슬라이드 업 (max-h-[70vh])
- [ ] Sheet 헤더: 인디고 Sparkles + "사고력 분석"
- [ ] Sheet 내부 ThoughtPanel 렌더 (데스크톱과 동일)
- [ ] Sheet 외부 클릭/드래그 닫기
- [ ] Sidebar 햄버거 (`bottom-4 right-4` z-50)와 분석 floating (`bottom-20 right-4` z-40) 수직 16px offset

**합격 기준**: 7/7
**비고**: isDemo는 `?demo=true` URL 필요 (현재 경로는 false)

### L.19 — Navbar 드롭다운 로그아웃 (게스트)

**목적**: 게스트 드롭다운 + 로그아웃

- [ ] 우측 드롭다운 트리거: User + "체험 사용자 XXXX" + 앰버 "게스트" + ChevronDown
- [ ] 드롭다운 내부: 이메일 회색 텍스트 + Separator + LogOut + "로그아웃"
- [ ] "로그아웃" 클릭 → localStorage clear → "/" 또는 "/login"
- [ ] Navbar 복귀: "로그인" + "회원가입" (unauthenticated)
- [ ] 뒤로가기로 `/student/chat` 시도 → 로그인 페이지로 redirect

**합격 기준**: 5/5

### L.20 — 게스트 세션 중 새로고침

**목적**: 세션 복원 동작 (알려진 제약)

- [ ] 현재 URL 확인 — sessionId 쿼리 없을 수 있음
- [ ] F5 새로고침
- [ ] AuthProvider가 localStorage 토큰으로 user 복원
- [ ] sessionId state로만 보관 → "새 대화 시작" 카드 재표시 가능성 높음
- [ ] 이전 대화 유실 — 의도된 제약
- [ ] API 직접 호출 시 이전 세션 DB에 존재 확인

**합격 기준**: 4/5 (5는 정상 동작)
**비고**: 게스트 새로고침 세션 복원 미지원 — 회원가입 전환 유도

---

## §2. 학생 역할 — 회원가입부터 리포트까지

### ST.1 — 랜딩 페이지 초기 로딩 + Hero CTA

**목적**: 랜딩 정상 렌더링 + warm-up
**선행 조건**: 로그아웃 상태, DevTools Network 열림

- [ ] `/` 접속 — Navbar + Hero 배지 "AI 소크라테스식 1:1 튜터링"
- [ ] Hero 제목 2줄 페이드인 (200ms stagger)
- [ ] Network `GET /health` 호출 (warm-up)
- [ ] "바로 체험하기" CTA + "회원가입 없이 5턴 무료 체험" 캡션
- [ ] 스크롤 — 비교 / 피처 3개 / 데모 순차 페이드인

**합격 기준**: 5/5

### ST.2 — 회원가입 필드 유효성 (client-side)

**목적**: 공백/짧은 비밀번호 가드

- [ ] `/register` — 이름/이메일/비밀번호/역할 4섹션
- [ ] 모든 필드 빈 채 "가입하기" → "모든 항목을 입력해주세요."
- [ ] 비밀번호 5자 → "비밀번호는 6자 이상이어야 합니다."
- [ ] 역할 "학생" 기본 → 인디고 테마. "교강사" 클릭 → emerald 전환
- [ ] Input 포커스 ring 인디고-200

**합격 기준**: 5/5
**비고**: `MIN_PASSWORD_LENGTH = 6`

### ST.3 — 회원가입 성공 + 자동 로그인 + 리다이렉트

**목적**: 신규 등록 → JWT 저장 → `/student/chat`

- [ ] 신규 이메일 (`testuser_{timestamp}@qa.com`) + "testpass123" + "학생" → "가입하기"
- [ ] 버튼 "가입 중..." + disabled
- [ ] 성공 → `/student/chat` redirect + Navbar 사용자 이름 + 학생 뱃지
- [ ] localStorage: `thinkbridge_token` / `thinkbridge_user`
- [ ] 동일 이메일 재시도 → "이미 등록된 이메일입니다"

**합격 기준**: 5/5

### ST.4 — 로그인 성공 (데모 학생)

**목적**: 데모 계정 정상 로그인

- [ ] `/login` — 좌측 인디고/퍼플 브랜드 패널 + 우측 로그인 카드 (모바일: 브랜드 패널 숨김)
- [ ] `student@demo.com / demo1234` 입력 → "로그인"
- [ ] "로그인 중..." + disabled
- [ ] 성공 → `/student/chat` + Navbar 이름 + 학생 뱃지

**합격 기준**: 4/4

### ST.5 — 로그인 실패 에러 (Information disclosure 방지)

**목적**: 비밀번호 틀림 / 존재하지 않는 이메일 동일 에러

- [ ] `student@demo.com` + `wrongpass` → "이메일 또는 비밀번호가 올바르지 않습니다"
- [ ] `nobody@nothere.com` + `whatever` → **동일 메시지**
- [ ] 빈 필드 → "이메일과 비밀번호를 입력해주세요."

**합격 기준**: 3/3
**비고**: 백엔드 `INVALID_CREDENTIALS_DETAIL` 단일 상수

### ST.6 — Guest 트라이얼 진입

**목적**: 랜딩 "바로 체험하기" + 로그인 페이지 "회원가입 없이 체험하기" 정상

- [ ] `/` "바로 체험하기" 클릭 — "준비 중..." → `/student/chat`
- [ ] Navbar: "체험 사용자 xxxx" + 게스트 뱃지
- [ ] amber "5턴 체험 중" 뱃지 노출
- [ ] 로그아웃 후 `/login` "회원가입 없이 체험하기" (Sparkles + ArrowRight) 클릭 — 동일
- [ ] **P1-8 검증**: Offline 상태에서 버튼 클릭 → 우측 상단 빨간 배너 + "닫기"

**합격 기준**: 5/5

### ST.7 — 데모 원클릭 로그인 (Landing)

**목적**: 랜딩 3개 버튼 동작

- [ ] "학생으로 체험" 클릭 → 자동 로그인 → `/student/chat`
- [ ] **P1-8 visibility**: `/api/auth/login` block 후 버튼 재클릭 → 빨간 배너 에러
- [ ] "닫기" 버튼 → 배너 사라짐

**합격 기준**: 3/3

### ST.8 — 학생 레이아웃 가드 + Sidebar (Desktop)

**목적**: 학생 외 접근 차단 + Sidebar 정상

- [ ] `/student/chat` — 상단 sticky Navbar + 좌측 `w-56` Sidebar ("채팅" / "세션 목록")
- [ ] "채팅" `bg-blue-50 text-blue-700` highlight
- [ ] "세션 목록" 클릭 → `/student/sessions`
- [ ] `/instructor/dashboard` 수동 입력 → `/` redirect (학생 가드)
- [ ] `/admin/dashboard` 수동 입력 → `/` redirect

**합격 기준**: 5/5

### ST.9 — Mobile 햄버거 Sheet

**목적**: 모바일에서 Sidebar → Sheet

- [ ] iPhone 12 (390×844) 전환 — Sidebar 숨김, 우측 하단 `fixed bottom-4 right-4` 파란 햄버거
- [ ] 햄버거 클릭 → 좌측 `w-64` Sheet 슬라이드인
- [ ] "세션 목록" 클릭 → Sheet 자동 close + 이동
- [ ] 다른 페이지에서 햄버거 재오픈 가능

**합격 기준**: 4/4

### ST.10 — Navbar 사용자 드롭다운 + 로그아웃

**목적**: 드롭다운 메뉴 + 로그아웃 동작

- [ ] Navbar 우측 User 아이콘 + 이름 + 뱃지 ("학생" default) + ChevronDown
- [ ] 클릭 → 드롭다운: 이메일 + Separator + "로그아웃"
- [ ] "로그아웃" → localStorage clear + `/` redirect
- [ ] `/student/chat` 재접근 → `/login` redirect
- [ ] 게스트로 로그인 시 뱃지가 "게스트"

**합격 기준**: 5/5

### ST.11 — 새 대화 카드

**목적**: 과목 3개 + 주제 + Enter + validation

- [ ] 카드 헤더: Sparkles + "새 대화 시작" + 서브텍스트
- [ ] 과목 3버튼 — 수학(BookOpen, 파랑) / 과학(FlaskConical, emerald) / 논술(PenLine, purple)
- [ ] 기본 "수학" — 파랑 테마
- [ ] "과학" 클릭 — emerald 전환, placeholder "예: 뉴턴의 운동 법칙"
- [ ] "논술" 클릭 — purple 전환, placeholder "예: 기본소득제 찬반 논증"
- [ ] 주제 빈 상태 — 버튼 disabled (gradient 제거)
- [ ] 주제 "테스트 주제" — 버튼 active
- [ ] Textarea 포커스 + Enter — 세션 생성 트리거
- [ ] 256자 초과 → "주제는 255자 이내로 입력해주세요."
- [ ] 게스트면 amber "5턴 체험 중" 뱃지 추가

**합격 기준**: 10/10
**비고**: `MAX_TOPIC_LENGTH = 255`

### ST.12 — 세션 생성 중 로딩

**목적**: `POST /api/sessions` 진행 UI

- [ ] "대화 시작하기" 클릭 — 스피너 + "세션 생성 중..." + input disabled
- [ ] 성공 → ChatInterface 전환
- [ ] Network: POST 201 + SessionResponse

**합격 기준**: 3/3

### ST.13 — 세션 생성 실패

**목적**: 에러 박스 표시

- [ ] `/api/sessions` block 후 "대화 시작하기" — 빨간 error 박스
- [ ] 버튼 active 복귀, 재시도 가능
- [ ] Block 해제 후 성공

**합격 기준**: 3/3

### ST.14 — ChatInterface 초기 렌더링

**목적**: Welcome + 진행바 + 분석 placeholder

- [ ] 상단: 과목 뱃지 + topic (truncate max-w-200) + 진행바
- [ ] 진행바: 5 원형 stage, Stage 1 current (9×9, indigo-600 gradient, ring + animate-ping)
- [ ] 연결선 모바일 숨김 (sm:block), responsive width
- [ ] Welcome 카드: Sparkles + "안녕하세요!" + 3 tips (MessageCircle/Lightbulb/BookOpen)
- [ ] 데스크톱(≥lg) 우측 `w-72 xl:w-80` ThoughtPanel (indigo dashed placeholder)
- [ ] 입력창 placeholder "질문을 입력하세요... (Shift+Enter: 줄바꿈)" + Send/힌트/종료 3버튼

**합격 기준**: 6/6

### ST.15 — 메시지 전송 + SSE 스트리밍 (Happy Path)

**목적**: 1-tool + text 스트리밍 + 분석 실시간 업데이트

- [ ] "근의 공식이 뭐예요?" + Send (또는 Enter)
- [ ] 사용자 버블 즉시 우측 (인디고 그라디언트, "나")
- [ ] 도착 전 "AI 튜터" 아바타 + 3 bouncing dots (150ms stagger)
- [ ] 첫 토큰 도착 → dots → 말풍선 (왼쪽, 흰 bg, border-l-4 인디고, `rounded-bl-md`)
- [ ] 글자 2개씩 30ms 간격 + `█` 블링크
- [ ] Network SSE: event: token / analysis / done chunks
- [ ] ThoughtPanel 업데이트: 평균 pill + engagement 뱃지 (접힌 상태)
- [ ] 헤더 클릭 → 6차원 bar (500ms transition) + stage + 패턴 뱃지
- [ ] 입력창 자동 포커스 복귀

**합격 기준**: 9/9
**비고**: `CHARS_PER_FRAME=2`, `ANIMATION_INTERVAL_MS=30`

### ST.16 — 입력 validation

**목적**: 빈 / 5000자 초과 방어

- [ ] 빈 상태 → Send disabled (`tCanSend`)
- [ ] 공백만 → 여전히 disabled
- [ ] 5001자 붙여넣기 + Send → 400 "메시지는 5000자 이내로..."
- [ ] "다시 시도" → 재전송
- [ ] Textarea auto-resize — max 4 rows (max-h-120px)

**합격 기준**: 5/5

### ST.17 — 5턴 진행 + ProgressBar Stage 전환

**목적**: socraticStage 1→5 시 애니메이션

- [ ] 턴 2-3회 진행 — Stage 전진
- [ ] Past: checkmark + indigo-400 gradient. Current: 크기 9→10 + ping pulse. Future: border + gray
- [ ] 연결선 현재 이전 100% gradient, 이후 0%
- [ ] Stage 5 도달 → emerald 카드 "대화가 완료되었습니다! 사고 과정 리포트를 확인해 보세요." + "리포트 확인" (FileText)
- [ ] 버튼 클릭 → `/student/report/{sessionId}`

**합격 기준**: 5/5
**비고**: `clampSocraticStage` [1,5] 방어

### ST.18 — 힌트 요청 + 정체 감지

**목적**: 힌트 버튼 동작 + 턴 소모 (P2-6 알려진 제약)

- [ ] 입력창 옆 amber "힌트" (Lightbulb) 클릭 (최초엔 disabled, 1턴 이후 enable)
- [ ] 사용자 버블 `[힌트 요청] <마지막 발화>` 형태 표시
- [ ] AI 응답이 일반 질문보다 더 구체적
- [ ] Network body `content = [힌트 요청] ...`
- [ ] 게스트 모드 힌트 시 턴 증가 (1/5 → 2/5) — **P2-6 알려진 제약**

**합격 기준**: 5/5
**비고**: sessions.py L478-485 prefix 제거 + `STUCK_DETECTION_INSTRUCTION` prepend

### ST.19 — 대화 마무리 (세션 종료)

**목적**: "종료" → PATCH → 리포트 이동

- [ ] 빨간 "종료" (Square) 클릭 (0턴이면 disabled)
- [ ] Network: PATCH `/api/sessions/{id}/end` 200
- [ ] `/student/report/{sessionId}` 즉시 이동
- [ ] 실패 시 "세션 종료 중 오류가 발생했습니다." + 재시도

**합격 기준**: 4/4

### ST.20 — 게스트 5턴 한도 도달

**목적**: 게스트 5턴 소모 후 CTA

- [ ] 턴마다 amber "체험 중 (N/5)" 증가
- [ ] 5번째 후 placeholder "체험이 종료되었습니다" + disabled
- [ ] Send/힌트/종료 모두 disabled
- [ ] amber 카드 "체험 5턴이 모두 사용되었습니다." + "회원가입하기"
- [ ] 버튼 클릭 → `/register`
- [ ] 6회차 race → 서버 403 "체험 모드의 최대 대화 횟수(5턴)에 도달했습니다..."

**합격 기준**: 6/6
**비고**: 백엔드 CAS race-free

### ST.21 — SSE 중 페이지 이탈 (P1-2: fetch abort)

**목적**: 스트리밍 중 이탈 시 리소스 정리

- [ ] 긴 질문 전송 → 스트리밍
- [ ] Network `/messages` pending
- [ ] Sidebar "세션 목록" 클릭 (또는 back)
- [ ] Network 상태 → **cancelled**
- [ ] Console unhandled promise rejection 없음
- [ ] 백엔드 로그 (접근 가능 시): `"Client disconnected during streaming for session X"`

**합격 기준**: 6/6
**비고**: `mAbortRef.current?.abort()` in useEffect cleanup

### ST.22 — SSE 에러 이벤트 (P0-1, P0-2, P1-6)

**목적**: 에러 타입별 구체 메시지

- [ ] **P0-1 (Claude 529)**: ANTHROPIC_API_KEY 무효화 상태 (간접 유도 필요) → `event: error`, code `AI_API_ERROR`, "AI 서비스 일시 오류입니다..."
- [ ] **P0-2 (DB 실패)**: Supabase 일시 차단 → `done` 후 추가 `error` + code `DB_SAVE_FAILED`, "응답을 저장하지 못했습니다..."
- [ ] **P1-6 (일반 예외)**: code `STREAM_UNEXPECTED`, "스트리밍 중 예상치 못한 오류가 발생했습니다." (generic 아님, 구체)
- [ ] 각 에러 박스 "다시 시도" 버튼 → 재전송
- [ ] 게스트 + 완전 실패 시 턴 5/5 → 4/5 보상 감소 (P1-1 compensation)

**합격 기준**: 5/5

### ST.23 — 서버 HTML 에러 페이지 (P0-3)

**목적**: 502 HTML 응답 시 frontend 크래시 방지

- [ ] 백엔드 down 상태 재현 (프록시 또는 실제 sleeping)
- [ ] 메시지 전송 → `POST /messages` 502 + text/html
- [ ] 에러 박스: `HTTP 502: <!DOCTYPE html>...` (100자 preview)
- [ ] React 크래시 없음, global-error.tsx 폴백 없음
- [ ] Console SyntaxError (JSON parse) 없음

**합격 기준**: 4/4
**비고**: `api.ts` text() 먼저 읽고 JSON.parse try/catch 방어 + `ERROR_BODY_PREVIEW_MAX_LENGTH = 100`

### ST.24 — 모바일 ThoughtPanel Sheet

**목적**: <lg 뷰포트 floating → Bottom Sheet

- [ ] 모바일 뷰포트 + 활성 세션에서 첫 분석 완료
- [ ] 우측 ThoughtPanel 숨김 (`hidden lg:block`)
- [ ] 우측 하단 `fixed bottom-20 right-4` 원형 Brain 아이콘 (인디고 gradient, 12×12)
- [ ] 클릭 → Sheet 하단에서 슬라이드 업 (`max-h-70vh`, `rounded-t-2xl`)
- [ ] SheetHeader "사고력 분석" + Sparkles
- [ ] Sheet 외부 클릭/드래그 닫기

**합격 기준**: 6/6

### ST.25 — 세션 목록 페이지

**목적**: 카드 + 상태 뱃지 + 포맷된 날짜

- [ ] `/student/sessions` — 헤더 "세션 목록" + "새 대화 시작" 버튼 (Plus)
- [ ] 로딩 중 4개 SessionSkeleton
- [ ] 세션 카드 호버: `shadow-md + border-blue-200`
- [ ] 카드 구성: 과목 아이콘 + topic(truncate) + `<과목> | N턴 | YYYY. M. D.` (ko-KR) + 상태 뱃지 (Active green / Completed blue) + ChevronRight
- [ ] 완료 세션 → `/student/report/{id}`
- [ ] 진행 세션 → `/student/chat?sessionId={id}`
- [ ] 0개: empty — MessageCircle + "아직 세션이 없습니다. 새 대화를 시작해보세요!" + 버튼

**합격 기준**: 7/7

### ST.26 — 세션 목록 API 실패

**목적**: 에러 상태

- [ ] `/api/sessions` block → 스켈레톤 → 빨간 에러 박스 "세션 목록을 불러오지 못했습니다."
- [ ] 헤더 + "새 대화 시작" 버튼 정상

**합격 기준**: 2/2

### ST.27 — 채팅 재개 (진행 중 세션)

**목적**: `?sessionId=X` 파라미터로 기존 세션 로드

- [ ] 세션 목록에서 진행 중 카드 클릭 → `/student/chat?sessionId={id}`
- [ ] ChatInterface 렌더 (subject 재로드, topic 표시), 과목 선택 스킵
- [ ] Network: `GET /api/sessions/{id}`
- [ ] **현 구현 제약**: 이전 메시지 로드 안 함 (L119-162는 id/subject만 설정) — 최소 크래시 없어야
- [ ] 잘못된 id 시 "기존 세션을 불러올 수 없습니다. 새 대화를 시작하세요." + 새 대화 UI

**합격 기준**: 4/5

### ST.28 — 리포트 정상 렌더링

**목적**: Radar + 요약 + Growth + Timeline

- [ ] `/student/report/{id}` — ReportSkeleton (5영역)
- [ ] 병렬 API: `GET /reports/session/{id}` + `GET /sessions/{id}` + `GET /students/{userId}/growth`
- [ ] 헤더: "← 세션 목록으로" + "학습 리포트" + 4뱃지 (과목 blue outline, topic gray, N턴 MessageCircle, 날짜 Calendar "YYYY년 M월 D일")
- [ ] Stage transition > 0 시 "N번의 사고 전환을 거쳐 스스로 답에 도달했습니다." 파란 문구
- [ ] Separator + 2열 grid (md↑): Radar + AI 요약
- [ ] Radar: 6각형 (minHeight 300), 실선 인디고 fill + (growth ≥ 2) 대시 "전체 평균" overlay + Legend
- [ ] 요약 카드: Clock + narrative (whitespace-pre-line) + "YYYY년 M월 D일에 생성됨"
- [ ] Growth Trend (length > 0): TrendingUp + LineChart 6선 + 커스텀 tooltip
- [ ] Timeline 카드: List + TimelineEntry (dot + 수직선 + 턴 N + stage/engagement 뱃지 + 강점/약점 + 패턴)
- [ ] 하단 2버튼 (sm↑ side-by-side): "새 대화 시작" (primary) + "세션 목록으로" (outline)

**합격 기준**: 10/10

### ST.29 — 리포트 미준비 상태 (P2-2)

**목적**: Auto-create 제거 후 404 핸들링

- [ ] `/student/report/{id}` — 노란 박스 "리포트 데이터가 없습니다." 또는 에러 "리포트가 아직 준비되지 않았습니다..."
- [ ] "세션 목록으로" 버튼 제공
- [ ] 자동 재생성 API 없음 (race 제거됨)
- [ ] 새로고침으로 수동 재시도

**합격 기준**: 4/4
**비고**: reports.py "endSession eagerly triggers report creation"

### ST.30 — 리포트 NaN id

**목적**: 잘못된 id 가드

- [ ] `/student/report/abc` 입력 → `/student/sessions` redirect
- [ ] 크래시 없음

**합격 기준**: 2/2

### ST.31 — 리포트 403/500

**목적**: 권한/서버 에러

- [ ] 다른 학생 세션 id 강제 접근 → ReportSkeleton → 빨간 에러 박스 ("해당 세션의 리포트에 대한 접근 권한이 없습니다" 또는 "세션을 찾을 수 없습니다")
- [ ] "세션 목록으로" 버튼 동작

**합격 기준**: 2/2

### ST.32 — JWT 만료 처리

**목적**: 토큰 만료 후 보호 페이지

- [ ] DevTools Application → localStorage token 수동 삭제
- [ ] `/student/chat` 재접근 → AuthProvider가 null 감지 → `/login` redirect
- [ ] 토큰 존재하나 서버 401 시 — 첫 API 실패 → 페이지 에러 배너 + 수동 로그아웃 필요
- [ ] 재로그인 후 정상 복구

**합격 기준**: 4/4
**비고**: 현재 401 자동 로그아웃 훅 없음 (follow-up)

### ST.33 — Next.js segment error boundary (app/error.tsx)

**목적**: 렌더 예외 시 폴백

- [ ] 렌더 에러 강제 (예: `/student/report/999999`)
- [ ] 중앙 정렬 폴백: AlertTriangle (빨강) + "문제가 발생했습니다" + 설명 + 회색 박스 (error.message preview)
- [ ] "다시 시도" (RotateCcw) + "홈으로 돌아가기" 2버튼
- [ ] "다시 시도" → `reset()` → 리마운트
- [ ] "홈으로" → `window.location.href = "/"`

**합격 기준**: 5/5

### ST.34 — Root layout global-error.tsx (P2-4)

**목적**: 루트 레이아웃 치명 오류 폴백

- [ ] Code 경로 확인: `app/global-error.tsx` 존재 + `<html lang="ko"><body>` 래핑
- [ ] UI: "심각한 오류가 발생했습니다" + "페이지를 새로고침하거나 홈으로 돌아가주세요." + "다시 시도" / "홈으로"
- [ ] Vercel 빌드 포함 확인
- [ ] Manual 검증 한계 — 실제 발동은 백엔드 로그/Sentry 필요

**합격 기준**: 3/4

### ST.35 — 네트워크 불안정 종합

**목적**: DevTools Slow 3G / Offline UX

- [ ] Slow 3G 설정
- [ ] 메시지 전송 — 타이핑 indicator 오래 + 토큰 천천히 (애니메이션 버퍼 정상)
- [ ] 스트리밍 중 Offline → 에러 박스 "다시 시도"
- [ ] 복구 후 재시도 성공
- [ ] Offline에서 "종료" → 에러 박스

**합격 기준**: 5/5

---

## §3. 강사 역할 — 대시보드부터 세션 재생까지

### IN.1 — 강사 로그인 → 대시보드 자동 라우팅

**목적**: role-based redirect

- [ ] `/login`에서 `instructor@demo.com` / `demo1234` → 로그인
- [ ] 또는 랜딩 "교강사로 체험" 원클릭
- [ ] URL → `/instructor/dashboard`
- [ ] Sidebar: ThinkBridge 로고 + "대시보드" 1항목 (학생 메뉴 미표시)
- [ ] Navbar: 강사 이름 표시

**합격 기준**: 5/5

### IN.2 — 학생이 강사 URL 직접 접근 시 가드

**목적**: `useEffect` role 가드

- [ ] `student@demo.com` 로그인 상태
- [ ] 주소창 `/instructor/dashboard` 직접 입력 — 보라 스피너 잠깐 → `/` redirect
- [ ] `/instructor/replay/1` 직접 입력 — 동일

**합격 기준**: 3/3
**비고**: P2 1-tick flicker 가능성. 대시보드 내용은 한 프레임도 노출 안 됨

### IN.3 — 로그아웃 후 재접근

**목적**: 세션 만료/로그아웃 처리

- [ ] Navbar 로그아웃
- [ ] 랜딩 이동 후 `/instructor/dashboard` 재입력
- [ ] DevTools Application: token/user 제거 확인
- [ ] `/login` redirect
- [ ] 뒤로가기로도 로그인 페이지로 재redirect

**합격 기준**: 5/5

### IN.4 — 대시보드 초기 로드 + 첫 반 자동 선택

**목적**: `getClasses` → 첫 반 자동 선택 → 병렬 패치

- [ ] 페이지 제목 "교강사 대시보드"
- [ ] 스켈레톤 잠깐 (제목/드롭다운/카드 4개/히트맵 64h)
- [ ] Network: `/api/dashboard/classes` → `/api/dashboard/classes/{id}/students` + `/heatmap` 병렬
- [ ] 드롭다운: "고등수학 1반 (수학 / 5명)" / "물리학 기초반 (과학 / 3명)" / "논술 심화반 (논술 / 3명)" 3개
- [ ] **첫 항목 자동 선택**
- [ ] SummaryCards / HeatmapChart / StudentList 렌더 완료

**합격 기준**: 6/6

### IN.5 — SummaryCards 4개 지표

**목적**: 총 학생 / 평균 세션 / 활성률 / 전체 평균

- [ ] 2열(mobile) / 4열(desktop) 그리드
- [ ] 카드 아이콘 색상: Users(파랑), BookOpen(초록), Activity(주황), TrendingUp(보라)
- [ ] 접미사: `5명`, `X.X회`, `XX%`, `X.X점`
- [ ] 고등수학 1반 예상치: 총 학생 5, 평균 세션 5.0 ±0.5, 활성률 100%, 전체 평균 5~7점
- [ ] 학생 0명 반: 모두 0 값

**합격 기준**: 5/5

### IN.6 — HeatmapChart 6차원 매트릭스

**목적**: X축 라벨 + Y축 학생 + 색상 스케일 + 클릭 이동

- [ ] 카드 제목 "사고력 히트맵"
- [ ] X축: 문제 이해 · 전제 확인 · 논리 구조화 · 근거 제시 · 비판적 사고 · 창의적 사고
- [ ] Y축: 5명 학생 (김민수/이서연/박지호/최준서/한소율), `sticky left-0` 고정
- [ ] Cell 숫자 + 색상: 빨강(0-3) / 노랑(4-6) / 초록(7-10)
- [ ] Row 호버 `hover:bg-gray-50` + 이름 `hover:text-blue-600`
- [ ] Row 클릭 → `/instructor/replay/{studentId}`
- [ ] 하단 파란 박스: Lightbulb + "전체 학생의 N%가 '{차원}' 영역에서 4.0점 이하입니다..."

**합격 기준**: 7/7
**비고**: 시드 기준 김민수(논리 구조화 4)·박지호(근거 제시 3)·강예은(창의적 사고 3) 빨강 cell

### IN.7 — StudentList 카드 뱃지

**목적**: 학생 카드 grid + 점수 색상 + 클릭

- [ ] 헤더 "학생 목록 (N명)"
- [ ] 그리드: 모바일 1열 / sm 2열 / lg 3열
- [ ] 카드: User 아이콘 + 이름 + BookOpen + "N회 세션" + 점수 뱃지 + ChevronRight
- [ ] 뱃지 색상: <4 빨강, 4-6.99 노랑, ≥7 초록
- [ ] 호버 `hover:shadow-md`
- [ ] 클릭 → `/instructor/replay/{student.id}`

**합격 기준**: 6/6

### IN.8 — 반 변경 시 재패칭

**목적**: `mSelectedClassId` 변경 → 모든 섹션 업데이트

- [ ] 드롭다운 "물리학 기초반" 선택
- [ ] 하단 스켈레톤 (카드/히트맵/목록) 표시
- [ ] 3명 학생 기반으로 값 전환 + 히트맵 Y축 교체 (이서연/정하윤/윤도현)
- [ ] "논술 심화반" 선택 반복
- [ ] Network: students + heatmap 2개 요청 매번

**합격 기준**: 5/5

### IN.9 — 에러 재시도 버튼

**목적**: API 장애 시 배너 + 재시도

- [ ] DevTools Offline 토글
- [ ] 드롭다운 반 변경 → 로드 실패
- [ ] 빨간 배너 "데이터를 불러오는 중 오류가 발생했습니다." + RefreshCw 버튼
- [ ] "다시 시도" 클릭 (Offline 상태)
- [ ] Online 복구 후 재클릭 → 정상
- [ ] 새로고침으로 반 목록 실패 유도 → "반 목록을 불러오는 중 오류가 발생했습니다."

**합격 기준**: 6/6

### IN.10 — Empty state

**목적**: 학생 0명 반 / 분석 0건

- [ ] 담당 반 없음 계정 (있다면) → "담당 반이 없습니다." 점선 박스
- [ ] StudentList 0명 → 점선 + User 아이콘 + "이 반에 등록된 학생이 없습니다."
- [ ] HeatmapChart 0건 → "분석할 데이터가 없습니다."
- [ ] SummaryCards 안전 기본값 (모두 0)

**합격 기준**: 3/4 (시드 환경에서 실제 0명 반 없음)

### IN.11 — 세션 리플레이 진입 + 3단 레이아웃

**목적**: 학생 클릭 → replay 페이지

- [ ] "김민수" 카드(또는 히트맵 row) 클릭
- [ ] URL → `/instructor/replay/1` (studentId)
- [ ] **알려진 drift**: route param은 `sessionId`지만 실제 studentId로 사용 (`docs/revise_plan_v3/03_structural.md` P2-16)
- [ ] 상단 "← 대시보드로 돌아가기" + 제목 "세션 리플레이"
- [ ] 3단 레이아웃:
  - 좌측(w-56~64): "세션 목록" 카드, 완료 세션 5개 (`세션 #N` + BookOpen + Calendar + YYYY.MM.DD)
  - 중앙: 메시지 영역, 상단 메타 바(과목 + 주제 + 상태 + N턴)
  - 우측(lg 이상): ThoughtPanel (isDemo=true, 6차원 bar + stage + engagement)
- [ ] 진입 시 첫 세션 자동 선택 (`bg-blue-50`) + 첫 assistant 메시지 + analysis 자동 선택

**합격 기준**: 6/6
**비고**: 로딩 중 파란 스피너

### IN.12 — 세션 전환 + 메시지 클릭 동기화

**목적**: 좌측 세션 클릭 → 중앙 재로드 / 메시지 클릭 → 우측 업데이트

- [ ] 2번째 세션 클릭 → 중앙 스피너 → 새 메시지 로드
- [ ] 메시지: user(우측 파랑) / assistant(좌측 회색) 번갈아
- [ ] 메타 바: 과목 Badge + topic + 상태 뱃지 (완료=`border-green-300 bg-green-50 text-green-700` / 진행 중=노랑) + 턴 수
- [ ] analysis 있는 assistant 메시지 우측 하단 "분석 보기" 뱃지
- [ ] 임의 assistant 메시지 클릭 → `bg-blue-50 ring-1 ring-blue-200` + 우측 ThoughtPanel 6차원 bar 새 값으로 전환
- [ ] ScrollArea 스크롤
- [ ] 모바일: 좌측 목록 가로 스크롤(h-32), 우측 패널 숨김(lg:block)

**합격 기준**: 6/7

### IN.13 — 에러·권한 + 뒤로가기

**목적**: 잘못된 URL / 권한 없음 / navigation

- [ ] `/instructor/replay/abc` (NaN) → `/instructor/dashboard` redirect
- [ ] `/instructor/replay/999999` → "세션 목록을 불러올 수 없습니다." + "이 학생의 완료된 세션이 없습니다." fallback
- [ ] 다른 강사 반 (403) — API 레벨 "해당 교실에 대한 접근 권한이 없습니다"
- [ ] 세션 상세 로드 실패 → "세션 상세를 불러올 수 없습니다."
- [ ] 좌상단 "대시보드로 돌아가기" → `/instructor/dashboard` 복귀 + 선택 반 보존
- [ ] **P0-1 검증**: analysis null 메시지는 이름만 보임, 우측 패널 "왼쪽에서 세션을 선택하세요."

**합격 기준**: 5/6

### IN.14 — 반응형 레이아웃

**목적**: 모바일 / 태블릿 / 데스크톱

- [ ] 375px (iPhone SE): SummaryCards `grid-cols-2` / HeatmapChart `overflow-x-auto` + `sticky left-0` 이름 셀 + `min-w-[480px]` / StudentList 1열 / Sidebar 햄버거 → Sheet
- [ ] 세션 리플레이 모바일: 좌측 목록 `h-32` 가로 스크롤 / 중앙 `h-[50vh]` / 우측 패널 숨김
- [ ] 768px 태블릿: StudentList 2열
- [ ] 1024px+ 데스크톱: StudentList 3열

**합격 기준**: 4/4

---

## §4. 관리자 역할 — 전체 통계 + 반/과목 비교

### AD.1 — 관리자 로그인 + 역할 가드

**목적**: admin role redirect + 다른 URL 차단

- [ ] 시크릿 창, localStorage 비어있음
- [ ] `/login` `admin@demo.com` / `demo1234` 로그인
- [ ] `/admin/dashboard` 자동 redirect (학생/강사 페이지로 튀면 실패)
- [ ] DevTools Application: `token` + `user` (role="admin")
- [ ] `/student/chat`, `/student/sessions`, `/instructor/dashboard`, `/instructor/replay/1` 직접 입력 → 각각 `/` redirect
- [ ] 랜딩 "운영자로 체험" 원클릭도 동일하게 `/admin/dashboard` 도착

**합격 기준**: 6/6

### AD.2 — 데모 배너 + 페이지 골격

**목적**: 경고 배너 + 페이지 구조

- [ ] 제목 "운영자 대시보드"
- [ ] 제목 아래 amber 배너: "데모 데이터입니다. 실제 운영 시 전체 학원 데이터가 표시됩니다."
- [ ] 배너 좌측 AlertTriangle (삼각형 느낌표)
- [ ] Navbar: "관리자" 이름 + 로그아웃
- [ ] Sidebar: 관리자 메뉴만
- [ ] 최초 로딩: 스켈레톤 (카드 4 + 차트 2) → 실제 데이터

**합격 기준**: 6/6

### AD.3 — 전체 통계 카드 4개

**목적**: 총 학생 / 총 세션 / 평균 / 활성률

- [ ] 순서: 총 학생 / 총 세션 / 전체 평균 / 활성률
- [ ] 그리드: mobile 2열 / lg 4열
- [ ] 아이콘 배경: Users(파랑), BookOpen(초록), TrendingUp(보라), Activity(주황)
- [ ] 총 학생 = `8명` (게스트 제외. 9+면 backlog 이슈)
- [ ] 총 세션 ≈ `40회` (학생 8 × 5세션 + 손수 제작 3)
- [ ] 전체 평균 소수 1자리 + "점" (예: `5.8점`)
- [ ] 활성률 정수 + `%`. **알려진 제약**: 시드 `BASE_DATE=2026-03-15`, 오늘(2026-04-12)과 28일 차이 → 활성률 0% 정상

**합격 기준**: 7/7

### AD.4 — 반별 사고력 비교 BarChart

**목적**: 3개 반 × 6차원 bar + Legend + Tooltip

- [ ] 제목 "반별 사고력 비교" + 400px 높이
- [ ] X축: `고등수학 1반`, `물리학 기초반`, `논술 심화반`
- [ ] Y축: 0-10 도메인
- [ ] 각 반 6개 bar 그룹 + `DIMENSION_COLORS` 6색
- [ ] Legend: 한글 차원 6개 (문제 이해 / 전제 확인 / 논리 구조화 / 근거 제시 / 비판적 사고 / 창의적 사고)
- [ ] Hover Tooltip: `차원 한글명 : 점수`
- [ ] DevTools Network `/api/admin/classes` 응답 vs bar 높이 샘플 검증 (고등수학 1반 `creative_thinking` == bar tooltip)
- [ ] X축 라벨 잘림 없음

**합격 기준**: 8/8

### AD.5 — 과목별 6차원 RadarChart overlay

**목적**: 3개 과목 동시 overlay

- [ ] 제목 "과목별 6차원 레이더" + 400px
- [ ] 6축 한글 라벨 원형 배치
- [ ] 반경 0-10 + tick 6개 (0,2,4,6,8,10)
- [ ] 3개 과목: 수학(파랑 #3B82F6), 과학(초록 #10B981), 논술(보라 #8B5CF6) overlay (fillOpacity 0.15)
- [ ] Legend: "수학 / 과학 / 논술" 한글 (`SUBJECT_LABELS`) — 영문 그대로 노출되면 버그
- [ ] Network `/api/admin/subjects` 응답 vs radar 꼭짓점 샘플 검증

**합격 기준**: 6/6

### AD.6 — 데이터 일관성 교차 검증

**목적**: seed 기반 값 정확성

- [ ] 고등수학 1반 `scores` vs 소속 5명(김민수·이서연·박지호·최준서·한소율) 평균 — 창의성 강한 강예은 미포함으로 반 평균 `creative_thinking` 낮아야
- [ ] 논술 심화반 (정하윤·강예은·한소율) `critical_thinking` 평균 높음 (정하윤 8, 강예은 포함)
- [ ] `/api/admin/subjects` 정확히 3개 과목
- [ ] `/api/admin/stats` totalStudents = 8, totalSessions 일치

**합격 기준**: 4/4

### AD.7 — 에러 처리 + 빈 상태

**목적**: 네트워크 실패 / 만료 / 시드 없음

- [ ] `/api/admin/stats` Block request URL → 새로고침 → 빨간 배너 "데이터를 불러오는 중 오류가 발생했습니다." + "다시 시도"
- [ ] 차단 해제 후 재시도 → 3개 API 재호출 + 정상 렌더
- [ ] localStorage `token` 조작 후 reload → 401 시 로그인 redirect 또는 에러 배너
- [ ] 시드 empty 환경에서 BarChart/RadarChart 조건부 렌더 (`tBarChartData.length > 0`)로 숨김
- [ ] Console recharts 경고/React key 경고 없음

**합격 기준**: 5/5

### AD.8 — 반응형 레이아웃

**목적**: mobile / tablet / desktop

- [ ] 375px: 통계 카드 2×2 그리드
- [ ] 모바일 BarChart `overflow-x-auto` + minWidth 400px
- [ ] 768px: 카드 2×2, 차트 풀폭, 배너 줄바꿈 정상
- [ ] RadarChart ResponsiveContainer 100%, 한글 차원 라벨 안 잘림
- [ ] 모바일 Sidebar 햄버거 → Sheet

**합격 기준**: 5/5

### AD.9 — 로그아웃 + 역할 전환 청결성

**목적**: 토큰/유저 완전 제거

- [ ] Navbar 로그아웃 → `/login` 또는 랜딩, localStorage `token`/`user` 완전 제거 (role 잔존 금지)
- [ ] `/admin/dashboard` 직접 입력 → `/login` redirect
- [ ] 같은 브라우저 `student@demo.com` 로그인 → 학생 대시보드, 관리자 UI/데이터 섞임 없음
- [ ] 로그아웃 후 `admin@demo.com` 재로그인 → 3 API 재호출 (캐시된 이전 role 데이터 노출 없음)

**합격 기준**: 4/4

---

## §5. 교차 관심사 — v3 변경 검증 + 반응형 + 접근성 + 호환성

### X.1 — P0-1 Anthropic 529 Overload 관찰

**목적**: 실제 overload 발생 시 서명 수집 (재현 어려움)

- [ ] `/student/chat` + 메시지 전송
- [ ] Console 탭 유지 — `[SSE parse] failed` 또는 `Claude overload, retry` 로그 10분간 관찰
- [ ] Network `/api/sessions/{id}/messages` 응답에 `event: error`, `data: {"code": "AI_API_ERROR"}` 페이로드 등장 시 P0-1 fallback 작동 증거
- [ ] 이전 증상: 토큰/분석 이벤트 없이 스트림 종료
- [ ] 현재: `event: error` 명시 수신 + UI 빨간 배너 + "다시 시도"

**합격 기준**: 에러 발생 시 "AI 서비스 일시 오류입니다. 잠시 후 다시 시도해주세요." 표시

### X.2 — P0-2 DB Save Failure 스트림 후 에러

**목적**: Throttle로 save 경로 지연 유도

- [ ] DevTools Network Throttling "Slow 3G"
- [ ] 메시지 전송
- [ ] Response 여러 `event: token` + `event: done` 정상
- [ ] 추가 `event: error` + `"code": "DB_SAVE_FAILED"` 프레임 끝까지 스크롤
- [ ] done 직후 save 실패 시 error event yield + "응답을 저장하지 못했습니다. 페이지를 새로고침해주세요." 토스트/인라인
- [ ] "No throttling" 복귀 후 done만 수신, error 없음 확인 (false positive 배제)

**합격 기준**: 5/6

### X.3 — P0-3 Render Cold Start HTML 응답

**목적**: 502/503 HTML 응답 시 크래시 방지

- [ ] 15분+ idle 확보 (또는 별도 브라우저 방치)
- [ ] 랜딩 "바로 체험하기" 클릭
- [ ] Network `/api/auth/guest` 502/503 + HTML 응답 재현
- [ ] 응답 바디 `<!DOCTYPE html>` 시작해도 크래시 없음
- [ ] 에러 배너 `HTTP 502: <!DOCTYPE html...` (첫 100자 preview)
- [ ] Console `Uncaught SyntaxError: Unexpected token '<'` 없음 (이전 증상)

**합격 기준**: 5/5

### X.4 — P1-1 게스트 턴 보상

**목적**: 실패 시 턴 복구

- [ ] 게스트 로그인 → 4턴 진행 → 배지 "체험 중 (4/5)"
- [ ] 5번째 전송 직전 Throttling "Offline"
- [ ] 메시지 전송 → 실패
- [ ] "No throttling" 복귀 → 새 메시지 전송 → 성공 (4에서 재개)
- [ ] 5번째 실패에도 배지 (4/5) 유지 또는 감소. 403 "한도 초과" 뜨지 않음
- [ ] 보조: GET `/api/sessions` 해당 세션 `totalTurns` 증분 안 됨

**합격 기준**: 5/6

### X.5 — P1-2 AbortController 언마운트 Cancel

**목적**: 언마운트 시 fetch cancel

- [ ] 메시지 전송 → SSE 스트리밍 (토큰 한 글자씩 출현 중)
- [ ] 스트리밍 중 Sidebar "세션 기록" 클릭
- [ ] Network `/api/sessions/{id}/messages` Status → `(canceled)` 또는 Type `eventsource → canceled`
- [ ] Console `Can't perform a React state update on unmounted component` 경고 없음
- [ ] 같은 화면에서 재전송 → 첫 번째 호출이 `(canceled)`로 전환 (race 방어)

**합격 기준**: 5/5

### X.6 — P1-4 Canned Text 제거

**목적**: fallback 메시지 유저 노출 금지

- [ ] 장시간(20세션+) 다양한 질문 시도
- [ ] 채팅창에 `"좋은 질문이에요! 조금 더 생각해볼까요?"` 정확 문자열 **단 한 번도 표시되지 않아야**
- [ ] tool_use만 수신되고 text 비는 드문 경우 → "AI 응답을 받지 못했습니다. 다시 시도해주세요." (code `AI_EMPTY_RESPONSE`) 에러 배너
- [ ] 세션 종료 후 리포트 AI narrative에 해당 canned 문자열 섞이지 않음

**합격 기준**: 4/4

### X.7 — P1-6 Exception Differentiation

**목적**: 에러 타입별 다른 code/메시지

- [ ] 정상 대화: error 이벤트 없음
- [ ] DB save 실패 (X.2): code `DB_SAVE_FAILED`
- [ ] AI overload (X.1): code `AI_API_ERROR`, "AI 서비스 일시 오류"
- [ ] 예상 외 에러: code `STREAM_UNEXPECTED`, "스트리밍 중 예상치 못한 오류가 발생했습니다."
- [ ] 세 code 서로 다르게 분기 + UI 메시지 구분 (이전엔 generic)
- [ ] CancelledError (X.5): Render logs `"Client disconnected during streaming"`. `"Unexpected streaming error"` **아님**

**합격 기준**: 6/6

### X.8 — P1-7 parseSSEBuffer Log

**목적**: 파싱 실패 visibility

- [ ] Console 탭 열어두고 정상 대화 10턴 — 경고 없음이 정상
- [ ] 불안정 네트워크에서 반복
- [ ] 실패 시 Console `SSE event JSON parse failed` + `eventType`, `dataPreview` (100자까지), `error` 필드 object `console.warn`
- [ ] 대화는 중단되지 않고 (해당 이벤트만 skip), 로그 흔적 남음

**합격 기준**: 4/4

### X.9 — P1-8 Landing Error Visibility

**목적**: 백엔드 down 시 버튼 무반응 아님

- [ ] Throttling "Offline"
- [ ] 랜딩 "바로 체험하기" 클릭
- [ ] 수초 이내 에러 배너 화면 우측 상단 또는 인라인 등장 (예: "게스트 체험 시작에 실패했습니다")
- [ ] Console `"Guest login failed"` 프리픽스 에러 로그
- [ ] 배너 닫기 → 사라짐
- [ ] "No throttling" 복귀 → 재시도 → 정상 `/student/chat`
- [ ] `/login` 페이지 학생/강사/운영자 원클릭도 Offline에서 silent 아님

**합격 기준**: 6/6

### X.10 — P2-1 Duplicate Assistant Message (서버 로그)

**목적**: Duplicate INSERT 방어

- [ ] Render logs (Dashboard → thinkbridge-api → Logs)
- [ ] 일반 대화 중 `"Assistant message already exists for session"` 경고 관찰
- [ ] 정상 운영 중엔 등장 안 함
- [ ] 등장 시 방어 로직 작동 증거 (skip, 중복 INSERT 없음)

**합격 기준**: 로그 부재 (정상) 또는 부재 시나리오에서 defensively 동작

### X.11 — P2-2 Report Race 방지

**목적**: Auto-create 제거 후 race 없음

- [ ] 세션 5턴+ 진행 → "대화 마무리" → `/student/report/{id}` 자동 이동
- [ ] Pass A (정상): Radar + Growth + Timeline 렌더
- [ ] Pass B (race 없음): 동일 브라우저 새 탭 2개로 동일 URL 복제 붙여넣기 → 둘 다 200, 어느 탭도 500 아님
- [ ] 예외: 종료 직후 404 "리포트가 아직 준비되지 않았습니다" 배너 → 새로고침 → 정상 로드

**합격 기준**: 3/4

### X.12 — P2-3 socraticStage Clamp

**목적**: 비정상 stage 값 시 UI 크래시 없음

- [ ] 정상 대화 → ThoughtPanel "단계: 명확화 / 탐색 / 유도 / 검증 / 확장" 라벨
- [ ] 관찰: `undefined` 라벨 없음, 크래시 없음
- [ ] 백엔드가 stage 0 또는 999 반환 이론 시 — UI 1~5 범위 내 clamp

**합격 기준**: 3/3

### X.13 — P2-4 global-error.tsx

**목적**: Root layout 에러 핸들러

- [ ] DevTools Application → `thinkbridge_token` 값 수동 변경 (예: `{malformed}`)
- [ ] 페이지 새로고침
- [ ] `readFromStorage` try/catch가 흡수 → null 반환 → 로그인 redirect (정상)
- [ ] 더 강한 트리거: `/student/report/99999999` 존재하지 않는 세션 → segment-level `error.tsx` 발동
- [ ] Pass A (segment): "문제가 발생했습니다" + "다시 시도" / "홈으로 돌아가기"
- [ ] Pass B (global): "심각한 오류가 발생했습니다" + "다시 시도" / "홈으로" + `<html lang="ko">` 래퍼
- [ ] "다시 시도" → `reset()`
- [ ] "홈으로" → `/`

**합격 기준**: 6/6

### X.14 — P2-5 Suspense Boundary

**목적**: useSearchParams 래핑

- [ ] DevTools "Disable cache" 체크
- [ ] `/student/chat?sessionId=123` 직접 입력
- [ ] 0.1~0.5초 Suspense fallback (skeleton) → ChatInterface 전환
- [ ] 빌드 타임 `useSearchParams() should be wrapped in a suspense boundary` 경고 없음 (Vercel logs 확인 가능)
- [ ] `/student/chat` (쿼리 없음)도 정상

**합격 기준**: 4/4

### X.15 — Mobile <768px 반응형

**목적**: 모바일 전체 UX

- [ ] DevTools "iPhone 14 Pro" (390×844) 또는 "iPhone SE" (375×667)
- [ ] 랜딩: Hero/비교/피처 수직 스택, "바로 체험하기" full-width
- [ ] 데모 3버튼 full-width 스택
- [ ] `/student/chat`: 메시지 영역 전체 폭, ThoughtPanel sidebar 숨김 (lg:block)
- [ ] 분석 등장 시 우측 하단 floating Brain 버튼 → Sheet 슬라이드업, max 70vh
- [ ] Sheet 내부 6차원 bar 가로 표시
- [ ] 좌측 Sidebar 햄버거 → Sheet (좌측 슬라이드인)
- [ ] 헤더 과목 뱃지 + topic `truncate max-w-[200px]` 말줄임표
- [ ] 입력창: Textarea + Send/힌트/종료 한 행 (sm:inline으로 텍스트 숨김 + 아이콘만)
- [ ] 강사 히트맵 가로 스크롤
- [ ] 리포트 Recharts 수직 스택

**합격 기준**: 10/10

### X.16 — Tablet 768-1024px

**목적**: 태블릿 전환

- [ ] iPad Mini (768×1024) 또는 iPad Air (820×1180)
- [ ] 강사 SummaryCards 2×2
- [ ] StudentList 2열
- [ ] 채팅: 768px 이상도 `lg:block`(1024px) 미달이라 ThoughtPanel sidebar 없음, Sheet 유지
- [ ] Heatmap 전체 폭 여유롭게
- [ ] 랜딩 ChatGPT vs ThinkBridge 좌우 2열

**합격 기준**: 5/5

### X.17 — Desktop >1024px

**목적**: 데스크톱 레이아웃

- [ ] Device Toolbar 해제 또는 브라우저 최대화
- [ ] 채팅: 좌측 메시지 + 우측 ThoughtPanel (w-72 / xl:w-80) 고정
- [ ] Sidebar 좌측 고정 (Sheet 아님)
- [ ] 대시보드 카드 4열
- [ ] 리포트 Radar + Growth 좌우 2열
- [ ] 1440px+ 초대형: 중앙 max-w-2xl 유지, 좌우 여백

**합격 기준**: 6/6

### X.18 — 모바일 Orientation 전환

**목적**: 가로/세로 전환

- [ ] iPhone 14 Pro 가로(844×390) — ThoughtPanel sidebar 없음, bottom Sheet 유지 (width 기반 breakpoint)
- [ ] 가로모드 메시지 영역 우측 여백 과하지 않음

**합격 기준**: 2/2

### X.19 — 키보드 네비게이션

**목적**: Tab / Enter / Esc

- [ ] 랜딩 마우스 없이 Tab — 로고/헤더 → 주요 CTA → 비교 카드 → 피처 → 데모 순
- [ ] 각 포커스 요소 focus ring (indigo outline)
- [ ] Enter로 "바로 체험하기" 활성화
- [ ] `/student/chat` Tab: Textarea → 힌트 → Send → 종료
- [ ] Textarea 포커스 **Shift+Enter**: 줄바꿈, **Enter**: 전송
- [ ] Esc: ThoughtPanel Sheet 열려 있으면 닫기 (shadcn 기본)

**합격 기준**: 6/6

### X.20 — Label / aria-label

**목적**: SR 접근성

- [ ] Login: 이메일/비밀번호 input `<label htmlFor="...">` 또는 `aria-label`
- [ ] Register 동일
- [ ] 채팅 Textarea: **현재 placeholder만** (알려진 backlog) — SR 사용자 안내 부족
- [ ] 아이콘 버튼(Brain/Sparkles/Square/Lightbulb): `<span className="hidden sm:inline">` 텍스트 또는 `title`
- [ ] 주요 form field label/aria-label 보유 (textarea follow-up)

**합격 기준**: 3/5 (textarea backlog)

### X.21 — 색상 대비 (WCAG AA)

**목적**: 대비 4.5:1 이상

- [ ] DevTools Elements → Accessibility → Contrast
- [ ] 에러 배너 `bg-red-50` + `text-red-700` AA
- [ ] 성공 `bg-emerald-50` + `text-emerald-800`
- [ ] 게스트 `bg-amber-50` + `text-amber-700`
- [ ] CTA `bg-indigo-600` + `text-white` AAA
- [ ] Muted text(`text-gray-500/600`) on `bg-white` AA

**합격 기준**: 5/5

### X.22 — aria-live 에러 발화

**목적**: 에러 배너 발화

- [ ] 랜딩 에러 배너 `role="alert"` / `aria-live` 속성 — **알려진 follow-up (미적용)**
- [ ] 채팅 에러 배너 동일
- [ ] 포커스 프로그램적으로 에러 컨테이너로 이동되지 않음 — 스크롤 위치 기반으로만 노출

**합격 기준**: 0/3 (follow-up 인식)

### X.23 — Chrome 최신

**목적**: 주 지원

- [ ] Chrome 120+ 전체 플로우 (게스트 5턴 + 리포트)
- [ ] 스트리밍 + 실시간 분석 + 자동 리포트 생성 모두 정상

**합격 기준**: 1/1

### X.24 — Firefox 최신

**목적**: SSE ReadableStream 동작

- [ ] Firefox 120+ 접속
- [ ] SSE 정상
- [ ] Network `text/event-stream`
- [ ] 토큰 한 글자씩 애니메이션 Chrome과 동등

**합격 기준**: 4/4

### X.25 — Safari (macOS) 최신

**목적**: WebKit quirks

- [ ] Safari 17+ SSE ReadableStream
- [ ] AbortController + fetch signal 정상 cancel
- [ ] CSS Grid/Flex/backdrop-blur 일관성
- [ ] 채팅 스트리밍 + 분석 정상

**합격 기준**: 4/4

### X.26 — Edge 최신

**목적**: Chromium 기반

- [ ] Edge 120+ Chrome 동등
- [ ] 빠른 스모크

**합격 기준**: 2/2

### X.27 — Mobile Safari (iOS)

**목적**: 특이 동작 확인

- [ ] iOS 17+ Safari `https://frontend-manhyeon.vercel.app` 접속 → 게스트 시작
- [ ] 백그라운드 탭 → 복귀: 스트리밍 재개/멈춤/끊김 기록
- [ ] 가상 키보드 올라올 때 Textarea + Send 가려지지 않음 (safe-area-inset)
- [ ] Sheet 드로어 iOS bottom-sheet gesture 충돌 없음

**합격 기준**: 4/4

### X.28 — 구식 브라우저 (공식 미지원)

**목적**: 언급만

- [ ] IE11 / Chrome 80 이하 — **지원 안 함**
- [ ] Render 백엔드 HTTP/2 + TLS 1.3 요구로 연결 불가

**합격 기준**: 인식 확인

### X.29 — 첫 페이지 로드 (Cold vs Warm)

**목적**: 로드 시간

- [ ] 15분 idle 후 랜딩 직접 접근 (cold start)
- [ ] DevTools Network "Doc" 요청 TTFB 기록
- [ ] Cold: 프론트 자체는 Vercel edge로 빠름(<1s). 백엔드 `/health` warm-up 30-60초 — **Render 제약**
- [ ] Warm: 2회째 로드 TTFB <200ms

**합격 기준**: 4/4

### X.30 — SSE 첫 토큰 출현 시각

**목적**: TTFB (SSE)

- [ ] 메시지 전송 직후 스톱워치 (또는 Performance 탭)
- [ ] 첫 `event: token` 나타나기까지 시간
- [ ] 정상 1.5~3초 (Claude latency 포함). 5초 초과 시 의심
- [ ] typing dot 먼저 → `setStreamingText` 채우기

**합격 기준**: 4/4

### X.31 — 다수 턴 누적 렌더링

**목적**: 관찰 (실현 어려움)

- [ ] 현 구조: `<MessageBubble>` map — 100+ 턴 시 React reconciliation 비용
- [ ] 실측 데모 최대 10턴 — 현재 구조 충분
- [ ] 향후 가상화 스크롤 검토 (react-window)

**합격 기준**: 인식 확인

### X.32 — JWT 만료 24h 테스트

**목적**: 만료 처리 (실제 24h 대기 불가)

- [ ] Application → localStorage `thinkbridge_token` jwt.io에서 payload 확인
- [ ] exp 필드(Unix ts) 24h 검증
- [ ] 토큰 값 한 글자 변조 → 서명 실패 유도
- [ ] 변조 토큰으로 보호 엔드포인트 요청 → 백엔드 401 → 프론트 Auth context 처리
- [ ] 현재 자동 logout 미구현, 사용자 수동 로그아웃 필요 — follow-up

**합격 기준**: 4/5 (follow-up 인식)

### X.33 — localStorage 삭제 → 로그인

**목적**: 토큰 없을 때 redirect

- [ ] Application → localStorage Clear
- [ ] `/student/chat` 이동/새로고침
- [ ] AuthProvider useEffect가 `mUser === null && !isPublicPath` 감지 → `/login`

**합격 기준**: 3/3

### X.34 — 멀티 탭 로그아웃

**목적**: 탭 간 세션 동기화

- [ ] 탭 A, B에 같은 세션 `/student/chat`
- [ ] 탭 A 로그아웃
- [ ] 탭 B 즉시 반응 없음 (Storage event 미구독 — 현 구현)
- [ ] 탭 B 다음 fetch 시도 → 401 → 에러 배너. 자동 logout 미구현 (follow-up)
- [ ] 탭 B 크래시 없음

**합격 기준**: 4/4 (follow-up 인식)

### X.35 — 다크모드 (미구현)

**목적**: 테마 일관성

- [ ] 시스템 테마 dark 전환 후 `/student/chat`
- [ ] **현재 라이트 모드 전용** (`dark:` variants 미사용)
- [ ] 전체 UI 라이트 강제 렌더 (시스템 다크와 혼합 없음)
- [ ] 향후 기능 — 스코프 외

**합격 기준**: 3/3

---

## §6. 최종 Sign-off Checklist

### 필수 통과 (데모 블로커 방지)

- [ ] **L.1, L.2, L.4, L.8, L.10, L.11, L.12, L.13, L.15** — 랜딩 + 게스트 5턴 전체
- [ ] **ST.4, ST.11, ST.12, ST.14, ST.15, ST.17, ST.19, ST.28** — 학생 핵심 플로우
- [ ] **IN.1, IN.4, IN.6, IN.7, IN.11, IN.12** — 강사 핵심
- [ ] **AD.1, AD.3, AD.4, AD.5** — 관리자 핵심
- [ ] **X.3 (Render HTML 방어), X.5 (AbortController), X.15 (모바일)** — v3 보안망

### 우선 통과 (심사 품질)

- [ ] **L.3, L.5, L.6, L.7, L.9 (P1-8 검증), L.14 (CAS)** — 랜딩/게스트 품질
- [ ] **ST.3, ST.5, ST.6, ST.10, ST.20, ST.22** — 학생 에러 처리
- [ ] **IN.2, IN.3, IN.9, IN.14** — 강사 가드/에러/반응형
- [ ] **AD.2, AD.7, AD.8, AD.9** — 관리자 배너/에러/반응형
- [ ] **X.1 (P0-1), X.2 (P0-2), X.4 (P1-1), X.6 (P1-4), X.7 (P1-6), X.9 (P1-8)** — v3 Fix 검증

### 풀스펙 통과 (완벽 제출)

전 113개 시나리오 완주.

### 알려진 제약 (제출 시 언급 or follow-up)

- **L.17**: AI 실패 시뮬레이션 어려움 — 관찰 기반
- **L.20**: 게스트 새로고침 세션 복원 미지원 (회원가입 전환 유도)
- **ST.27**: sessionId 재접근 시 이전 메시지 로드 안 함 (현 구현)
- **ST.32**: 401 자동 logout 훅 없음 (follow-up)
- **IN.11**: `[sessionId]` route param이 실제로는 studentId (post-submission 리네임)
- **IN.14**: 모바일 리플레이에서 우측 분석 패널 숨김 — 알려진 한계
- **AD.3**: 활성률 0% 정상 (시드 BASE_DATE 28일 차이)
- **P2-6**: 게스트 힌트 요청이 턴을 소모함 (post-submission 개선)
- **X.20**: 채팅 Textarea aria-label 없음 (follow-up)
- **X.22**: 에러 배너 aria-live 미적용 (follow-up)
- **X.32/X.34**: 만료/멀티탭 자동 logout 미구현 (follow-up)
- **X.35**: 다크모드 미구현 (향후 기능)

### Test 완료 기록

- [ ] 테스터 이름: __________
- [ ] 테스트 일시 (시작): __________
- [ ] 테스트 일시 (종료): __________
- [ ] 브라우저 / OS: __________
- [ ] 필수 통과 개수: __ / 32
- [ ] 우선 통과 개수: __ / 27
- [ ] 전체 통과 개수: __ / 113
- [ ] 발견된 블로커 (Critical bug): __________
- [ ] 기타 특이사항: __________

---

## 📎 관련 파일 참조

### 프론트엔드
- `frontend/src/app/page.tsx` — 랜딩
- `frontend/src/app/layout.tsx` — 루트 레이아웃 + AuthProvider
- `frontend/src/app/error.tsx` — segment-level 에러 boundary
- `frontend/src/app/global-error.tsx` — root-level (P2-4)
- `frontend/src/app/login/page.tsx`, `register/page.tsx`
- `frontend/src/app/student/{chat,sessions,report/[id]}/page.tsx`
- `frontend/src/app/student/layout.tsx` — 학생 가드
- `frontend/src/app/instructor/{dashboard,replay/[sessionId]}/page.tsx`
- `frontend/src/app/instructor/layout.tsx` — 강사 가드
- `frontend/src/app/admin/{layout,dashboard/page}.tsx`
- `frontend/src/components/chat/{ChatInterface,MessageBubble,ThoughtPanel,ProgressBar}.tsx`
- `frontend/src/components/charts/{RadarChart,HeatmapChart,GrowthTrendChart,ThoughtTimeline}.tsx`
- `frontend/src/components/layout/{Navbar,Sidebar}.tsx`
- `frontend/src/components/dashboard/{ClassSelector,StudentList,SummaryCards,HeatmapChart}.tsx`
- `frontend/src/lib/{api.ts,auth.tsx,constants.ts}`

### 백엔드
- `backend/app/routers/{auth,sessions,reports,dashboard,admin}.py`
- `backend/app/services/{ai_engine,report_generator}.py`
- `backend/app/core/{security,prompts}.py`
- `backend/app/models/*.py` (8개 테이블)
- `backend/seed_data.py`
- `backend/app/database.py` — Supabase Session mode

### 기획/기록
- `docs/revise_plan_v3/01_critical_fixes.md` ~ `06_execution_order.md`
- `docs/work_log/01_overview.md` ~ `10_v3_stability_hardening.md`
- `docs/superpowers/specs/2026-04-12-sse-and-guest-race-hardening-design.md`

---

**END OF TEST SCENARIOS — 113 scenarios across 5 sections**
