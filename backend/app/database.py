import ssl
from collections.abc import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings


# Supabase PostgreSQL 비동기 엔진 생성
# Convert postgres:// or postgresql:// to postgresql+asyncpg:// for SQLAlchemy async support
def _buildAsyncDatabaseUrl(databaseUrl: str) -> str:
    """
    DB URL을 asyncpg 드라이버 형식으로 변환
    Handles various PostgreSQL URL schemes from Supabase/Render.
    """
    if databaseUrl.startswith("postgresql+asyncpg://"):
        return databaseUrl
    if databaseUrl.startswith("postgres://"):
        return databaseUrl.replace("postgres://", "postgresql+asyncpg://", 1)
    if databaseUrl.startswith("postgresql://"):
        return databaseUrl.replace("postgresql://", "postgresql+asyncpg://", 1)
    return databaseUrl


ASYNC_DATABASE_URL = _buildAsyncDatabaseUrl(settings.DATABASE_URL)

# Supabase는 SSL 연결을 요구함
_sslContext = ssl.create_default_context()
_sslContext.check_hostname = False
_sslContext.verify_mode = ssl.CERT_NONE

DB_CONNECT_TIMEOUT = 10

# Supabase Session Mode Pooler 호환 설정:
# NullPool: 앱 측 풀링 비활성화 (pgbouncer가 풀링 담당)
engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    poolclass=NullPool,
    connect_args={
        "ssl": _sslContext,
        "timeout": DB_CONNECT_TIMEOUT,
        "command_timeout": DB_CONNECT_TIMEOUT,
        "statement_cache_size": 0,
    },
)


# asyncpg prepared statement 캐시를 강제 비활성화
# SQLAlchemy dialect 초기화 시에도 적용되도록 connect 이벤트에서 설정
@event.listens_for(engine.sync_engine, "connect")
def _disablePreparedStatementCache(dbapi_connection, connection_record):
    """
    Supabase pgbouncer 호환: asyncpg의 prepared statement 캐시를 비활성화.
    connect_args의 statement_cache_size=0이 dialect 초기화에 적용되지 않는
    문제를 우회하기 위해 raw connection 레벨에서 캐시를 직접 제거.
    """
    # SQLAlchemy 2.0+: driver_connection replaces deprecated dbapi_connection
    raw_conn = getattr(
        dbapi_connection, "driver_connection",
        getattr(dbapi_connection, "dbapi_connection", None),
    )
    if hasattr(raw_conn, "_stmt_cache"):
        raw_conn._stmt_cache.clear()
    if hasattr(raw_conn, "_stmts_to_close"):
        raw_conn._stmts_to_close.clear()


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
