"""Reset a user's password and sign them out everywhere (all refresh tokens revoked).

    python -m backend.scripts.reset_password --email you@example.com

Run it from your own machine against the production database. Anyone holding
an access token already issued keeps it until it expires (15 minutes).
"""
import argparse
import asyncio
import getpass
import sys

from pydantic import ValidationError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import async_session_factory, dispose_engine
from backend.core.security import hash_password
from backend.models import User
from backend.schemas.auth import RegisterRequest
from backend.services.auth_service import audit, normalize_email, revoke_all_for_user


async def reset_password(session: AsyncSession, email: str, new_password: str) -> bool:
    """Returns False if no such user exists."""
    user = (await session.exec(select(User).where(User.email == normalize_email(email)))).first()
    if user is None:
        return False
    user.hashed_password = hash_password(new_password)
    await revoke_all_for_user(session, user.id)
    audit(session, "user.password_reset", user_id=user.id, resource_id=user.id)
    await session.commit()
    return True


async def main(email: str, new_password: str) -> int:
    async with async_session_factory() as session:
        found = await reset_password(session, email, new_password)
    await dispose_engine()
    print("Password changed; all sessions revoked." if found else f"No user with email {email}.")
    return 0 if found else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--email", required=True)
    args = ap.parse_args()

    password = getpass.getpass("New password (min 10 chars): ")
    if password != getpass.getpass("Repeat new password: "):
        sys.exit("Passwords do not match.")
    try:  # same rules as registration
        RegisterRequest(email=args.email, full_name="x", password=password)
    except ValidationError as e:
        sys.exit("Invalid input:\n" + "\n".join(f"  - {'.'.join(map(str, x['loc']))}: {x['msg']}" for x in e.errors()))
    sys.exit(asyncio.run(main(args.email, password)))
