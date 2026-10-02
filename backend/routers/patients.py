import uuid

from fastapi import APIRouter, Depends, Query, Request
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import get_session
from backend.core.deps import get_current_user
from backend.core.net import client_ip
from backend.models import User
from backend.schemas.patient import PatientCreate, PatientOut
from backend.services import patient_service

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("", response_model=PatientOut, status_code=201)
async def create_patient(
    body: PatientCreate, request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    ip = client_ip(request)
    return await patient_service.create_patient(session, user, body, ip)


@router.get("", response_model=list[PatientOut])
async def list_patients(
    limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await patient_service.list_patients(session, user, limit, offset)


@router.get("/{patient_id}", response_model=PatientOut)
async def get_patient(
    patient_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await patient_service.get_accessible_patient(session, user, patient_id)
