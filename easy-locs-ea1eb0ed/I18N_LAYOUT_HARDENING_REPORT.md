# I18N LAYOUT HARDENING REPORT

## Permanent CSS Rules Applied

### RTL/LTR Safety
| Rule | CSS Selector | What It Does |
|------|-------------|-------------|
| RTL text direction | [dir=rtl] p, span, label, h1-h4 | overflow: visible; direction: inherit |
| RTL margin swap | [dir=rtl] .ml-3, .ml-4, .mr-1, .mr-2 | Left ↔ Right margin swap |
| RTL padding swap | [dir=rtl] .pl-3, .pl-9, .pl-12, .pr-1 | Left ↔ Right padding swap |
| RTL border swap | [dir=rtl] .border-l-2 | Left ↔ Right border swap |
| RTL text alignment | [dir=rtl] .text-right/.text-left | Swapped |
| RTL icon flip | [dir=rtl] .rtl-flip | transform: scaleX(-1) |
| RTL space reversal | [dir=rtl] .space-x-1 through .space-x-4 | --tw-space-x-reverse: 1 |
| RTL border radius | [dir=rtl] .rounded-l-lg/.rounded-r-lg | Swapped |

### Long-Text Language Safety
| Language Group | CSS Selector | What It Does |
|---------------|-------------|-------------|
| German/Finnish/Dutch | :lang(de/fi/nl) h1-h3 | word-break: normal; overflow-wrap: break-word; hyphens: auto |
| Japanese/Korean/Chinese | :lang(ja/ko/zh) | word-break: keep-all; line-break: strict; font-feature-settings: "palt" |
| Thai | :lang(th) | word-break: keep-all; line-break: normal |
| Hindi/Bengali/Tamil | :lang(hi/bn/ta) | word-break: normal; line-break: normal |
| Arabic | :lang(ar) | font-family: IBM Plex Sans Arabic; line-height: 1.8; letter-spacing: 0 |
| Arabic headings | :lang(ar) h1-h3 | line-height: 1.5 |

### Global Text Safety
| Rule | What It Does |
|------|-------------|
| overflow-wrap: break-word | Applied to ALL non-code elements via universal selector |
| word-wrap: break-word | Fallback for older browsers |
| word-break: normal | Prevents letter-by-letter breaks |
| hyphens: manual | Only hyphenate where explicitly marked |

## Remaining I18N Issues (Not Yet Permanent)

| Issue | Current Mitigation | Permanent Fix Needed |
|-------|-------------------|---------------------|
| Raw i18n keys (dotted labels) | Runtime titleize() patch | Add missing keys to i18n JSON files |
| Missing translations | Fallback to English | Complete translation files for all 31 languages |
| Translated text causing layout break | Runtime text audit | Per-component testing with long translations |

## i18n Architecture Status

| System | Status |
|--------|--------|
| tc() canonical translation function | Active (src/lib/i18n-canonical.ts) |
| Language detection | Active (browser locale) |
| RTL auto-detection | Active (ar, he trigger dir=rtl) |
| Font loading | Active (Plus Jakarta Sans, Playfair Display, IBM Plex Sans Arabic) |
| CSS language-specific rules | Active (24 rules covering 13 language groups) |
