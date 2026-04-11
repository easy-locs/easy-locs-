# RAW LABEL ELIMINATION REPORT

## Current State

### Runtime Patching (Active)
The UI Engine's `safePatches.ts` catches raw i18n keys at runtime:
- **Detection**: Regex `/[A-Za-zÀ-ÿ]\.[A-Za-zÀ-ÿ]/` for dotted labels, `/^[a-z0-9_.-]+$/` for untranslated keys
- **Patch**: `titleize(text)` — converts "nav.dashboard" → "Dashboard", "settings.profile" → "Profile"
- **Scope**: Runs on all 10 user-facing pages via useUiEngine

### Source-Level Protections (Permanent)
| Protection | How |
|-----------|-----|
| tc() function | Canonical translation function with English fallback |
| ErrorState component | Uses tc("common.error") — never shows raw keys |
| PageShell component | Renders EmptyState with proper titles |
| Button labels | All use tc() or hardcoded English |

### Remaining Raw Key Sources
| Location | Type | Fix Required |
|----------|------|-------------|
| Dynamic data from DB | Database field names shown as labels | Map field names to human labels in code |
| Third-party integrations | API response keys shown in UI | Add translation mappings |
| Dev-only debug output | Console-style output visible in dev | Gate behind import.meta.env.DEV |

## Plan for Complete Elimination

### Phase 1 (Done)
- Runtime titleize() catches most common patterns
- CSS handles text overflow from translated text
- RTL/LTR layout safety rules applied

### Phase 2 (Next)
- Audit all tc() calls to ensure complete translation coverage
- Add missing translation keys for all 31 supported languages
- Test critical pages with longest translations (German, Finnish)

### Phase 3 (Future)
- Automated i18n key coverage testing
- Translation completeness CI check
- Per-language screenshot comparison
