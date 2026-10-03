from __future__ import annotations

import argparse
import logging
import time
from typing import Sequence

from app.core.config import Settings, settings
from app.integrations.ai_provider import create_analysis_provider
from app.integrations.supabase import create_worker_client
from app.repositories.supabase_analysis_job_repository import (
    SupabaseAnalysisJobRepository,
)
from app.services.review_analysis_service import ReviewAnalysisService

logger = logging.getLogger(__name__)


def create_worker(config: Settings = settings) -> ReviewAnalysisService:
    client = create_worker_client(config)
    return ReviewAnalysisService(
        repository=SupabaseAnalysisJobRepository(client),
        provider=create_analysis_provider(config),
        settings=config,
    )


def run_worker(
    worker: ReviewAnalysisService,
    once: bool = False,
    poll_seconds: float = 5,
) -> None:
    while True:
        result = worker.process_next()
        logger.info(
            "Analysis worker iteration status=%s job_id=%s review_id=%s",
            result["status"],
            result.get("job_id", "none"),
            result.get("review_id", "none"),
        )
        if once:
            return
        if result["status"] == "idle":
            time.sleep(poll_seconds)


def main(arguments: Sequence[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Process queued ReviewBand analysis jobs")
    parser.add_argument(
        "--once",
        action="store_true",
        help="Process at most one ready job and exit",
    )
    parser.add_argument(
        "--poll-seconds",
        type=float,
        default=5,
        help="Idle delay for continuous worker mode",
    )
    options = parser.parse_args(arguments)
    if options.poll_seconds < 0.1:
        parser.error("--poll-seconds must be at least 0.1")
    run_worker(create_worker(), once=options.once, poll_seconds=options.poll_seconds)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
