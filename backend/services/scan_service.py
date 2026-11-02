import logging
import re
import uuid

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.errors import AppError
from backend.models import Finding, Patient, Scan, ScanStatus, User
from backend.services.auth_service import audit
from backend.services.inference_service import FindingResult
from backend.services.patient_service import get_accessible_patient
from backend.services.storage_service import StorageService

logger = logging.getLogger("mediscan.scans")


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


async def save_scan(
    session: AsyncSession,
    storage: StorageService,
    *,
    user: User,
    patient: Patient,
    image_png: bytes,
    image_sha256: str,
    results: list[FindingResult],
    ip: str | None,
) -> Scan:
    """Stores image + heatmaps, then the DB rows. If anything fails, objects
    already written are removed so no orphans are left behind."""
    user_id, patient_id = user.id, patient.id
    scan_id = uuid.uuid4()
    image_key = f"scans/{scan_id}.png"  # UUID-only keys: nothing identifying
    written: list[str] = []
    try:
        await storage.put(image_key, image_png, "image/png")
        written.append(image_key)

        findings: list[Finding] = []
        for r in results:
            heatmap_key = None
            if r.heatmap_png is not None:
                heatmap_key = f"heatmaps/{scan_id}/{_slug(r.condition)}.png"
                await storage.put(heatmap_key, r.heatmap_png, "image/png")
                written.append(heatmap_key)
            findings.append(
                Finding(
                    condition=r.condition, score=r.score, heatmap_key=heatmap_key,
                    model_name=r.model_name, model_version=r.model_version,
                    experimental=r.experimental,
                )
            )

        scan = Scan(
            id=scan_id, patient_id=patient_id, uploaded_by_id=user_id,
            image_key=image_key, image_sha256=image_sha256,
            content_type="image/png", size_bytes=len(image_png),
            status=ScanStatus.completed, findings=findings,
        )
        session.add(scan)
        audit(session, "scan.create", user_id=user_id,
              resource_type="scan", resource_id=scan_id, ip=ip)
        await session.commit()
        return scan
    except Exception:
        logger.exception("Saving scan %s failed; cleaning up", scan_id)
        await session.rollback()
        for key in written:
            try:
                await storage.delete(key)
            except Exception:
                logger.exception("Could not delete orphaned object %s", key)
        raise AppError(500, "Could not save the scan")


async def get_accessible_scan(session: AsyncSession, user: User, scan_id: uuid.UUID) -> Scan:
    scan = await session.get(Scan, scan_id)
    if scan is None:
        raise AppError(404, "Scan not found")
    await get_accessible_patient(session, user, scan.patient_id)  # 404 if not yours
    return scan


async def list_scans(
    session: AsyncSession, user: User, patient_id: uuid.UUID, limit: int, offset: int
) -> list[Scan]:
    await get_accessible_patient(session, user, patient_id)
    stmt = (
        select(Scan).where(Scan.patient_id == patient_id)
        .order_by(Scan.created_at.desc()).limit(limit).offset(offset)
    )
    return list((await session.exec(stmt)).all())
