# UI DEFECT TO SOURCE MAP

## How Runtime Patches Map to Permanent Source Fixes

### Category 1: TEXT TRUNCATION

| Defect | Runtime Patch | Permanent Source Fix | File |
|--------|-------------|---------------------|------|
| Text clipped by overflow:hidden | el.style.overflow = "visible" | p/span/label/heading { overflow: visible } in Layout Protection Engine | index.css:70-76 |
| Vertical text truncation | el.style.overflow = "visible" | Same Layout Protection Engine rule | index.css:70-76 |
| Button text cut by nowrap | el.style.whiteSpace = "normal" | Removed whitespace-nowrap from button base class | button.tsx:13 |
| Title too long for card | el.style.overflowWrap = "break-word" | [data-card] h3/h4 { -webkit-line-clamp: 2 } | index.css:502-513 |
| Label doesn't fit | el.style.height = "auto" | Tab labels: white-space: normal; min-height: 36px | index.css:123-128 |
| Nowrap overflow | el.style.whiteSpace = "normal" | Badge/chip: nowrap + ellipsis; Buttons: nowrap removed | index.css:131-136, button.tsx |

### Category 2: CARD INTEGRITY

| Defect | Runtime Patch | Permanent Source Fix | File |
|--------|-------------|---------------------|------|
| Broken card layout | card.style.minHeight/display/flex | [data-card] { display: flex; flex-direction: column; min-height: 120px } | index.css:485-500 |
| Card content overflow | CardShell overflow-hidden | Changed to [&>img]:overflow-hidden only | CardShell.tsx:37-38 |
| Inconsistent heights | — (not patched) | card-grid auto-fill + min-max | index.css:166-180 |

### Category 3: TAP TARGET / ACCESSIBILITY

| Defect | Runtime Patch | Permanent Source Fix | File |
|--------|-------------|---------------------|------|
| Tiny tap targets | el.style.minWidth/minHeight = "40px" | button { min-height: 2.25rem; min-width: 2.25rem } + coarse: 2.75rem | index.css:464-473 |
| Icon buttons no padding | — | button:has(> svg:only-child) { padding: 0.5rem; centered } | index.css:476-483 |

### Category 4: OVERFLOW / CONTAINER

| Defect | Runtime Patch | Permanent Source Fix | File |
|--------|-------------|---------------------|------|
| Horizontal overflow | body.style.overflowX = "hidden" | html, body { overflow-x: hidden; max-width: 100vw } | index.css:350-354 |
| Wrapper strangling | el.style.overflow = "visible" | Layout Protection Engine: text elements get overflow: visible | index.css:68-76 |
| Element overlap | marginTop adjustment | NOT YET PERMANENT — requires per-component fix | — |

### Category 5: I18N / RAW LABELS

| Defect | Runtime Patch | Permanent Source Fix | File |
|--------|-------------|---------------------|------|
| Dotted i18n keys | titleize(text) | NOT YET PERMANENT — needs i18n JSON file updates | — |
| RTL clipping | — | [dir=rtl] text { overflow: visible } | index.css:330-336 |
| Long German/Finnish text | — | :lang(de/fi/nl) { overflow-wrap: break-word; hyphens: auto } | index.css:339-345 |

### Category 6: EMPTY / ERROR / LOADING

| Defect | Runtime Patch | Permanent Source Fix | File |
|--------|-------------|---------------------|------|
| Empty sections | innerHTML placeholder | EmptyState + ErrorState + LoadingState components exist | empty-state.tsx, error-state.tsx, LoadingState.tsx |
| Missing empty state CSS | — | .empty-state, .state-container CSS classes defined | index.css:246-270, 512-528 |
