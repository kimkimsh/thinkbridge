import ssl
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

# Supabase는 SSL 연결을 요구함
# asyncpg용 SSL 컨텍스트 생성 (서버 인증서 검증 비활성화 — Supabase 자체 인증)
_sslContext = ssl.create_default_context()
_sslContext.check_hostname = False
_sslContext.verify_mode = ssl.CERT_NONE

DB_POOL_SIZE = 5
DB_MAX_OVERFLOW = 5
DB_POOL_TIMEOUT = 10
DB_CONNECT_TIMEOUT = 10

engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=DB_POOL_SIZE,
    max_overflow=DB_MAX_OVERFLOW,
    pool_timeout=DB_POOL_TIMEOUT,
    connect_args={
        "ssl": _sslContext,
        "timeout": DB_CONNECT_TIMEOUT,
        "command_timeout": DB_CONNECT_TIMEOUT,
        # Supabase Pooler (Transaction mode)는 prepared statements 미지원
        # asyncpg 캐시를 비활성화해야 호환됨
        "prepared_statement_cache_size": 0,
    },
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
