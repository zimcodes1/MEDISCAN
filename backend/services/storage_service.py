"""Binary storage behind a small interface. Only object keys are kept in the
database; step 5 adds a private S3-compatible implementation."""
from pathlib import Path
from typing import Protocol

from starlette.concurrency import run_in_threadpool

from backend.core.config import Settings


class StorageService(Protocol):
    async def put(self, key: str, data: bytes, content_type: str) -> None: ...
    async def get(self, key: str) -> bytes: ...
    async def delete(self, key: str) -> None: ...


class LocalStorage:
    """Files under a base directory. Development and tests only."""

    def __init__(self, base_dir: Path):
        self.base = Path(base_dir).resolve()

    def _path(self, key: str) -> Path:
        path = (self.base / key).resolve()
        if not path.is_relative_to(self.base):  # blocks ../ traversal
            raise ValueError("Invalid storage key")
        return path

    async def put(self, key: str, data: bytes, content_type: str) -> None:
        def _write() -> None:
            path = self._path(key)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)

        await run_in_threadpool(_write)

    async def get(self, key: str) -> bytes:
        return await run_in_threadpool(lambda: self._path(key).read_bytes())

    async def delete(self, key: str) -> None:
        await run_in_threadpool(lambda: self._path(key).unlink(missing_ok=True))


def build_storage_service(settings: Settings) -> StorageService:
    return LocalStorage(settings.storage_local_dir)
