import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from app.config import settings
from app.database import engine, Base
from app.models import (  # noqa: F401 — import to register models with Base.metadata
    User, ClassRoom, Enrollment, TutoringSession,
    Message, ThoughtAnalysis, Report, TokenUsage,
)


SSE_TEST_EVENT_COUNT = 5
SSE_TEST_INTERVAL_SECONDS = 0.5


STARTUP_DB_TIMEOUT_SECONDS = 15


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    애플리케이션 시작 시 테이블 자동 생성
    Application lifespan: create all tables on startup.
    """
    import logging
    tLogger = logging.getLogger(__name__)
    try:
        async with asyncio.timeout(STARTUP_DB_TIMEOUT_SECONDS):
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        tLogger.info("Database tables created successfully")
    except Exception as tError:
        tLogger.error("Failed to create database tables: %s", tError)
        # DB 연결 실패해도 앱은 시작 (health check는 동작해야 함)
    yield


app = FastAPI(
    title="ThinkBridge API",
    description="AI 소크라테스식 튜터링 시스템 API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS 미들웨어 설정 - 프론트엔드 오리진 허용
tOrigins = [
    origin.strip()
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=tOrigins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Router mounting (uncomment as routers are implemented) ---
from app.routers import auth
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
from app.routers import sessions
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
from app.routers import reports
app.include_router(reports.router, prefix="/api", tags=["reports"])
from app.routers import dashboard
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
from app.routers import admin
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.get("/health")
async def healthCheck() -> dict:
    """
    헬스체크 엔드포인트 - Render 및 UptimeRobot 모니터링용
    Health check endpoint for Render and UptimeRobot monitoring.
    """
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/health/db")
async def healthCheckDb() -> dict:
    """DB 연결 상태 확인 - 디버깅용"""
    from sqlalchemy import text
    try:
        async with engine.begin() as conn:
            tResult = await conn.execute(text("SELECT 1"))
            tResult.fetchone()
        return {"db": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}
    except Exception as tError:
        return {"db": "error", "detail": str(tError), "timestamp": datetime.now(timezone.utc).isoformat()}


async def _generateSseTestEvents():
    """
    SSE 테스트용 이벤트 생성기
    Generates test SSE events for connectivity verification.
    """
    for i in range(SSE_TEST_EVENT_COUNT):
        yield {
            "event": "test",
            "data": f"ThinkBridge SSE test event {i + 1}/{SSE_TEST_EVENT_COUNT}",
        }
        await asyncio.sleep(SSE_TEST_INTERVAL_SECONDS)


@app.get("/api/test-sse")
async def testSse() -> EventSourceResponse:
    """
    SSE 연결 테스트 엔드포인트 - 스트리밍 동작 확인용
    SSE test endpoint to verify streaming connectivity.
    """
    return EventSourceResponse(_generateSseTestEvents())
