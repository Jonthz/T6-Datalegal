"""Centralized legal-deadline (SLA) computation, shared across modules.

Previously the ARCO stoplight and the reports on-time percentage each
re-implemented the same overdue/deadline arithmetic. This module is the
single source of truth for "is this legal deadline green/yellow/red" so
future deadline types (audits, consents) can reuse it instead of
duplicating the rule.
"""

from datetime import date

# Stoplight thresholds, in days remaining until the deadline.
YELLOW_THRESHOLD_DAYS = 7
APPROACHING_ALERT_DAYS = 3


def compute_stoplight(deadline_date: date, today: date | None = None) -> tuple[str, int]:
    """Return (stoplight, days_remaining) for an open (non-terminal) deadline.

    GREEN: more than YELLOW_THRESHOLD_DAYS days left.
    YELLOW: between 0 and YELLOW_THRESHOLD_DAYS days left. The deadline day
        itself (days_remaining == 0) is still within the legal term, so it is
        treated as a last-chance YELLOW rather than RED. This keeps the
        stoplight consistent with is_overdue() and is_approaching(), which both
        treat the deadline day as on-time/approaching.
    RED: the deadline has passed (overdue).
    """
    today = today or date.today()
    days_remaining = (deadline_date - today).days
    if days_remaining > YELLOW_THRESHOLD_DAYS:
        stoplight = "GREEN"
    elif days_remaining >= 0:
        stoplight = "YELLOW"
    else:
        stoplight = "RED"
    return stoplight, days_remaining


def is_overdue(deadline_date: date, today: date | None = None) -> bool:
    """Return whether a deadline has passed (used for open/non-terminal items)."""
    today = today or date.today()
    return deadline_date < today


def is_approaching(
    deadline_date: date, today: date | None = None, within_days: int = APPROACHING_ALERT_DAYS
) -> bool:
    """Return whether a deadline falls within the next `within_days` days (inclusive)."""
    today = today or date.today()
    days_remaining = (deadline_date - today).days
    return 0 <= days_remaining <= within_days


def is_on_time(responded_date: date | None, deadline_date: date) -> bool:
    """Return whether a terminal item was completed on or before its deadline."""
    return responded_date is not None and responded_date <= deadline_date
