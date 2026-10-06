import pytest

from backend.core.config import Settings

SECRET = "x" * 40
NEON = (
    "postgresql://u:p@ep-cool-123-pooler.eu-west-2.aws.neon.tech/neondb"
    "?sslmode=require&channel_binding=require"
)


def make(url: str) -> Settings:
    return Settings(_env_file=None, database_url=url, jwt_secret_key=SECRET)


def test_neon_url_is_normalised_for_asyncpg():
    s = make(NEON)
    url = s.async_database_url
    assert url.startswith("postgresql+asyncpg://u:p@ep-cool-123-pooler")
    assert "sslmode" not in url and "channel_binding" not in url
    assert "prepared_statement_cache_size=0" in url
    assert s.db_requires_ssl and s.db_is_pooled


def test_direct_neon_endpoint_keeps_statement_cache():
    s = make(NEON.replace("-pooler", ""))
    assert not s.db_is_pooled
    assert "prepared_statement_cache_size" not in s.async_database_url


def test_sqlite_is_left_alone():
    s = make("sqlite+aiosqlite:///:memory:")
    assert not s.db_is_postgres and not s.db_requires_ssl
    assert s.async_database_url.startswith("sqlite+aiosqlite")


def test_short_jwt_secret_rejected():
    with pytest.raises(Exception):
        Settings(_env_file=None, database_url=NEON, jwt_secret_key="short")


def test_validation_errors_never_echo_secret_values():
    with pytest.raises(Exception) as e:
        Settings(_env_file=None, database_url="postgresql://u:topsecretpw@h/db",
                 jwt_secret_key="hunter2hunter2")  # too short
    assert "hunter2" not in str(e.value) and "topsecretpw" not in str(e.value)
