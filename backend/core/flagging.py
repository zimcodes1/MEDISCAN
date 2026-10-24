"""Which findings are flagged.

A finding is flagged when it is non-experimental and its raw model score is at
or above the threshold for its condition (`FLAG_THRESHOLDS`, falling back to
`FLAG_DEFAULT_THRESHOLD`). A scan is flagged when any finding is.

The same rule exists twice on purpose: `finding_is_flagged` for one loaded
finding, `flagged_scan_clause` as SQL for counting and filtering. Tests keep
them in agreement."""
from sqlalchemy import and_, or_
from sqlalchemy.sql.elements import ColumnElement
from sqlmodel import select

from backend.core.config import get_settings
from backend.models import Finding, Scan


def threshold_for(condition: str) -> float:
    s = get_settings()
    return s.flag_thresholds.get(condition, s.flag_default_threshold)


def finding_is_flagged(condition: str, score: float, experimental: bool) -> bool:
    return (not experimental) and score >= threshold_for(condition)


def flagged_scan_clause() -> ColumnElement[bool]:
    """EXISTS(...) for use inside a query that selects from `Scan`."""
    s = get_settings()
    per_condition = [
        and_(Finding.condition == cond, Finding.score >= t)
        for cond, t in s.flag_thresholds.items()
    ]
    others = Finding.score >= s.flag_default_threshold
    if s.flag_thresholds:
        others = and_(Finding.condition.notin_(list(s.flag_thresholds)), others)
    return (
        select(Finding.id)
        .where(
            Finding.scan_id == Scan.id,
            Finding.experimental.is_(False),
            or_(*per_condition, others),
        )
        .exists()
    )
