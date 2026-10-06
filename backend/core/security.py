"""Password hashing (bcrypt) and token helpers (PyJWT access tokens,
opaque refresh tokens stored as SHA-256 digests)."""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from functools import lru_cache

import bcrypt
import jwt
from starlette.concurrency import run_in_threadpool

from backend.core.config import get_settings
from backend.models.user import User, UserRole

MAX_PASSWORD_BYTES = 72  # bcrypt limit


# ---------- passwords ----------
def hash_password(password: str) -> str:
    rounds = get_settings().bcrypt_rounds
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=rounds)).decode()


def verify_password(password: str, hashed: str) -> bool:
    raw = password.encode()
    if len(raw) > MAX_PASSWORD_BYTES:
        return False
    try:
        return bcrypt.checkpw(raw, hashed.encode())
    except ValueError:
        return False


# bcrypt is CPU-bound (~250 ms at cost 12): keep it off the event loop.
async def hash_password_async(password: str) -> str:
    return await run_in_threadpool(hash_password, password)


async def verify_password_async(password: str, hashed: str) -> bool:
    return await run_in_threadpool(verify_password, password, hashed)


@lru_cache
def dummy_hash() -> str:
    """Verified against when the email is unknown, so response time does not
    reveal whether an account exists."""
    return hash_password("dummy-password-for-timing-equalisation")


# ---------- access tokens (JWT) ----------
def create_access_token(user: User, expires_delta: timedelta | None = None) -> str:
    s = get_settings()
    now = datetime.now(timezone.utc)
    exp = now + (expires_delta or timedelta(minutes=s.access_token_expire_minutes))
    payload = {
        "sub": str(user.id),
        "role": UserRole(user.role).value,
        "type": "access",
        "iat": now,
        "exp": exp,
    }
    return jwt.encode(payload, s.jwt_secret_key, algorithm=s.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """Raises jwt.PyJWTError on any problem (bad signature, expired, wrong type)."""
    s = get_settings()
    payload = jwt.decode(
        token,
        s.jwt_secret_key,
        algorithms=[s.jwt_algorithm],  # pinned: prevents algorithm-confusion
        options={"require": ["exp", "iat", "sub"]},
    )
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("Not an access token")
    return payload


# ---------- refresh tokens (opaque) ----------
def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)  # 384 bits of entropy


def hash_token(raw: str) -> str:
    """Deterministic (unlike bcrypt), so we can look the token up by index.
    Safe because the input is high-entropy random, not a human password."""
    return hashlib.sha256(raw.encode()).hexdigest()
