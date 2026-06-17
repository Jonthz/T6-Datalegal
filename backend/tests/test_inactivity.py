"""Tests for US-RF02-2: Session closure by inactivity."""

from datetime import datetime, timedelta, timezone

from tests.conftest import auth_headers


def test_active_session_works(client, dpo_user, dpo_token):
    """A freshly-issued token with no inactivity should succeed."""
    resp = client.get("/api/v1/treatment-activities", headers=auth_headers(dpo_token))
    assert resp.status_code == 200


def test_session_expired_by_inactivity(client, session, dpo_user, dpo_token):
    """Simulate inactivity by backdating last_activity_at by 35 min."""
    # Set last_activity_at to 35 minutes ago
    stale_time = datetime.now(timezone.utc) - timedelta(minutes=35)
    dpo_user.last_activity_at = stale_time
    session.flush()

    resp = client.get("/api/v1/treatment-activities", headers=auth_headers(dpo_token))
    assert resp.status_code == 401
    assert "inactivity" in resp.json()["detail"].lower()


def test_activity_refreshes_last_activity(client, session, dpo_user, dpo_token):
    """Each request should update last_activity_at."""
    resp = client.get("/api/v1/treatment-activities", headers=auth_headers(dpo_token))
    assert resp.status_code == 200
    session.refresh(dpo_user)
    assert dpo_user.last_activity_at is not None
