"""
Thin API client used by the step definitions.

It hides whether we are talking to the FastAPI app in-process (default) or to a
real server over HTTP (when DATALEGAL_BASE_URL is set). Steps just call
context.api.post("/api/v1/...", token=..., json=...) and read .status_code /
.json() off the returned response — the interface is the same in both modes
because httpx.Response and starlette's TestClient response share that shape.
"""

import os


class ApiClient:
    """HTTP client wrapper for the acceptance suite (in-process or live)."""

    def __init__(self):
        """Build an in-process TestClient, or an httpx client if a base URL is set."""
        self.base_url = os.environ.get("DATALEGAL_BASE_URL", "").rstrip("/")
        self.live = bool(self.base_url)
        if self.live:
            import httpx

            self._client = httpx.Client(base_url=self.base_url, timeout=30.0)
        else:
            from fastapi.testclient import TestClient

            from app.main import app

            self._client = TestClient(app)

    def _headers(self, token, extra):
        """Merge an optional bearer token into the request headers."""
        headers = dict(extra or {})
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    def request(self, method, path, token=None, headers=None, **kwargs):
        """Send an HTTP request and return the response."""
        return self._client.request(
            method, path, headers=self._headers(token, headers), **kwargs
        )

    def get(self, path, token=None, **kw):
        """Send a GET request."""
        return self.request("GET", path, token=token, **kw)

    def post(self, path, token=None, **kw):
        """Send a POST request."""
        return self.request("POST", path, token=token, **kw)

    def patch(self, path, token=None, **kw):
        """Send a PATCH request."""
        return self.request("PATCH", path, token=token, **kw)

    def put(self, path, token=None, **kw):
        """Send a PUT request."""
        return self.request("PUT", path, token=token, **kw)

    def delete(self, path, token=None, **kw):
        """Send a DELETE request."""
        return self.request("DELETE", path, token=token, **kw)
