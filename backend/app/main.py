from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.middleware import SecurityHeadersMiddleware
from app.core.rate_limit import limiter, rate_limit_exceeded_handler

_is_prod = settings.ENVIRONMENT == "production"
_docs_enabled = settings.SHOW_DOCS and not _is_prod

app = FastAPI(
    title="DataLegal 2.0 API",
    description="Multi-tenant LOPDP compliance platform",
    version="0.1.0",
    docs_url="/api/docs" if _docs_enabled else None,
    redoc_url="/api/redoc" if _docs_enabled else None,
    openapi_url="/api/openapi.json" if _docs_enabled else None,
)

# Rate limiter (slowapi). Endpoints opt in via @limiter.limit decorator.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# CORS — dev/test allow "*" without credentials; prod requires explicit origins.
_origins = settings.cors_origins_list
if _is_prod:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins if _origins else ["*"],
        # `*` is invalid with credentials per the CORS spec; keep credentials
        # off in dev so the wildcard actually works in a browser.
        allow_credentials=bool(_origins),
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.add_middleware(SecurityHeadersMiddleware)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
def health_check():
    """Handle health check."""
    return {"status": "ok", "version": "0.1.0", "environment": settings.ENVIRONMENT}
