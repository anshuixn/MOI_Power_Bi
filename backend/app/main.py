from __future__ import annotations

import logging
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import analytics, complaints, insights, reviews, topics
from app.core.config import settings
from app.core.exceptions import InvalidRequestError, ResourceNotFoundError
from app.core.logging import configure_logging
from app.schemas.common import Result

configure_logging()
logger = logging.getLogger(__name__)
app = FastAPI(title="ReviewBand API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_v1_routers = (
    analytics.router,
    reviews.router,
    topics.router,
    complaints.router,
    insights.router,
)
for api_router in api_v1_routers:
    app.include_router(api_router, prefix="/api/v1")
    app.include_router(api_router)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = str(uuid4())
    request.state.request_id = request_id
    started = perf_counter()
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "Request completed request_id=%s method=%s path=%s status_code=%s duration_ms=%.2f",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        (perf_counter() - started) * 1000,
    )
    return response


@app.exception_handler(ResourceNotFoundError)
async def resource_not_found_handler(request: Request, exc: ResourceNotFoundError):
    logger.info(
        "Requested resource was not found request_id=%s path=%s",
        request.state.request_id,
        request.url.path,
    )
    return JSONResponse(
        status_code=404,
        content=Result(
            status="error",
            error=str(exc),
            code=404,
        ).model_dump(exclude_none=True),
    )


@app.exception_handler(InvalidRequestError)
async def invalid_request_handler(request: Request, exc: InvalidRequestError):
    logger.warning(
        "Invalid API request request_id=%s path=%s",
        request.state.request_id,
        request.url.path,
    )
    return JSONResponse(
        status_code=422,
        content=Result(
            status="error",
            error=str(exc),
            code=422,
        ).model_dump(exclude_none=True),
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.warning(
        "HTTP request failed request_id=%s path=%s status_code=%s",
        request.state.request_id,
        request.url.path,
        exc.status_code,
    )
    message = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return JSONResponse(
        status_code=exc.status_code,
        headers=exc.headers,
        content=Result(
            status="error",
            error=message,
            code=exc.status_code,
        ).model_dump(exclude_none=True),
    )


@app.exception_handler(RequestValidationError)
async def request_validation_handler(request: Request, exc: RequestValidationError):
    logger.warning(
        "Request validation failed request_id=%s path=%s",
        request.state.request_id,
        request.url.path,
    )
    details = [
        {
            "location": [str(part) for part in error["loc"]],
            "message": error["msg"],
            "type": error["type"],
        }
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content=Result(
            status="error",
            error="Request validation failed",
            code=422,
            details=details,
        ).model_dump(exclude_none=True),
    )


@app.exception_handler(Exception)
async def unexpected_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled request error request_id=%s path=%s",
        getattr(request.state, "request_id", None),
        request.url.path,
        exc_info=(type(exc), exc, exc.__traceback__),
    )
    return JSONResponse(
        status_code=500,
        content=Result(
            status="error",
            error="Internal server error",
            code=500,
        ).model_dump(exclude_none=True),
    )


@app.get("/api/v1/health")
@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}
