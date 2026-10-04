# ReviewBand Power BI report pages

These page definitions use only the tenant-scoped `reviewband_bi` views and explicit measures. They are instructions for a real report authoring session; no charts or sample values are fabricated here.

## Page 1 — Executive Overview

- Cards: `Total Reviews`, `Average Rating`, `Positive %`, `Neutral %`, `Negative %`, `Active Complaints`.
- Line chart: `dim_dates[date_key]` by `Total Reviews` (daily, weekly, or monthly drill level).
- Sentiment trend: date by positive/neutral/negative review counts or shares.
- Slicers: date, product, source, sentiment, rating, topic, and complaint.

## Page 2 — Sentiment Analysis

- Distribution: sentiment counts and share from `fact_reviews`.
- Trend: date by sentiment count/share, including negative-only trend.
- Matrix/bar charts: sentiment by product, source, and rating.
- Slicers: date, product, source, sentiment, rating, topic, and complaint.

## Page 3 — Topics & Complaints

- Ranked topics and mentions from `dim_topics` + `fact_review_topics`; time series by `date_key`.
- Complaint categories, mentions, active status, and severity from `dim_complaints` + `fact_review_complaints`.
- Product/topic and product/complaint comparisons through their assignment facts.
- Topic/complaint overlap: distinct reviews in each assignment fact; compare via review IDs, not a direct many-to-many relationship.
- To show reviews supporting a selected insight, use `bridge_insight_reviews` and filter a review detail table to `Insight Evidence Review Flag = 1`.
- Slicers: date, product, source, sentiment, rating, topic, complaint, severity/status.

## Page 4 — Product / Campaign Comparison

- Compare review volume, average rating, sentiment shares, topic assignments, and complaints by product.
- Compare selected date range with the immediately preceding range using `Review Growth`, `Sentiment Change`, and `Complaint Change`.
- Source is the supported ingestion channel dimension; campaign is not currently a first-class domain attribute, so do not imply campaign analysis until campaign metadata exists.
- Slicers: date, product, source, sentiment, rating, topic, complaint.

## Page 5 — Time & Trend Analysis

- Daily/weekly/monthly review volume and sentiment movement from the Date dimension.
- Topic and complaint movement from actual dated assignments.
- Period comparisons use the prior interval with the same number of selected calendar days.
- Show no “significant” or “unusual” flags unless derived from actual selected data; explain the measure threshold/method.
- Slicers: date, product, source, sentiment, rating, topic, complaint.

## Page 6 — Model Health

- Processed reviews, successful/failed attempts, failure rate, and average/P95 latency from `fact_model_attempts`.
- Confidence distribution from `fact_model_confidences`, segmented by sentiment/topic/complaint classification type.
- Version activity by provider/model/version and sentiment/topic/complaint outputs from model attempt facts.
- Descriptive sentiment distribution drift only when both equal-length periods have at least 30 successful analyses. It is not feature drift or model accuracy.
- Slicers: model event date, product, source, model version, classification type, and outcome.
