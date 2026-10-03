from __future__ import annotations

from ipaddress import IPv4Address, AddressValueError
import re
import unicodedata

from app.schemas.pii import DetectedPII, PIIProcessingResult


_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("email", re.compile(r"(?<![\w.+-])[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}(?![\w.-])")),
    (
        "url",
        re.compile(
            r"\b(?:(?:https?://|www\.)[^\s<>]+|"
            r"(?:[a-z0-9-]+\.)+[a-z]{2,}(?:/[^\s<>]*)?)",
            re.IGNORECASE,
        ),
    ),
    ("ssn", re.compile(r"(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)")),
    (
        "ip_address",
        re.compile(
            r"(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?!\d|\.\d)"
        ),
    ),
    (
        "address",
        re.compile(
            r"\b\d{1,6}\s+(?:[A-Za-z0-9.'-]+\s+){0,5}"
            r"(?:street|st|avenue|ave|road|rd|boulevard|blvd|"
            r"lane|ln|drive|dr|court|ct|place|pl|way)\b"
            r"(?:[,\s]+(?:apt|apartment|unit|suite|#)\s*[\w-]+)?",
            re.IGNORECASE,
        ),
    ),
    ("phone", re.compile(r"(?<!\w)\+?\d(?:[\d(). -]{7,}\d)(?!\w)")),
)


class PIIProtectionService:
    """Redacts direct identifiers before review text can reach an AI provider."""

    def process(self, text: str) -> PIIProcessingResult:
        normalized = " ".join(
            unicodedata.normalize("NFC", text).replace("\ufeff", "").split()
        )
        detected: list[DetectedPII] = []
        for identifier_type, pattern in _PATTERNS:
            count = 0

            def redact(match: re.Match[str]) -> str:
                nonlocal count
                if identifier_type == "phone":
                    digits = sum(character.isdigit() for character in match.group())
                    if not 10 <= digits <= 15:
                        return match.group()
                if identifier_type == "ip_address":
                    try:
                        IPv4Address(match.group())
                    except AddressValueError:
                        return match.group()
                count += 1
                return "[REDACTED]"

            normalized = pattern.sub(redact, normalized)
            if count:
                detected.append({"type": identifier_type, "field": "review_text"})
        return {"sanitized_text": normalized, "detected_pii": detected}
