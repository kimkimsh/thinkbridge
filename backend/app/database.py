from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


# Supabase PostgreSQL 비동기 엔진 생성
# Convert postgres:// or postgresql:// to postgresql+asyncpg:// for SQLAlchemy async support
def _buildAsyncDatabaseUrl(databaseUrl: str) -> str:
    """
    DB URL을 asyncpg 드라이버 형식으로 변환
    Handles various PostgreSQL URL schemes from Supabase/Render.
    """
    if databaseUrl.startswith("postgresql+asyncpg://"):
        # Already in async format
        return databaseUrl
    if databaseUrl.startswith("postgres://"):
        return databaseUrl.replace("postgres://", "postgresql+asyncpg://", 1)
    if databaseUrl.startswith("postgresql://"):
        return databaseUrl.replace("postgresql://", "postgresql+asyncpg://", 1)
    return databaseUrl


ASYNC_DATABASE_URL = _buildAsyncDatabaseUrl(settings.DATABASE_URL)

engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)

# 비동기 세션 팩토리
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 declarative base for all models."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    비동기 DB 세션 의존성 주입용 제너레이터
    Dependency injection generator for async DB sessions.
    """
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
