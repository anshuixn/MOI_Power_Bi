# ReviewBand Design Specification

## Visual Direction

**Dashboard:** Bright · Premium · Warm · Soft · Dimensional · Professional · Modern · Polished
**Intro:** Cinematic · Spatial · Immersive · Expressive

The product should feel calm, credible, analytical, and high-end — like a polished commercial SaaS.

---

## Color System (70/20/10)

### 70% — Grounds
| Token | Value | Usage |
|-------|-------|-------|
| bg-ground | #FBF8F3 | Page background |
| bg-cream | #F5EFE6 | Secondary surfaces |
| bg-white | #FFFFFF | Card surfaces |

### 20% — Structure
| Token | Value | Usage |
|-------|-------|-------|
| color-text-primary | #1B1F2A | Headlines |
| color-text-secondary | #4A5160 | Body copy |
| color-text-muted | #6B7280 | Meta, labels |
| color-blue | #E6EFFA | Neutral tint |
| color-blue-gray | #DDE4EE | Borders, dividers |
| color-lavender | #ECE7F8 | Accent surfaces |
| color-peach | #FBE4D5 | Warm accent surfaces |

### 10% — Accent
| Token | Value | Usage |
|-------|-------|-------|
| brand-orange | #F5821F | Primary brand |
| soft-orange | #FDE7D0 | Tint / soft bg |
| color-yellow | #FFC857 | Rating stars |
| color-positive | #2E9E73 | Positive sentiment |
| color-positive-soft | #DDF3EA | Positive bg |
| color-neutral-blue | #4C8BD4 | Neutral sentiment |
| color-neutral-soft | #E1EDFA | Neutral bg |
| color-negative | #EA6670 | Negative sentiment |
| color-negative-soft | #FCE3E5 | Negative bg |
| color-warning | #F2A33A | Warnings |

---

## Typography

Font: Inter Variable
Scale: 4px base, 8px rhythm
Tabular numerals for all data values.

## Shadow System

Rest: 0 1px 2px rgba(60,40,20,.04), 0 4px 12px rgba(60,40,20,.05)
Raised: 0 2px 4px rgba(60,40,20,.05), 0 12px 28px rgba(60,40,20,.08)
Floating: 0 4px 8px rgba(60,40,20,.06), 0 24px 56px rgba(60,40,20,.12)

## Card System

Primary radius: 20px
Inner radius: 12px
Pill: 999px

## Glass System

Selective use. Nav: rgba(255,255,255,0.78) blur 20px.
Dense content: opaque surfaces.

## Future Backend Boundary

services/mock/ is replaceable with services/api/ without UI changes.
