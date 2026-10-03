from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TopicAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=160)
    confidence: float = Field(ge=0, le=1)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = " ".join(value.split()).title()
        if not normalized:
            raise ValueError("Topic name cannot be blank")
        return normalized


class ComplaintAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: str = Field(min_length=1, max_length=160)
    severity: Literal["low", "medium", "high", "critical"]
    confidence: float = Field(ge=0, le=1)

    @field_validator("category")
    @classmethod
    def normalize_category(cls, value: str) -> str:
        normalized = " ".join(value.split()).title()
        if not normalized:
            raise ValueError("Complaint category cannot be blank")
        return normalized


class ReviewAnalysisOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sentiment: Literal["positive", "neutral", "negative"]
    sentiment_score: float = Field(ge=-1, le=1)
    sentiment_confidence: float = Field(ge=0, le=1)
    topics: list[TopicAnalysis] = Field(max_length=12)
    complaints: list[ComplaintAnalysis] = Field(max_length=8)

    @field_validator("topics")
    @classmethod
    def unique_topics(cls, values: list[TopicAnalysis]) -> list[TopicAnalysis]:
        names = [item.name.casefold() for item in values]
        if len(names) != len(set(names)):
            raise ValueError("Topic names must be unique")
        return values

    @field_validator("complaints")
    @classmethod
    def unique_complaints(
        cls,
        values: list[ComplaintAnalysis],
    ) -> list[ComplaintAnalysis]:
        names = [item.category.casefold() for item in values]
        if len(names) != len(set(names)):
            raise ValueError("Complaint categories must be unique")
        return values
