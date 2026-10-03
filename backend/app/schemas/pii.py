from __future__ import annotations

from typing import TypedDict


class DetectedPII(TypedDict):
    type: str
    field: str


class PIIProcessingResult(TypedDict):
    sanitized_text: str
    detected_pii: list[DetectedPII]
