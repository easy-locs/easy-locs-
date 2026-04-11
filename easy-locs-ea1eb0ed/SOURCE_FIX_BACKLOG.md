# SOURCE FIX BACKLOG

## Summary
**15 permanent source fixes applied** | **1 remaining runtime-only** | **11/14 runtime patch types eliminated by CSS**

## Fixed in Source (Permanent)

| ID | Issue | Component | Fix Type | Status |
|----|-------|-----------|----------|--------|
| SF-001 | Horizontal overflow on all pages | html, body | CSS global | FIXED |
| SF-002 | Button text clipping (whitespace-nowrap) | Button (ui/button.tsx) | Component | FIXED |
| SF-003 | Card content clipped by overflow-hidden | CardShell | Component | FIXED |
| SF-004 | Tiny tap targets below 44px | Global buttons | CSS DS-14 | FIXED |
| SF-005 | Card titles overflowing container | [data-card] h3/h4 | CSS DS-14d | FIXED |
| SF-006 | Card descriptions uncontrolled | [data-card] .text-muted-foreground | CSS DS-14e | FIXED |
| SF-007 | Icon buttons without padding | button:has(> svg:only-child) | CSS DS-14b | FIXED |
| SF-008 | Card internal layout inconsistent | [data-card=merchant/listing/shell] | CSS DS-14c | FIXED |
| SF-009 | Text clipping in overflow-hidden | p, span, label, headings | CSS Layout Protection | FIXED |
| SF-010 | Tab label clipping on small screens | [role=tablist] [role=tab] | CSS | FIXED |
| SF-011 | Badge/chip text overflow | .badge, [data-badge] | CSS DS-18 | FIXED |
| SF-012 | RTL text clipping | [dir=rtl] text elements | CSS | FIXED |
| SF-013 | i18n long-text overflow (DE/FI/NL) | :lang(de/fi/nl) headings | CSS | FIXED |
| SF-014 | CJK word breaking | :lang(ja/ko/zh) | CSS | FIXED |
| SF-016 | Empty sections without placeholder | Various pages | EmptyState component | FIXED |

## Remaining Runtime-Only

| ID | Issue | Component | Why Not Fixed in Source |
|----|-------|-----------|----------------------|
| SF-015 | Dotted i18n keys in UI | Various | Requires adding missing translation keys to i18n JSON files |

## Runtime Patch Types — Permanent vs Temporary

| Patch Type | Permanent? | Note |
|-----------|-----------|------|
| overflow_x | YES | Global CSS: html, body { overflow-x: hidden } |
| overflow_y_clip | YES | Layout Protection Engine rules |
| text_clipping | YES | DS-4c text element visibility rules |
| element_overlap | NO | Requires per-component layout fixes |
| wrapper_strangling | YES | Layout Protection Engine |
| tiny_tap_targets | YES | DS-14 min-height/min-width |
| dotted_labels | NO | Needs i18n translation file updates |
| untranslated_keys | NO | Needs i18n translation file updates |
| broken_card_layout | YES | DS-14c card layout enforcement |
| empty_section | YES | EmptyState component + DS-7/DS-20 |
| text_truncated_no_ellipsis | YES | Text visibility rules |
| whitespace_nowrap_dangerous | YES | Button nowrap removed |
| title_too_long_for_card | YES | DS-14d line-clamp |
| label_doesnt_fit | YES | Button/tab CSS fixes |

**Result: 11/14 (79%) patch types are now permanent CSS fixes**
