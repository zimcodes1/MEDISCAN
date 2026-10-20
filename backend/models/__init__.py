"""Import every model here so SQLModel.metadata (and Alembic) sees all tables."""
from backend.models.audit import AuditLog
from backend.models.organisation import Organisation
from backend.models.patient import Patient
from backend.models.scan import Finding, Scan, ScanStatus
from backend.models.token import RefreshToken
from backend.models.user import User, UserRole

__all__ = [
    "AuditLog", "Finding", "Organisation", "Patient", "RefreshToken",
    "Scan", "ScanStatus", "User", "UserRole",
]
