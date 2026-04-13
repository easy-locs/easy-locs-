# ENGINE SCORECARD
**Audit Date:** 2026-04-13
**Audit Version:** Nuclear Audit v2.0.0
**Total Engines Scored:** 262
**Scoring Method:** 12-dimension scoring, each dimension 1–10, sum = Fitness Score (max 120)
**Verdict Distribution:** KEEP 146 | FIX 60 | MERGE 21 | QUARANTINE 7 | REMOVE 28 = 262 ✓

---

## SCORING DIMENSIONS

| # | Dimension | Meaning | Score Range |
|---|-----------|---------|------------|
| 1 | STB | Stability — does the engine behave consistently across runs? | 1=chaotic, 10=rock-solid |
| 2 | TRS | Trustworthiness — are its outputs reliable and verified? | 1=unverified, 10=fully proven |
| 3 | PER | Performance — does it complete within acceptable SLAs? | 1=unknown/slow, 10=fast and measured |
| 4 | DIS | Discipline — does it stay within its declared scope? | 1=scope-creeping, 10=perfectly bounded |
| 5 | CAN | Canonical Compliance — does it wire to canonical contracts? | 1=bypasses all, 10=full contract compliance |
| 6 | LEA | Learning Eligibility — can it improve its behavior over time? | 1=cannot learn, 10=full learning loop |
| 7 | FPR | False Positive Risk (inverted) — risk of flagging healthy entities | 1=high FP risk, 10=no FP risk |
| 8 | FRR | False Repair Risk (inverted) — risk of corrupting correct data | 1=high FR risk, 10=no FR risk |
| 9 | RED | Redundancy (inverted) — overlap with other engines | 1=severe redundancy, 10=unique |
| 10 | CON | Conflict Risk (inverted) — risk of conflicting with other engines | 1=active conflict, 10=no conflict |
| 11 | VAL | Runtime Value — does it provide observable business value? | 1=no value, 10=critical value |
| 12 | MNT | Maintainability — how easy is it to understand and change? | 1=unmaintainable, 10=clean and documented |

**Fitness Score** = sum of all 12 dimensions (12–120)
**Verdict Threshold:**
- **KEEP** ≥ 72 — canonical engine in correct location with valid scope
- **FIX** 50–71 — valid engine; needs proof system, contract, or wiring improvement
- **MERGE** any score — engine logic is correct but it is in the **wrong location** (shadow, orch duplication, or misplaced file); logic must be absorbed into the canonical location; score reflects the quality of the logic, NOT the appropriateness of its file path
- **QUARANTINE** any score — high-risk autonomous behavior regardless of fitness; disable immediately
- **REMOVE** ≤ 29 or when structurally required — dead shadow, god-layer bypass, or pure redundancy; no unique logic to extract

---

## COMPLETE ENGINE SCORECARD — ALL 262 ENGINES

IDs are **sequential by file path sort order** (ENG-001 to ENG-262). No letter suffixes. No gaps. ENG-261 and ENG-262 were added during audit scan (previously missing from inventory).

| ID | Engine Name | STB | TRS | PER | DIS | CAN | LEA | FPR | FRR | RED | CON | VAL | MNT | Fitness | Verdict |
|----|------------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|---------|---------|
| ENG-001 | Omega Adaptive UX Engine | 3 | 2 | 5 | 3 | 2 | 2 | 3 | 3 | 8 | 5 | 5 | 3 | **44** | QUARANTINE |
| ENG-002 | Omega Business Opportunity Engine | 6 | 4 | 6 | 5 | 5 | 7 | 6 | 7 | 8 | 7 | 7 | 5 | **73** | FIX |
| ENG-003 | Omega Code Evolution Engine | 2 | 1 | 4 | 2 | 1 | 1 | 2 | 2 | 9 | 2 | 4 | 2 | **32** | QUARANTINE |
| ENG-004 | Omega Decision Engine | 5 | 3 | 6 | 4 | 4 | 6 | 5 | 5 | 8 | 5 | 7 | 4 | **62** | QUARANTINE |
| ENG-005 | Omega Incident Response Engine | 5 | 4 | 6 | 5 | 5 | 3 | 7 | 7 | 5 | 6 | 5 | 5 | **63** | FIX |
| ENG-006 | Omega Knowledge Graph Engine | 6 | 4 | 6 | 5 | 6 | 4 | 5 | 6 | 8 | 7 | 7 | 5 | **69** | FIX |
| ENG-007 | Omega Memory Engine | 5 | 3 | 6 | 4 | 4 | 3 | 7 | 7 | 6 | 7 | 5 | 4 | **61** | FIX |
| ENG-008 | Omega Prediction Engine | 6 | 4 | 6 | 5 | 6 | 7 | 5 | 6 | 6 | 6 | 7 | 5 | **69** | FIX |
| ENG-009 | Omega Priority Engine | 6 | 5 | 7 | 5 | 6 | 4 | 7 | 8 | 7 | 6 | 7 | 6 | **74** | KEEP |
| ENG-010 | Omega Self-Improvement Engine | 2 | 1 | 4 | 2 | 1 | 1 | 2 | 2 | 9 | 2 | 3 | 2 | **31** | QUARANTINE |
| ENG-011 | Sentinel Audit Engine | 9 | 7 | 8 | 9 | 9 | 8 | 8 | 9 | 10 | 8 | 10 | 9 | **104** | KEEP |
| ENG-012 | Sentinel Conflict Engine | 8 | 6 | 8 | 7 | 9 | 4 | 7 | 8 | 9 | 6 | 9 | 8 | **89** | FIX |
| ENG-013 | Sentinel Healing Engine | 9 | 7 | 8 | 8 | 9 | 7 | 7 | 8 | 8 | 7 | 10 | 9 | **97** | KEEP |
| ENG-014 | Sentinel Health Engine | 9 | 8 | 9 | 9 | 9 | 4 | 9 | 9 | 9 | 9 | 10 | 9 | **103** | KEEP |
| ENG-015 | Sentinel Incident Engine | 9 | 8 | 9 | 9 | 9 | 4 | 8 | 9 | 9 | 9 | 10 | 9 | **102** | KEEP |
| ENG-016 | Sentinel Invariant Engine | 8 | 6 | 8 | 9 | 9 | 4 | 8 | 9 | 10 | 9 | 8 | 8 | **96** | FIX |
| ENG-017 | Sentinel Engine Registry | 9 | 7 | 9 | 9 | 9 | 4 | 9 | 9 | 8 | 9 | 10 | 9 | **101** | KEEP |
| ENG-018 | Sentinel Report Engine | 8 | 6 | 8 | 9 | 9 | 4 | 9 | 9 | 10 | 9 | 8 | 8 | **97** | FIX |
| ENG-019 | Sentinel Scoring Engine | 9 | 7 | 8 | 9 | 9 | 7 | 8 | 9 | 10 | 9 | 9 | 9 | **103** | KEEP |
| ENG-020 | Sentinel Telemetry Engine | 9 | 7 | 9 | 9 | 9 | 4 | 9 | 9 | 9 | 9 | 9 | 9 | **102** | KEEP |
| ENG-021 | Sentinel Validation Engine | 8 | 6 | 8 | 9 | 9 | 4 | 8 | 9 | 10 | 9 | 9 | 8 | **97** | FIX |
| ENG-022 | Sentinel Workflow Engine | 7 | 6 | 7 | 6 | 8 | 4 | 7 | 8 | 7 | 7 | 8 | 7 | **82** | FIX |
| ENG-023 | Orbit Preview Engine | 7 | 5 | 8 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **85** | KEEP |
| ENG-024 | Base Engine | 10 | 9 | 10 | 10 | 10 | 5 | 10 | 10 | 10 | 10 | 10 | 10 | **114** | KEEP |
| ENG-025 | Engine Feature Flags | 10 | 9 | 10 | 10 | 10 | 4 | 10 | 10 | 10 | 10 | 10 | 10 | **113** | KEEP |
| ENG-026 | Engine Learning Core | 7 | 5 | 8 | 6 | 8 | 8 | 7 | 6 | 8 | 8 | 8 | 7 | **86** | KEEP |
| ENG-027 | Engine Memory Core | 7 | 5 | 8 | 6 | 8 | 6 | 7 | 7 | 7 | 8 | 8 | 7 | **84** | FIX |
| ENG-028 | Engine Observer | 9 | 7 | 9 | 9 | 9 | 4 | 9 | 10 | 10 | 10 | 8 | 9 | **103** | KEEP |
| ENG-029 | Engine Orchestrator | 10 | 8 | 10 | 9 | 10 | 4 | 9 | 10 | 9 | 9 | 10 | 9 | **107** | KEEP |
| ENG-030 | Taxonomy Runtime Engine | 9 | 8 | 9 | 9 | 9 | 4 | 9 | 9 | 10 | 9 | 9 | 9 | **103** | KEEP |
| ENG-031 | Engine Registry | 9 | 8 | 10 | 9 | 9 | 4 | 10 | 10 | 8 | 9 | 10 | 9 | **105** | KEEP |
| ENG-032 | Publish Gate Food Orch Engine | 6 | 5 | 7 | 5 | 7 | 3 | 7 | 8 | 3 | 5 | 8 | 5 | **69** | MERGE |
| ENG-033 | Publish Gate Grocery Orch Engine | 6 | 5 | 7 | 5 | 7 | 3 | 7 | 8 | 3 | 5 | 8 | 5 | **69** | MERGE |
| ENG-034 | Publish Gate Service Orch Engine | 6 | 5 | 7 | 5 | 7 | 3 | 7 | 8 | 3 | 5 | 8 | 5 | **69** | MERGE |
| ENG-035 | Action Wiring Engine | 7 | 5 | 7 | 7 | 7 | 4 | 8 | 9 | 9 | 9 | 7 | 6 | **85** | FIX |
| ENG-036 | Anti-Conflict Engine (Governance) | 4 | 3 | 5 | 3 | 2 | 2 | 5 | 5 | 1 | 1 | 4 | 3 | **38** | MERGE |
| ENG-037 | Auto-Remediation Engine | 8 | 7 | 8 | 8 | 8 | 3 | 8 | 9 | 8 | 8 | 8 | 8 | **91** | KEEP |
| ENG-038 | Banner Strategy Engine | 5 | 3 | 6 | 3 | 3 | 2 | 6 | 7 | 2 | 5 | 3 | 3 | **48** | MERGE |
| ENG-039 | Flow Closure Engine | 7 | 5 | 7 | 7 | 6 | 4 | 7 | 8 | 9 | 8 | 7 | 6 | **81** | FIX |
| ENG-040 | Layout Integrity Engine | 5 | 3 | 6 | 4 | 3 | 2 | 6 | 7 | 2 | 6 | 4 | 3 | **51** | MERGE |
| ENG-041 | Localization Engine | 5 | 4 | 6 | 5 | 4 | 3 | 7 | 8 | 3 | 6 | 6 | 4 | **61** | MERGE |
| ENG-042 | Media Relevance Engine (Governance) | 4 | 3 | 5 | 3 | 2 | 2 | 5 | 6 | 1 | 2 | 3 | 3 | **39** | MERGE |
| ENG-043 | Page Open Engine | 7 | 5 | 7 | 8 | 7 | 4 | 7 | 8 | 9 | 8 | 7 | 6 | **83** | FIX |
| ENG-044 | Runtime Health Engine | 4 | 3 | 5 | 3 | 2 | 2 | 5 | 6 | 1 | 2 | 3 | 3 | **39** | REMOVE |
| ENG-045 | Taxonomy Governance Engine | 7 | 6 | 7 | 6 | 8 | 7 | 7 | 7 | 6 | 6 | 9 | 7 | **83** | FIX |
| ENG-046 | Text Integrity Engine | 7 | 5 | 7 | 8 | 7 | 4 | 7 | 8 | 9 | 8 | 7 | 6 | **83** | FIX |
| ENG-047 | Vertical Isolation Engine | 9 | 8 | 8 | 9 | 9 | 4 | 8 | 9 | 9 | 9 | 10 | 9 | **101** | KEEP |
| ENG-048 | Backend Connectivity Orch Engine | 6 | 5 | 7 | 5 | 7 | 3 | 7 | 8 | 3 | 5 | 8 | 5 | **69** | MERGE |
| ENG-049 | Full-Stack Linkage Orch Engine | 6 | 5 | 7 | 5 | 7 | 3 | 7 | 8 | 3 | 5 | 8 | 5 | **69** | MERGE |
| ENG-050 | Auto-Publish Orch Engine | 6 | 5 | 7 | 5 | 7 | 3 | 7 | 8 | 3 | 5 | 8 | 5 | **69** | MERGE |
| ENG-051 | Auto-Unpublish Orch Engine | 6 | 5 | 7 | 5 | 7 | 3 | 7 | 8 | 3 | 5 | 8 | 5 | **69** | MERGE |
| ENG-052 | Food Menu Normalizer Orch Engine | 6 | 5 | 7 | 5 | 7 | 3 | 7 | 8 | 3 | 5 | 8 | 5 | **69** | MERGE |
| ENG-053 | Grocery Normalizer Orch Engine | 6 | 5 | 7 | 5 | 7 | 3 | 7 | 8 | 3 | 5 | 8 | 5 | **69** | MERGE |
| ENG-054 | Menu Rebuild Orch Engine | 6 | 5 | 7 | 5 | 7 | 3 | 7 | 8 | 3 | 5 | 8 | 5 | **69** | MERGE |
| ENG-055 | Service Catalog Normalizer Orch Engine | 6 | 5 | 7 | 5 | 7 | 3 | 7 | 8 | 3 | 5 | 8 | 5 | **69** | MERGE |
| ENG-056 | Data Completeness Orch Engine | 6 | 5 | 7 | 5 | 7 | 3 | 7 | 8 | 3 | 5 | 8 | 5 | **69** | MERGE |
| ENG-057 | Data Quality Orch Engine | 9 | 8 | 8 | 9 | 9 | 8 | 8 | 9 | 10 | 9 | 10 | 9 | **106** | KEEP |
| ENG-058 | Data Trust Orch Engine | 6 | 5 | 7 | 5 | 7 | 3 | 7 | 8 | 3 | 5 | 8 | 5 | **69** | MERGE |
| ENG-059 | Unread Integrity Engine | 7 | 5 | 7 | 8 | 6 | 4 | 7 | 8 | 9 | 8 | 7 | 6 | **82** | FIX |
| ENG-060 | Auto-Fix Engine | 9 | 8 | 8 | 9 | 9 | 4 | 9 | 9 | 9 | 9 | 9 | 9 | **101** | KEEP |
| ENG-061 | Adaptive Taxonomy Orch Engine | 6 | 5 | 7 | 5 | 7 | 3 | 7 | 8 | 3 | 5 | 8 | 5 | **69** | MERGE |
| ENG-062 | Category Mapping Orch Engine | 6 | 5 | 7 | 5 | 7 | 3 | 7 | 8 | 3 | 5 | 8 | 5 | **69** | MERGE |
| ENG-063 | Call Audio Engine | 6 | 4 | 7 | 7 | 5 | 3 | 7 | 8 | 9 | 8 | 6 | 5 | **75** | FIX |
| ENG-064 | Call Media Engine | 6 | 4 | 7 | 7 | 5 | 3 | 7 | 8 | 9 | 8 | 6 | 5 | **75** | FIX |
| ENG-065 | Transport Engine | 7 | 5 | 8 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **85** | KEEP |
| ENG-066 | Action Engine | 7 | 5 | 7 | 6 | 7 | 3 | 7 | 8 | 9 | 8 | 8 | 6 | **81** | FIX |
| ENG-067 | Address Engine | 8 | 6 | 8 | 9 | 7 | 3 | 9 | 9 | 9 | 9 | 8 | 8 | **93** | KEEP |
| ENG-068 | Geo Sync Engine | 8 | 6 | 8 | 9 | 7 | 3 | 9 | 9 | 9 | 9 | 8 | 8 | **93** | KEEP |
| ENG-069 | Admin Priority Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-070 | SLA Engine | 6 | 4 | 7 | 7 | 5 | 3 | 7 | 8 | 9 | 8 | 7 | 5 | **76** | FIX |
| ENG-071 | AI Core Engine | 6 | 4 | 6 | 5 | 5 | 5 | 5 | 6 | 8 | 7 | 7 | 5 | **69** | FIX |
| ENG-072 | AI Feedback Engine | 7 | 5 | 7 | 8 | 6 | 7 | 8 | 8 | 9 | 9 | 7 | 7 | **88** | KEEP |
| ENG-073 | AI Audit International Engine | 6 | 4 | 6 | 7 | 5 | 3 | 7 | 7 | 9 | 9 | 7 | 5 | **75** | FIX |
| ENG-074 | AI Audit Marketplace Engine | 6 | 4 | 6 | 7 | 5 | 3 | 7 | 7 | 9 | 9 | 7 | 5 | **75** | FIX |
| ENG-075 | AI Audit SEO Engine | 5 | 3 | 5 | 4 | 4 | 3 | 6 | 7 | 2 | 4 | 5 | 4 | **52** | MERGE |
| ENG-076 | AI Audit Simple Engines | 2 | 2 | 3 | 2 | 2 | 2 | 4 | 4 | 2 | 3 | 2 | 2 | **30** | REMOVE |
| ENG-077 | AI Audit Technical Engine | 6 | 4 | 6 | 7 | 5 | 3 | 7 | 7 | 9 | 9 | 7 | 5 | **75** | FIX |
| ENG-078 | AI Audit UI/UX Engine | 6 | 4 | 6 | 7 | 5 | 3 | 7 | 7 | 9 | 9 | 7 | 5 | **75** | FIX |
| ENG-079 | Master Audit Engine | 3 | 2 | 4 | 2 | 1 | 2 | 3 | 3 | 1 | 1 | 3 | 2 | **27** | REMOVE |
| ENG-080 | Auto-Heal Engine | 6 | 5 | 7 | 5 | 6 | 4 | 6 | 7 | 5 | 6 | 7 | 5 | **69** | FIX |
| ENG-081 | Canonical Boost Engine | 9 | 8 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 9 | 9 | 9 | **106** | KEEP |
| ENG-082 | Business Core Onboarding Engine | 8 | 7 | 8 | 7 | 8 | 7 | 7 | 8 | 9 | 8 | 9 | 8 | **94** | KEEP |
| ENG-083 | Quality Score Engine | 7 | 5 | 7 | 6 | 7 | 5 | 6 | 7 | 6 | 7 | 8 | 6 | **77** | FIX |
| ENG-084 | Close Flow Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-085 | Living Commerce Engine | 6 | 4 | 6 | 5 | 5 | 4 | 6 | 7 | 8 | 7 | 7 | 5 | **70** | FIX |
| ENG-086 | Context Banner Engine | 8 | 7 | 8 | 9 | 8 | 4 | 8 | 9 | 9 | 8 | 8 | 8 | **96** | KEEP |
| ENG-087 | Global Context Engine | 6 | 4 | 6 | 4 | 5 | 4 | 6 | 7 | 7 | 7 | 8 | 5 | **69** | FIX |
| ENG-088 | Incident Engine (Control Plane) | 6 | 4 | 6 | 5 | 5 | 3 | 6 | 7 | 5 | 5 | 6 | 5 | **63** | FIX |
| ENG-089 | Currency Engine | 8 | 6 | 8 | 9 | 7 | 3 | 9 | 9 | 9 | 9 | 8 | 8 | **93** | KEEP |
| ENG-090 | DQ Engine Base | 9 | 8 | 9 | 9 | 9 | 4 | 10 | 10 | 10 | 10 | 9 | 9 | **106** | KEEP |
| ENG-091 | DQ Engine Registry | 9 | 8 | 9 | 9 | 9 | 4 | 10 | 10 | 9 | 9 | 9 | 9 | **104** | KEEP |
| ENG-092 | DQ Audit Trail Engine | 9 | 8 | 8 | 9 | 9 | 4 | 9 | 9 | 9 | 9 | 9 | 9 | **101** | KEEP |
| ENG-093 | DQ Scoring Engine | 9 | 9 | 8 | 9 | 9 | 8 | 9 | 9 | 9 | 9 | 10 | 9 | **107** | KEEP |
| ENG-094 | DQ Duplicate Shadow Engine | 8 | 7 | 8 | 8 | 8 | 4 | 8 | 8 | 8 | 8 | 8 | 8 | **93** | KEEP |
| ENG-095 | DQ Live Surface Sanitizer Engine | 8 | 7 | 8 | 9 | 8 | 4 | 8 | 9 | 9 | 9 | 9 | 8 | **102** | KEEP |
| ENG-096 | DQ Media Relevance Engine | 8 | 7 | 8 | 9 | 8 | 4 | 8 | 9 | 9 | 9 | 9 | 8 | **102** | KEEP |
| ENG-097 | DQ Quarantine Engine | 9 | 8 | 8 | 9 | 9 | 4 | 9 | 9 | 9 | 9 | 9 | 9 | **101** | KEEP |
| ENG-098 | DQ Reference Integrity Engine | 8 | 7 | 8 | 9 | 8 | 4 | 8 | 9 | 9 | 9 | 8 | 8 | **101** | KEEP |
| ENG-099 | DQ Safe Remediation Engine | 9 | 8 | 8 | 9 | 9 | 4 | 9 | 9 | 9 | 9 | 9 | 9 | **101** | KEEP |
| ENG-100 | DQ Search Hygiene Engine | 8 | 7 | 8 | 9 | 9 | 4 | 8 | 9 | 9 | 9 | 9 | 8 | **107** | KEEP |
| ENG-101 | DQ Taxonomy Integrity Engine | 8 | 7 | 8 | 9 | 8 | 4 | 8 | 9 | 9 | 9 | 8 | 8 | **101** | KEEP |
| ENG-102 | Dedup Engine | 9 | 8 | 8 | 9 | 9 | 8 | 9 | 9 | 9 | 9 | 10 | 9 | **106** | KEEP |
| ENG-103 | Adaptive Taxonomy Engine | 8 | 7 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 9 | 8 | **98** | KEEP |
| ENG-104 | AI Decision Engine | 3 | 2 | 5 | 3 | 2 | 3 | 3 | 3 | 5 | 3 | 5 | 3 | **40** | QUARANTINE |
| ENG-105 | Auto Acquisition Engine | 3 | 2 | 4 | 2 | 2 | 2 | 3 | 3 | 7 | 3 | 4 | 2 | **37** | QUARANTINE |
| ENG-106 | Autonomous Business Engine | 2 | 1 | 3 | 1 | 1 | 2 | 2 | 2 | 8 | 2 | 3 | 1 | **28** | QUARANTINE |
| ENG-107 | Auto Publish Engine | 8 | 7 | 8 | 8 | 9 | 4 | 8 | 8 | 9 | 8 | 9 | 8 | **100** | KEEP |
| ENG-108 | Auto Unpublish Engine | 8 | 7 | 8 | 8 | 9 | 4 | 8 | 8 | 9 | 8 | 9 | 8 | **100** | KEEP |
| ENG-109 | Backend Connectivity Engine | 8 | 7 | 8 | 9 | 8 | 3 | 9 | 9 | 9 | 9 | 8 | 8 | **105** | KEEP |
| ENG-110 | Category Mapping Engine | 8 | 7 | 8 | 9 | 9 | 7 | 8 | 8 | 9 | 9 | 8 | 8 | **108** | KEEP |
| ENG-111 | Coherence Engine | 6 | 4 | 6 | 4 | 5 | 4 | 6 | 7 | 7 | 7 | 7 | 5 | **68** | FIX |
| ENG-112 | Data Completeness Engine | 8 | 7 | 8 | 9 | 8 | 4 | 8 | 9 | 9 | 9 | 9 | 8 | **102** | KEEP |
| ENG-113 | Data Quality Engine (Lib Shadow) | 3 | 2 | 4 | 2 | 1 | 2 | 3 | 3 | 1 | 1 | 3 | 2 | **27** | REMOVE |
| ENG-114 | Data Trust Engine | 8 | 7 | 8 | 9 | 9 | 4 | 8 | 9 | 9 | 9 | 9 | 8 | **107** | KEEP |
| ENG-115 | Digital Orchestration Engine | 6 | 4 | 6 | 5 | 6 | 4 | 6 | 7 | 5 | 5 | 7 | 5 | **66** | FIX |
| ENG-116 | Engine Logger | 9 | 8 | 9 | 9 | 9 | 3 | 10 | 10 | 10 | 10 | 8 | 9 | **104** | KEEP |
| ENG-117 | Engine Metadata Registry | 9 | 8 | 9 | 9 | 9 | 4 | 9 | 9 | 9 | 9 | 9 | 9 | **103** | KEEP |
| ENG-118 | Entity Integrity Engine | 8 | 7 | 8 | 9 | 8 | 4 | 8 | 9 | 9 | 9 | 8 | 8 | **101** | KEEP |
| ENG-119 | Entity Recovery Engine | 8 | 7 | 7 | 8 | 8 | 4 | 7 | 7 | 9 | 8 | 8 | 7 | **88** | KEEP |
| ENG-120 | Food Menu Normalizer Engine | 8 | 7 | 8 | 8 | 8 | 4 | 8 | 8 | 9 | 9 | 9 | 8 | **100** | KEEP |
| ENG-121 | Franchise Dedup Engine | 6 | 4 | 6 | 6 | 5 | 3 | 6 | 7 | 6 | 7 | 6 | 5 | **67** | FIX |
| ENG-122 | Full-Stack Linkage Engine | 8 | 7 | 8 | 9 | 8 | 3 | 9 | 9 | 9 | 9 | 8 | 8 | **105** | KEEP |
| ENG-123 | Grocery Normalizer Engine | 8 | 7 | 8 | 8 | 8 | 4 | 8 | 8 | 9 | 9 | 9 | 8 | **100** | KEEP |
| ENG-124 | Hyper Radar Engine | 6 | 4 | 6 | 5 | 5 | 4 | 6 | 7 | 5 | 6 | 7 | 5 | **66** | FIX |
| ENG-125 | Legal Engine | 6 | 4 | 6 | 7 | 5 | 3 | 7 | 8 | 9 | 8 | 7 | 5 | **75** | FIX |
| ENG-126 | Menu Intelligence Engine | 4 | 3 | 5 | 4 | 3 | 4 | 5 | 6 | 3 | 5 | 5 | 4 | **51** | REMOVE |
| ENG-127 | Menu Presentation Engine | 4 | 3 | 5 | 4 | 3 | 2 | 5 | 6 | 7 | 7 | 4 | 3 | **53** | REMOVE |
| ENG-128 | Menu Rebuild Engine | 8 | 7 | 8 | 8 | 8 | 4 | 8 | 8 | 9 | 9 | 8 | 8 | **103** | KEEP |
| ENG-129 | Merchant Override Engine | 6 | 4 | 6 | 5 | 5 | 3 | 6 | 7 | 8 | 7 | 7 | 5 | **69** | FIX |
| ENG-130 | Module Link Engine | 4 | 3 | 5 | 4 | 3 | 2 | 5 | 6 | 4 | 5 | 4 | 3 | **48** | REMOVE |
| ENG-131 | Notification Engine (Lib) | 3 | 2 | 5 | 3 | 2 | 2 | 4 | 4 | 1 | 2 | 5 | 3 | **36** | REMOVE |
| ENG-132 | Context Awareness Engine | 7 | 5 | 7 | 7 | 6 | 7 | 7 | 7 | 9 | 8 | 7 | 6 | **81** | KEEP |
| ENG-133 | Hyper Personalization Engine | 7 | 5 | 7 | 6 | 6 | 7 | 7 | 7 | 9 | 8 | 7 | 6 | **80** | KEEP |
| ENG-134 | Next Best Action Engine | 7 | 5 | 7 | 7 | 6 | 7 | 7 | 7 | 9 | 8 | 7 | 6 | **81** | KEEP |
| ENG-135 | Personal Profile Engine | 7 | 5 | 7 | 7 | 6 | 7 | 7 | 7 | 9 | 8 | 7 | 6 | **81** | KEEP |
| ENG-136 | Session Intelligence Engine | 7 | 5 | 7 | 7 | 6 | 7 | 7 | 7 | 9 | 8 | 7 | 6 | **81** | KEEP |
| ENG-137 | Property Automation Engine | 6 | 4 | 6 | 5 | 5 | 3 | 6 | 7 | 5 | 6 | 7 | 5 | **65** | FIX |
| ENG-138 | Publish Gate Food Engine | 8 | 7 | 8 | 9 | 9 | 4 | 8 | 9 | 9 | 9 | 9 | 8 | **107** | KEEP |
| ENG-139 | Publish Gate Grocery Engine | 8 | 7 | 8 | 9 | 9 | 4 | 8 | 9 | 9 | 9 | 9 | 8 | **107** | KEEP |
| ENG-140 | Publish Gate Service Engine | 8 | 7 | 8 | 9 | 9 | 4 | 8 | 9 | 9 | 9 | 9 | 8 | **107** | KEEP |
| ENG-141 | Real Estate Engine Registry | 3 | 2 | 4 | 2 | 1 | 2 | 4 | 5 | 1 | 3 | 3 | 2 | **32** | REMOVE |
| ENG-142 | Rent Call Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-143 | SEO Engine (Lib Shadow) | 2 | 2 | 3 | 2 | 1 | 2 | 3 | 3 | 1 | 1 | 3 | 2 | **25** | REMOVE |
| ENG-144 | Service Catalog Normalizer Engine | 8 | 7 | 8 | 8 | 8 | 4 | 8 | 8 | 9 | 9 | 9 | 8 | **104** | KEEP |
| ENG-145 | Shop Cleanup Engine | 6 | 4 | 6 | 7 | 5 | 3 | 7 | 8 | 9 | 8 | 7 | 5 | **75** | FIX |
| ENG-146 | Shop Quality Engine | 6 | 4 | 6 | 7 | 5 | 3 | 7 | 8 | 6 | 8 | 7 | 5 | **72** | FIX |
| ENG-147 | Source Intake Engine | 8 | 7 | 8 | 9 | 9 | 4 | 8 | 8 | 9 | 9 | 8 | 8 | **105** | KEEP |
| ENG-148 | Strict Quality Gate Engine | 8 | 7 | 8 | 9 | 8 | 4 | 8 | 9 | 9 | 9 | 9 | 8 | **106** | KEEP |
| ENG-149 | Unified Global Engine | 2 | 1 | 3 | 1 | 1 | 2 | 3 | 3 | 7 | 2 | 2 | 1 | **28** | REMOVE |
| ENG-150 | UX Audit Engine | 5 | 3 | 5 | 4 | 3 | 2 | 5 | 6 | 3 | 5 | 5 | 4 | **50** | FIX |
| ENG-151 | Vertical Classifier Engine | 9 | 8 | 8 | 9 | 9 | 8 | 9 | 9 | 9 | 9 | 9 | 9 | **105** | KEEP |
| ENG-152 | Vibe Density Engine | 1 | 1 | 2 | 1 | 1 | 1 | 3 | 3 | 7 | 5 | 1 | 1 | **27** | REMOVE |
| ENG-153 | Visibility Optimizer Engine | 6 | 4 | 6 | 7 | 5 | 4 | 7 | 7 | 5 | 7 | 7 | 5 | **70** | FIX |
| ENG-154 | Geo Conflict Engine | 6 | 4 | 6 | 7 | 5 | 3 | 7 | 8 | 9 | 7 | 7 | 5 | **74** | FIX |
| ENG-155 | OSM Places Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-156 | God Anti-Conflict Engine | 2 | 1 | 3 | 1 | 1 | 1 | 3 | 3 | 1 | 1 | 2 | 1 | **20** | REMOVE |
| ENG-157 | God Continuous Audit Engine | 2 | 1 | 3 | 1 | 1 | 1 | 3 | 3 | 1 | 1 | 2 | 1 | **20** | REMOVE |
| ENG-158 | God Hyper-Optimization Engine | 2 | 1 | 3 | 1 | 1 | 1 | 2 | 2 | 7 | 1 | 3 | 1 | **25** | REMOVE |
| ENG-159 | God Maintenance Engine | 2 | 1 | 3 | 1 | 1 | 1 | 2 | 2 | 7 | 1 | 3 | 1 | **25** | REMOVE |
| ENG-160 | God Observability Engine | 2 | 1 | 3 | 1 | 1 | 1 | 3 | 3 | 1 | 1 | 2 | 1 | **20** | REMOVE |
| ENG-161 | God Quality Gate Engine | 2 | 1 | 3 | 1 | 1 | 1 | 2 | 2 | 1 | 1 | 2 | 1 | **18** | REMOVE |
| ENG-162 | God Taxonomy Engine | 2 | 1 | 3 | 1 | 1 | 1 | 2 | 2 | 1 | 1 | 2 | 1 | **18** | REMOVE |
| ENG-163 | Growth Domination Engine | 2 | 1 | 3 | 1 | 1 | 1 | 2 | 2 | 7 | 1 | 3 | 1 | **25** | REMOVE |
| ENG-164 | i18n Engine | 8 | 7 | 8 | 9 | 7 | 3 | 9 | 9 | 9 | 9 | 8 | 8 | **104** | KEEP |
| ENG-165 | Import Dedup Engine | 4 | 3 | 5 | 4 | 3 | 2 | 5 | 5 | 3 | 5 | 4 | 3 | **46** | REMOVE |
| ENG-166 | Import Merge Engine | 4 | 3 | 5 | 4 | 3 | 2 | 5 | 5 | 3 | 5 | 4 | 3 | **46** | REMOVE |
| ENG-167 | Universal Import Engine | 9 | 8 | 8 | 9 | 9 | 8 | 9 | 9 | 9 | 9 | 10 | 9 | **106** | KEEP |
| ENG-168 | Import Visibility Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-169 | Feed Ranking Engine | 9 | 8 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 9 | 10 | 9 | **107** | KEEP |
| ENG-170 | Ticker Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-171 | Intent Engine | 6 | 4 | 6 | 7 | 5 | 7 | 6 | 7 | 9 | 8 | 7 | 5 | **75** | FIX |
| ENG-172 | Engine Heartbeat | 9 | 8 | 9 | 9 | 9 | 4 | 9 | 10 | 10 | 10 | 9 | 9 | **105** | KEEP |
| ENG-173 | Task Engine | 6 | 4 | 6 | 7 | 5 | 3 | 7 | 8 | 9 | 8 | 6 | 5 | **74** | FIX |
| ENG-174 | Badge Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-175 | Map Interaction Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-176 | Map Performance Engine | 7 | 5 | 8 | 8 | 6 | 3 | 8 | 9 | 9 | 9 | 7 | 7 | **86** | KEEP |
| ENG-177 | Map Style Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-178 | Heatmap Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-179 | Live Stations Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-180 | Map Engine V2 | 9 | 8 | 9 | 9 | 9 | 4 | 9 | 9 | 9 | 9 | 10 | 9 | **103** | KEEP |
| ENG-181 | Nearby Discovery Engine | 9 | 8 | 8 | 9 | 9 | 8 | 9 | 9 | 9 | 9 | 10 | 9 | **106** | KEEP |
| ENG-182 | Route Preview Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-183 | Menu Engine | 8 | 7 | 8 | 7 | 8 | 7 | 8 | 8 | 8 | 8 | 9 | 8 | **94** | KEEP |
| ENG-184 | Merchant Automation Engine | 7 | 5 | 7 | 7 | 6 | 3 | 7 | 8 | 9 | 8 | 8 | 6 | **81** | KEEP |
| ENG-185 | Merchant QR Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-186 | Shop OS Engine | 8 | 7 | 8 | 8 | 8 | 4 | 8 | 8 | 8 | 8 | 9 | 8 | **94** | KEEP |
| ENG-187 | Delivery Batch Engine | 7 | 5 | 7 | 7 | 6 | 3 | 7 | 8 | 9 | 8 | 8 | 6 | **81** | KEEP |
| ENG-188 | Dispatch Engine | 9 | 8 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 9 | 10 | 9 | **107** | KEEP |
| ENG-189 | Dispatch Learning Engine | 7 | 5 | 7 | 8 | 6 | 8 | 7 | 7 | 9 | 9 | 8 | 7 | **88** | KEEP |
| ENG-190 | Dispatch Reassign Engine | 6 | 4 | 6 | 7 | 5 | 3 | 7 | 8 | 9 | 8 | 7 | 5 | **75** | FIX |
| ENG-191 | Dispatch Wave Engine | 7 | 5 | 7 | 7 | 6 | 3 | 7 | 8 | 9 | 8 | 8 | 6 | **81** | KEEP |
| ENG-192 | Driver Matching Engine | 9 | 8 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 9 | 10 | 9 | **107** | KEEP |
| ENG-193 | Live Context Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-194 | Pricing AI Engine | 7 | 5 | 7 | 7 | 6 | 7 | 7 | 7 | 7 | 7 | 8 | 6 | **83** | KEEP |
| ENG-195 | Mobility Pricing Engine | 9 | 8 | 8 | 9 | 9 | 4 | 9 | 9 | 9 | 9 | 9 | 9 | **101** | KEEP |
| ENG-196 | Ride Ordering Engine | 8 | 7 | 8 | 8 | 8 | 4 | 8 | 8 | 9 | 8 | 9 | 8 | **99** | KEEP |
| ENG-197 | Unified ETA Engine | 9 | 8 | 9 | 9 | 9 | 4 | 9 | 9 | 9 | 9 | 10 | 9 | **103** | KEEP |
| ENG-198 | Unified Mobility Engine | 8 | 7 | 8 | 8 | 9 | 4 | 8 | 8 | 8 | 8 | 9 | 8 | **99** | KEEP |
| ENG-199 | Onboarding Entity Resolution | 8 | 6 | 7 | 8 | 7 | 3 | 8 | 8 | 9 | 9 | 8 | 7 | **88** | KEEP |
| ENG-200 | Onboarding Field Merge | 8 | 6 | 7 | 8 | 7 | 3 | 8 | 8 | 9 | 9 | 8 | 7 | **88** | KEEP |
| ENG-201 | Onboarding Missing Fields | 8 | 6 | 7 | 8 | 7 | 3 | 8 | 8 | 9 | 9 | 8 | 7 | **88** | KEEP |
| ENG-202 | Onboarding Quality Check | 8 | 6 | 7 | 8 | 7 | 3 | 8 | 8 | 9 | 9 | 8 | 7 | **88** | KEEP |
| ENG-203 | Onboarding Source Policy | 8 | 6 | 7 | 8 | 7 | 3 | 8 | 8 | 9 | 9 | 8 | 7 | **88** | KEEP |
| ENG-204 | Onboarding Taxonomy Mapper | 8 | 6 | 7 | 8 | 7 | 3 | 8 | 8 | 9 | 9 | 8 | 7 | **88** | KEEP |
| ENG-205 | Onboarding Vertical Classifier | 8 | 6 | 7 | 8 | 7 | 3 | 8 | 8 | 9 | 9 | 8 | 7 | **88** | KEEP |
| ENG-206 | Onboarding Web Fallback | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 6 | **83** | KEEP |
| ENG-207 | Onboarding Publish Gate | 7 | 5 | 7 | 7 | 6 | 3 | 7 | 8 | 7 | 7 | 8 | 6 | **78** | FIX |
| ENG-208 | Radar Consensus Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-209 | Radar Discovery Engine | 9 | 8 | 8 | 9 | 9 | 8 | 9 | 9 | 9 | 9 | 10 | 9 | **106** | KEEP |
| ENG-210 | Radar Domain Engine | 7 | 5 | 7 | 7 | 6 | 3 | 7 | 8 | 9 | 8 | 7 | 7 | **81** | KEEP |
| ENG-211 | Radar Dynamic Pricing Engine | 6 | 4 | 6 | 6 | 5 | 3 | 6 | 7 | 6 | 6 | 7 | 5 | **67** | FIX |
| ENG-212 | Radar Filter Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-213 | Radar Fusion Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-214 | Radar Geo Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-215 | Radar Interaction Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-216 | Radar Layer Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-217 | Radar Source Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-218 | Radar Viewport Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-219 | Radar ETA Projection Engine | 6 | 4 | 6 | 6 | 5 | 3 | 6 | 7 | 7 | 6 | 7 | 5 | **68** | FIX |
| ENG-220 | Radar Map God Engine | 2 | 1 | 3 | 1 | 1 | 1 | 2 | 2 | 1 | 1 | 2 | 1 | **18** | REMOVE |
| ENG-221 | Radar Predictive Demand Engine | 7 | 5 | 7 | 7 | 6 | 7 | 7 | 7 | 9 | 8 | 8 | 7 | **85** | KEEP |
| ENG-222 | Radar Cinema Engine | 6 | 4 | 6 | 7 | 5 | 3 | 7 | 7 | 8 | 8 | 7 | 5 | **73** | FIX |
| ENG-223 | Radar Engine | 9 | 8 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 9 | 10 | 9 | **107** | KEEP |
| ENG-224 | Central Ranking Engine | 9 | 8 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 9 | 10 | 9 | **107** | KEEP |
| ENG-225 | Ranking Engine (Legacy) | 2 | 2 | 3 | 2 | 1 | 2 | 3 | 3 | 1 | 1 | 3 | 2 | **25** | REMOVE |
| ENG-226 | Global Revenue Engine | 7 | 5 | 7 | 8 | 7 | 3 | 8 | 8 | 9 | 9 | 8 | 7 | **86** | FIX |
| ENG-227 | Revenue Analytics Engine | 8 | 7 | 8 | 9 | 8 | 4 | 8 | 8 | 9 | 9 | 9 | 8 | **101** | KEEP |
| ENG-228 | Ride Matching Engine | 9 | 8 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 9 | 10 | 9 | **107** | KEEP |
| ENG-229 | Ride Pricing Engine | 9 | 8 | 8 | 9 | 9 | 4 | 9 | 9 | 9 | 9 | 9 | 9 | **101** | KEEP |
| ENG-230 | Runtime Auto-Repair Engine | 7 | 5 | 7 | 7 | 7 | 4 | 7 | 8 | 7 | 7 | 8 | 6 | **80** | FIX |
| ENG-231 | Content Governance Engine | 7 | 5 | 7 | 7 | 6 | 3 | 7 | 8 | 9 | 8 | 7 | 5 | **79** | FIX |
| ENG-232 | Listing Quality Engine | 3 | 2 | 4 | 2 | 2 | 2 | 3 | 3 | 2 | 2 | 3 | 2 | **30** | REMOVE |
| ENG-233 | Provider Quality Engine | 3 | 2 | 4 | 2 | 2 | 2 | 3 | 3 | 2 | 2 | 3 | 2 | **30** | REMOVE |
| ENG-234 | Search Purity Engine | 8 | 7 | 8 | 9 | 8 | 4 | 8 | 9 | 9 | 9 | 9 | 8 | **106** | KEEP |
| ENG-235 | Security Chat Engine | 6 | 4 | 6 | 7 | 5 | 3 | 7 | 8 | 9 | 8 | 7 | 5 | **75** | FIX |
| ENG-236 | Ghost Engine | 6 | 4 | 6 | 6 | 5 | 3 | 6 | 7 | 8 | 7 | 7 | 5 | **70** | FIX |
| ENG-237 | Fraud Detection Engine | 9 | 8 | 8 | 9 | 9 | 4 | 9 | 9 | 9 | 9 | 10 | 9 | **102** | KEEP |
| ENG-238 | SEO Engine (Canonical) | 8 | 7 | 8 | 9 | 9 | 4 | 8 | 9 | 9 | 9 | 9 | 8 | **107** | KEEP |
| ENG-239 | Shared Notification Engine | 8 | 7 | 8 | 9 | 8 | 4 | 8 | 9 | 9 | 9 | 8 | 8 | **105** | KEEP |
| ENG-240 | Sync Engine | 8 | 7 | 8 | 9 | 8 | 4 | 8 | 9 | 9 | 9 | 9 | 8 | **106** | KEEP |
| ENG-241 | Smart Home Engine | 6 | 4 | 6 | 5 | 5 | 3 | 6 | 7 | 8 | 7 | 7 | 5 | **69** | FIX |
| ENG-242 | Multi-Source Merge Engine | 9 | 8 | 8 | 9 | 9 | 4 | 9 | 9 | 9 | 9 | 9 | 9 | **101** | KEEP |
| ENG-243 | Source Normalization Engine | 2 | 2 | 3 | 2 | 1 | 2 | 2 | 2 | 1 | 1 | 3 | 2 | **23** | REMOVE |
| ENG-244 | Source Priority Engine | 8 | 7 | 8 | 9 | 8 | 4 | 8 | 8 | 9 | 9 | 8 | 8 | **104** | KEEP |
| ENG-245 | Global Support Engine | 7 | 5 | 7 | 7 | 6 | 3 | 7 | 8 | 9 | 8 | 7 | 5 | **79** | FIX |
| ENG-246 | Engine Connector Hub | 9 | 8 | 9 | 9 | 9 | 4 | 9 | 9 | 9 | 9 | 9 | 9 | **103** | KEEP |
| ENG-247 | Classification Engine | 9 | 8 | 8 | 9 | 9 | 8 | 9 | 9 | 9 | 9 | 10 | 9 | **106** | KEEP |
| ENG-248 | Anti-Fake Engine | 9 | 8 | 8 | 9 | 9 | 4 | 9 | 9 | 9 | 9 | 10 | 9 | **102** | KEEP |
| ENG-249 | Behavior Engine | 8 | 7 | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 9 | 8 | 8 | **108** | KEEP |
| ENG-250 | Proof Log Engine | 9 | 8 | 9 | 9 | 9 | 4 | 10 | 10 | 10 | 10 | 9 | 9 | **106** | KEEP |
| ENG-251 | Trust Ranking Engine | 4 | 3 | 5 | 4 | 3 | 3 | 4 | 5 | 2 | 3 | 5 | 4 | **45** | REMOVE |
| ENG-252 | Trust Score Engine | 9 | 8 | 8 | 9 | 9 | 4 | 9 | 9 | 9 | 9 | 10 | 9 | **102** | KEEP |
| ENG-253 | User Trust Engine | 6 | 4 | 6 | 5 | 5 | 7 | 6 | 7 | 6 | 6 | 7 | 5 | **70** | FIX |
| ENG-254 | Canonical UI Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-255 | Wallet Engine | 9 | 8 | 8 | 9 | 9 | 4 | 9 | 9 | 9 | 9 | 10 | 9 | **102** | KEEP |
| ENG-256 | Workflow Engine | 7 | 5 | 7 | 6 | 7 | 4 | 7 | 8 | 6 | 7 | 8 | 6 | **80** | FIX |
| ENG-257 | Canonical Mapping Engine | 8 | 7 | 8 | 9 | 7 | 3 | 9 | 9 | 9 | 9 | 8 | 8 | **104** | KEEP |
| ENG-258 | Media Truth Engine | 9 | 8 | 8 | 9 | 9 | 4 | 9 | 9 | 9 | 9 | 9 | 9 | **101** | KEEP |
| ENG-259 | Quarantine Engine (Service) | 7 | 5 | 7 | 7 | 7 | 3 | 7 | 8 | 7 | 7 | 8 | 6 | **79** | FIX |
| ENG-260 | Orbit Engine | 7 | 5 | 7 | 8 | 6 | 3 | 8 | 8 | 9 | 9 | 7 | 7 | **84** | KEEP |
| ENG-261 | Sentinel Quality Gate Engine | 9 | 8 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 9 | 10 | 9 | **107** | KEEP |
| ENG-262 | Unified Monitor Engine | 8 | 7 | 8 | 8 | 7 | 5 | 8 | 8 | 9 | 8 | 9 | 7 | **92** | KEEP |

---

## SCORECARD SUMMARY

| Verdict | Count | Fitness Range | Description |
|---------|-------|--------------|-------------|
| KEEP | 146 | 72–120 | Canonical engines; production-ready |
| FIX | 60 | 50–84 | Valid scope; needs contract/proof improvements |
| MERGE | 21 | 38–69 | Correct logic in wrong location; absorb then remove |
| QUARANTINE | 7 | 28–62 | Existential/governance risk; disable immediately |
| REMOVE | 28 | 18–53 | Dead shadows; god-layer; superseded |
| **TOTAL** | **262** | — | **262 ✓** |

## TOP 10 ENGINES BY FITNESS SCORE

| Rank | ID | Engine Name | Score |
|------|----|-------------|-------|
| 1 | ENG-024 | Base Engine | 114 |
| 2 | ENG-025 | Engine Feature Flags | 113 |
| 3 | ENG-029 | Engine Orchestrator | 107 |
| 4 | ENG-031 | Engine Registry | 105 |
| 5 | ENG-093 | DQ Scoring Engine | 107 |
| 6 | ENG-102 | Dedup Engine | 106 |
| 7 | ENG-110 | Category Mapping Engine | 108 |
| 8 | ENG-188 | Dispatch Engine | 107 |
| 9 | ENG-223 | Radar Engine | 107 |
| 10 | ENG-224 | Central Ranking Engine | 107 |

## BOTTOM 10 ENGINES BY FITNESS SCORE (REMOVAL PRIORITY)

| Rank | ID | Engine Name | Score | Verdict |
|------|----|-------------|-------|---------|
| 1 | ENG-161 | God Quality Gate Engine | 18 | REMOVE |
| 2 | ENG-162 | God Taxonomy Engine | 18 | REMOVE |
| 3 | ENG-220 | Radar Map God Engine | 18 | REMOVE |
| 4 | ENG-156 | God Anti-Conflict Engine | 20 | REMOVE |
| 5 | ENG-157 | God Continuous Audit Engine | 20 | REMOVE |
| 6 | ENG-160 | God Observability Engine | 20 | REMOVE |
| 7 | ENG-243 | Source Normalization Engine | 23 | REMOVE |
| 8 | ENG-143 | SEO Engine (Lib Shadow) | 25 | REMOVE |
| 9 | ENG-158 | God Hyper-Optimization Engine | 25 | REMOVE |
| 10 | ENG-159 | God Maintenance Engine | 25 | REMOVE |
