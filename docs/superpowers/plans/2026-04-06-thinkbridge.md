# ThinkBridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an AI-powered Socratic tutoring system that never gives answers directly, instead guiding students through questions while analyzing their thinking patterns in 6 dimensions.

**Architecture:** Next.js 14 frontend with FastAPI Python backend. Claude API powers the Socratic dialogue engine and thought pattern analyzer. PostgreSQL stores sessions, messages, and analysis data. Three core AI modules: Socratic Engine (dialogue), Thought Analyzer (pattern classification), Report Generator (narrative reports).

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts, FastAPI, SQLAlchemy, PostgreSQL, Anthropic Claude API, NextAuth.js, Vercel, Railway

---

## File Structure

```
thinkbridge/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                          # FastAPI app, CORS, router mounting
│   │   ├── config.py                        # Settings from env vars
│   │   ├── database.py                      # async engine, sessionmaker, Base
│   │   ├── models/
│   │   │   ├── __init__.py                  # re-export all models
│   │   │   ├── user.py                      # User model
│   │   │   ├── class_room.py               # ClassRoom model
│   │   │   ├── enrollment.py               # Enrollment model
│   │   │   ├── session.py                  # TutoringSession model
│   │   │   ├── message.py                  # Message model
│   │   │   ├── thought_analysis.py         # ThoughtAnalysis model
│   │   │   └── report.py                   # Report model
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py                      # User request/response schemas
│   │   │   ├── session.py                  # Session schemas
│   │   │   ├── message.py                  # Message + analysis schemas
│   │   │   └── report.py                   # Report schemas
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                      # register, login, me
│   │   │   ├── sessions.py                 # CRUD sessions, send message
│   │   │   ├── reports.py                  # generate/get reports
│   │   │   └── dashboard.py               # instructor dashboard endpoints
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── socratic_engine.py          # Socratic dialogue generation
│   │   │   ├── thought_analyzer.py         # Thinking pattern analysis
│   │   │   └── report_generator.py         # Report narrative generation
│   │   └── core/
│   │       ├── __init__.py
│   │       ├── security.py                  # JWT, password hashing
│   │       └── prompts.py                   # All Claude API prompt templates
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py                      # fixtures: test DB, client, auth
│   │   ├── test_auth.py
│   │   ├── test_sessions.py
│   │   ├── test_socratic_engine.py
│   │   ├── test_thought_analyzer.py
│   │   └── test_report_generator.py
│   ├── seed_data.py                         # Demo data seeding script
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx                   # Root layout, font, providers
│   │   │   ├── page.tsx                     # Landing page
│   │   │   ├── globals.css                  # Tailwind imports + custom
│   │   │   ├── login/page.tsx              # Login form
│   │   │   ├── register/page.tsx           # Register form
│   │   │   ├── student/
│   │   │   │   ├── layout.tsx              # Student sidebar layout
│   │   │   │   ├── chat/page.tsx           # Socratic chat interface
│   │   │   │   ├── sessions/page.tsx       # Session history list
│   │   │   │   └── report/[id]/page.tsx    # Session report (radar chart)
│   │   │   └── instructor/
│   │   │       ├── layout.tsx              # Instructor sidebar layout
│   │   │       ├── dashboard/page.tsx      # Student list + summary
│   │   │       ├── heatmap/[classId]/page.tsx  # Class heatmap
│   │   │       └── replay/[sessionId]/page.tsx # Session replay
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── ChatInterface.tsx        # Main chat container
│   │   │   │   ├── MessageBubble.tsx        # Single message display
│   │   │   │   └── ThoughtPanel.tsx         # Side panel: live analysis
│   │   │   ├── charts/
│   │   │   │   ├── RadarChart.tsx           # 6-dim radar chart
│   │   │   │   ├── HeatmapChart.tsx         # Student x dimension matrix
│   │   │   │   └── ThoughtTimeline.tsx      # Turn-by-turn timeline
│   │   │   ├── dashboard/
│   │   │   │   ├── StudentList.tsx          # Student cards with scores
│   │   │   │   └── ClassSelector.tsx        # Class dropdown
│   │   │   ├── replay/
│   │   │   │   └── SessionReplay.tsx        # Dual-panel replay
│   │   │   └── layout/
│   │   │       ├── Navbar.tsx               # Top nav with user info
│   │   │       └── Sidebar.tsx              # Role-based sidebar
│   │   ├── lib/
│   │   │   ├── api.ts                       # Backend API client
│   │   │   ├── auth.ts                      # Auth context + hooks
│   │   │   └── constants.ts                 # Dimension labels, colors
│   │   └── types/
│   │       └── index.ts                     # All TypeScript interfaces
│   ├── public/
│   │   └── logo.svg
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   ├── components.json                      # shadcn/ui config
│   └── .env.local.example
├── .gitignore
├── .env.example
└── README.md
```

---

## Task 1: Project Scaffolding & Configuration

**Files:**
- Create: `thinkbridge/backend/requirements.txt`
- Create: `thinkbridge/backend/app/__init__.py`
- Create: `thinkbridge/backend/app/config.py`
- Create: `thinkbridge/backend/app/main.py`
- Create: `thinkbridge/.gitignore`
- Create: `thinkbridge/.env.example`
- Create: `thinkbridge/README.md`

- [ ] **Step 1: Create project root and backend directory**

```bash
mkdir -p thinkbridge/backend/app/{models,schemas,routers,services,core}
mkdir -p thinkbridge/backend/tests
touch thinkbridge/backend/app/__init__.py
touch thinkbridge/backend/app/models/__init__.py
touch thinkbridge/backend/app/schemas/__init__.py
touch thinkbridge/backend/app/routers/__init__.py
touch thinkbridge/backend/app/services/__init__.py
touch thinkbridge/backend/app/core/__init__.py
touch thinkbridge/backend/tests/__init__.py
```

- [ ] **Step 2: Write requirements.txt**

Write to `thinkbridge/backend/requirements.txt`:
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy[asyncio]==2.0.35
asyncpg==0.30.0
alembic==1.13.0
pydantic==2.9.0
pydantic-settings==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
anthropic==0.40.0
python-multipart==0.0.12
httpx==0.27.0
pytest==8.3.0
pytest-asyncio==0.24.0
pytest-httpx==0.32.0
```

- [ ] **Step 3: Write config.py**

Write to `thinkbridge/backend/app/config.py`:
```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/thinkbridge"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"
    CORS_ORIGINS: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
```

- [ ] **Step 4: Write database.py**

Write to `thinkbridge/backend/app/database.py`:
```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session
```

- [ ] **Step 5: Write main.py**

Write to `thinkbridge/backend/app/main.py`:
```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="ThinkBridge API",
    description="AI Socratic Tutoring & Thinking Analysis System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
```

- [ ] **Step 6: Write .gitignore and .env.example**

Write to `thinkbridge/.gitignore`:
```
__pycache__/
*.pyc
.env
.env.local
node_modules/
.next/
*.db
.venv/
venv/
dist/
.vercel/
```

Write to `thinkbridge/.env.example`:
```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/thinkbridge
SECRET_KEY=your-secret-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
ANTHROPIC_MODEL=claude-sonnet-4-20250514
CORS_ORIGINS=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

- [ ] **Step 7: Write README.md**

Write to `thinkbridge/README.md`:
```markdown
# ThinkBridge

AI가 답을 주는 시대, 생각하는 법을 가르치는 AI

소크라테스식 질문법으로 학생의 사고를 유도하고, 6차원 사고력 분석을 제공하는 교육 솔루션

## Tech Stack
- Frontend: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- Backend: FastAPI, SQLAlchemy, PostgreSQL
- AI: Claude API (Anthropic)

## Getting Started

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env  # edit with your values
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local  # edit with your values
npm run dev
```

## Project Structure
- `backend/` - FastAPI REST API + AI services
- `frontend/` - Next.js 14 web application
```

- [ ] **Step 8: Initialize git and commit**

```bash
cd thinkbridge
git init
git add .
git commit -m "chore: initial project scaffolding with FastAPI backend"
```

---

## Task 2: Database Models

**Files:**
- Create: `thinkbridge/backend/app/models/user.py`
- Create: `thinkbridge/backend/app/models/class_room.py`
- Create: `thinkbridge/backend/app/models/enrollment.py`
- Create: `thinkbridge/backend/app/models/session.py`
- Create: `thinkbridge/backend/app/models/message.py`
- Create: `thinkbridge/backend/app/models/thought_analysis.py`
- Create: `thinkbridge/backend/app/models/report.py`
- Modify: `thinkbridge/backend/app/models/__init__.py`

- [ ] **Step 1: Write User model**

Write to `thinkbridge/backend/app/models/user.py`:
```python
import enum
from datetime import datetime

from sqlalchemy import String, Enum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    STUDENT = "student"
    INSTRUCTOR = "instructor"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.STUDENT)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    enrollments = relationship("Enrollment", back_populates="user")
    sessions = relationship("TutoringSession", back_populates="user")
```

- [ ] **Step 2: Write ClassRoom and Enrollment models**

Write to `thinkbridge/backend/app/models/class_room.py`:
```python
from datetime import datetime

from sqlalchemy import String, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ClassRoom(Base):
    __tablename__ = "classrooms"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    subject: Mapped[str] = mapped_column(String(100))
    instructor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    instructor = relationship("User", foreign_keys=[instructor_id])
    enrollments = relationship("Enrollment", back_populates="classroom")
```

Write to `thinkbridge/backend/app/models/enrollment.py`:
```python
from sqlalchemy import Integer, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Enrollment(Base):
    __tablename__ = "enrollments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("classrooms.id"))
    role: Mapped[str] = mapped_column(String(20), default="student")

    user = relationship("User", back_populates="enrollments")
    classroom = relationship("ClassRoom", back_populates="enrollments")
```

- [ ] **Step 3: Write Session and Message models**

Write to `thinkbridge/backend/app/models/session.py`:
```python
import enum
from datetime import datetime

from sqlalchemy import String, Integer, ForeignKey, DateTime, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SessionStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"


class TutoringSession(Base):
    __tablename__ = "tutoring_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    subject: Mapped[str] = mapped_column(String(100))
    topic: Mapped[str] = mapped_column(String(500))
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus), default=SessionStatus.ACTIVE
    )
    total_turns: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user = relationship("User", back_populates="sessions")
    messages = relationship(
        "Message", back_populates="session", order_by="Message.turn_number"
    )
```

Write to `thinkbridge/backend/app/models/message.py`:
```python
import enum
from datetime import datetime

from sqlalchemy import String, Integer, ForeignKey, DateTime, Text, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("tutoring_sessions.id"))
    role: Mapped[MessageRole] = mapped_column(Enum(MessageRole))
    content: Mapped[str] = mapped_column(Text)
    turn_number: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    session = relationship("TutoringSession", back_populates="messages")
    analysis = relationship("ThoughtAnalysis", back_populates="message", uselist=False)
```

- [ ] **Step 4: Write ThoughtAnalysis and Report models**

Write to `thinkbridge/backend/app/models/thought_analysis.py`:
```python
import enum

from sqlalchemy import Integer, ForeignKey, Enum, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EngagementLevel(str, enum.Enum):
    ACTIVE = "active"
    PASSIVE = "passive"
    STUCK = "stuck"


class ThoughtAnalysis(Base):
    __tablename__ = "thought_analyses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    message_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("messages.id"), unique=True
    )
    problem_understanding: Mapped[int] = mapped_column(Integer, default=0)
    premise_check: Mapped[int] = mapped_column(Integer, default=0)
    logical_structure: Mapped[int] = mapped_column(Integer, default=0)
    evidence_provision: Mapped[int] = mapped_column(Integer, default=0)
    critical_thinking: Mapped[int] = mapped_column(Integer, default=0)
    creative_thinking: Mapped[int] = mapped_column(Integer, default=0)
    detected_patterns: Mapped[list] = mapped_column(JSON, default=list)
    socratic_stage: Mapped[int] = mapped_column(Integer, default=1)
    engagement_level: Mapped[EngagementLevel] = mapped_column(
        Enum(EngagementLevel), default=EngagementLevel.ACTIVE
    )

    message = relationship("Message", back_populates="analysis")
```

Write to `thinkbridge/backend/app/models/report.py`:
```python
import enum
from datetime import datetime

from sqlalchemy import Integer, String, Text, Enum, JSON, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ReportType(str, enum.Enum):
    SESSION = "session"
    STUDENT = "student"
    CLASS = "class"


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    type: Mapped[ReportType] = mapped_column(Enum(ReportType))
    target_id: Mapped[int] = mapped_column(Integer)
    summary: Mapped[str] = mapped_column(Text)
    dimension_scores: Mapped[dict] = mapped_column(JSON, default=dict)
    generated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
```

- [ ] **Step 5: Write models __init__.py**

Write to `thinkbridge/backend/app/models/__init__.py`:
```python
from app.models.user import User, UserRole
from app.models.class_room import ClassRoom
from app.models.enrollment import Enrollment
from app.models.session import TutoringSession, SessionStatus
from app.models.message import Message, MessageRole
from app.models.thought_analysis import ThoughtAnalysis, EngagementLevel
from app.models.report import Report, ReportType

__all__ = [
    "User",
    "UserRole",
    "ClassRoom",
    "Enrollment",
    "TutoringSession",
    "SessionStatus",
    "Message",
    "MessageRole",
    "ThoughtAnalysis",
    "EngagementLevel",
    "Report",
    "ReportType",
]
```

- [ ] **Step 6: Update main.py to import models**

Add to top of `thinkbridge/backend/app/main.py` after existing imports:
```python
import app.models  # noqa: F401 — register models with SQLAlchemy Base
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/ backend/app/main.py
git commit -m "feat: add all database models (User, Session, Message, ThoughtAnalysis, Report)"
```

---

## Task 3: Pydantic Schemas

**Files:**
- Create: `thinkbridge/backend/app/schemas/user.py`
- Create: `thinkbridge/backend/app/schemas/session.py`
- Create: `thinkbridge/backend/app/schemas/message.py`
- Create: `thinkbridge/backend/app/schemas/report.py`
- Modify: `thinkbridge/backend/app/schemas/__init__.py`

- [ ] **Step 1: Write user schemas**

Write to `thinkbridge/backend/app/schemas/user.py`:
```python
from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserRegister(BaseModel):
    email: str
    name: str
    password: str
    role: UserRole = UserRole.STUDENT


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
```

- [ ] **Step 2: Write session schemas**

Write to `thinkbridge/backend/app/schemas/session.py`:
```python
from datetime import datetime

from pydantic import BaseModel

from app.models.session import SessionStatus


class SessionCreate(BaseModel):
    subject: str
    topic: str


class SessionResponse(BaseModel):
    id: int
    user_id: int
    subject: str
    topic: str
    status: SessionStatus
    total_turns: int
    started_at: datetime
    ended_at: datetime | None

    model_config = {"from_attributes": True}


class SessionDetail(SessionResponse):
    messages: list["MessageWithAnalysis"] = []


from app.schemas.message import MessageWithAnalysis  # noqa: E402

SessionDetail.model_rebuild()
```

- [ ] **Step 3: Write message schemas**

Write to `thinkbridge/backend/app/schemas/message.py`:
```python
from datetime import datetime

from pydantic import BaseModel

from app.models.message import MessageRole
from app.models.thought_analysis import EngagementLevel


class MessageCreate(BaseModel):
    content: str


class ThoughtAnalysisResponse(BaseModel):
    problem_understanding: int
    premise_check: int
    logical_structure: int
    evidence_provision: int
    critical_thinking: int
    creative_thinking: int
    detected_patterns: list[str]
    socratic_stage: int
    engagement_level: EngagementLevel

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    id: int
    session_id: int
    role: MessageRole
    content: str
    turn_number: int
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageWithAnalysis(MessageResponse):
    analysis: ThoughtAnalysisResponse | None = None


class SocraticResponse(BaseModel):
    user_message: MessageWithAnalysis
    ai_message: MessageResponse
```

- [ ] **Step 4: Write report schemas**

Write to `thinkbridge/backend/app/schemas/report.py`:
```python
from datetime import datetime

from pydantic import BaseModel

from app.models.report import ReportType


class ReportResponse(BaseModel):
    id: int
    type: ReportType
    target_id: int
    summary: str
    dimension_scores: dict
    generated_at: datetime

    model_config = {"from_attributes": True}


class HeatmapEntry(BaseModel):
    student_id: int
    student_name: str
    problem_understanding: float
    premise_check: float
    logical_structure: float
    evidence_provision: float
    critical_thinking: float
    creative_thinking: float
    session_count: int


class HeatmapResponse(BaseModel):
    class_id: int
    class_name: str
    entries: list[HeatmapEntry]


class StudentSummary(BaseModel):
    id: int
    name: str
    email: str
    session_count: int
    latest_scores: dict | None
    avg_scores: dict | None

    model_config = {"from_attributes": True}
```

- [ ] **Step 5: Write schemas __init__.py and commit**

Write to `thinkbridge/backend/app/schemas/__init__.py`:
```python
from app.schemas.user import UserRegister, UserLogin, UserResponse, TokenResponse
from app.schemas.session import SessionCreate, SessionResponse, SessionDetail
from app.schemas.message import (
    MessageCreate,
    MessageResponse,
    MessageWithAnalysis,
    ThoughtAnalysisResponse,
    SocraticResponse,
)
from app.schemas.report import (
    ReportResponse,
    HeatmapEntry,
    HeatmapResponse,
    StudentSummary,
)
```

```bash
git add backend/app/schemas/
git commit -m "feat: add Pydantic request/response schemas"
```

---

## Task 4: Auth System (Backend)

**Files:**
- Create: `thinkbridge/backend/app/core/security.py`
- Create: `thinkbridge/backend/app/routers/auth.py`
- Modify: `thinkbridge/backend/app/main.py`
- Create: `thinkbridge/backend/tests/conftest.py`
- Create: `thinkbridge/backend/tests/test_auth.py`

- [ ] **Step 1: Write security utilities**

Write to `thinkbridge/backend/app/core/security.py`:
```python
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return user
```

- [ ] **Step 2: Write auth router**

Write to `thinkbridge/backend/app/routers/auth.py`:
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, UserResponse, TokenResponse
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(body: UserRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )
    user = User(
        email=body.email,
        name=body.name,
        role=body.role,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
```

- [ ] **Step 3: Mount auth router in main.py**

Add to `thinkbridge/backend/app/main.py` after CORS middleware:
```python
from app.routers import auth

app.include_router(auth.router)
```

- [ ] **Step 4: Write test fixtures**

Write to `thinkbridge/backend/tests/conftest.py`:
```python
import asyncio
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
test_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with test_session() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def student_token(client: AsyncClient) -> str:
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "student@test.com",
            "name": "Test Student",
            "password": "password123",
            "role": "student",
        },
    )
    return response.json()["access_token"]


@pytest_asyncio.fixture
async def instructor_token(client: AsyncClient) -> str:
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "instructor@test.com",
            "name": "Test Instructor",
            "password": "password123",
            "role": "instructor",
        },
    )
    return response.json()["access_token"]
```

Add `aiosqlite==0.20.0` to `thinkbridge/backend/requirements.txt`.

- [ ] **Step 5: Write auth tests**

Write to `thinkbridge/backend/tests/test_auth.py`:
```python
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_student(client: AsyncClient):
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "new@test.com",
            "name": "New User",
            "password": "pass123",
            "role": "student",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "student"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {
        "email": "dup@test.com",
        "name": "User",
        "password": "pass123",
        "role": "student",
    }
    await client.post("/api/auth/register", json=payload)
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login(client: AsyncClient):
    await client.post(
        "/api/auth/register",
        json={
            "email": "login@test.com",
            "name": "User",
            "password": "pass123",
            "role": "student",
        },
    )
    response = await client.post(
        "/api/auth/login",
        json={"email": "login@test.com", "password": "pass123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post(
        "/api/auth/register",
        json={
            "email": "wrong@test.com",
            "name": "User",
            "password": "pass123",
            "role": "student",
        },
    )
    response = await client.post(
        "/api/auth/login",
        json={"email": "wrong@test.com", "password": "wrongpass"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, student_token: str):
    response = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "student@test.com"
```

- [ ] **Step 6: Run tests**

```bash
cd backend && python -m pytest tests/test_auth.py -v
```
Expected: All 5 tests PASS

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat: add JWT auth system with register/login/me endpoints"
```

---

## Task 5: AI Prompt Templates

**Files:**
- Create: `thinkbridge/backend/app/core/prompts.py`

- [ ] **Step 1: Write all prompt templates**

Write to `thinkbridge/backend/app/core/prompts.py`:
```python
SOCRATIC_SYSTEM_PROMPT = """You are a Socratic tutor for {subject}. Your role is to guide students to discover answers through questioning, NEVER giving direct answers.

## Absolute Rules
1. NEVER provide the answer directly
2. NEVER solve the problem for the student
3. NEVER say "correct" or "incorrect" definitively - instead ask them to verify
4. Always respond in Korean (한국어)
5. Be warm and encouraging, like a patient mentor

## Socratic Strategy Stages
- Stage 1 (문제 명확화): Help student clarify what the problem is asking
- Stage 2 (조건 탐색): Guide student to identify given conditions and constraints
- Stage 3 (전략 유도): Prompt student to recall related concepts or methods
- Stage 4 (검증 촉진): Encourage student to verify their answer
- Stage 5 (일반화/확장): Help student generalize or extend their understanding

## Adaptive Rules
- If student is STUCK: Move DOWN one stage, ask more specific guiding questions
- If student is progressing FAST: Skip stages, jump to verification/extension
- If student shows FRUSTRATION: Acknowledge their effort, break the problem into smaller steps

## Current Context
Subject: {subject}
Topic: {topic}
Current Stage: {current_stage}

Respond with a single Socratic question or guiding prompt. Keep responses concise (2-4 sentences max)."""

THOUGHT_ANALYSIS_SYSTEM_PROMPT = """You are an expert educational psychologist analyzing a student's thinking patterns during a Socratic tutoring session.

Analyze the student's latest message and rate their thinking across 6 dimensions (0-10 scale):

1. problem_understanding: How well do they grasp what the problem is asking?
2. premise_check: Do they identify and use given conditions/assumptions?
3. logical_structure: Is their reasoning step-by-step and coherent?
4. evidence_provision: Do they support claims with reasons or evidence?
5. critical_thinking: Do they verify, question, or consider alternatives?
6. creative_thinking: Do they try novel approaches or perspectives?

Also detect any thinking patterns from this list:
- logical_leap: Jumping to conclusions without intermediate steps
- missing_premise: Failing to use important given conditions
- circular_reasoning: Using the conclusion as a premise
- correct_reasoning: Sound logical progression
- self_correction: Catching and fixing own mistakes
- creative_approach: Trying an unusual but valid method
- surface_level: Only engaging superficially with the problem

Determine the student's engagement level:
- active: Actively thinking and progressing
- passive: Giving minimal or superficial responses
- stuck: Showing signs of being unable to progress

Respond ONLY with valid JSON in this exact format:
{
  "problem_understanding": <0-10>,
  "premise_check": <0-10>,
  "logical_structure": <0-10>,
  "evidence_provision": <0-10>,
  "critical_thinking": <0-10>,
  "creative_thinking": <0-10>,
  "detected_patterns": ["pattern1", "pattern2"],
  "socratic_stage": <1-5>,
  "engagement_level": "active|passive|stuck",
  "evidence": {
    "problem_understanding": "<brief Korean explanation>",
    "premise_check": "<brief Korean explanation>",
    "logical_structure": "<brief Korean explanation>",
    "evidence_provision": "<brief Korean explanation>",
    "critical_thinking": "<brief Korean explanation>",
    "creative_thinking": "<brief Korean explanation>"
  }
}"""

REPORT_SYSTEM_PROMPT = """You are an educational analyst generating a thinking skills diagnostic report in Korean.

Given the analysis data from a tutoring session, write a comprehensive but encouraging report.

## Report Structure
1. 전체 요약 (2-3 sentences): Overall assessment of the student's thinking
2. 강점 분석: What dimensions they excelled in, with specific examples
3. 개선 영역: What dimensions need work, with actionable advice
4. 사고 패턴 분석: Recurring patterns observed (good and bad)
5. 다음 단계 제안: Specific recommendations for improvement

## Rules
- Always be encouraging - highlight growth and effort
- Be specific - reference actual moments from the session
- Make recommendations actionable and concrete
- Write in Korean
- Keep the total report under 500 words

Session data:
Subject: {subject}
Topic: {topic}
Total turns: {total_turns}
Dimension averages: {dimension_averages}
Detected patterns: {detected_patterns}
Session messages summary: {messages_summary}"""
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/core/prompts.py
git commit -m "feat: add Claude API prompt templates for Socratic engine, analyzer, reports"
```

---

## Task 6: Socratic Engine Service

**Files:**
- Create: `thinkbridge/backend/app/services/socratic_engine.py`
- Create: `thinkbridge/backend/tests/test_socratic_engine.py`

- [ ] **Step 1: Write Socratic Engine**

Write to `thinkbridge/backend/app/services/socratic_engine.py`:
```python
import anthropic

from app.config import settings
from app.core.prompts import SOCRATIC_SYSTEM_PROMPT


class SocraticEngine:
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def generate_response(
        self,
        subject: str,
        topic: str,
        conversation_history: list[dict],
        current_stage: int,
    ) -> str:
        system_prompt = SOCRATIC_SYSTEM_PROMPT.format(
            subject=subject,
            topic=topic,
            current_stage=current_stage,
        )

        messages = []
        for msg in conversation_history:
            messages.append({"role": msg["role"], "content": msg["content"]})

        response = await self.client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
        )

        return response.content[0].text


socratic_engine = SocraticEngine()
```

- [ ] **Step 2: Write Socratic Engine test**

Write to `thinkbridge/backend/tests/test_socratic_engine.py`:
```python
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.socratic_engine import SocraticEngine


@pytest.mark.asyncio
async def test_generate_response_calls_claude():
    engine = SocraticEngine()

    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="이 문제에서 구하려는 것이 뭘까요?")]

    with patch.object(
        engine.client.messages, "create", new_callable=AsyncMock
    ) as mock_create:
        mock_create.return_value = mock_response

        result = await engine.generate_response(
            subject="수학",
            topic="이차방정식",
            conversation_history=[
                {"role": "user", "content": "이차방정식 풀어주세요"}
            ],
            current_stage=1,
        )

        assert "구하려는" in result
        mock_create.assert_called_once()
        call_kwargs = mock_create.call_args.kwargs
        assert call_kwargs["model"] is not None
        assert "소크라테스" in call_kwargs["system"].lower() or "Socratic" in call_kwargs["system"]


@pytest.mark.asyncio
async def test_generate_response_includes_conversation_history():
    engine = SocraticEngine()

    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="좋은 시도야!")]

    with patch.object(
        engine.client.messages, "create", new_callable=AsyncMock
    ) as mock_create:
        mock_create.return_value = mock_response

        history = [
            {"role": "user", "content": "이차방정식이 뭐예요?"},
            {"role": "assistant", "content": "이차방정식은 무엇이라고 생각해?"},
            {"role": "user", "content": "x의 제곱이 있는 식이요"},
        ]

        await engine.generate_response(
            subject="수학",
            topic="이차방정식",
            conversation_history=history,
            current_stage=2,
        )

        call_kwargs = mock_create.call_args.kwargs
        assert len(call_kwargs["messages"]) == 3
```

- [ ] **Step 3: Run tests**

```bash
cd backend && python -m pytest tests/test_socratic_engine.py -v
```
Expected: 2 tests PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/socratic_engine.py backend/tests/test_socratic_engine.py
git commit -m "feat: add Socratic Engine service with Claude API integration"
```

---

## Task 7: Thought Analyzer Service

**Files:**
- Create: `thinkbridge/backend/app/services/thought_analyzer.py`
- Create: `thinkbridge/backend/tests/test_thought_analyzer.py`

- [ ] **Step 1: Write Thought Analyzer**

Write to `thinkbridge/backend/app/services/thought_analyzer.py`:
```python
import json

import anthropic

from app.config import settings
from app.core.prompts import THOUGHT_ANALYSIS_SYSTEM_PROMPT


DIMENSION_KEYS = [
    "problem_understanding",
    "premise_check",
    "logical_structure",
    "evidence_provision",
    "critical_thinking",
    "creative_thinking",
]

VALID_PATTERNS = [
    "logical_leap",
    "missing_premise",
    "circular_reasoning",
    "correct_reasoning",
    "self_correction",
    "creative_approach",
    "surface_level",
]

VALID_ENGAGEMENT_LEVELS = ["active", "passive", "stuck"]


class ThoughtAnalyzer:
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def analyze(
        self,
        student_message: str,
        conversation_history: list[dict],
        subject: str,
        topic: str,
    ) -> dict:
        context_messages = ""
        for msg in conversation_history[-6:]:
            role_label = "학생" if msg["role"] == "user" else "튜터"
            context_messages += f"{role_label}: {msg['content']}\n"

        user_prompt = (
            f"Subject: {subject}\nTopic: {topic}\n\n"
            f"Recent conversation:\n{context_messages}\n"
            f"Latest student message to analyze:\n{student_message}"
        )

        response = await self.client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1024,
            system=THOUGHT_ANALYSIS_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )

        raw_text = response.content[0].text
        analysis = self._parse_analysis(raw_text)
        return analysis

    def _parse_analysis(self, raw_text: str) -> dict:
        try:
            cleaned = raw_text.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
                cleaned = cleaned.rsplit("```", 1)[0]
            data = json.loads(cleaned)
        except (json.JSONDecodeError, IndexError):
            return self._default_analysis()

        result = {}
        for key in DIMENSION_KEYS:
            value = data.get(key, 5)
            result[key] = max(0, min(10, int(value)))

        patterns = data.get("detected_patterns", [])
        result["detected_patterns"] = [
            p for p in patterns if p in VALID_PATTERNS
        ]

        stage = data.get("socratic_stage", 1)
        result["socratic_stage"] = max(1, min(5, int(stage)))

        engagement = data.get("engagement_level", "active")
        if engagement not in VALID_ENGAGEMENT_LEVELS:
            engagement = "active"
        result["engagement_level"] = engagement

        return result

    def _default_analysis(self) -> dict:
        return {
            "problem_understanding": 5,
            "premise_check": 5,
            "logical_structure": 5,
            "evidence_provision": 5,
            "critical_thinking": 5,
            "creative_thinking": 5,
            "detected_patterns": [],
            "socratic_stage": 1,
            "engagement_level": "active",
        }


thought_analyzer = ThoughtAnalyzer()
```

- [ ] **Step 2: Write Thought Analyzer tests**

Write to `thinkbridge/backend/tests/test_thought_analyzer.py`:
```python
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.thought_analyzer import ThoughtAnalyzer


@pytest.mark.asyncio
async def test_analyze_parses_valid_json():
    analyzer = ThoughtAnalyzer()
    mock_json = """{
        "problem_understanding": 8,
        "premise_check": 3,
        "logical_structure": 6,
        "evidence_provision": 5,
        "critical_thinking": 2,
        "creative_thinking": 7,
        "detected_patterns": ["logical_leap", "missing_premise"],
        "socratic_stage": 3,
        "engagement_level": "active",
        "evidence": {}
    }"""

    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=mock_json)]

    with patch.object(
        analyzer.client.messages, "create", new_callable=AsyncMock
    ) as mock_create:
        mock_create.return_value = mock_response

        result = await analyzer.analyze(
            student_message="x^2 = 4이니까 x = 2",
            conversation_history=[],
            subject="수학",
            topic="이차방정식",
        )

        assert result["problem_understanding"] == 8
        assert result["premise_check"] == 3
        assert "logical_leap" in result["detected_patterns"]
        assert result["socratic_stage"] == 3
        assert result["engagement_level"] == "active"


def test_parse_analysis_clamps_scores():
    analyzer = ThoughtAnalyzer()
    raw = """{
        "problem_understanding": 15,
        "premise_check": -3,
        "logical_structure": 6,
        "evidence_provision": 5,
        "critical_thinking": 5,
        "creative_thinking": 5,
        "detected_patterns": ["invalid_pattern", "correct_reasoning"],
        "socratic_stage": 8,
        "engagement_level": "active"
    }"""
    result = analyzer._parse_analysis(raw)
    assert result["problem_understanding"] == 10
    assert result["premise_check"] == 0
    assert result["socratic_stage"] == 5
    assert result["detected_patterns"] == ["correct_reasoning"]


def test_parse_analysis_handles_invalid_json():
    analyzer = ThoughtAnalyzer()
    result = analyzer._parse_analysis("this is not json")
    assert result["problem_understanding"] == 5
    assert result["engagement_level"] == "active"


def test_parse_analysis_handles_markdown_wrapped_json():
    analyzer = ThoughtAnalyzer()
    raw = """```json
{
    "problem_understanding": 7,
    "premise_check": 6,
    "logical_structure": 8,
    "evidence_provision": 5,
    "critical_thinking": 4,
    "creative_thinking": 3,
    "detected_patterns": ["correct_reasoning"],
    "socratic_stage": 2,
    "engagement_level": "passive"
}
```"""
    result = analyzer._parse_analysis(raw)
    assert result["problem_understanding"] == 7
    assert result["engagement_level"] == "passive"
```

- [ ] **Step 3: Run tests**

```bash
cd backend && python -m pytest tests/test_thought_analyzer.py -v
```
Expected: 4 tests PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/thought_analyzer.py backend/tests/test_thought_analyzer.py
git commit -m "feat: add Thought Analyzer service with 6-dimension scoring and pattern detection"
```

---

## Task 8: Session & Message API Router

**Files:**
- Create: `thinkbridge/backend/app/routers/sessions.py`
- Modify: `thinkbridge/backend/app/main.py`
- Create: `thinkbridge/backend/tests/test_sessions.py`

- [ ] **Step 1: Write sessions router**

Write to `thinkbridge/backend/app/routers/sessions.py`:
```python
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User
from app.models.session import TutoringSession, SessionStatus
from app.models.message import Message, MessageRole
from app.models.thought_analysis import ThoughtAnalysis
from app.schemas.session import SessionCreate, SessionResponse, SessionDetail
from app.schemas.message import (
    MessageCreate,
    MessageResponse,
    MessageWithAnalysis,
    ThoughtAnalysisResponse,
    SocraticResponse,
)
from app.core.security import get_current_user
from app.services.socratic_engine import socratic_engine
from app.services.thought_analyzer import thought_analyzer

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse)
async def create_session(
    body: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = TutoringSession(
        user_id=current_user.id,
        subject=body.subject,
        topic=body.topic,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return SessionResponse.model_validate(session)


@router.get("", response_model=list[SessionResponse])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TutoringSession)
        .where(TutoringSession.user_id == current_user.id)
        .order_by(TutoringSession.started_at.desc())
    )
    return [SessionResponse.model_validate(s) for s in result.scalars().all()]


@router.get("/{session_id}", response_model=SessionDetail)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TutoringSession)
        .where(TutoringSession.id == session_id)
        .options(selectinload(TutoringSession.messages).selectinload(Message.analysis))
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    messages_data = []
    for msg in session.messages:
        msg_data = MessageWithAnalysis.model_validate(msg)
        if msg.analysis is not None:
            msg_data.analysis = ThoughtAnalysisResponse.model_validate(msg.analysis)
        messages_data.append(msg_data)

    return SessionDetail(
        id=session.id,
        user_id=session.user_id,
        subject=session.subject,
        topic=session.topic,
        status=session.status,
        total_turns=session.total_turns,
        started_at=session.started_at,
        ended_at=session.ended_at,
        messages=messages_data,
    )


@router.post("/{session_id}/messages", response_model=SocraticResponse)
async def send_message(
    session_id: int,
    body: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TutoringSession)
        .where(TutoringSession.id == session_id)
        .options(selectinload(TutoringSession.messages))
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")
    if session.status == SessionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Session already completed")

    turn_number = session.total_turns + 1

    user_msg = Message(
        session_id=session.id,
        role=MessageRole.USER,
        content=body.content,
        turn_number=turn_number,
    )
    db.add(user_msg)
    await db.flush()

    conversation_history = [
        {"role": msg.role.value, "content": msg.content}
        for msg in session.messages
    ]
    conversation_history.append({"role": "user", "content": body.content})

    current_stage = 1
    if session.messages:
        last_analysis_result = await db.execute(
            select(ThoughtAnalysis)
            .join(Message)
            .where(Message.session_id == session.id)
            .order_by(ThoughtAnalysis.id.desc())
            .limit(1)
        )
        last_analysis = last_analysis_result.scalar_one_or_none()
        if last_analysis is not None:
            current_stage = last_analysis.socratic_stage

    analysis_data = await thought_analyzer.analyze(
        student_message=body.content,
        conversation_history=conversation_history,
        subject=session.subject,
        topic=session.topic,
    )

    analysis = ThoughtAnalysis(
        message_id=user_msg.id,
        problem_understanding=analysis_data["problem_understanding"],
        premise_check=analysis_data["premise_check"],
        logical_structure=analysis_data["logical_structure"],
        evidence_provision=analysis_data["evidence_provision"],
        critical_thinking=analysis_data["critical_thinking"],
        creative_thinking=analysis_data["creative_thinking"],
        detected_patterns=analysis_data["detected_patterns"],
        socratic_stage=analysis_data["socratic_stage"],
        engagement_level=analysis_data["engagement_level"],
    )
    db.add(analysis)

    ai_response_text = await socratic_engine.generate_response(
        subject=session.subject,
        topic=session.topic,
        conversation_history=conversation_history,
        current_stage=analysis_data["socratic_stage"],
    )

    ai_msg = Message(
        session_id=session.id,
        role=MessageRole.ASSISTANT,
        content=ai_response_text,
        turn_number=turn_number,
    )
    db.add(ai_msg)

    session.total_turns = turn_number
    await db.commit()
    await db.refresh(user_msg)
    await db.refresh(ai_msg)
    await db.refresh(analysis)

    user_msg_response = MessageWithAnalysis(
        id=user_msg.id,
        session_id=user_msg.session_id,
        role=user_msg.role,
        content=user_msg.content,
        turn_number=user_msg.turn_number,
        created_at=user_msg.created_at,
        analysis=ThoughtAnalysisResponse.model_validate(analysis),
    )

    ai_msg_response = MessageResponse(
        id=ai_msg.id,
        session_id=ai_msg.session_id,
        role=ai_msg.role,
        content=ai_msg.content,
        turn_number=ai_msg.turn_number,
        created_at=ai_msg.created_at,
    )

    return SocraticResponse(user_message=user_msg_response, ai_message=ai_msg_response)


@router.patch("/{session_id}/end", response_model=SessionResponse)
async def end_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TutoringSession).where(TutoringSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")

    session.status = SessionStatus.COMPLETED
    session.ended_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)
    return SessionResponse.model_validate(session)
```

- [ ] **Step 2: Mount sessions router in main.py**

Add to `thinkbridge/backend/app/main.py`:
```python
from app.routers import auth, sessions

app.include_router(auth.router)
app.include_router(sessions.router)
```

- [ ] **Step 3: Write session tests**

Write to `thinkbridge/backend/tests/test_sessions.py`:
```python
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_session(client: AsyncClient, student_token: str):
    response = await client.post(
        "/api/sessions",
        json={"subject": "수학", "topic": "이차방정식"},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["subject"] == "수학"
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_list_sessions(client: AsyncClient, student_token: str):
    headers = {"Authorization": f"Bearer {student_token}"}
    await client.post(
        "/api/sessions",
        json={"subject": "수학", "topic": "이차방정식"},
        headers=headers,
    )
    response = await client.get("/api/sessions", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) >= 1


@pytest.mark.asyncio
async def test_end_session(client: AsyncClient, student_token: str):
    headers = {"Authorization": f"Bearer {student_token}"}
    create_resp = await client.post(
        "/api/sessions",
        json={"subject": "수학", "topic": "이차방정식"},
        headers=headers,
    )
    session_id = create_resp.json()["id"]
    response = await client.patch(
        f"/api/sessions/{session_id}/end", headers=headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "completed"
```

- [ ] **Step 4: Run tests**

```bash
cd backend && python -m pytest tests/test_sessions.py -v
```
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/sessions.py backend/app/main.py backend/tests/test_sessions.py
git commit -m "feat: add session CRUD and Socratic message flow API"
```

---

## Task 9: Report Generator Service & API

**Files:**
- Create: `thinkbridge/backend/app/services/report_generator.py`
- Create: `thinkbridge/backend/app/routers/reports.py`
- Modify: `thinkbridge/backend/app/main.py`

- [ ] **Step 1: Write Report Generator**

Write to `thinkbridge/backend/app/services/report_generator.py`:
```python
import anthropic
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.core.prompts import REPORT_SYSTEM_PROMPT
from app.models.session import TutoringSession
from app.models.message import Message, MessageRole
from app.models.thought_analysis import ThoughtAnalysis
from app.models.report import Report, ReportType

DIMENSION_KEYS = [
    "problem_understanding",
    "premise_check",
    "logical_structure",
    "evidence_provision",
    "critical_thinking",
    "creative_thinking",
]


class ReportGenerator:
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def generate_session_report(
        self, session_id: int, db: AsyncSession
    ) -> Report:
        result = await db.execute(
            select(TutoringSession)
            .where(TutoringSession.id == session_id)
            .options(
                selectinload(TutoringSession.messages).selectinload(Message.analysis)
            )
        )
        session = result.scalar_one_or_none()
        if session is None:
            raise ValueError(f"Session {session_id} not found")

        analyses = [
            msg.analysis
            for msg in session.messages
            if msg.role == MessageRole.USER and msg.analysis is not None
        ]

        if not analyses:
            dimension_averages = {k: 0 for k in DIMENSION_KEYS}
        else:
            dimension_averages = {}
            for key in DIMENSION_KEYS:
                values = [getattr(a, key) for a in analyses]
                dimension_averages[key] = round(sum(values) / len(values), 1)

        all_patterns = []
        for a in analyses:
            all_patterns.extend(a.detected_patterns or [])

        pattern_counts = {}
        for p in all_patterns:
            pattern_counts[p] = pattern_counts.get(p, 0) + 1

        messages_summary = ""
        for msg in session.messages[:20]:
            role_label = "학생" if msg.role == MessageRole.USER else "튜터"
            messages_summary += f"{role_label}: {msg.content[:100]}\n"

        prompt = REPORT_SYSTEM_PROMPT.format(
            subject=session.subject,
            topic=session.topic,
            total_turns=session.total_turns,
            dimension_averages=dimension_averages,
            detected_patterns=pattern_counts,
            messages_summary=messages_summary,
        )

        response = await self.client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=2048,
            system="You are an educational report writer. Write in Korean.",
            messages=[{"role": "user", "content": prompt}],
        )

        summary = response.content[0].text

        report = Report(
            type=ReportType.SESSION,
            target_id=session_id,
            summary=summary,
            dimension_scores=dimension_averages,
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)
        return report

    async def get_student_aggregate(
        self, student_id: int, db: AsyncSession
    ) -> dict:
        result = await db.execute(
            select(ThoughtAnalysis)
            .join(Message)
            .join(TutoringSession)
            .where(TutoringSession.user_id == student_id)
            .where(Message.role == MessageRole.USER)
        )
        analyses = result.scalars().all()

        if not analyses:
            return {"dimension_averages": {k: 0 for k in DIMENSION_KEYS}, "session_count": 0}

        dimension_averages = {}
        for key in DIMENSION_KEYS:
            values = [getattr(a, key) for a in analyses]
            dimension_averages[key] = round(sum(values) / len(values), 1)

        session_result = await db.execute(
            select(func.count(TutoringSession.id)).where(
                TutoringSession.user_id == student_id
            )
        )
        session_count = session_result.scalar()

        return {
            "dimension_averages": dimension_averages,
            "session_count": session_count,
        }


report_generator = ReportGenerator()
```

- [ ] **Step 2: Write reports router**

Write to `thinkbridge/backend/app/routers/reports.py`:
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.report import Report, ReportType
from app.schemas.report import ReportResponse
from app.core.security import get_current_user
from app.services.report_generator import report_generator

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/session/{session_id}", response_model=ReportResponse)
async def generate_session_report(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = await report_generator.generate_session_report(session_id, db)
    return ReportResponse.model_validate(report)


@router.get("/session/{session_id}", response_model=ReportResponse | None)
async def get_session_report(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Report).where(
            Report.type == ReportType.SESSION, Report.target_id == session_id
        )
    )
    report = result.scalar_one_or_none()
    if report is None:
        return None
    return ReportResponse.model_validate(report)


@router.get("/student/{student_id}/aggregate")
async def get_student_aggregate(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await report_generator.get_student_aggregate(student_id, db)
```

- [ ] **Step 3: Mount reports router**

Add to `thinkbridge/backend/app/main.py`:
```python
from app.routers import auth, sessions, reports

app.include_router(reports.router)
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/report_generator.py backend/app/routers/reports.py backend/app/main.py
git commit -m "feat: add Report Generator service and reports API endpoints"
```

---

## Task 10: Dashboard API Router

**Files:**
- Create: `thinkbridge/backend/app/routers/dashboard.py`
- Modify: `thinkbridge/backend/app/main.py`

- [ ] **Step 1: Write dashboard router**

Write to `thinkbridge/backend/app/routers/dashboard.py`:
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserRole
from app.models.class_room import ClassRoom
from app.models.enrollment import Enrollment
from app.models.session import TutoringSession
from app.models.message import Message, MessageRole
from app.models.thought_analysis import ThoughtAnalysis
from app.schemas.report import HeatmapEntry, HeatmapResponse, StudentSummary
from app.core.security import get_current_user
from app.services.report_generator import DIMENSION_KEYS

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/classes")
async def list_my_classes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.ADMIN:
        result = await db.execute(select(ClassRoom))
    else:
        result = await db.execute(
            select(ClassRoom).where(ClassRoom.instructor_id == current_user.id)
        )
    classes = result.scalars().all()
    return [
        {"id": c.id, "name": c.name, "subject": c.subject} for c in classes
    ]


@router.get("/classes/{class_id}/students", response_model=list[StudentSummary])
async def list_class_students(
    class_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enrollment_result = await db.execute(
        select(Enrollment)
        .where(Enrollment.class_id == class_id, Enrollment.role == "student")
        .options(selectinload(Enrollment.user))
    )
    enrollments = enrollment_result.scalars().all()

    summaries = []
    for enrollment in enrollments:
        student = enrollment.user

        session_count_result = await db.execute(
            select(func.count(TutoringSession.id)).where(
                TutoringSession.user_id == student.id
            )
        )
        session_count = session_count_result.scalar() or 0

        analysis_result = await db.execute(
            select(ThoughtAnalysis)
            .join(Message)
            .join(TutoringSession)
            .where(TutoringSession.user_id == student.id)
            .where(Message.role == MessageRole.USER)
        )
        analyses = analysis_result.scalars().all()

        avg_scores = None
        if analyses:
            avg_scores = {}
            for key in DIMENSION_KEYS:
                values = [getattr(a, key) for a in analyses]
                avg_scores[key] = round(sum(values) / len(values), 1)

        summaries.append(
            StudentSummary(
                id=student.id,
                name=student.name,
                email=student.email,
                session_count=session_count,
                latest_scores=avg_scores,
                avg_scores=avg_scores,
            )
        )

    return summaries


@router.get("/classes/{class_id}/heatmap", response_model=HeatmapResponse)
async def get_class_heatmap(
    class_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    class_result = await db.execute(
        select(ClassRoom).where(ClassRoom.id == class_id)
    )
    classroom = class_result.scalar_one_or_none()
    if classroom is None:
        raise HTTPException(status_code=404, detail="Class not found")

    students = await list_class_students(class_id, db, current_user)

    entries = []
    for student in students:
        scores = student.avg_scores or {k: 0 for k in DIMENSION_KEYS}
        entries.append(
            HeatmapEntry(
                student_id=student.id,
                student_name=student.name,
                problem_understanding=scores.get("problem_understanding", 0),
                premise_check=scores.get("premise_check", 0),
                logical_structure=scores.get("logical_structure", 0),
                evidence_provision=scores.get("evidence_provision", 0),
                critical_thinking=scores.get("critical_thinking", 0),
                creative_thinking=scores.get("creative_thinking", 0),
                session_count=student.session_count,
            )
        )

    return HeatmapResponse(
        class_id=class_id,
        class_name=classroom.name,
        entries=entries,
    )


@router.get("/students/{student_id}/sessions")
async def get_student_sessions(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TutoringSession)
        .where(TutoringSession.user_id == student_id)
        .order_by(TutoringSession.started_at.desc())
    )
    sessions = result.scalars().all()
    return [
        {
            "id": s.id,
            "subject": s.subject,
            "topic": s.topic,
            "status": s.status.value,
            "total_turns": s.total_turns,
            "started_at": s.started_at.isoformat(),
        }
        for s in sessions
    ]
```

- [ ] **Step 2: Mount dashboard router**

Add to `thinkbridge/backend/app/main.py`:
```python
from app.routers import auth, sessions, reports, dashboard

app.include_router(dashboard.router)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/dashboard.py backend/app/main.py
git commit -m "feat: add instructor dashboard API (class students, heatmap, student sessions)"
```

---

## Task 11: Frontend Scaffolding

**Files:**
- Create: `thinkbridge/frontend/` (Next.js project)
- Create: `thinkbridge/frontend/src/types/index.ts`
- Create: `thinkbridge/frontend/src/lib/api.ts`
- Create: `thinkbridge/frontend/src/lib/auth.ts`
- Create: `thinkbridge/frontend/src/lib/constants.ts`

- [ ] **Step 1: Create Next.js project**

```bash
cd thinkbridge
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

- [ ] **Step 2: Install dependencies**

```bash
cd thinkbridge/frontend
npm install recharts @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react
npm install -D @types/node
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
cd thinkbridge/frontend
npx shadcn@latest init -d
npx shadcn@latest add button card input label badge tabs scroll-area avatar dropdown-menu separator sheet textarea select
```

- [ ] **Step 4: Write TypeScript types**

Write to `thinkbridge/frontend/src/types/index.ts`:
```typescript
export type UserRole = "student" | "instructor" | "admin";

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Session {
  id: number;
  user_id: number;
  subject: string;
  topic: string;
  status: "active" | "completed";
  total_turns: number;
  started_at: string;
  ended_at: string | null;
}

export interface ThoughtAnalysis {
  problem_understanding: number;
  premise_check: number;
  logical_structure: number;
  evidence_provision: number;
  critical_thinking: number;
  creative_thinking: number;
  detected_patterns: string[];
  socratic_stage: number;
  engagement_level: "active" | "passive" | "stuck";
}

export interface Message {
  id: number;
  session_id: number;
  role: "user" | "assistant";
  content: string;
  turn_number: number;
  created_at: string;
  analysis?: ThoughtAnalysis | null;
}

export interface SocraticResponse {
  user_message: Message;
  ai_message: Message;
}

export interface SessionDetail extends Session {
  messages: Message[];
}

export interface Report {
  id: number;
  type: "session" | "student" | "class";
  target_id: number;
  summary: string;
  dimension_scores: Record<string, number>;
  generated_at: string;
}

export interface HeatmapEntry {
  student_id: number;
  student_name: string;
  problem_understanding: number;
  premise_check: number;
  logical_structure: number;
  evidence_provision: number;
  critical_thinking: number;
  creative_thinking: number;
  session_count: number;
}

export interface HeatmapData {
  class_id: number;
  class_name: string;
  entries: HeatmapEntry[];
}

export interface StudentSummary {
  id: number;
  name: string;
  email: string;
  session_count: number;
  latest_scores: Record<string, number> | null;
  avg_scores: Record<string, number> | null;
}

export interface ClassInfo {
  id: number;
  name: string;
  subject: string;
}
```

- [ ] **Step 5: Write API client**

Write to `thinkbridge/frontend/src/lib/api.ts`:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  auth: {
    register: (data: { email: string; name: string; password: string; role: string }) =>
      request("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
    me: () => request("/api/auth/me"),
  },
  sessions: {
    create: (data: { subject: string; topic: string }) =>
      request("/api/sessions", { method: "POST", body: JSON.stringify(data) }),
    list: () => request("/api/sessions"),
    get: (id: number) => request(`/api/sessions/${id}`),
    sendMessage: (sessionId: number, content: string) =>
      request(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    end: (id: number) =>
      request(`/api/sessions/${id}/end`, { method: "PATCH" }),
  },
  reports: {
    generateSession: (sessionId: number) =>
      request(`/api/reports/session/${sessionId}`, { method: "POST" }),
    getSession: (sessionId: number) =>
      request(`/api/reports/session/${sessionId}`),
    getStudentAggregate: (studentId: number) =>
      request(`/api/reports/student/${studentId}/aggregate`),
  },
  dashboard: {
    classes: () => request("/api/dashboard/classes"),
    classStudents: (classId: number) =>
      request(`/api/dashboard/classes/${classId}/students`),
    classHeatmap: (classId: number) =>
      request(`/api/dashboard/classes/${classId}/heatmap`),
    studentSessions: (studentId: number) =>
      request(`/api/dashboard/students/${studentId}/sessions`),
  },
};
```

- [ ] **Step 6: Write auth context**

Write to `thinkbridge/frontend/src/lib/auth.ts`:
```typescript
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { User, TokenResponse } from "@/types";
import { api } from "@/lib/api";

import React from "react";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    name: string,
    password: string,
    role: string
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.auth
        .me()
        .then((userData) => setUser(userData as User))
        .catch(() => localStorage.removeItem("token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const data = (await api.auth.login({ email, password })) as TokenResponse;
    localStorage.setItem("token", data.access_token);
    setUser(data.user);
    if (data.user.role === "instructor" || data.user.role === "admin") {
      router.push("/instructor/dashboard");
    } else {
      router.push("/student/chat");
    }
  };

  const register = async (
    email: string,
    name: string,
    password: string,
    role: string
  ) => {
    const data = (await api.auth.register({
      email,
      name,
      password,
      role,
    })) as TokenResponse;
    localStorage.setItem("token", data.access_token);
    setUser(data.user);
    if (data.user.role === "instructor" || data.user.role === "admin") {
      router.push("/instructor/dashboard");
    } else {
      router.push("/student/chat");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    router.push("/login");
  };

  return React.createElement(
    AuthContext.Provider,
    { value: { user, loading, login, register, logout } },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
```

- [ ] **Step 7: Write constants**

Write to `thinkbridge/frontend/src/lib/constants.ts`:
```typescript
export const DIMENSION_LABELS: Record<string, string> = {
  problem_understanding: "문제 이해",
  premise_check: "전제 확인",
  logical_structure: "논리 구조화",
  evidence_provision: "근거 제시",
  critical_thinking: "비판적 사고",
  creative_thinking: "창의적 사고",
};

export const DIMENSION_KEYS = [
  "problem_understanding",
  "premise_check",
  "logical_structure",
  "evidence_provision",
  "critical_thinking",
  "creative_thinking",
] as const;

export const DIMENSION_COLORS: Record<string, string> = {
  problem_understanding: "#6366f1",
  premise_check: "#8b5cf6",
  logical_structure: "#a855f7",
  evidence_provision: "#d946ef",
  critical_thinking: "#ec4899",
  creative_thinking: "#f43f5e",
};

export const PATTERN_LABELS: Record<string, string> = {
  logical_leap: "논리적 비약",
  missing_premise: "전제 누락",
  circular_reasoning: "순환 논증",
  correct_reasoning: "올바른 추론",
  self_correction: "자기 수정",
  creative_approach: "창의적 접근",
  surface_level: "피상적 접근",
};

export const SUBJECT_OPTIONS = [
  { value: "수학", label: "수학" },
  { value: "과학", label: "과학" },
  { value: "논술", label: "논술" },
];

export const ENGAGEMENT_LABELS: Record<string, string> = {
  active: "적극적",
  passive: "소극적",
  stuck: "막힘",
};
```

- [ ] **Step 8: Write .env.local.example and commit**

Write to `thinkbridge/frontend/.env.local.example`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
git add frontend/
git commit -m "feat: scaffold Next.js frontend with types, API client, auth context, constants"
```

---

## Task 12: Frontend Auth Pages & Layout

**Files:**
- Modify: `thinkbridge/frontend/src/app/layout.tsx`
- Create: `thinkbridge/frontend/src/app/page.tsx`
- Create: `thinkbridge/frontend/src/app/login/page.tsx`
- Create: `thinkbridge/frontend/src/app/register/page.tsx`
- Create: `thinkbridge/frontend/src/components/layout/Navbar.tsx`
- Create: `thinkbridge/frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Write root layout with AuthProvider**

Write to `thinkbridge/frontend/src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ThinkBridge - AI 소크라테스 튜터",
  description: "AI가 답을 주는 시대, 생각하는 법을 가르치는 AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Write landing page**

Write to `thinkbridge/frontend/src/app/page.tsx`:
```tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <nav className="flex items-center justify-between px-8 py-4">
        <h1 className="text-2xl font-bold text-indigo-600">ThinkBridge</h1>
        <div className="flex gap-3">
          <Link href="/login">
            <Button variant="ghost">로그인</Button>
          </Link>
          <Link href="/register">
            <Button>시작하기</Button>
          </Link>
        </div>
      </nav>

      <main className="flex flex-col items-center justify-center px-4 pt-32">
        <div className="max-w-3xl text-center">
          <h2 className="text-5xl font-bold tracking-tight text-gray-900">
            AI가 답을 주는 시대,
            <br />
            <span className="text-indigo-600">생각하는 법</span>을 가르치는 AI
          </h2>
          <p className="mt-6 text-xl text-gray-600">
            ThinkBridge는 소크라테스식 질문법으로 학생의 사고를 유도하고,
            <br />
            6차원 사고력 분석으로 성장을 추적합니다.
          </p>
          <div className="mt-10 flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8">
                무료로 시작하기
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl px-4">
          <FeatureCard
            title="소크라테스 AI 튜터"
            description="답을 주지 않고 질문으로 사고를 유도합니다. 스스로 답에 도달하는 경험을 제공합니다."
          />
          <FeatureCard
            title="6차원 사고력 분석"
            description="문제 이해, 전제 확인, 논리 구조화, 근거 제시, 비판적 사고, 창의적 사고를 실시간 분석합니다."
          />
          <FeatureCard
            title="교강사 대시보드"
            description="학생별 사고력 히트맵과 세션 리플레이로 맞춤형 교육이 가능합니다."
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-gray-600">{description}</p>
    </div>
  );
}
```

- [ ] **Step 3: Write login page**

Write to `thinkbridge/frontend/src/app/login/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            <span className="text-indigo-600">ThinkBridge</span> 로그인
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            계정이 없으신가요?{" "}
            <Link href="/register" className="text-indigo-600 hover:underline">
              회원가입
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Write register page**

Write to `thinkbridge/frontend/src/app/register/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, name, password, role);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            <span className="text-indigo-600">ThinkBridge</span> 회원가입
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div>
              <Label>역할</Label>
              <div className="flex gap-3 mt-2">
                {[
                  { value: "student", label: "학생" },
                  { value: "instructor", label: "교강사" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRole(option.value)}
                    className={`flex-1 rounded-lg border-2 py-3 text-center transition-colors ${
                      role === option.value
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "가입 중..." : "회원가입"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-indigo-600 hover:underline">
              로그인
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Write Navbar**

Write to `thinkbridge/frontend/src/components/layout/Navbar.tsx`:
```tsx
"use client";

import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-6">
      <h1 className="text-lg font-bold text-indigo-600">ThinkBridge</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {user?.name} ({user?.role === "student" ? "학생" : "교강사"})
        </span>
        <Button variant="ghost" size="sm" onClick={logout}>
          로그아웃
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 6: Write Sidebar**

Write to `thinkbridge/frontend/src/components/layout/Sidebar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface NavItem {
  href: string;
  label: string;
}

const STUDENT_NAV: NavItem[] = [
  { href: "/student/chat", label: "AI 튜터링" },
  { href: "/student/sessions", label: "세션 기록" },
];

const INSTRUCTOR_NAV: NavItem[] = [
  { href: "/instructor/dashboard", label: "대시보드" },
];

export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  const navItems =
    user?.role === "student" ? STUDENT_NAV : INSTRUCTOR_NAV;

  return (
    <aside className="w-56 border-r bg-gray-50 p-4">
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith(item.href)
                ? "bg-indigo-100 text-indigo-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 7: Write student layout**

Write to `thinkbridge/frontend/src/app/student/layout.tsx`:
```tsx
"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
```

Write to `thinkbridge/frontend/src/app/instructor/layout.tsx`:
```tsx
"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/ frontend/src/components/layout/
git commit -m "feat: add auth pages (login/register), landing page, Navbar, Sidebar, role-based layouts"
```

---

## Task 13: Student Chat Interface

**Files:**
- Create: `thinkbridge/frontend/src/app/student/chat/page.tsx`
- Create: `thinkbridge/frontend/src/components/chat/ChatInterface.tsx`
- Create: `thinkbridge/frontend/src/components/chat/MessageBubble.tsx`
- Create: `thinkbridge/frontend/src/components/chat/ThoughtPanel.tsx`

- [ ] **Step 1: Write MessageBubble component**

Write to `thinkbridge/frontend/src/components/chat/MessageBubble.tsx`:
```tsx
import { Message } from "@/types";
import { Badge } from "@/components/ui/badge";
import { PATTERN_LABELS } from "@/lib/constants";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-indigo-600 text-white"
            : "bg-gray-100 text-gray-900"
        }`}
      >
        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        {isUser && message.analysis && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.analysis.detected_patterns.map((pattern) => (
              <Badge
                key={pattern}
                variant="secondary"
                className="bg-indigo-500 text-white text-xs"
              >
                {PATTERN_LABELS[pattern] || pattern}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write ThoughtPanel component**

Write to `thinkbridge/frontend/src/components/chat/ThoughtPanel.tsx`:
```tsx
import { ThoughtAnalysis } from "@/types";
import { DIMENSION_LABELS, DIMENSION_KEYS, ENGAGEMENT_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

interface ThoughtPanelProps {
  analysis: ThoughtAnalysis | null;
  turnNumber: number;
}

export function ThoughtPanel({ analysis, turnNumber }: ThoughtPanelProps) {
  if (!analysis) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 text-sm">
        대화를 시작하면 사고 분석이 표시됩니다
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Turn {turnNumber} 분석
        </h3>
        <Badge
          variant={
            analysis.engagement_level === "active"
              ? "default"
              : analysis.engagement_level === "stuck"
              ? "destructive"
              : "secondary"
          }
        >
          {ENGAGEMENT_LABELS[analysis.engagement_level]}
        </Badge>
      </div>

      <div className="space-y-2">
        {DIMENSION_KEYS.map((key) => {
          const score = analysis[key] as number;
          return (
            <div key={key}>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>{DIMENSION_LABELS[key]}</span>
                <span>{score}/10</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${score * 10}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1">소크라테스 단계</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((stage) => (
            <div
              key={stage}
              className={`h-2 flex-1 rounded-full ${
                stage <= analysis.socratic_stage
                  ? "bg-indigo-500"
                  : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>명확화</span>
          <span>탐색</span>
          <span>유도</span>
          <span>검증</span>
          <span>확장</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write ChatInterface component**

Write to `thinkbridge/frontend/src/components/chat/ChatInterface.tsx`:
```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Message, SocraticResponse, ThoughtAnalysis } from "@/types";
import { api } from "@/lib/api";
import { MessageBubble } from "./MessageBubble";
import { ThoughtPanel } from "./ThoughtPanel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatInterfaceProps {
  sessionId: number;
  subject: string;
  topic: string;
  initialMessages?: Message[];
  onSessionEnd?: () => void;
}

export function ChatInterface({
  sessionId,
  subject,
  topic,
  initialMessages = [],
  onSessionEnd,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<ThoughtAnalysis | null>(
    null
  );
  const [latestTurn, setLatestTurn] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userContent = input.trim();
    setInput("");
    setLoading(true);

    try {
      const response = (await api.sessions.sendMessage(
        sessionId,
        userContent
      )) as SocraticResponse;

      setMessages((prev) => [
        ...prev,
        response.user_message,
        response.ai_message,
      ]);

      if (response.user_message.analysis) {
        setLatestAnalysis(response.user_message.analysis);
        setLatestTurn(response.user_message.turn_number);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndSession = async () => {
    await api.sessions.end(sessionId);
    onSessionEnd?.();
  };

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="font-semibold text-gray-900">{topic}</h2>
            <p className="text-xs text-gray-500">{subject}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleEndSession}>
            세션 종료
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-900">
                안녕하세요! {topic}에 대해 함께 생각해볼까요? 어떤 부분이 궁금하거나 어려운지 말해주세요.
              </div>
            </div>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-400">
                  생각하는 중...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="생각을 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
              className="min-h-[60px] resize-none"
              disabled={loading}
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="self-end"
            >
              전송
            </Button>
          </div>
        </div>
      </div>

      <div className="w-72 border-l bg-gray-50">
        <div className="border-b p-4">
          <h3 className="text-sm font-semibold text-gray-700">
            실시간 사고 분석
          </h3>
        </div>
        <ThoughtPanel analysis={latestAnalysis} turnNumber={latestTurn} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write chat page**

Write to `thinkbridge/frontend/src/app/student/chat/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Session } from "@/types";
import { api } from "@/lib/api";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUBJECT_OPTIONS } from "@/lib/constants";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [subject, setSubject] = useState("수학");
  const [topic, setTopic] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!topic.trim()) return;
    setCreating(true);
    try {
      const newSession = (await api.sessions.create({
        subject,
        topic: topic.trim(),
      })) as Session;
      setSession(newSession);
    } catch (err) {
      console.error("Failed to create session:", err);
    } finally {
      setCreating(false);
    }
  };

  if (session) {
    return (
      <div className="h-full">
        <ChatInterface
          sessionId={session.id}
          subject={session.subject}
          topic={session.topic}
          onSessionEnd={() => router.push(`/student/report/${session.id}`)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>새 튜터링 세션</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>과목</Label>
            <div className="flex gap-2 mt-2">
              {SUBJECT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSubject(opt.value)}
                  className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                    subject === opt.value
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="topic">질문 / 주제</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 이차방정식의 근의 공식을 유도하고 싶어요"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={!topic.trim() || creating}
            className="w-full"
          >
            {creating ? "생성 중..." : "대화 시작하기"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/chat/ frontend/src/app/student/chat/
git commit -m "feat: add student Socratic chat interface with real-time thought analysis panel"
```

---

## Task 14: Student Sessions & Report Pages

**Files:**
- Create: `thinkbridge/frontend/src/app/student/sessions/page.tsx`
- Create: `thinkbridge/frontend/src/app/student/report/[id]/page.tsx`
- Create: `thinkbridge/frontend/src/components/charts/RadarChart.tsx`
- Create: `thinkbridge/frontend/src/components/charts/ThoughtTimeline.tsx`

- [ ] **Step 1: Write RadarChart component**

Write to `thinkbridge/frontend/src/components/charts/RadarChart.tsx`:
```tsx
"use client";

import {
  Radar,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DIMENSION_LABELS, DIMENSION_KEYS } from "@/lib/constants";

interface RadarChartProps {
  scores: Record<string, number>;
  compareScores?: Record<string, number> | null;
  label?: string;
  compareLabel?: string;
}

export function RadarChart({
  scores,
  compareScores,
  label = "이번 세션",
  compareLabel = "평균",
}: RadarChartProps) {
  const data = DIMENSION_KEYS.map((key) => ({
    dimension: DIMENSION_LABELS[key],
    current: scores[key] || 0,
    compare: compareScores ? compareScores[key] || 0 : undefined,
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <RechartsRadar cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10 }} />
        <Radar
          name={label}
          dataKey="current"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.3}
        />
        {compareScores && (
          <Radar
            name={compareLabel}
            dataKey="compare"
            stroke="#d946ef"
            fill="#d946ef"
            fillOpacity={0.15}
          />
        )}
        <Legend />
      </RechartsRadar>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Write ThoughtTimeline component**

Write to `thinkbridge/frontend/src/components/charts/ThoughtTimeline.tsx`:
```tsx
import { Message } from "@/types";
import { DIMENSION_LABELS, DIMENSION_KEYS, PATTERN_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

interface ThoughtTimelineProps {
  messages: Message[];
}

export function ThoughtTimeline({ messages }: ThoughtTimelineProps) {
  const userMessages = messages.filter(
    (m) => m.role === "user" && m.analysis
  );

  if (userMessages.length === 0) {
    return <p className="text-gray-400 text-sm">분석 데이터가 없습니다</p>;
  }

  return (
    <div className="space-y-4">
      {userMessages.map((msg) => {
        const analysis = msg.analysis!;
        const topDimension = DIMENSION_KEYS.reduce((best, key) =>
          (analysis[key] as number) > (analysis[best] as number) ? key : best
        );
        const weakDimension = DIMENSION_KEYS.reduce((worst, key) =>
          (analysis[key] as number) < (analysis[worst] as number) ? key : worst
        );

        return (
          <div key={msg.id} className="flex gap-4 border-l-2 border-indigo-200 pl-4">
            <div className="flex-shrink-0 -ml-[21px] mt-1 h-4 w-4 rounded-full bg-indigo-500" />
            <div className="flex-1">
              <p className="text-xs text-gray-400">Turn {msg.turn_number}</p>
              <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                {msg.content}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge variant="default" className="text-xs">
                  강점: {DIMENSION_LABELS[topDimension]}
                </Badge>
                <Badge variant="destructive" className="text-xs">
                  약점: {DIMENSION_LABELS[weakDimension]}
                </Badge>
                {analysis.detected_patterns.map((p) => (
                  <Badge key={p} variant="outline" className="text-xs">
                    {PATTERN_LABELS[p] || p}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Write sessions list page**

Write to `thinkbridge/frontend/src/app/student/sessions/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Session } from "@/types";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.sessions
      .list()
      .then((data) => setSessions(data as Session[]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">세션 기록</h2>
      {sessions.length === 0 ? (
        <p className="text-gray-500">아직 세션 기록이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Link key={session.id} href={`/student/report/${session.id}`}>
              <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium text-gray-900">{session.topic}</p>
                    <p className="text-sm text-gray-500">
                      {session.subject} | {session.total_turns}턴 |{" "}
                      {new Date(session.started_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <Badge
                    variant={
                      session.status === "active" ? "default" : "secondary"
                    }
                  >
                    {session.status === "active" ? "진행중" : "완료"}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write session report page**

Write to `thinkbridge/frontend/src/app/student/report/[id]/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SessionDetail, Report } from "@/types";
import { api } from "@/lib/api";
import { RadarChart } from "@/components/charts/RadarChart";
import { ThoughtTimeline } from "@/components/charts/ThoughtTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DIMENSION_KEYS } from "@/lib/constants";

export default function ReportPage() {
  const params = useParams();
  const sessionId = Number(params.id);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.sessions.get(sessionId).then((data) => setSession(data as SessionDetail));
    api.reports.getSession(sessionId).then((data) => {
      if (data) setReport(data as Report);
    });
  }, [sessionId]);

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const newReport = (await api.reports.generateSession(sessionId)) as Report;
      setReport(newReport);
    } finally {
      setGenerating(false);
    }
  };

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  const userMessages = session.messages.filter(
    (m) => m.role === "user" && m.analysis
  );
  const avgScores: Record<string, number> = {};
  if (userMessages.length > 0) {
    for (const key of DIMENSION_KEYS) {
      const values = userMessages.map((m) => (m.analysis as Record<string, number>)[key] || 0);
      avgScores[key] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{session.topic}</h2>
        <p className="text-sm text-gray-500">
          {session.subject} | {session.total_turns}턴 |{" "}
          {new Date(session.started_at).toLocaleDateString("ko-KR")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">6차원 사고력 레이더</CardTitle>
          </CardHeader>
          <CardContent>
            {userMessages.length > 0 ? (
              <RadarChart scores={avgScores} />
            ) : (
              <p className="text-gray-400 text-sm">분석 데이터가 없습니다</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">사고 흐름 타임라인</CardTitle>
          </CardHeader>
          <CardContent>
            <ThoughtTimeline messages={session.messages} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">AI 진단 리포트</CardTitle>
          {!report && (
            <Button onClick={handleGenerateReport} disabled={generating}>
              {generating ? "생성 중..." : "리포트 생성"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {report ? (
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-gray-700">
                {report.summary}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">
              리포트를 생성하면 AI가 세션을 분석하여 상세 진단을 제공합니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/charts/ frontend/src/app/student/sessions/ frontend/src/app/student/report/
git commit -m "feat: add student session history, radar chart, thought timeline, and AI report page"
```

---

## Task 15: Instructor Dashboard

**Files:**
- Create: `thinkbridge/frontend/src/app/instructor/dashboard/page.tsx`
- Create: `thinkbridge/frontend/src/components/dashboard/StudentList.tsx`
- Create: `thinkbridge/frontend/src/components/dashboard/ClassSelector.tsx`
- Create: `thinkbridge/frontend/src/app/instructor/heatmap/[classId]/page.tsx`
- Create: `thinkbridge/frontend/src/components/charts/HeatmapChart.tsx`

- [ ] **Step 1: Write ClassSelector component**

Write to `thinkbridge/frontend/src/components/dashboard/ClassSelector.tsx`:
```tsx
"use client";

import { ClassInfo } from "@/types";

interface ClassSelectorProps {
  classes: ClassInfo[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function ClassSelector({
  classes,
  selectedId,
  onSelect,
}: ClassSelectorProps) {
  return (
    <div className="flex gap-2">
      {classes.map((cls) => (
        <button
          key={cls.id}
          onClick={() => onSelect(cls.id)}
          className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
            selectedId === cls.id
              ? "border-indigo-600 bg-indigo-50 text-indigo-700"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          {cls.name} ({cls.subject})
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write StudentList component**

Write to `thinkbridge/frontend/src/components/dashboard/StudentList.tsx`:
```tsx
"use client";

import Link from "next/link";
import { StudentSummary } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DIMENSION_LABELS, DIMENSION_KEYS } from "@/lib/constants";

interface StudentListProps {
  students: StudentSummary[];
}

export function StudentList({ students }: StudentListProps) {
  if (students.length === 0) {
    return <p className="text-gray-400 text-sm">등록된 학생이 없습니다</p>;
  }

  return (
    <div className="space-y-3">
      {students.map((student) => {
        const scores = student.avg_scores;
        const avgAll = scores
          ? Math.round(
              (DIMENSION_KEYS.reduce(
                (sum, k) => sum + (scores[k] || 0),
                0
              ) /
                6) *
                10
            ) / 10
          : null;

        return (
          <Card key={student.id} className="hover:bg-gray-50 transition-colors">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium text-gray-900">{student.name}</p>
                <p className="text-sm text-gray-500">
                  {student.email} | 세션 {student.session_count}회
                </p>
              </div>
              <div className="flex items-center gap-3">
                {avgAll !== null && (
                  <Badge
                    variant={
                      avgAll >= 7
                        ? "default"
                        : avgAll >= 4
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    평균 {avgAll}
                  </Badge>
                )}
                <Link
                  href={`/instructor/replay/${student.id}`}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  세션 보기
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Write HeatmapChart component**

Write to `thinkbridge/frontend/src/components/charts/HeatmapChart.tsx`:
```tsx
"use client";

import { HeatmapEntry } from "@/types";
import { DIMENSION_LABELS, DIMENSION_KEYS } from "@/lib/constants";

interface HeatmapChartProps {
  entries: HeatmapEntry[];
}

function getColor(score: number): string {
  if (score >= 8) return "bg-green-500";
  if (score >= 6) return "bg-green-300";
  if (score >= 4) return "bg-yellow-300";
  if (score >= 2) return "bg-orange-300";
  return "bg-red-400";
}

export function HeatmapChart({ entries }: HeatmapChartProps) {
  if (entries.length === 0) {
    return <p className="text-gray-400 text-sm">데이터가 없습니다</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left py-2 px-3 font-medium text-gray-600">
              학생
            </th>
            {DIMENSION_KEYS.map((key) => (
              <th
                key={key}
                className="py-2 px-2 font-medium text-gray-600 text-center"
              >
                {DIMENSION_LABELS[key]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.student_id} className="border-t">
              <td className="py-2 px-3 font-medium text-gray-900">
                {entry.student_name}
              </td>
              {DIMENSION_KEYS.map((key) => {
                const score = entry[key as keyof HeatmapEntry] as number;
                return (
                  <td key={key} className="py-2 px-2 text-center">
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs font-bold text-white ${getColor(
                        score
                      )}`}
                    >
                      {score.toFixed(1)}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Write instructor dashboard page**

Write to `thinkbridge/frontend/src/app/instructor/dashboard/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClassInfo, StudentSummary, HeatmapData } from "@/types";
import { api } from "@/lib/api";
import { ClassSelector } from "@/components/dashboard/ClassSelector";
import { StudentList } from "@/components/dashboard/StudentList";
import { HeatmapChart } from "@/components/charts/HeatmapChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard.classes().then((data) => {
      const classList = data as ClassInfo[];
      setClasses(classList);
      if (classList.length > 0) {
        setSelectedClassId(classList[0].id);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedClassId === null) return;
    api.dashboard
      .classStudents(selectedClassId)
      .then((data) => setStudents(data as StudentSummary[]));
    api.dashboard
      .classHeatmap(selectedClassId)
      .then((data) => setHeatmap(data as HeatmapData));
  }, [selectedClassId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">교강사 대시보드</h2>
        {selectedClassId && (
          <Link href={`/instructor/heatmap/${selectedClassId}`}>
            <Button variant="outline" size="sm">
              히트맵 상세보기
            </Button>
          </Link>
        )}
      </div>

      {classes.length > 0 && (
        <ClassSelector
          classes={classes}
          selectedId={selectedClassId}
          onSelect={setSelectedClassId}
        />
      )}

      {classes.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            등록된 반이 없습니다. 관리자에게 반 등록을 요청하세요.
          </CardContent>
        </Card>
      )}

      {heatmap && heatmap.entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">사고력 히트맵</CardTitle>
          </CardHeader>
          <CardContent>
            <HeatmapChart entries={heatmap.entries} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">학생 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentList students={students} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Write heatmap detail page**

Write to `thinkbridge/frontend/src/app/instructor/heatmap/[classId]/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { HeatmapData } from "@/types";
import { api } from "@/lib/api";
import { HeatmapChart } from "@/components/charts/HeatmapChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HeatmapPage() {
  const params = useParams();
  const classId = Number(params.classId);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);

  useEffect(() => {
    api.dashboard
      .classHeatmap(classId)
      .then((data) => setHeatmap(data as HeatmapData));
  }, [classId]);

  if (!heatmap) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        {heatmap.class_name} - 사고력 히트맵
      </h2>
      <Card>
        <CardContent className="pt-6">
          <HeatmapChart entries={heatmap.entries} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/dashboard/ frontend/src/components/charts/HeatmapChart.tsx frontend/src/app/instructor/
git commit -m "feat: add instructor dashboard with class selector, student list, and heatmap"
```

---

## Task 16: Session Replay View

**Files:**
- Create: `thinkbridge/frontend/src/app/instructor/replay/[sessionId]/page.tsx`
- Create: `thinkbridge/frontend/src/components/replay/SessionReplay.tsx`

- [ ] **Step 1: Write SessionReplay component**

Write to `thinkbridge/frontend/src/components/replay/SessionReplay.tsx`:
```tsx
"use client";

import { SessionDetail, Message } from "@/types";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ThoughtPanel } from "@/components/chat/ThoughtPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

interface SessionReplayProps {
  session: SessionDetail;
}

export function SessionReplay({ session }: SessionReplayProps) {
  const [selectedTurn, setSelectedTurn] = useState<Message | null>(null);

  const handleMessageClick = (msg: Message) => {
    if (msg.role === "user" && msg.analysis) {
      setSelectedTurn(msg);
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <div className="border-b px-4 py-3">
          <h3 className="font-semibold text-gray-900">{session.topic}</h3>
          <p className="text-xs text-gray-500">
            {session.subject} | {session.total_turns}턴 |{" "}
            {new Date(session.started_at).toLocaleDateString("ko-KR")}
          </p>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {session.messages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => handleMessageClick(msg)}
                className={`cursor-pointer rounded-lg transition-colors ${
                  selectedTurn?.id === msg.id ? "bg-indigo-50 p-2 -m-2" : ""
                }`}
              >
                <MessageBubble message={msg} />
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="w-72 border-l bg-gray-50">
        <div className="border-b p-4">
          <h3 className="text-sm font-semibold text-gray-700">턴별 분석</h3>
          <p className="text-xs text-gray-400 mt-1">
            학생 메시지를 클릭하면 분석을 볼 수 있습니다
          </p>
        </div>
        <ThoughtPanel
          analysis={selectedTurn?.analysis || null}
          turnNumber={selectedTurn?.turn_number || 0}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write replay page (shows student's sessions, then replay)**

Write to `thinkbridge/frontend/src/app/instructor/replay/[sessionId]/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SessionDetail, Session } from "@/types";
import { api } from "@/lib/api";
import { SessionReplay } from "@/components/replay/SessionReplay";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ReplayPage() {
  const params = useParams();
  const studentId = Number(params.sessionId);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard
      .studentSessions(studentId)
      .then((data) => {
        setSessions(data as Session[]);
        setLoading(false);
      });
  }, [studentId]);

  const handleSelectSession = async (sessionId: number) => {
    const detail = (await api.sessions.get(sessionId)) as SessionDetail;
    setSelectedSession(detail);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (selectedSession) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b px-4 py-2">
          <button
            onClick={() => setSelectedSession(null)}
            className="text-sm text-indigo-600 hover:underline"
          >
            &larr; 세션 목록으로
          </button>
        </div>
        <div className="flex-1">
          <SessionReplay session={selectedSession} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">학생 세션 기록</h2>
      {sessions.length === 0 ? (
        <p className="text-gray-500">세션 기록이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card
              key={session.id}
              className="hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => handleSelectSession(session.id)}
            >
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-gray-900">{session.topic}</p>
                  <p className="text-sm text-gray-500">
                    {session.subject} | {session.total_turns}턴
                  </p>
                </div>
                <Badge variant="secondary">
                  {new Date(session.started_at).toLocaleDateString("ko-KR")}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/replay/ frontend/src/app/instructor/replay/
git commit -m "feat: add session replay view with dual-panel (messages + turn analysis)"
```

---

## Task 17: Demo Data Seeding

**Files:**
- Create: `thinkbridge/backend/seed_data.py`

- [ ] **Step 1: Write seed script**

Write to `thinkbridge/backend/seed_data.py`:
```python
"""Demo data seeding script for ThinkBridge."""
import asyncio
import random

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session, engine, Base
from app.models.user import User, UserRole
from app.models.class_room import ClassRoom
from app.models.enrollment import Enrollment
from app.models.session import TutoringSession, SessionStatus
from app.models.message import Message, MessageRole
from app.models.thought_analysis import ThoughtAnalysis, EngagementLevel
from app.core.security import hash_password

DEMO_STUDENTS = [
    {"name": "김민수", "email": "minsu@demo.com"},
    {"name": "이서연", "email": "seoyeon@demo.com"},
    {"name": "박지호", "email": "jiho@demo.com"},
    {"name": "정하윤", "email": "hayun@demo.com"},
    {"name": "최준서", "email": "junseo@demo.com"},
]

DEMO_CONVERSATIONS = [
    {
        "subject": "수학",
        "topic": "이차방정식의 근의 공식 유도",
        "messages": [
            ("user", "이차방정식 ax^2 + bx + c = 0의 근의 공식을 유도하고 싶은데 어떻게 시작해야 할지 모르겠어요"),
            ("assistant", "좋은 질문이야! 먼저 이차방정식을 풀기 위해 어떤 방법들을 알고 있어? 그 중에서 이 식을 변형할 수 있는 방법이 있을까?"),
            ("user", "인수분해요? 그런데 일반적인 이차방정식은 인수분해가 안 되잖아요"),
            ("assistant", "맞아, 인수분해가 항상 되는 건 아니지. 그러면 완전제곱식이라는 걸 들어본 적 있어? (x+p)^2 형태로 만드는 건데, 이걸 이용하면 어떨까?"),
            ("user", "완전제곱식이요... ax^2 + bx + c를 a(x + 뭔가)^2 + 뭔가 형태로 만드는 거요?"),
            ("assistant", "정확해! 그러면 첫 번째 단계로 양변을 a로 나눠볼까? 그 결과가 어떻게 될까?"),
            ("user", "x^2 + (b/a)x + (c/a) = 0 이 되네요"),
            ("assistant", "좋아! 이제 x^2 + (b/a)x 부분을 완전제곱식으로 만들려면 어떤 수를 더하고 빼야 할까? (x + k)^2을 전개하면 어떻게 되지?"),
        ],
    },
    {
        "subject": "과학",
        "topic": "뉴턴의 운동 제2법칙 이해",
        "messages": [
            ("user", "F=ma에서 힘이 일정할 때 질량이 커지면 가속도가 왜 줄어드나요?"),
            ("assistant", "좋은 질문이야! 일상에서 경험한 것으로 생각해보자. 빈 쇼핑카트와 짐이 가득 찬 쇼핑카트를 같은 힘으로 밀면 어떻게 될까?"),
            ("user", "빈 카트가 더 빨리 움직이고, 무거운 카트는 느리게 움직여요"),
            ("assistant", "맞아! 그 경험이 바로 F=ma를 보여주는 거야. 그러면 같은 힘 F로 두 카트를 밀 때, F=ma 식에서 어떤 값이 변하고 어떤 값이 같은 거지?"),
        ],
    },
]

ANALYSIS_PROFILES = {
    "김민수": {"base": [8, 5, 6, 5, 3, 7], "engagement": "active"},
    "이서연": {"base": [7, 7, 8, 6, 6, 5], "engagement": "active"},
    "박지호": {"base": [5, 4, 5, 3, 2, 4], "engagement": "passive"},
    "정하윤": {"base": [6, 6, 7, 7, 5, 8], "engagement": "active"},
    "최준서": {"base": [9, 8, 7, 6, 4, 6], "engagement": "active"},
}

DIMENSION_ORDER = [
    "problem_understanding",
    "premise_check",
    "logical_structure",
    "evidence_provision",
    "critical_thinking",
    "creative_thinking",
]

PATTERNS_POOL = [
    "logical_leap",
    "missing_premise",
    "correct_reasoning",
    "self_correction",
    "creative_approach",
    "surface_level",
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        hashed = hash_password("demo1234")

        instructor = User(
            email="instructor@demo.com",
            name="김교수",
            role=UserRole.INSTRUCTOR,
            hashed_password=hashed,
        )
        db.add(instructor)
        await db.flush()

        admin = User(
            email="admin@demo.com",
            name="운영자",
            role=UserRole.ADMIN,
            hashed_password=hashed,
        )
        db.add(admin)
        await db.flush()

        students = []
        for s in DEMO_STUDENTS:
            user = User(
                email=s["email"],
                name=s["name"],
                role=UserRole.STUDENT,
                hashed_password=hashed,
            )
            db.add(user)
            students.append(user)
        await db.flush()

        math_class = ClassRoom(
            name="고등수학 1반", subject="수학", instructor_id=instructor.id
        )
        science_class = ClassRoom(
            name="물리학 기초반", subject="과학", instructor_id=instructor.id
        )
        db.add(math_class)
        db.add(science_class)
        await db.flush()

        for student in students:
            db.add(
                Enrollment(
                    user_id=student.id, class_id=math_class.id, role="student"
                )
            )
            db.add(
                Enrollment(
                    user_id=student.id, class_id=science_class.id, role="student"
                )
            )

        db.add(
            Enrollment(
                user_id=instructor.id, class_id=math_class.id, role="instructor"
            )
        )
        db.add(
            Enrollment(
                user_id=instructor.id,
                class_id=science_class.id,
                role="instructor",
            )
        )

        for student in students:
            profile = ANALYSIS_PROFILES[student.name]
            for conv in DEMO_CONVERSATIONS:
                session = TutoringSession(
                    user_id=student.id,
                    subject=conv["subject"],
                    topic=conv["topic"],
                    status=SessionStatus.COMPLETED,
                    total_turns=len(conv["messages"]) // 2,
                )
                db.add(session)
                await db.flush()

                turn = 0
                for i, (role_str, content) in enumerate(conv["messages"]):
                    if role_str == "user":
                        turn += 1
                    msg = Message(
                        session_id=session.id,
                        role=MessageRole.USER
                        if role_str == "user"
                        else MessageRole.ASSISTANT,
                        content=content,
                        turn_number=turn,
                    )
                    db.add(msg)
                    await db.flush()

                    if role_str == "user":
                        scores = {}
                        for j, key in enumerate(DIMENSION_ORDER):
                            base = profile["base"][j]
                            scores[key] = max(
                                0, min(10, base + random.randint(-2, 2))
                            )

                        patterns = random.sample(
                            PATTERNS_POOL, k=random.randint(1, 3)
                        )

                        analysis = ThoughtAnalysis(
                            message_id=msg.id,
                            problem_understanding=scores["problem_understanding"],
                            premise_check=scores["premise_check"],
                            logical_structure=scores["logical_structure"],
                            evidence_provision=scores["evidence_provision"],
                            critical_thinking=scores["critical_thinking"],
                            creative_thinking=scores["creative_thinking"],
                            detected_patterns=patterns,
                            socratic_stage=min(5, (turn // 2) + 1),
                            engagement_level=profile["engagement"],
                        )
                        db.add(analysis)

                session.total_turns = turn

        await db.commit()
        print("Demo data seeded successfully!")
        print(f"  Instructor: instructor@demo.com / demo1234")
        print(f"  Admin: admin@demo.com / demo1234")
        print(f"  Students: minsu@demo.com ... / demo1234")


if __name__ == "__main__":
    asyncio.run(seed())
```

- [ ] **Step 2: Commit**

```bash
git add backend/seed_data.py
git commit -m "feat: add demo data seeding script with 5 students, 2 classes, conversations"
```

---

## Task 18: Deployment Configuration

**Files:**
- Create: `thinkbridge/backend/Dockerfile`
- Create: `thinkbridge/backend/Procfile`
- Modify: `thinkbridge/frontend/next.config.ts`

- [ ] **Step 1: Write backend Dockerfile**

Write to `thinkbridge/backend/Dockerfile`:
```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Write to `thinkbridge/backend/Procfile`:
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

- [ ] **Step 2: Update next.config.ts for API proxy**

Write to `thinkbridge/frontend/next.config.ts`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 3: Commit**

```bash
git add backend/Dockerfile backend/Procfile frontend/next.config.ts
git commit -m "feat: add deployment configuration (Dockerfile, Procfile, Next.js rewrites)"
```

---

## Task 19: Final Integration & Polish

- [ ] **Step 1: Run backend locally and verify health check**

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload &
curl http://localhost:8000/health
```
Expected: `{"status":"ok"}`

- [ ] **Step 2: Seed demo data**

```bash
cd backend && python seed_data.py
```
Expected: "Demo data seeded successfully!"

- [ ] **Step 3: Run frontend locally and verify**

```bash
cd frontend
npm install && npm run dev &
```
Open http://localhost:3000, verify landing page renders.

- [ ] **Step 4: Run all backend tests**

```bash
cd backend && python -m pytest tests/ -v
```
Expected: All tests PASS

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final integration verification"
```

---

## Parallelization Guide

Tasks that can run in parallel (independent of each other):

**Parallel Group 1 (Backend foundation):**
- Task 1: Project Scaffolding
(sequential prerequisite for all)

**Parallel Group 2 (Backend models & schemas):**
- Task 2: Database Models
- Task 3: Pydantic Schemas
(can run in parallel after Task 1)

**Parallel Group 3 (Backend services):**
- Task 5: AI Prompt Templates
- Task 6: Socratic Engine
- Task 7: Thought Analyzer
(can run in parallel after Tasks 2-3)

**Parallel Group 4 (Backend API):**
- Task 4: Auth System
- Task 8: Session & Message API (depends on Tasks 6-7)
- Task 9: Report Generator & API
- Task 10: Dashboard API
(Tasks 4, 9, 10 can run in parallel; Task 8 after Group 3)

**Parallel Group 5 (Frontend):**
- Task 11: Frontend Scaffolding
(can start after Task 1, independent of backend)

**Parallel Group 6 (Frontend pages):**
- Task 12: Auth Pages & Layout
- Task 13: Student Chat
- Task 14: Student Sessions & Reports
- Task 15: Instructor Dashboard
- Task 16: Session Replay
(all can run in parallel after Task 11)

**Sequential (final):**
- Task 17: Demo Data Seeding (after all backend tasks)
- Task 18: Deployment Config (after all tasks)
- Task 19: Final Integration (last)
