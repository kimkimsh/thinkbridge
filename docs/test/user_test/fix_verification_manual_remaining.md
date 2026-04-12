# 수동 검증이 필요한 남은 테스트 항목

> **Date**: 2026-04-12
> **목적**: Claude Code 자동 테스트에서 커버 못한 영역을 테스터(사용자)가 직접 수행
> **자동 테스트 결과**: `fix_verification_automated_results.md` 참조
> **원본 시나리오**: `fix_verification_scenarios.md` (V.1-V.25)
> **예상 소요**: 약 40-60분 (타이밍 관찰 포함)

---

## 📋 개요

자동 테스트에서 18/25 시나리오는 완전 통과, 4 시나리오는 핵심 동작(outcome)만 확인됨. 아래는 그 4 시나리오의 **시각적 타이밍** / **네트워크 조건** / **pseudo-class** 영역과, 3 통합 시나리오 연속 실행 검증.

### 왜 수동이 필요한가

| 이슈 | 자동 테스트 불가 이유 |
|------|------------------|
| **CSS `:hover` / `:active`** | Playwright MCP는 computed style을 실제 pseudo-state 활성 중 측정하기 어려움 — 브라우저 interactive 환경 필요 |
| **Flash 오버레이 관찰 (<1s)** | Render warm 상태에서 API 응답 너무 빠름, Playwright wait 로도 타이밍 맞추기 어려움 → 실제 화면에서 눈으로 순간 관찰 |
| **페이지 navigation 후 fetch override 유지** | Playwright MCP `page.goto` 가 새 window context 생성 → `addInitScript`/CDP 접근 없이는 V.4 retry 5회 관찰 불가 |
| **Device 실제 터치 이벤트** | DevTools Device Toolbar는 UI 크기만 변경 — 실제 손가락 터치 반경/제스처는 재현 안 됨 |
| **스크린 리더 호환성** | NVDA/VoiceOver 실제 실행 필요 |

---

## 🧪 수동 검증 체크리스트

### §1. 에러 처리 — 수동 관찰 필요 항목

#### V.2 단계 2-4 — 세션 종료 오버레이 **시각적 flash** 관찰

**자동 테스트 결과**: 종료 클릭 → 리포트 페이지 이동 outcome 은 통과. JS 번들에 오버레이 텍스트 존재 확인됨. 하지만 200-500ms 짜리 오버레이 flash는 Playwright wait 로 관찰 불가.

**수동 재현 방법**:
1. Chrome DevTools → Network 탭 → Throttling → **Slow 3G** 선택 (리포트 생성 시간 지연 인위적 주입)
2. 학생 또는 게스트 로그인 → 채팅 세션 생성 → 1-2턴 전송
3. 입력창 우측 **"종료" 버튼** 클릭
4. **관찰 항목**:
   - [ ] 단계 3: 오버레이 클래스 `fixed inset-0 z-[70] flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm animate-in fade-in duration-200` 적용
   - [ ] 단계 4: 중앙 인디고 spinner (`h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent`)
   - [ ] 단계 4: "사고 과정을 분석하고 있어요" 텍스트
   - [ ] 단계 4: "리포트 생성까지 최대 10초가 걸릴 수 있습니다" 캡션
   - [ ] 단계 5: 오버레이 등장 중 모바일 햄버거 / Sheet 사이드바 열기 **불가** (z-[70] 상위)
   - [ ] 단계 6: ThoughtPanel 플로팅 버튼 (z-40) 클릭 **불가**
   - [ ] 단계 8: 오버레이 `<div>`의 `role="status"` + `aria-live="polite"` 속성 (DevTools Elements 확인)

**합격**: 6/7 이상 (단계 8은 DevTools Elements 탭에서 5초 안에 확인 가능해야 함)

---

#### V.4 전체 — 리포트 retry 5회 × 2초 카운터

**자동 테스트 결과**: 코드 존재 (JS 번들 검증), outcome 불가 (Playwright navigation이 fetch override를 리셋).

**수동 재현 방법**:
1. 학생 또는 게스트로 채팅 세션 생성 후 종료 → 리포트 페이지 진입 (보통 즉시 렌더됨)
2. 뒤로가기 후 **Chrome DevTools Network 탭 → 우측 돋보기 아이콘 → `/api/reports/session/`** 입력 → 우클릭 → **Block request URL**
3. 리포트 페이지 URL 새로고침 (F5)
4. **관찰 항목**:
   - [ ] 단계 3: 스켈레톤 UI 위에 `absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm` 반투명 오버레이 + spinner
   - [ ] 단계 4: "사고 과정을 분석하고 있어요... (1/5)" 카운터 표시
   - [ ] 단계 5: **약 2초 간격**으로 카운터 증가 관찰 — (2/5) → (3/5) → (4/5) → (5/5)
   - [ ] 단계 6: 5회 모두 실패 시 오버레이 사라지고 빨간 에러 박스 "리포트를 불러오지 못했습니다." 표시
   - [ ] 단계 7: Block 해제 후 새로고침 → 즉시 정상 렌더
   - [ ] 단계 8: 오버레이 `<div>`의 `role="status"` + `aria-live="polite"` 속성
   - [ ] 단계 9: 오버레이 표시 중 세션 목록으로 뒤로가기 → Network 탭 추가 요청 없음 (`tIsCancelled` 가드)

**합격**: 7/9 이상

**참고**: Block request URL을 Block Overrides 로 대체하면 404 응답을 정확히 주입 가능 (`.playwright-mcp/` 내 DevTools 도움말 참조).

---

### §3. UI 폴리시 — hover/active 시각 검증

#### V.11 단계 3-4 — 종료 버튼 hover / active pseudo-class 전이

**자동 테스트 결과**: CSS 클래스 정의 + disabled 상태 + aria-label/title/transition-colors 확인됨. hover/active 시각 확인은 실제 마우스 필요.

**수동 재현 방법**:
1. 학생 계정 로그인 → 채팅 생성 → 최소 1턴 전송 (종료 버튼 활성화)
2. **마우스를 "종료" 버튼 위에 올림 (hover)**
3. **관찰 항목 (단계 3)**:
   - [ ] 테두리 색: `border-red-500` (더 짙은 빨강)
   - [ ] 배경: `bg-red-50` (연한 빨강 배경)
   - [ ] 텍스트: `text-red-700` (짙은 빨강)
   - [ ] 150ms 이내에 매끄럽게 전환
4. **마우스로 버튼 클릭 후 떼지 않고 유지 (active)**
5. **관찰 항목 (단계 4)**:
   - [ ] 배경: `bg-red-100` (hover보다 더 짙은 배경, 매우 짧게)
6. 마우스 떼기 → 종료 process 시작 → disabled 스타일 (회색) 전환 (단계 5)

**합격**: 시각적 구분이 뚜렷해야 함 (base/hover/active/disabled 4 state 차별화)

---

### §4. 튜토리얼 — 스크린 리더 호환성 (선택)

#### V.22 단계 8 — 스크린 리더 (선택 항목)

**자동 테스트 결과**: `dialog role=dialog aria-modal=true aria-labelledby=tutorial-title aria-describedby=tutorial-description` 속성 확인됨.

**수동 검증** (스크린 리더 사용 가능 시):
1. NVDA (Windows) 또는 VoiceOver (Mac) 활성화
2. 아무 페이지에서 `?` 버튼 클릭 → 튜토리얼 열기
3. **관찰**:
   - [ ] 스크린 리더가 "튜토리얼 1 / 7" 또는 "과목을 선택하세요" 읽음
   - [ ] 설명 텍스트 자동 읽음
   - [ ] Tab 키 순환 — 닫기 → 건너뛰기 → 이전 → 다음 순서 (focus trap)
   - [ ] Esc 키로 닫으면 원래 포커스로 복귀

**합격**: 스크린 리더가 dialog 내용을 자동 공지 + Tab 순환 focus trap 작동

---

### §5. 통합 시나리오 (V.13-V.15)

자동 테스트로 개별 구성 요소는 모두 통과. 전체 플로우 연속 실행 시 부작용 없는지 확인.

#### V.13 — 게스트 E2E (14단계, 모바일 뷰포트)

**수동 실행 이유**: 시각적 전환, SSE 스트리밍 중 overlap, guest limit 경고 등 종합 관찰.

**실행 가이드**:
1. 시크릿 창 + Chrome DevTools Device Toolbar → **iPhone 14 Pro (390×844)**
2. `/` 진입 (비로그인) → "바로 체험하기" + "로그인" 2개 CTA 확인 (V.5 반대 케이스)
3. "바로 체험하기" 클릭 → `/student/chat` 이동 (guest 세션 생성)
4. 수학 + 주제 입력 → "대화 시작하기"
5. 좌하단 햄버거 버튼 확인 (V.12)
6. 2턴 진행 → 턴 카운트 "(2/5)"
7. 햄버거 → "세션 목록" — 우하단 햄버거 복귀 확인 (V.12 반대)
8. Active 세션 카드 클릭 (V.9 — 리포트 버튼 없음 확인)
9. 로딩 스피너 "이전 대화를 불러오고 있어요..." 관찰 (V.7)
10. 메시지 복원 확인 (V.7)
11. 추가 3턴 진행 → "(5/5)" 도달 + guest limit 경고
12. "종료" 버튼 → overlay 관찰 (V.2 + V.4 연속)
13. 리포트 페이지 렌더
14. 데스크톱 뷰포트 전환 + Navbar 로고 클릭 (V.6)

**합격 기준**: 12/14 이상

---

#### V.14 — 학생 Navigation 일관성 (8단계)

**실행 가이드**:
1. `student@demo.com` 로그인 → 자동 `/student/chat` 이동
2. 로고 클릭 → `/student/chat` 유지
3. 주소창 `/` → 랜딩 "대화 계속하기" CTA (V.5)
4. "대화 계속하기" → `/student/chat`
5. 사이드바 → "세션 목록" → completed 카드의 "리포트" 버튼 표시 (V.9)
6. 리포트 버튼 직접 클릭 → `/student/report/{id}`
7. 로고 클릭 → `/student/chat` (V.6)
8. 로그아웃 → `/` → 기본 CTA 복귀

**합격**: 7/8 이상

---

#### V.15 — 강사 Replay 일관성 (7단계)

**실행 가이드**:
1. `instructor@demo.com` 로그인 → `/instructor/dashboard`
2. 학생 카드 1 클릭 → `/instructor/replay/{id1}?name=...` + 학생명 확인
3. "대시보드로 돌아가기" → 학생 카드 2 클릭 (이름 다름)
4. HeatmapChart row 클릭 → 학생 3 (같은 쿼리 방식)
5. 3 리플레이 모두 메타 라인 구조 동일 확인 (V.10)
6. 임의 리플레이에서 로고 클릭 → `/instructor/dashboard` (V.6)
7. 히스토리 자연성 — 뒤로가기 / 앞으로가기 동작

**합격**: 6/7 이상

---

## 🎯 의사결정 필요 항목

### D.1 — V.25 단계 8: `thinkbridge_tutorial_disabled` 키 효과 범위

**자동 테스트에서 발견된 불일치**:

| 항목 | 시나리오 원래 가정 | 실제 구현 |
|------|------------------|---------|
| `?` 버튼 수동 실행 | "disable 키 무시하고 수동 실행 허용" | **disable 키로 `?` 버튼도 차단됨** |

**결정 옵션**:
- **A. 현재 동작이 의도**: 시나리오 문서 수정 (`?` 버튼도 차단된다고 명시) — 이미 `fix_verification_automated_results.md`에 정정안 기재됨. **이 경우 추가 코드 수정 없음.**
- **B. 수동 실행은 허용해야 함 (원래 시나리오 의도 준수)**: `frontend/src/components/tutorial/TutorialButton.tsx` 또는 `tutorial.tsx` 내 `startTutorial` 함수가 disable 키를 검사하지 않도록 수정 필요.

**권장**: 옵션 A (현재 동작 유지) — "완전 off 스위치"라는 설계가 직관적이고, `?` 버튼도 함께 숨기는 확장이 가능하면 더 깔끔함. 사용자 판단 요망.

---

## 📊 최종 Sign-off (수동 완료 후 기입)

### 각 수동 시나리오 결과

| ID | 시나리오 | Pass | Fail | Skip | 비고 |
|----|---------|------|------|------|------|
| V.2-시각 | 종료 오버레이 flash | ☐ | ☐ | ☐ | Slow 3G 필요 |
| V.4 | 리포트 retry 5×2s | ☐ | ☐ | ☐ | Block URL 필요 |
| V.11-hover | 종료 버튼 hover/active | ☐ | ☐ | ☐ | 실제 마우스 필요 |
| V.22-SR | 스크린 리더 호환성 | ☐ | ☐ | ☐ | 선택 |
| V.13 | 게스트 E2E 14단계 | ☐ | ☐ | ☐ | iPhone 14 Pro 뷰포트 |
| V.14 | 학생 네비 8단계 | ☐ | ☐ | ☐ | |
| V.15 | 강사 Replay 7단계 | ☐ | ☐ | ☐ | |

### 전체 합격 판정

- [ ] 자동 테스트 18개 + 수동 테스트 위 7개 = **25개 중 22개 이상 통과**
- [ ] V.7 CRITICAL 은 자동 이미 통과
- [ ] V.25 단계 8 결정 완료 (옵션 A 또는 B)
- [ ] Console 에러 누적 없음 (정상 동작 중)

테스터: ______________________
날짜: ______________________
결과: ☐ 전체 합격 ☐ 조건부 합격 ☐ 재시도 필요

---

## 🛠 테스트 팁 / 트러블슈팅

### Block request URL이 작동하지 않을 때 (V.4)
- Chrome DevTools Network 탭 → 우측 `⋮` 메뉴 → "More network conditions" 열어서 "Enable request blocking" 체크 확인
- URL 패턴은 와일드카드 사용: `*reports/session*`

### Slow 3G가 너무 느려 타임아웃 날 때 (V.2)
- "Custom" throttling 설정: Download 1.5 Mb/s, Upload 750 Kb/s, Latency 2000ms
- 이 정도면 리포트 생성에 충분한 지연 + 오버레이 관찰 가능

### 튜토리얼이 반복해서 뜰 때
- DevTools Application → LocalStorage → `thinkbridge_tutorial_*` 키 일괄 제거
- 또는 `thinkbridge_tutorial_disabled = "true"` 설정 (전체 비활성 스위치, 주의: 현재 구현은 `?` 수동 실행까지 차단함)

### AuthProvider가 수동 설정한 token을 무시할 때
- `localStorage.setItem('thinkbridge_token', ...)` 후 `window.location.reload()` 대신 **로그인 폼을 실제로 사용** (email/password 입력 + 제출) — AuthProvider의 rehydration 사이클과 안전하게 상호작용
