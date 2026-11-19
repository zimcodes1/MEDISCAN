"""Async engine + session management (SQLModel / asyncpg / Neon)."""
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.config import get_settings

settings = get_settings()


def _build_engine() -> AsyncEngine:
    kwargs: dict = {"echo": settings.debug, "pool_pre_ping": True}
    connect_args: dict = {}

    if settings.db_is_postgres:
        kwargs.update(
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_recycle=settings.db_pool_recycle_seconds,
        )
        connect_args["timeout"] = settings.db_connect_timeout_seconds
        if settings.db_requires_ssl:
            connect_args["ssl"] = True
        if settings.db_is_pooled:
            # PgBouncer (transaction mode) cannot handle asyncpg prepared statements.
            connect_args["statement_cache_size"] = 0

    return create_async_engine(
        settings.async_database_url, connect_args=connect_args, **kwargs
    )


engine: AsyncEngine = _build_engine()

async_session_factory = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: one session per request.

    Commits are explicit: call `await session.commit()` in the service/router
    that owns the unit of work. Uncommitted work is rolled back on exit.
    """
    async with async_session_factory() as session:
        yield session


async def dispose_engine() -> None:
    await engine.dispose()
