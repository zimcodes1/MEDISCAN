"""Verify the storage configuration end to end (run this before deploying):

    python -m backend.scripts.check_storage

Writes, reads back and deletes one tiny test object using your .env settings.
"""
import asyncio
import sys

from pydantic import ValidationError

from backend.core.config import get_settings
from backend.services.storage_service import (
    build_storage_service, describe_storage_error, endpoint_host,
)


async def main() -> int:
    try:
        s = get_settings()
    except ValidationError as exc:
        print("CONFIGURATION ERROR:")
        for err in exc.errors():  # field + message only: values may be secrets
            field = ".".join(str(p) for p in err["loc"]) or "settings"
            print(f"  - {field}: {err['msg']}")
        return 1
    print(f"Storage backend : {s.storage_backend}")
    if s.storage_backend == "s3":
        print(f"Endpoint        : {endpoint_host(s)}")
        print(f"Bucket          : {s.s3_bucket}")
    else:
        print(f"Directory       : {s.storage_local_dir}")
    try:
        await build_storage_service(s).check()
    except Exception as exc:
        print(f"\nFAILED: {describe_storage_error(exc)}")
        return 1
    print("\nOK: wrote, read back and deleted a test object.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
