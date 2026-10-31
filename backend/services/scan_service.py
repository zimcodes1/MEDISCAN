import logging
import re
import uuid
from dataclasses import dataclass
from datetime import date

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.errors import AppError
from backend.core.flagging import flagged_scan_clause
from backend.models import Finding, Patient, Report, Scan, ScanStatus, User
from backend.models.base import utcnow
from backend.schemas.scan import ScanOut, ScanUpdate
from backend.services import activity_service
from backend.services.auth_service import audit
from backend.services.inference_service import FindingResult
from backend.services.patient_service import get_accessible_patient
from backend.services.storage_service import StorageService

logger = logging.getLogger("mediscan.scans")


@dataclass
class ScanMeta:
    """Optional clinical details sent with an upload."""
    priority: str = "routine"
    projection: str | None = None
    exam_date: date | None = None
    clinical_notes: str | None = None  # patient data: never log
    assigned_to_id: uuid.UUID | None = None


async def validate_assignee(session: AsyncSession, user: User, assignee_id: uuid.UUID) -> User:
    """Assignees must be approved, active members of the caller's organisation.
    Anyone else (including another organisation's user) is a plain 422."""
    assignee = await session.get(User, assignee_id)
    if (
        assignee is None or assignee.organisation_id != user.organisation_id
        or not assignee.is_approved or not assignee.is_active
    ):
        raise AppError(422, "assigned_to_id must be an approved, active user in your organisation")
    return assignee


async def usable_assignee(session: AsyncSession, user: User, assignee_id: uuid.UUID) -> User | None:
    """Like validate_assignee, but returns None instead of failing: used for the
    organisation's auto-assign setting, which may name someone who has since left."""
    try:
        return await validate_assignee(session, user, assignee_id)
    except AppError:
        return None


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
    meta: ScanMeta | None = None,
    assignee: User | None = None,
) -> Scan:
    """Stores image + heatmaps, then the DB rows. If anything fails, objects
    already written are removed so no orphans are left behind."""
    meta = meta or ScanMeta()
    # rollback() expires ORM objects, so keep plain values for after the try.
    user_id, patient_id, org_id = user.id, patient.id, patient.organisation_id
    code = patient.patient_code
    assignee_id = assignee.id if assignee else None
    assignee_name = assignee.full_name if assignee else None
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
            organisation_id=org_id,
            image_key=image_key, image_sha256=image_sha256,
            content_type="image/png", size_bytes=len(image_png),
            status=ScanStatus.completed, findings=findings,
            priority=meta.priority, projection=meta.projection,
            exam_date=meta.exam_date, clinical_notes=meta.clinical_notes,
            assigned_to_id=assignee_id,
        )
        session.add(scan)
        # Write the scan and its findings first. The feed entry below points at the
        # scan by foreign key only (no ORM relationship), so SQLAlchemy would not
        # order the inserts for us, and Postgres rejects a row that points at a
        # scan that does not exist yet.
        await session.flush()
        audit(session, "scan.create", user_id=user_id,
              resource_type="scan", resource_id=scan_id, ip=ip)
        activity_service.record(
            session, organisation_id=org_id, type="scan_uploaded", actor_id=user_id,
            scan_id=scan_id, message=f"Scan uploaded for {code}",
        )
        if assignee_id:
            activity_service.record(
                session, organisation_id=org_id, type="scan_assigned", actor_id=user_id,
                scan_id=scan_id,
                message=f"Scan for {code} assigned to {assignee_name}",
            )
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
    if scan is None or scan.organisation_id != user.organisation_id:
        raise AppError(404, "Scan not found")  # other organisation: same 404
    return scan


async def list_scans(
    session: AsyncSession, user: User, *,
    patient_id: uuid.UUID | None = None,
    review_status: str | None = None,
    priority: str | None = None,
    assigned_to_id: uuid.UUID | None = None,
    flagged: bool | None = None,
    limit: int = 50, offset: int = 0,
) -> list[Scan]:
    """Scans in the caller's organisation, newest first, optionally filtered."""
    if patient_id is not None:
        await get_accessible_patient(session, user, patient_id)  # 404 if not ours
    stmt = select(Scan).where(Scan.organisation_id == user.organisation_id)
    if patient_id is not None:
        stmt = stmt.where(Scan.patient_id == patient_id)
    if review_status is not None:
        stmt = stmt.where(Scan.review_status == review_status)
    if priority is not None:
        stmt = stmt.where(Scan.priority == priority)
    if assigned_to_id is not None:
        stmt = stmt.where(Scan.assigned_to_id == assigned_to_id)
    if flagged is True:
        stmt = stmt.where(flagged_scan_clause())
    elif flagged is False:
        stmt = stmt.where(~flagged_scan_clause())
    stmt = stmt.order_by(Scan.created_at.desc(), Scan.id).limit(limit).offset(offset)
    return list((await session.exec(stmt)).all())


async def to_out(session: AsyncSession, scans: list[Scan]) -> list[ScanOut]:
    """Build ScanOut objects with one query for all the people they mention."""
    ids = {
        uid for sc in scans
        for uid in (sc.uploaded_by_id, sc.assigned_to_id, sc.reviewed_by_id) if uid
    }
    users = {}
    if ids:
        users = {u.id: u for u in (await session.exec(select(User).where(User.id.in_(ids)))).all()}
    return [ScanOut.from_scan(sc, users) for sc in scans]


async def update_scan(
    session: AsyncSession, user: User, scan_id: uuid.UUID, body: ScanUpdate, ip: str | None
) -> Scan:
    scan = await get_accessible_scan(session, user, scan_id)
    fields = body.model_fields_set
    if not fields:
        raise AppError(422, "No fields to update")
    patient = await session.get(Patient, scan.patient_id)
    code, org_id, sid = patient.patient_code, user.organisation_id, scan.id

    if "priority" in fields:
        scan.priority = body.priority

    if "assigned_to_id" in fields:
        if body.assigned_to_id is None:
            scan.assigned_to_id = None
        else:
            assignee = await validate_assignee(session, user, body.assigned_to_id)
            if scan.assigned_to_id != assignee.id:
                activity_service.record(
                    session, organisation_id=org_id, type="scan_assigned", actor_id=user.id,
                    scan_id=sid,
                    message=f"Scan for {code} assigned to {assignee.full_name}",
                )
            scan.assigned_to_id = assignee.id

    if "review_status" in fields:
        if body.review_status == "reviewed":
            if scan.review_status != "reviewed":  # first review wins; who did it stays recorded
                scan.review_status = "reviewed"
                scan.reviewed_at = utcnow()
                scan.reviewed_by_id = user.id
                activity_service.record(
                    session, organisation_id=org_id, type="scan_reviewed", actor_id=user.id,
                    scan_id=sid, message=f"Scan for {code} marked as reviewed",
                )
        else:
            final = (await session.exec(
                select(Report.id).where(Report.scan_id == sid, Report.status == "final")
            )).first()
            if final is not None:
                raise AppError(409, "A finalised report exists, so the scan stays reviewed")
            scan.review_status = "pending"
            scan.reviewed_at = None
            scan.reviewed_by_id = None

    audit(session, "scan.update", user_id=user.id, resource_type="scan", resource_id=sid, ip=ip)
    session.add(scan)
    await session.commit()
    return scan
