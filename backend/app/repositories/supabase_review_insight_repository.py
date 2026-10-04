from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from httpx import HTTPError
from postgrest.exceptions import APIError
from supabase import Client

from app.core.exceptions import DatabaseOperationError, InvalidRequestError
from app.repositories.review_insight_repository import DataRecord

_REVIEW_FIELDS = (
    "id,external_id,rating,product_id,source_id,review_date,"
    "processing_status,"
    "product:products(name),source:sources(code),"
    "analysis:review_analysis(sentiment,sentiment_score,sentiment_confidence,"
    "sanitized_text,detected_pii,processed_at),"
    "topic_links:review_topics(topic_id,confidence),"
    "complaint_links:review_complaints(complaint_id,confidence)"
)


class SupabaseReviewInsightRepository:
    """Supabase PostgREST adapter scoped to one authenticated organization."""

    def __init__(
        self,
        client: Client,
        organization_id: UUID,
        insight_write_client: Client | None = None,
    ) -> None:
        self._client = client
        self._insight_write_client = insight_write_client
        self._organization_id = str(organization_id)

    def list_reviews(self, options: dict[str, Any]) -> dict[str, Any]:
        page = options.get("page", 1)
        page_size = options.get("page_size", 10)
        sort_by = options.get("sort_by", "date")
        sort_column = {
            "date": "review_date",
            "rating": "rating",
            "confidence": "sentiment_confidence",
        }[sort_by]
        descending = options.get("sort_order", "desc") == "desc"
        analysis = "analysis:review_analysis"
        topic_links = "topic_links:review_topics"
        complaint_links = "complaint_links:review_complaints"
        source = "source:sources"
        if options.get("sentiment") or options.get("search"):
            analysis += "!inner"
        if options.get("topic_id"):
            topic_links += "!inner"
        if options.get("complaint_id"):
            complaint_links += "!inner"
        if options.get("source"):
            source += "!inner"

        fields = _REVIEW_FIELDS.replace(
            "analysis:review_analysis", analysis
        ).replace("topic_links:review_topics", topic_links).replace(
            "complaint_links:review_complaints", complaint_links
        ).replace("source:sources", source)
        query = (
            self._client.table("reviews")
            .select(fields, count="exact")
            .eq("organization_id", self._organization_id)
        )

        if options.get("product_id"):
            query = query.eq("product_id", self._uuid_filter(options["product_id"], "product_id"))
        if options.get("source"):
            query = query.eq("source.code", options["source"])
        if options.get("sentiment"):
            query = query.eq("analysis.sentiment", options["sentiment"])
        if options.get("rating") is not None:
            query = query.eq("rating", options["rating"])
        if options.get("topic_id"):
            query = query.eq(
                "topic_links.topic_id",
                self._uuid_filter(options["topic_id"], "topic_id"),
            )
        if options.get("complaint_id"):
            query = query.eq(
                "complaint_links.complaint_id",
                self._uuid_filter(options["complaint_id"], "complaint_id"),
            )
        if options.get("start_at"):
            query = query.gte("review_date", options["start_at"])
        if options.get("end_at"):
            query = query.lt("review_date", options["end_at"])
        if options.get("search"):
            query = query.ilike(
                "analysis.sanitized_text",
                f"%{options['search']}%",
            )

        if sort_by == "confidence":
            query = query.order(
                sort_column,
                desc=descending,
                foreign_table="analysis",
            )
        else:
            query = query.order(sort_column, desc=descending)
        start = (page - 1) * page_size
        response = self._execute(query.range(start, start + page_size - 1))
        total = response.count or 0
        page_count = max(1, (total + page_size - 1) // page_size)
        current_page = min(page, page_count)
        if current_page != page:
            start = (current_page - 1) * page_size
            response = self._execute(query.range(start, start + page_size - 1))
        return {
            "items": [self._review_to_api(row) for row in (response.data or [])],
            "total": total,
            "page": current_page,
            "page_size": page_size,
            "page_count": page_count,
        }

    def get_review(self, review_id: str) -> DataRecord | None:
        try:
            identifier = str(UUID(review_id))
        except ValueError:
            return None
        query = (
            self._client.table("reviews")
            .select(_REVIEW_FIELDS)
            .eq("organization_id", self._organization_id)
            .eq("id", identifier)
            .maybe_single()
        )
        row = self._execute(query).data
        return self._review_to_api(row) if row else None

    def list_topics(self, options: dict[str, Any]) -> list[DataRecord]:
        response = self._execute(self._client.rpc(
            "get_topic_summaries", self._catalog_rpc_params(options)
        ))
        return response.data or []

    def get_topic(
        self, topic_id: str, options: dict[str, Any]
    ) -> DataRecord | None:
        identifier = self._valid_uuid_or_none(topic_id)
        if identifier is None:
            return None
        return next(
            (
                topic for topic in self.list_topics({
                    **options,
                    "topic_id": identifier,
                })
                if topic["id"] == identifier
            ),
            None,
        )

    def get_topic_reviews(
        self, topic_id: str, options: dict[str, Any]
    ) -> dict[str, Any]:
        return self.list_reviews({**options, "topic_id": topic_id})

    def list_complaints(self, options: dict[str, Any]) -> list[DataRecord]:
        response = self._execute(self._client.rpc(
            "get_complaint_summaries",
            self._catalog_rpc_params(options, include_complaint_filters=True),
        ))
        return response.data or []

    def get_complaint(
        self, complaint_id: str, options: dict[str, Any]
    ) -> DataRecord | None:
        identifier = self._valid_uuid_or_none(complaint_id)
        if identifier is None:
            return None
        return next(
            (
                complaint for complaint in self.list_complaints({
                    **options,
                    "complaint_id": identifier,
                })
                if complaint["id"] == identifier
            ),
            None,
        )

    def get_complaint_reviews(
        self, complaint_id: str, options: dict[str, Any]
    ) -> dict[str, Any]:
        return self.list_reviews({**options, "complaint_id": complaint_id})

    def list_insights(self, options: dict[str, Any]) -> list[DataRecord]:
        query = (
            self._client.table("ai_insights")
            .select(
                "id,kind,title,summary,confidence,impact,topic_id,product_id,"
                "complaint_id,supporting_metrics,provider,model_name,model_version,"
                "generated_at,is_new,insight_reviews(review_id)"
            )
            .eq("organization_id", self._organization_id)
            .order("generated_at", desc=True)
        )
        for key in ("kind", "impact"):
            if options.get(key):
                query = query.eq(key, options[key])
        for key in ("topic_id", "product_id"):
            if options.get(key):
                query = query.eq(key, self._uuid_filter(options[key], key))
        if options.get("start_at"):
            query = query.gte("generated_at", options["start_at"])
        if options.get("end_at"):
            query = query.lt("generated_at", options["end_at"])
        if options.get("min_confidence") is not None:
            query = query.gte("confidence", options["min_confidence"])
        if options.get("limit"):
            query = query.range(0, int(options["limit"]) - 1)
        rows = self._execute(query).data or []
        return [self._insight_to_api(row) for row in rows]

    def get_insight(self, insight_id: str) -> DataRecord | None:
        identifier = self._valid_uuid_or_none(insight_id)
        if identifier is None:
            return None
        response = self._execute(
            self._client.table("ai_insights")
            .select(
                "id,kind,title,summary,confidence,impact,topic_id,product_id,"
                "complaint_id,supporting_metrics,provider,model_name,model_version,"
                "generated_at,is_new,insight_reviews(review_id)"
            )
            .eq("organization_id", self._organization_id)
            .eq("id", identifier)
            .maybe_single()
        )
        row = response.data
        return self._insight_to_api(row) if row else None

    def create_insight(self, insight: DataRecord) -> DataRecord:
        response = self._execute(
            (self._insight_write_client or self._client).rpc(
                "store_ai_insight",
                {
                    "p_organization_id": self._organization_id,
                    "p_provider": insight["provider"],
                    "p_model_name": insight["model"],
                    "p_model_version": insight["model_version"],
                    "p_kind": insight["kind"],
                    "p_title": insight["title"],
                    "p_summary": insight["summary"],
                    "p_confidence": insight["confidence"],
                    "p_impact": insight["impact"],
                    "p_topic_id": insight.get("topic_id"),
                    "p_product_id": insight.get("product_id"),
                    "p_complaint_id": insight.get("complaint_id"),
                    "p_supporting_metrics": insight["supporting_metrics"],
                    "p_review_ids": insight["related_review_ids"],
                },
            )
        )
        if not isinstance(response.data, dict):
            raise DatabaseOperationError("Insight storage returned an invalid response")
        return self._insight_to_api(response.data)

    def list_products(self) -> list[DataRecord]:
        return [
            {
                "id": str(row["id"]),
                "name": row["name"],
                "sku": row["sku"],
                "category": row["category"],
                "image_url": row.get("image_url"),
            }
            for row in self._fetch_all("products", "id,name,sku,category,image_url")
        ]

    def ingestion_catalog(self) -> dict[str, list[DataRecord]]:
        return {
            "sources": self._fetch_all("sources", "id,code,display_name"),
            "products": self._fetch_all("products", "id,name,sku"),
        }

    def ingest_review(self, review: dict[str, Any]) -> DataRecord:
        response = self._execute(
            self._client.rpc(
                "ingest_review",
                {
                    "p_organization_id": self._organization_id,
                    "p_external_id": review["external_id"],
                    "p_review_text": review["review_text"],
                    "p_rating": review["rating"],
                    "p_product_id": review["product_id"],
                    "p_source_id": review["source_id"],
                    "p_review_date": review["review_date"],
                    "p_import_batch_id": review.get("import_batch_id"),
                    "p_content_fingerprint": review["content_fingerprint"],
                    "p_sanitized_text": review["sanitized_text"],
                    "p_detected_pii": review["detected_pii"],
                },
            )
        )
        if not isinstance(response.data, dict):
            raise DatabaseOperationError("Review ingestion returned an invalid database response")
        return response.data

    def create_import_batch(self, file_name: str, user_id: UUID) -> str:
        response = self._execute(
            self._client.table("import_batches")
            .insert({
                "organization_id": self._organization_id,
                "created_by": str(user_id),
                "file_name": file_name,
                "status": "processing",
            })
            .select("id")
            .single()
        )
        if not isinstance(response.data, dict) or not response.data.get("id"):
            raise DatabaseOperationError("Import batch creation returned no identifier")
        return str(response.data["id"])

    def finish_import_batch(
        self,
        batch_id: str,
        items: list[dict[str, Any]],
        counts: dict[str, int],
    ) -> None:
        if items:
            self._execute(
                self._client.table("import_batch_items").insert([
                    {
                        "organization_id": self._organization_id,
                        "import_batch_id": batch_id,
                        **item,
                    }
                    for item in items
                ])
            )
        updated = self._execute(
            self._client.table("import_batches")
            .update({
                "status": "completed",
                "row_count": len(items),
                "error_count": counts["rejected"] + counts["failed"],
                "accepted_count": counts["accepted"],
                "duplicate_count": counts["duplicate"],
                "rejected_count": counts["rejected"],
                "processing_count": counts["processing"],
                "failed_count": counts["failed"],
                "completed_at": datetime.now(timezone.utc).isoformat(),
            })
            .eq("organization_id", self._organization_id)
            .eq("id", batch_id)
            .select("id")
        )
        if not updated.data:
            raise DatabaseOperationError("Import batch could not be finalized")

    def get_import_batch(self, batch_id: str) -> DataRecord | None:
        batch_response = self._execute(
            self._client.table("import_batches")
            .select(
                "id,file_name,status,row_count,accepted_count,rejected_count,"
                "duplicate_count,processing_count,failed_count,created_at"
            )
            .eq("organization_id", self._organization_id)
            .eq("id", batch_id)
            .maybe_single()
        )
        batch = batch_response.data
        if not batch:
            return None
        items_response = self._execute(
            self._client.table("import_batch_items")
            .select("row_number,status,review_id,errors")
            .eq("organization_id", self._organization_id)
            .eq("import_batch_id", batch_id)
            .order("row_number")
            .range(0, 999)
        )
        return {**batch, "items": items_response.data or []}

    def retry_review_analysis(self, review_id: str) -> DataRecord:
        response = self._execute(
            self._client.rpc(
                "retry_review_analysis",
                {
                    "p_organization_id": self._organization_id,
                    "p_review_id": review_id,
                },
            )
        )
        if not isinstance(response.data, dict):
            raise DatabaseOperationError("Analysis retry returned an invalid database response")
        return response.data

    def dashboard_data(self, filters: dict[str, Any]) -> dict[str, Any]:
        params = self._catalog_rpc_params(filters)
        return self._execute(self._client.rpc("get_dashboard_summary", params)).data or {}

    def model_health_data(self, days: int) -> dict[str, Any]:
        response = self._execute(
            self._client.rpc(
                "get_model_health",
                {
                    "p_organization_id": self._organization_id,
                    "p_days": days,
                },
            )
        )
        if not isinstance(response.data, dict):
            raise DatabaseOperationError("Model health query returned an invalid response")
        return response.data

    def _catalog_rpc_params(
        self,
        filters: dict[str, Any],
        *,
        include_complaint_filters: bool = False,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {
            "p_organization_id": self._organization_id,
            "p_start_at": filters["start_at"],
            "p_end_at": filters["end_at"],
            "p_product_id": None,
            "p_source": filters.get("source"),
            "p_sentiment": filters.get("sentiment"),
            "p_topic_id": None,
            "p_complaint_id": None,
        }
        if include_complaint_filters:
            params["p_severity"] = filters.get("severity")
            params["p_status"] = filters.get("status")
        if filters.get("product_id"):
            params["p_product_id"] = self._uuid_filter(
                filters["product_id"], "product_id"
            )
        for key in ("topic_id", "complaint_id"):
            if filters.get(key):
                params[f"p_{key}"] = self._uuid_filter(filters[key], key)
        return params

    @staticmethod
    def _one(value: Any) -> dict[str, Any] | None:
        if isinstance(value, list):
            return value[0] if value else None
        return value if isinstance(value, dict) else None

    @classmethod
    def _review_to_api(cls, row: dict[str, Any]) -> DataRecord:
        analysis = cls._one(row.get("analysis"))
        product = cls._one(row.get("product"))
        source = cls._one(row.get("source"))
        topic_links = row.get("topic_links") or []
        complaint_links = row.get("complaint_links") or []
        pii_items = (analysis or {}).get("detected_pii") or []
        score = float((analysis or {}).get("sentiment_score") or 0)
        confidence = float((analysis or {}).get("sentiment_confidence") or 0)
        sentiment = (analysis or {}).get("sentiment")
        return {
            "id": str(row["id"]),
            "text": (analysis or {}).get("sanitized_text") or "",
            "rating": row["rating"],
            "product_id": str(row["product_id"]) if row.get("product_id") else None,
            "product_name": (product or {}).get("name") or "",
            "source": (source or {}).get("code") or "",
            "date": row["review_date"],
            "author_initial": "",
            "sentiment": (
                {
                    "label": sentiment,
                    "positive": max(score, 0.0),
                    "neutral": 1.0 - abs(score),
                    "negative": max(-score, 0.0),
                    "confidence": confidence,
                }
                if sentiment else None
            ),
            "topic_ids": [str(link["topic_id"]) for link in topic_links],
            "complaint_id": str(complaint_links[0]["complaint_id"]) if complaint_links else None,
            "pii_status": (
                {
                    "is_clean": not pii_items,
                    "redacted_fields": [
                        str(item["field"]) for item in pii_items
                        if isinstance(item, dict) and item.get("field")
                    ],
                    "detected_entities": [
                        str(item["type"]) for item in pii_items
                        if isinstance(item, dict) and item.get("type")
                    ],
                    "processed_at": (analysis or {}).get("processed_at"),
                }
                if analysis and (analysis.get("processed_at") or pii_items) else None
            ),
            "processing_status": row["processing_status"],
        }

    @staticmethod
    def _insight_to_api(row: dict[str, Any]) -> DataRecord:
        links = row.get("insight_reviews") or []
        if not links and row.get("related_review_ids"):
            related_review_ids = row["related_review_ids"]
        else:
            related_review_ids = [
                str(link["review_id"])
                for link in links
                if isinstance(link, dict) and link.get("review_id")
            ]
        return {
            "id": str(row["id"]),
            "kind": row["kind"],
            "title": row["title"],
            "summary": row["summary"],
            "confidence": float(row["confidence"]),
            "impact": row["impact"],
            "topic_id": str(row["topic_id"]) if row.get("topic_id") else None,
            "product_id": str(row["product_id"]) if row.get("product_id") else None,
            "complaint_id": (
                str(row["complaint_id"]) if row.get("complaint_id") else None
            ),
            "supporting_metrics": row.get("supporting_metrics") or {},
            "provider": row.get("provider") or "unknown",
            "model": row.get("model_name") or "unknown",
            "model_version": row.get("model_version") or "unknown",
            "related_review_ids": related_review_ids,
            "generated_at": row["generated_at"],
            "is_new": row["is_new"],
        }

    def _fetch_all(
        self,
        table: str,
        fields: str,
        filters: tuple[tuple[str, Any], ...] = (),
    ) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        offset = 0
        batch_size = 500
        order_fields = {
            "review_topics": ("review_id", "topic_id"),
            "review_complaints": ("review_id", "complaint_id"),
            "insight_reviews": ("insight_id", "review_id"),
        }.get(table, ("id",))
        while True:
            query = (
                self._client.table(table)
                .select(fields)
                .eq("organization_id", self._organization_id)
            )
            for key, value in filters:
                query = query.eq(key, value)
            for order_field in order_fields:
                query = query.order(order_field)
            page = self._execute(query.range(offset, offset + batch_size - 1)).data or []
            rows.extend(page)
            if len(page) < batch_size:
                return rows
            offset += batch_size

    def _execute(self, query: Any) -> Any:
        try:
            return query.execute()
        except (APIError, HTTPError) as exc:
            raise DatabaseOperationError("Supabase database operation failed") from exc

    @staticmethod
    def _valid_uuid_or_none(value: str) -> str | None:
        try:
            return str(UUID(value))
        except ValueError:
            return None

    @classmethod
    def _uuid_filter(cls, value: str, field: str) -> str:
        identifier = cls._valid_uuid_or_none(value)
        if identifier is None:
            raise InvalidRequestError(f"{field} must be a valid UUID")
        return identifier
