#!/usr/bin/env python3
"""
remove_bg.py
Removes white/near-white backgrounds from source PNG images,
tightly crops to the actual icon content, and saves as transparent PNG.
Outputs into src/assets/icons/ so originals remain untouched.
"""

import os
import sys
from PIL import Image
import numpy as np

SRC = "src/assets"
OUT = "src/assets/icons"
os.makedirs(OUT, exist_ok=True)

# Files to process — (source_filename, output_filename)
TARGETS = [
    ("01_total_reviews.png",              "kpi_total_reviews.png"),
    ("02_average_rating.png",             "kpi_average_rating.png"),
    ("03_active_complaints.png",          "kpi_active_complaints.png"),
    ("04_positive_sentiments.png",        "kpi_positive.png"),
    ("05_neutral_sentiments.png",         "kpi_neutral.png"),
    ("06_negative_sentiments.png",        "kpi_negative.png"),
    ("dashboard icon.png",                "nav_dashboard.png"),
    ("reviews icon.png",                  "nav_reviews.png"),
    ("Analytics Icon.png",                "nav_analytics.png"),
    ("topics icon.png",                   "nav_topics.png"),
    ("complaints icon.png",               "nav_complaints.png"),
    ("Ai insights.png",                   "nav_ai_insights.png"),
    ("Model Health.png",                  "nav_model_health.png"),
    ("Reports icon.png",                  "nav_reports.png"),
    ("Settings Icon.png",                 "nav_settings.png"),
    ("intro icon.png",                    "nav_intro.png"),
    ("Monthly Sentiments.png",            "report_monthly.png"),
    ("Complaint Intelligence Report.png", "report_complaints.png"),
    ("Topic Analysis Deep Dive.png",      "report_topics.png"),
    ("Executive Brief.png",               "report_executive.png"),
    ("Volume Heatmap.png",                "analytics_heatmap.png"),
    ("Rating Distribution.png",           "analytics_rating_dist.png"),
    ("Recent Ai Insights.png",            "analytics_ai_insights.png"),
    ("Review Spotlight.png",              "analytics_spotlight.png"),
    ("Source Breakdown.png",              "analytics_source.png"),
]

# How close to white a pixel needs to be to be considered background
# 0 = only pure white. 255 = everything. ~200 works well for typical screenshots.
WHITE_THRESHOLD = 220

def remove_white_background(img: Image.Image, threshold: int = WHITE_THRESHOLD) -> Image.Image:
    """
    Convert white/near-white pixels to transparent.
    Works on both RGB and RGBA inputs.
    """
    img = img.convert("RGBA")
    data = np.array(img, dtype=np.uint16)

    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]

    # A pixel is "background" if:
    #   - It is close to white (all channels >= threshold)
    #   - AND it is not already transparent
    is_white = (r >= threshold) & (g >= threshold) & (b >= threshold)

    # Set those pixels to fully transparent
    data[:,:,3] = np.where(is_white, 0, a)

    return Image.fromarray(data.astype(np.uint8), "RGBA")


def tight_crop(img: Image.Image, padding: int = 8) -> Image.Image:
    """
    Crop to the bounding box of non-transparent pixels, then add a small padding.
    """
    bbox = img.getbbox()   # returns (left, upper, right, lower) of non-zero alpha
    if bbox is None:
        return img  # fully transparent — leave as is

    # Expand bbox by padding, clamped to image bounds
    left   = max(bbox[0] - padding, 0)
    upper  = max(bbox[1] - padding, 0)
    right  = min(bbox[2] + padding, img.width)
    lower  = min(bbox[3] + padding, img.height)

    return img.crop((left, upper, right, lower))


def process(src_path: str, out_path: str):
    img = Image.open(src_path)
    img = remove_white_background(img)
    img = tight_crop(img, padding=6)
    img.save(out_path, "PNG", optimize=True)
    w, h = img.size
    print(f"  ✓ {os.path.basename(out_path):45s}  {w}x{h}px")


print(f"\nProcessing {len(TARGETS)} assets ...\n")
errors = []
for src_name, out_name in TARGETS:
    src_path = os.path.join(SRC, src_name)
    out_path = os.path.join(OUT, out_name)
    if not os.path.exists(src_path):
        print(f"  ✗ MISSING: {src_name}")
        errors.append(src_name)
        continue
    try:
        process(src_path, out_path)
    except Exception as e:
        print(f"  ✗ ERROR {src_name}: {e}")
        errors.append(src_name)

print(f"\nDone. {len(TARGETS) - len(errors)} processed, {len(errors)} failed.")
if errors:
    print("Failures:", errors)
    sys.exit(1)
