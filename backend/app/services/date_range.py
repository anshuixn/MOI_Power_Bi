from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from app.core.exceptions import InvalidRequestError


def date_window(filters: dict[str, Any]) -> dict[str, str]:
    today = datetime.now(timezone.utc).date()
    date_range = filters.get("date_range", "last_30_days")
    if date_range == "custom":
        start_value = filters.get("custom_date_start")
        end_value = filters.get("custom_date_end")
        if not start_value or not end_value:
            raise InvalidRequestError(
                "dateStart and dateEnd are required when dateRange is custom"
            )
        start = date.fromisoformat(start_value)
        end = date.fromisoformat(end_value)
        if end < start:
            raise InvalidRequestError("dateEnd must be on or after dateStart")
    else:
        days = {"last_7_days": 7, "last_30_days": 30, "last_90_days": 90}.get(
            date_range
        )
        if days is None:
            raise InvalidRequestError("Unsupported dateRange")
        end = today
        start = end - timedelta(days=days - 1)

    return {
        "start_at": datetime.combine(start, time.min, timezone.utc).isoformat(),
        "end_at": datetime.combine(
            end + timedelta(days=1), time.min, timezone.utc
        ).isoformat(),
    }
