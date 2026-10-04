from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import APIModel

from app.schemas.review import Review


class Topic(APIModel):
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


class Complaint(APIModel):
    id: str
    category: str
    active_count: int
    severity: Literal["low", "medium", "high", "critical"]
    trend: Literal["rising", "stable", "falling"]
    trend_pct: float
    description: str
    example_review_ids: list[str]
    status: Literal["open", "investigating", "resolved"]
    mentions: int = 0
    affected_products: list[dict[str, str | int]] = Field(default_factory=list)
    affected_topics: list[dict[str, str | int]] = Field(default_factory=list)


class Insight(APIModel):
    id: str
    kind: Literal[
        "trend_detected",
        "opportunity",
        "alert",
        "anomaly",
        "summary",
        "sentiment_trend",
        "emerging_complaint",
        "product_issue",
        "topic_movement",
        "rating_change",
        "unusual_trend",
    ]
    title: str
    summary: str
    confidence: float
    impact: Literal["low", "medium", "high", "critical"]
    topic_id: str | None = None
    product_id: str | None = None
    complaint_id: str | None = None
    supporting_metrics: dict[str, Any] = Field(default_factory=dict)
    provider: str = "unknown"
    model: str = "unknown"
    model_version: str = "unknown"
    related_review_ids: list[str] = Field(default_factory=list)
    generated_at: str
    is_new: bool


class GeneratedInsight(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal[
        "sentiment_trend",
        "emerging_complaint",
        "product_issue",
        "topic_movement",
        "rating_change",
        "unusual_trend",
    ]
    evidence_key: str = Field(min_length=1, max_length=180)
    title: str = Field(min_length=1, max_length=240)
    summary: str = Field(min_length=1, max_length=2000)
    confidence: float = Field(ge=0, le=1)
    impact: Literal["low", "medium", "high", "critical"]

    @field_validator("title", "summary")
    @classmethod
    def prohibit_numeric_claims(cls, value: str) -> str:
        if any(character.isdigit() for character in value):
            raise ValueError("Generated insight text must not contain numeric claims")
        return value.strip()


class ModelHealth(APIModel):
    overall_status: Literal["online", "degraded", "offline", "unknown"]
    window_days: int
    reviews_processed: int
    successful_analyses: int
    failed_analyses: int
    queue_depth: int
    processing_latency_avg_ms: float | None
    processing_latency_p95_ms: float | None
    latency_sample_count: int
    model_versions: list[dict[str, Any]]
    confidence_distribution: dict[str, int]
    confidence_sample_count: int
    sentiment_distribution: dict[str, int]
    topic_distribution: list[dict[str, Any]]
    complaint_distribution: list[dict[str, Any]]
    drift_available: bool
    drift_method: str
    drift_score: float | None
    drift_sample_count: int
    generated_at: str


class KPIDelta(APIModel):
    value: float
    pct: float
    direction: Literal["up", "down", "flat"]
    is_positive: bool
    comparison_label: str


class KPICard(APIModel):
    id: str
    label: str
    value: float
    formatted_value: str
    delta: KPIDelta
    sparkline: list[float]
    unit: str | None = None


class SentimentDataPoint(APIModel):
    date: str
    positive: float
    neutral: float
    negative: float
    review_count: int


class SentimentSummary(APIModel):
    positive: float
    neutral: float
    negative: float
    total_reviews: int
    trend: list[SentimentDataPoint]


class ReviewVolumeDataPoint(APIModel):
    date: str
    review_count: int


class ProductComparison(APIModel):
    product_id: str
    product_name: str
    review_count: int
    average_rating: float


class SourceComparison(APIModel):
    source: str
    review_count: int
    average_rating: float


class AnalyticsSummary(APIModel):
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
    model_health: ModelHealth | None = None
    rating_distribution: dict[str, int]
    source_breakdown: dict[str, int]
    product_breakdown: dict[str, int]
    review_volume: list[ReviewVolumeDataPoint] = Field(default_factory=list)
    product_comparison: list[ProductComparison] = Field(default_factory=list)
    source_comparison: list[SourceComparison] = Field(default_factory=list)
