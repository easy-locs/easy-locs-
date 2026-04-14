# Engine Contracts

## AI Audit Engine System
The platform has 15 specialized audit engines located in `src/lib/ai-audit/engines/`. Each engine scores a specific quality dimension.

## Engine Registry (`src/engines/engine-registry.ts`)
All engines are registered centrally. New engines must be added to the registry.

## Engine Categories

### Quality Engines
| Engine | Category | Checks |
|--------|----------|--------|
| UI/UX | `ui_ux` | Layout, accessibility, responsiveness |
| SEO | `seo` | Meta tags, sitemap, structured data |
| Technical | `technical` | Performance, errors, bundle size |
| Brand | `brand` | Color consistency, logo usage |
| Content | `content` | Spelling, readability, freshness |
| Mobile | `mobile` | Touch targets, viewport, PWA |

### Business Engines
| Engine | Category | Checks |
|--------|----------|--------|
| Marketplace | `marketplace` | Listing quality, photos, pricing |
| Conversion | `conversion` | CTA placement, funnel analysis |
| Payment | `payment` | Checkout flow, error handling |
| Booking | `booking` | Availability, confirmation flow |
| Analytics | `analytics` | Tracking coverage, event naming |

### Infrastructure Engines
| Engine | Category | Checks |
|--------|----------|--------|
| Security | `security` | Auth, XSS, CSRF, data exposure |
| Data Quality | `data_quality` | Completeness, duplicates, integrity |
| International | `international` | i18n coverage, currency, date formats |
| Communication | `communication` | Response time, template quality |

## Scoring Formula
```
Global Score = average(module scores)
Module Score = 100 - sum(severity_weight per issue)
Severity weights: critical=25, high=15, medium=8, low=3, info=0
```

## Engine Subsystems (`src/engines/`)
| Directory | Purpose |
|-----------|---------|
| `core/` | Core engine runtime |
| `data/` | Data processing engines |
| `gates/` | Quality gates / validation gates |
| `governance/` | Governance and compliance |
| `infra/` | Infrastructure monitoring |
| `lifecycle/` | Engine lifecycle management |
| `normalizers/` | Data normalization |
| `quality/` | Quality scoring |
| `realtime/` | Real-time processing |
| `self-healing/` | Auto-remediation |
| `taxonomy/` | Classification and taxonomy |

## Rules for Agents
1. Never modify engine scoring weights without Chief Architect review
2. New engines must follow the existing interface contract
3. Engine results must be serializable (no functions, no DOM references)
4. Engines must be stateless — no side effects between runs
5. All engines must handle missing data gracefully (return score with warnings)
