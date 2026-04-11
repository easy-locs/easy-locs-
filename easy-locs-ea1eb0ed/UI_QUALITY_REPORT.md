# UI Quality Report

## Summary
The UI Engine (`useUiEngine`) performs automated quality auditing on 10 user-facing pages. This report documents the quality framework, detection capabilities, and current status.

---

## Quality Framework

### Score Calculation (0-100)
Each page receives a composite score based on:
- **Accessibility (40%)**: Missing alt text, missing labels, missing ARIA attributes, focus traps
- **Contrast (20%)**: Text/background contrast ratio below WCAG AA threshold
- **Layout (20%)**: Overflow issues, overlapping elements, broken grid alignment
- **Completeness (20%)**: Missing required UI elements, empty states without fallback

### Auto-Patch Capabilities
The UI Engine can automatically fix:
- Missing `aria-label` on interactive elements
- Missing `role` attributes on custom widgets
- Contrast issues via CSS variable overrides (where safe)

### Issue Categories
| Category | Severity | Auto-Patchable |
|----------|----------|----------------|
| Missing alt text | Medium | No |
| Missing form labels | High | Yes |
| Low contrast text | Medium | Yes |
| Layout overflow | High | No |
| Missing ARIA roles | Medium | Yes |
| Empty state fallback | Low | No |

---

## Per-Page Status

| Page | Route | Expected Score | Notes |
|------|-------|---------------|-------|
| Dashboard | `/dashboard` | 85-95 | Complex layout, many widgets |
| HyperRadar | `/radar` | 90-95 | Search-focused, good a11y |
| CommunicationCenter | `/orbit` | 85-90 | Thread list + message view |
| WalletHub | `/wallet` | 90-95 | Financial data display |
| MeCommandCenter | `/me` | 85-90 | Profile forms + settings |
| Onboarding | `/onboarding` | 80-90 | Multi-step form wizard |
| ShopPage | `/shop/:id` | 85-95 | Product listing + cart |
| PublicListing | `/listing/:id` | 90-95 | Read-only display |
| MerchantDashboard | `/merchant/dashboard` | 85-90 | Analytics + controls |
| PropertyDetailHub | `/property/:id` | 85-95 | Property gallery + details |

---

## Monitoring

### Real-Time Telemetry
```
platformBus channel: "ui-engine:report"
Payload: { route, score, issueCount, patchCount, timestamp }
Frequency: On page mount
Consumer: AdminUiEnginePage
```

### Admin Visibility
- **URL**: `/admin/ui-engine`
- **Shows**: Per-page scores, issue counts, patch counts, trend over time
- **Refresh**: Real-time via platformBus subscription

---

## Design Token Compliance

All UI Engine pages use the approved design tokens:
- **Navy**: `hsl(220 40% 18%)` — backgrounds, cards, containers
- **Gold**: `hsl(38 65% 56%)` — headings, accents, highlights
- **Inline styles**: `style={{}}` pattern (no external CSS classes for brand colors)

## Volatile Thread Key Protection
Thread components use `arePropsEqual` deny-list to prevent infinite re-renders:
- `unreadCount`, `lastMessage`, `lastMessageTime`, `lastMessagePreview`, `lastMessageTimestamp`, `updatedAt`
