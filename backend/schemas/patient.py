import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator


class PatientCreate(BaseModel):
    sex: Literal["female", "male", "other", "unknown"] | None = None
    year_of_birth: int | None = None

    @field_validator("year_of_birth")
    @classmethod
    def _plausible_year(cls, v: int | None) -> int | None:
        if v is not None and not (1900 <= v <= date.today().year):
            raise ValueError("year_of_birth is out of range")
        return v


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_code: str
    sex: str | None
    year_of_birth: int | None
    created_at: datetime
