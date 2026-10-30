import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import get_session
from backend.core.deps import get_current_user
from backend.core.net import client_ip
from backend.models import User
from backend.schemas.report import ReportOut, ReportSummary, ReportUpdate
from backend.services import report_service

router = APIRouter(tags=["reports"])


@router.get("/scans/{scan_id}/report", response_model=ReportOut)
async def get_report(
    scan_id: uuid.UUID, request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """The report for a scan, or 404 if none has been started."""
    return await report_service.get_report(session, user, scan_id, client_ip(request))


@router.put("/scans/{scan_id}/report", response_model=ReportOut)
async def save_report(
    scan_id: uuid.UUID, body: ReportUpdate, request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create or update the draft. Only the fields sent are changed. 409 once final."""
    return await report_service.save_draft(session, user, scan_id, body, client_ip(request))


@router.post("/scans/{scan_id}/report/finalise", response_model=ReportOut)
async def finalise_report(
    scan_id: uuid.UUID, request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Validate, lock the report for good, and mark the scan reviewed."""
    return await report_service.finalise(session, user, scan_id, client_ip(request))


@router.get("/reports", response_model=list[ReportSummary])
async def list_reports(
    status: Literal["draft", "final"] | None = None,
    limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Report summaries for your organisation, most recently updated first."""
    return await report_service.list_reports(session, user, status, limit, offset)
