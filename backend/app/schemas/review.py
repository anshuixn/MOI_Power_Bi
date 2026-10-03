from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class PIIStatus(BaseModel):
    is_clean: bool
    redacted_fields: list[str] = Field(default_factory=list)
    detected_entities: list[str] = Field(default_factory=list)
    processed_at: str | None = None


class SentimentScore(BaseModel):
    label: Literal["positive", "neutral", "negative"]
    positive: float
    neutral: float
    negative: float
    confidence: float


class Review(BaseModel):
    id: str
    text: str
    rating: int
    product_id: str | None = None
    product_name: str
    source: Literal["web_store", "mobile_app", "marketplace", "survey", "social"]
    date: str
    author_initial: str | None = None
    sentiment: SentimentScore | None = None
    topic_ids: list[str]
    complaint_id: str | None = None
    pii_status: PIIStatus | None = None
    processing_status: Literal["pending", "queued", "processing", "processed", "failed", "skipped"] = "processed"


class Product(BaseModel):
    id: str
    name: str
    sku: str
    category: str
    image_url: str | None = None
