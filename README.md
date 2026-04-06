# ThinkBridge - AI 소크라테스식 튜터링 시스템

> "AI가 답을 주는 시대, 생각하는 법을 가르치는 AI"

## 프로젝트 소개

ThinkBridge는 AI가 절대 정답을 제공하지 않고, 소크라테스식 질문법으로 학생의 사고를 유도하는 1:1 튜터링 시스템입니다.

- 학생이 질문하면 AI가 되물으며 사고를 확장시킵니다
- 6차원 사고 분석 프레임워크(블룸의 개정판 분류체계)로 실시간 분석
- 세션 종료 시 자동 리포트 생성 (레이더 차트 + 성장 추이)
- 교수자 대시보드로 학생 현황 모니터링

## 라이브 URL

- **Frontend**: (배포 후 업데이트 예정)
- **Backend API**: (배포 후 업데이트 예정)

## 데모 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 학생 | student@demo.com | demo1234 |
| 교수자 | instructor@demo.com | demo1234 |
| 관리자 | admin@demo.com | demo1234 |

**게스트 체험**: 로그인 없이 "바로 체험하기"로 5턴 체험 가능

## 아키텍처

```
[Browser] --> [Vercel: Next.js 14 Frontend]
                      |
                      | REST + SSE (fetch ReadableStream)
                      v
              [Render: FastAPI Backend] <-- UptimeRobot 5min ping
                      |
              +-------+-------+
              |               |
    [Claude API]      [Supabase PostgreSQL]
    (Tool Use + text)
```

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Backend | FastAPI (Python), SQLAlchemy 2.0 (async), Pydantic v2 |
| AI | Claude API + Tool Use (1-tool + text 패턴) |
| DB | Supabase PostgreSQL |
| 배포 FE | Vercel |
| 배포 BE | Render + UptimeRobot |
| 인증 | Custom JWT + 게스트 모드 |

## 6차원 사고 분석 프레임워크

블룸의 개정판 분류체계(Bloom's Revised Taxonomy) 기반:

1. **문제 이해** (Understand)
2. **전제 확인** (Remember/Understand)
3. **논리 구조화** (Analyze)
4. **근거 제시** (Apply)
5. **비판적 사고** (Evaluate)
6. **창의적 사고** (Create)

## 로컬 개발 환경 설정

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# .env 파일에 실제 값 입력
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# .env.local 파일에 실제 값 입력
npm run dev
```

## 2026 KIT 바이브코딩 공모전 출품작

- **심사 기준**: 기술적 완성도, AI 활용 능력/효율성, 기획력/실무 접합성, 창의성
- **핵심 원칙**: "학생 채팅 1개 기능의 완벽함 > 기능 10개의 존재"
