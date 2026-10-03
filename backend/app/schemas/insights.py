from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

from app.schemas.review import Review


class Topic(BaseModel):
    id: str
    name: str
    mentions: int
    positive_pct: float
    neutral_pct: float
    negative_pct: float
    keywords: list[str]
    trend: Literal["rising", "stable", "falling"]
    trend_pct: float
    sample_review_ids: list[str]


class Complaint(BaseModel):
    id: str
    category: str
    active_count: int
    severity: Literal["low", "medium", "high", "critical"]
    trend: Literal["rising", "stable", "falling"]
    trend_pct: float
    description: str
    example_review_ids: list[str]
    status: Literal["open", "investigating", "resolved"]


class Insight(BaseModel):
    id: str
    kind: Literal["trend_detected", "opportunity", "alert", "anomaly", "summary"]
    title: str
    summary: str
    confidence: float
    impact: Literal["low", "medium", "high", "critical"]
    topic_id: str | None = None
    product_id: str | None = None
    generated_at: str
    is_new: bool


class ModelMetric(BaseModel):
    name: str
    accuracy: float
    precision: float
    recall: float
    f1: float
    macro_f1: float
    latency_avg_ms: int
    latency_p95_ms: int
    drift: float
    last_retrained: str
    status: Literal["online", "degraded", "offline", "maintenance"]


class ModelComponent(BaseModel):
    id: str
    name: str
    status: Literal["online", "degraded", "offline", "maintenance"]
    metric: str | None = None
    metric_value: float | None = None
    last_checked: str


class ModelHealth(BaseModel):
    overall_status: Literal["online", "degraded", "offline", "maintenance"]
    reviews_processed_today: int
    queue_depth: int
    last_validation: str
    components: list[ModelComponent]
    sentiment_model: ModelMetric
    topic_model: ModelMetric
    complaint_classifier: ModelMetric
    drift_score: float
    model_history: list[dict]


class KPIDelta(BaseModel):
    value: float
    pct: float
    direction: Literal["up", "down", "flat"]
    is_positive: bool
    comparison_label: str


class KPICard(BaseModel):
    id: str
    label: str
    value: float
    formatted_value: str
    delta: KPIDelta
    sparkline: list[float]
    unit: str | None = None


class SentimentDataPoint(BaseModel):
    date: str
    positive: float
    neutral: float
    negative: float
    review_count: int


class SentimentSummary(BaseModel):
    positive: float
    neutral: float
    negative: float
    total_reviews: int
    trend: list[SentimentDataPoint]


class AnalyticsSummary(BaseModel):
    total_reviews: KPICard
    average_rating: KPICard
    positive_sentiment: KPICard
    neutral_sentiment: KPICard
    negative_sentiment: KPICard
    active_complaints: KPICard
    sentiment: SentimentSummary
    topics: list[Topic]
    complaints: list[Complaint]
    recent_insights: list[Insight]
    spotlight_review: Review | None = None
    model_health: ModelHealth
    rating_distribution: dict[str, int]
    source_breakdown: dict[str, int]
    product_breakdown: dict[str, int]
