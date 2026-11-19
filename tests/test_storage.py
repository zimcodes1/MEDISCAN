import asyncio

import boto3
import pytest
from botocore.exceptions import ClientError, EndpointConnectionError
from pydantic import ValidationError

from backend.core.config import Settings
from backend.services.storage_service import (
    LocalStorage, build_storage_service, describe_storage_error,
)

GOOD = dict(database_url="sqlite+aiosqlite:///:memory:", jwt_secret_key="x" * 40, _env_file=None)
S3_FIELDS = dict(storage_backend="s3", s3_bucket="b", s3_access_key_id="id",
                 s3_secret_access_key="super-secret-value")


# ---------------------------------------------------- shared behaviour
async def test_roundtrip_binary_exact(any_storage):
    data = bytes(range(256)) * 400
    await any_storage.put("scans/abc.png", data, "image/png")
    assert await any_storage.get("scans/abc.png") == data


async def test_overwrite_delete_and_idempotent_delete(any_storage):
    await any_storage.put("a/b.png", b"one", "image/png")
    await any_storage.put("a/b.png", b"two", "image/png")
    assert await any_storage.get("a/b.png") == b"two"
    await any_storage.delete("a/b.png")
    await any_storage.delete("a/b.png")  # already gone: not an error
    with pytest.raises(FileNotFoundError):
        await any_storage.get("a/b.png")


async def test_missing_object_raises_file_not_found(any_storage):
    with pytest.raises(FileNotFoundError):
        await any_storage.get("scans/never-existed.png")


@pytest.mark.parametrize("key", ["../x", "/etc/passwd", "a/../b", "a//b", "", ".hidden/x", "a b"])
async def test_bad_keys_rejected(any_storage, key):
    with pytest.raises(ValueError):
        await any_storage.put(key, b"x", "text/plain")
    with pytest.raises(ValueError):
        await any_storage.get(key)


async def test_concurrent_writes(any_storage):
    await asyncio.gather(*[any_storage.put(f"c/{i}.bin", bytes([i]) * 10, "x/y") for i in range(20)])
    got = await asyncio.gather(*[any_storage.get(f"c/{i}.bin") for i in range(20)])
    assert got == [bytes([i]) * 10 for i in range(20)]


async def test_check_passes_and_leaves_nothing_behind(any_storage):
    await any_storage.check()
    if isinstance(any_storage, LocalStorage):
        assert not any(p.is_file() for p in any_storage.base.rglob("*"))
    else:
        listing = any_storage._client.list_objects_v2(Bucket=any_storage.bucket)
        assert listing.get("KeyCount", 0) == 0


# ------------------------------------------------------------- s3 only
async def test_s3_stores_content_type(s3_storage):
    await s3_storage.put("scans/x.png", b"data", "image/png")
    head = s3_storage._client.head_object(Bucket="test-bucket", Key="scans/x.png")
    assert head["ContentType"] == "image/png"


async def test_s3_check_fails_clearly_when_bucket_is_missing(s3_storage):
    s3_storage.bucket = "no-such-bucket"
    with pytest.raises(ClientError) as e:
        await s3_storage.check()
    assert "Bucket not found" in describe_storage_error(e.value)


# ------------------------------------------------- error descriptions
def _client_error(code: str) -> ClientError:
    return ClientError({"Error": {"Code": code, "Message": "m"}}, "PutObject")


def test_error_descriptions_are_actionable():
    assert "access key or secret" in describe_storage_error(_client_error("InvalidAccessKeyId"))
    assert "access key or secret" in describe_storage_error(_client_error("SignatureDoesNotMatch"))
    assert "Object Read & Write" in describe_storage_error(_client_error("AccessDenied"))
    assert "Bucket not found" in describe_storage_error(_client_error("NoSuchBucket"))
    assert "S3_ENDPOINT_URL" in describe_storage_error(
        EndpointConnectionError(endpoint_url="https://x"))
    assert "'Weird'" in describe_storage_error(_client_error("Weird"))


# ----------------------------------------------------------- settings
def test_s3_requires_all_credentials():
    with pytest.raises(ValidationError) as e:
        Settings(**GOOD, storage_backend="s3", s3_bucket="b")
    msg = str(e.value)
    assert "S3_ACCESS_KEY_ID" in msg and "S3_SECRET_ACCESS_KEY" in msg


def test_production_refuses_local_storage():
    with pytest.raises(ValidationError) as e:
        Settings(**GOOD, environment="production")
    assert "STORAGE_BACKEND=local is not allowed" in str(e.value)
    Settings(**GOOD, environment="production", **S3_FIELDS)  # s3 is fine


def test_endpoint_must_be_https():
    with pytest.raises(ValidationError):
        Settings(**GOOD, **S3_FIELDS, s3_endpoint_url="http://storage.example.com")
    Settings(**GOOD, **S3_FIELDS, s3_endpoint_url="https://abc.r2.cloudflarestorage.com")
    Settings(**GOOD, **S3_FIELDS, s3_endpoint_url="http://localhost:9000")  # local MinIO


def test_secret_is_not_leaked_in_repr_or_str():
    s = Settings(**GOOD, **S3_FIELDS)
    assert "super-secret-value" not in repr(s) and "super-secret-value" not in str(s)
    assert s.s3_secret_access_key.get_secret_value() == "super-secret-value"


def test_factory_builds_the_configured_backend(tmp_path):
    assert isinstance(build_storage_service(Settings(**GOOD, storage_local_dir=tmp_path)), LocalStorage)
    from backend.services.storage_service import S3Storage
    s3 = build_storage_service(Settings(**GOOD, **S3_FIELDS, s3_endpoint_url="https://a.r2.cloudflarestorage.com"))
    assert isinstance(s3, S3Storage) and s3.bucket == "b"
