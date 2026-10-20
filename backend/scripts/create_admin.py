"""
    python -m backend.scripts.create_admin --email you@example.com --name "Your Name" [--platform-admin]

The admin joins the default organisation (created by migration 0003).
--platform-admin also marks them as the platform operator who approves
new organisations.
"""
import argparse
import asyncio
import getpass
import sys

from pydantic import ValidationError
from sqlmodel import select

from backend.core.database import async_session_factory, dispose_engine
from backend.core.security import hash_password
from backend.core.config import get_settings
from backend.models import Organisation, User, UserRole
from backend.schemas.auth import RegisterRequest
from backend.services.auth_service import normalize_email


async def main(email: str, name: str, password: str, platform_admin: bool) -> int:
    email = normalize_email(email)
    async with async_session_factory() as session:
        if (await session.exec(select(User).where(User.email == email))).first():
            print(f"A user with email {email} already exists.")
            return 1
        org = (await session.exec(
            select(Organisation).where(Organisation.name == get_settings().default_organisation_name)
        )).first()
        if org is None:
            print("Default organisation not found. Run `alembic upgrade head` first.")
            return 1
        session.add(
            User(
                email=email, full_name=name.strip(),
                hashed_password=hash_password(password),
                role=UserRole.admin, is_approved=True, is_active=True,
                organisation_id=org.id, is_platform_admin=platform_admin,
            )
        )
        await session.commit()
    await dispose_engine()
    print(f"Admin {email} created.")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--email", required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--platform-admin", action="store_true")
    args = ap.parse_args()

    password = getpass.getpass("Password (min 10 chars): ")
    if password != getpass.getpass("Repeat password: "):
        sys.exit("Passwords do not match.")
    try:  # reuse the API's validation rules
        RegisterRequest(email=args.email, full_name=args.name, password=password)
    except ValidationError as e:
        sys.exit(f"Invalid input:\n{e}")
    sys.exit(asyncio.run(main(args.email, args.name, password, args.platform_admin)))
