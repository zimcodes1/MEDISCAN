"""Structured reports (api-contract.md section 7).

One report per scan. Saving creates or updates the draft; finalising validates,
locks the report forever and marks the scan reviewed. Report text is patient
data: nothing in this module logs it, and the audit log and activity feed only
ever receive ids and the patient code."""
import uuid

from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.errors import AppError
from backend.models import Patient, Report, Scan, User
from backend.models.base import utcnow
from backend.schemas.report import ReportOut, ReportSummary, ReportUpdate
from backend.schemas.scan import UserRef
from backend.services import activity_service, notification_service
from backend.services.auth_service import audit
from backend.services.scan_service import get_accessible_scan

TEXT_FIELDS = {
    "detailed_findings", "secondary_findings", "impression_narrative", "additional_notes",
}


async def _find(session: AsyncSession, scan_id: uuid.UUID, lock: bool = False) -> Report | None:
    stmt = select(Report).where(Report.scan_id == scan_id)
    if lock:
        stmt = stmt.with_for_update()  # Postgres row lock; a no-op on SQLite
    return (await session.exec(stmt)).first()


async def _out(session: AsyncSession, report: Report) -> ReportOut:
    author = await session.get(User, report.author_id)
    return ReportOut.of(report, UserRef(id=author.id, full_name=author.full_name))


def _apply(report: Report, data: dict) -> None:
    for key, value in data.items():
        if key in TEXT_FIELDS and value is None:
            value = ""
        if key == "lung_fields":
            value = list(value or [])  # a new list, so the JSON column notices the change
        setattr(report, key, value)
    report.updated_at = utcnow()


async def get_report(
    session: AsyncSession, user: User, scan_id: uuid.UUID, ip: str | None
) -> ReportOut:
    scan = await get_accessible_scan(session, user, scan_id)  # 404 for other organisations
    report = await _find(session, scan.id)
    if report is None:
        raise AppError(404, "Report not found")
    audit(session, "report.view", user_id=user.id, resource_type="report",
          resource_id=report.id, ip=ip)
    await session.commit()
    return await _out(session, report)


async def save_draft(
    session: AsyncSession, user: User, scan_id: uuid.UUID, body: ReportUpdate, ip: str | None
) -> ReportOut:
    scan = await get_accessible_scan(session, user, scan_id)
    # rollback() expires ORM objects, so keep plain values for the retry path.
    sid, org_id, user_id = scan.id, scan.organisation_id, user.id
    data = body.model_dump(exclude_unset=True)

    report = await _find(session, sid, lock=True)
    if report is not None and report.status == "final":
        raise AppError(409, "Report is already finalised")

    if report is None:
        report = Report(scan_id=sid, organisation_id=org_id, author_id=user_id)
        _apply(report, data)
        session.add(report)
        audit(session, "report.save", user_id=user_id, resource_type="report",
              resource_id=report.id, ip=ip)
        try:
            await session.commit()
        except IntegrityError:
            # Two first saves raced; the other one won. Update its row instead.
            await session.rollback()
            report = await _find(session, sid, lock=True)
            if report is None:
                raise
            if report.status == "final":
                raise AppError(409, "Report is already finalised")
            _apply(report, data)
            audit(session, "report.save", user_id=user_id, resource_type="report",
                  resource_id=report.id, ip=ip)
            await session.commit()
    else:
        _apply(report, data)
        audit(session, "report.save", user_id=user_id, resource_type="report",
              resource_id=report.id, ip=ip)
        await session.commit()
    return await _out(session, report)


def missing_for_finalise(report: Report) -> list[str]:
    missing = []
    if not report.primary_impression:
        missing.append("primary_impression")
    if not report.recommended_action:
        missing.append("recommended_action")
    if not report.ai_agreement:
        missing.append("ai_agreement")
    elif report.ai_agreement != "agree" and not (report.ai_disagreement_reason or "").strip():
        missing.append("ai_disagreement_reason")
    return missing


async def finalise(
    session: AsyncSession, user: User, scan_id: uuid.UUID, ip: str | None
) -> ReportOut:
    scan = await get_accessible_scan(session, user, scan_id)
    report = await _find(session, scan.id, lock=True)
    if report is None:
        raise AppError(404, "Report not found")
    if report.status == "final":
        raise AppError(409, "Report is already finalised")
    missing = missing_for_finalise(report)
    if missing:
        raise AppError(422, "Missing: " + ", ".join(missing))

    now = utcnow()
    patient = await session.get(Patient, scan.patient_id)
    code, org_id, user_id = patient.patient_code, scan.organisation_id, user.id
    report.status = "final"
    report.finalised_at = now
    report.updated_at = now
    if scan.review_status != "reviewed":  # finalising a report marks the scan reviewed
        scan.review_status = "reviewed"
        scan.reviewed_at = now
        scan.reviewed_by_id = user_id
        session.add(scan)
    audit(session, "report.finalise", user_id=user_id, resource_type="report",
          resource_id=report.id, ip=ip)
    activity_service.record(
        session, organisation_id=org_id, type="report_finalised", actor_id=user_id,
        scan_id=scan.id, message=f"Report finalised for {code}",
    )
    await notification_service.notify(
        session, recipient_ids=[scan.uploaded_by_id, scan.assigned_to_id],
        organisation_id=org_id, type="report_finalised", actor_id=user_id, scan_id=scan.id,
        message=f"Report for {code} was finalised by {user.full_name}",
    )
    await session.commit()
    return await _out(session, report)


async def list_reports(
    session: AsyncSession, user: User, status: str | None, limit: int, offset: int
) -> list[ReportSummary]:
    stmt = (
        select(Report, Patient.patient_code, User)
        .join(Scan, Scan.id == Report.scan_id)
        .join(Patient, Patient.id == Scan.patient_id)
        .join(User, User.id == Report.author_id)
        .where(Report.organisation_id == user.organisation_id)
    )
    if status is not None:
        stmt = stmt.where(Report.status == status)
    stmt = stmt.order_by(Report.updated_at.desc(), Report.id).limit(limit).offset(offset)
    return [
        ReportSummary(
            id=r.id, scan_id=r.scan_id, patient_code=code, status=r.status,
            author=UserRef(id=a.id, full_name=a.full_name),
            primary_impression=r.primary_impression, created_at=r.created_at,
            updated_at=r.updated_at, finalised_at=r.finalised_at,
        )
        for r, code, a in (await session.exec(stmt)).all()
    ]
