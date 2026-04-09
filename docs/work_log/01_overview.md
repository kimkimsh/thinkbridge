# ThinkBridge 작업 로그 — 전체 개요

> 작업 기간: 2026-04-06 ~ 2026-04-09
> 프로젝트: AI 소크라테스식 튜터링 시스템 (2026 KIT 바이브코딩 공모전)

## 프로젝트 규모

| 항목 | 수치 |
|------|------|
| Backend 소스 파일 | 31개 (Python) |
| Frontend 소스 파일 | 44개 (TypeScript/TSX) |
| 총 커밋 수 | 36개 |
| API 엔드포인트 | 16개 |
| DB 테이블 | 8개 |
| 프론트엔드 페이지 | 10개 |
| UI 컴포넌트 | 14개 |
| API 테스트 시나리오 | 190개 |

## 라이브 URL

| 서비스 | URL |
|--------|-----|
| Frontend | https://frontend-manhyeon.vercel.app |
| Backend API | https://thinkbridge-api.onrender.com |
| GitHub | https://github.com/kimkimsh/thinkbridge |

## 데모 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 학생 | student@demo.com | demo1234 |
| 교강사 | instructor@demo.com | demo1234 |
| 관리자 | admin@demo.com | demo1234 |

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Backend | FastAPI, SQLAlchemy 2.0 (async), Pydantic v2 |
| AI | Claude API + Tool Use (1-tool + text 패턴) |
| DB | Supabase PostgreSQL |
| 배포 FE | Vercel |
| 배포 BE | Render |
| 인증 | Custom JWT + 게스트 모드 |

## 작업 로그 목차

1. [01_overview.md](01_overview.md) — 전체 개요 (이 파일)
2. [02_implementation.md](02_implementation.md) — 구현 과정 (17개 태스크)
3. [03_deployment.md](03_deployment.md) — 배포 과정 및 트러블슈팅
4. [04_qa_testing.md](04_qa_testing.md) — QA 테스트 및 버그 수정
5. [05_architecture.md](05_architecture.md) — 아키텍처 및 주요 설계 결정
