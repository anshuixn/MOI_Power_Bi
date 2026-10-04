from __future__ import annotations

from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(word.capitalize() for word in rest)


class APIModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class Result(BaseModel, Generic[T]):
    status: Literal["success", "error", "loading", "empty"]
    data: T | None = None
    error: str | None = None
    code: int | None = None
    details: list[dict[str, object]] | None = None

    model_config = ConfigDict(extra="forbid")


class FilterState(BaseModel):
    date_range: Literal["last_7_days", "last_30_days", "last_90_days", "custom"] = "last_30_days"
    custom_date_start: str | None = None
    custom_date_end: str | None = None
    product_id: str | None = None
    source: str | None = None


class PaginatedResult(APIModel, Generic[T]):
    items: list[T]
    total: int
    page: int = 1
    page_size: int = 10
    page_count: int = 1


class ReviewFilterOptions(BaseModel):
    search: str | None = None
    sentiment: str | None = None
    rating: int | None = None
    topic_id: str | None = None
    page: int = 1
    page_size: int = 10
    sort_by: Literal["date", "rating", "confidence"] = "date"
    sort_order: Literal["asc", "desc"] = "desc"


class InsightFilterOptions(BaseModel):
    kind: str | None = None
    impact: str | None = None
    topic_id: str | None = None
    product_id: str | None = None
    min_confidence: float | None = None
