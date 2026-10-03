from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.analytics import router as analytics_router
from app.api.routes.complaints import router as complaints_router
from app.api.routes.insights import router as insights_router
from app.api.routes.reviews import router as reviews_router
from app.api.routes.topics import router as topics_router
from app.core.config import settings

app = FastAPI(title="ReviewBand API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics_router)
app.include_router(reviews_router)
app.include_router(topics_router)
app.include_router(complaints_router)
app.include_router(insights_router)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}
