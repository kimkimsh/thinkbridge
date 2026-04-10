# UI/UX 리디자인

> 날짜: 2026-04-10

## Before vs After 비교

### 랜딩 페이지
| 항목 | Before | After |
|------|--------|-------|
| 히어로 배경 | 단색 blue-50 | 도트 패턴 + indigo/purple blur 그라데이션 |
| 헤드라인 | 일반 텍스트 | 그라데이션 텍스트 (indigo -> purple) |
| CTA 버튼 | blue-600 (평범) | indigo-600 + shadow-lg + hover 효과 |
| 제품 미리보기 | 없음 | 소크라테스 대화 미니 목업 추가 |
| 비교 섹션 | 동일한 카드 2개 | VS 디바이더 + 빨강/초록 색코딩 + 글로우 효과 |
| 기능 카드 | 기본 아이콘+텍스트 | 색상별 보더 + hover 리프트 + 큰 아이콘 배경 |
| 데모 섹션 | 동일한 카드 3개 | 역할별 색상 (indigo/purple/slate) |
| 애니메이션 | 없음 | 스크롤 트리거 fade-in + stagger |

### 로그인/회원가입
| 항목 | Before | After |
|------|--------|-------|
| 레이아웃 | 중앙 카드 only | 좌: 브랜드 패널 (indigo-purple 그라데이션) + 우: 폼 |
| 브랜딩 | 로고만 | 로고 + 태그라인 + 기능 하이라이트 3개 |
| 역할 선택 | 기본 라디오 | 색상별 카드 (학생=indigo, 교강사=emerald) |

### 채팅 인터페이스
| 항목 | Before | After |
|------|--------|-------|
| 메시지 버블 | 단색 blue/gray | 그라데이션 + 아바타 아이콘 (User/Sparkles) |
| AI 메시지 | gray 배경 | 흰색 + 좌측 indigo 보더 (인용 스타일) |
| 사고력 분석 | 디버그 패널 느낌 | 그라데이션 바 + Sparkles 아이콘 + 평균 점수 |
| 진행 바 | 작은 원 5개 | 큰 원 + 체크마크 + 펄스 애니메이션 + 그라데이션 연결선 |
| 웰컴 상태 | 빈 화면 | 환영 카드 + 소크라테스 튜터링 팁 3개 |
| 입력 영역 | 기본 textarea | 포커스 글로우 + indigo 테마 버튼 |
| 과목 선택 | 동일한 카드 3개 | 과목별 색상 (수학=파랑, 과학=초록, 논술=보라) |

## 색상 시스템 변경

| 용도 | Before | After |
|------|--------|-------|
| Primary | blue-600 (#2563EB) | indigo-600 (#4F46E5) |
| CTA accent | blue-600 | amber-500 (#F59E0B) |
| AI 브랜드 | blue | indigo -> purple 그라데이션 |
| 배경 | white | slate-50 -> white 그라데이션 |
| 수학 | blue | blue-500 |
| 과학 | blue | emerald-500 |
| 논술 | blue | purple-500 |

## 영향 파일
- frontend/src/app/page.tsx (랜딩 페이지)
- frontend/src/app/login/page.tsx (로그인)
- frontend/src/app/register/page.tsx (회원가입)
- frontend/src/app/student/chat/page.tsx (과목 선택)
- frontend/src/components/chat/ChatInterface.tsx (웰컴 카드, 입력 글로우)
- frontend/src/components/chat/MessageBubble.tsx (그라데이션 + 아바타)
- frontend/src/components/chat/ThoughtPanel.tsx (그라데이션 바 + 아이콘)
- frontend/src/components/chat/ProgressBar.tsx (체크마크 + 펄스 + 연결선)

## 커밋
- 289cb91: feat: redesign UI/UX with distinctive visual identity
