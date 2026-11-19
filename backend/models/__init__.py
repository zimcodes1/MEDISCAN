"""Import every model here so SQLModel.metadata (and Alembic) sees all tables."""
from backend.models.audit import AuditLog
from backend.models.patient import Patient
from backend.models.scan import Finding, Scan, ScanStatus
from backend.models.token import RefreshToken
from backend.models.user import User, UserRole

__all__ = [
    "AuditLog", "Finding", "Patient", "RefreshToken",
    "Scan", "ScanStatus", "User", "UserRole",
]
