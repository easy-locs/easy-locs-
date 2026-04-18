import type { SafePatchResult, UiIssue } from "./types";
import { titleize } from "./utils";
import {
  findVerticalClipping,
  findTextClipping,
  findElementOverlaps,
  findStranglingWrappers,
  findMissingCardAttributes,
  findNonResponsiveWidths,
} from "./detectors";

const PATCHED_ATTR = "data-ui-engine-patched";

function markPatched(el: HTMLElement, issueId: string) {
  el.setAttribute(PATCHED_ATTR, issueId);
}

function alreadyPatched(el: HTMLElement) {
  return el.hasAttribute(PATCHED_ATTR);
}

export function applySafePatches(issues: UiIssue[]): SafePatchResult[] {
  const results: SafePatchResult[] = [];

  for (const issue of issues) {
    try {
      switch (issue.type) {
        case "overflow_x": {
          document.documentElement.style.overflowX = "hidden";
          document.body.style.overflowX = "hidden";
          results.push({ issueId: issue.id, patched: true, message: "Forced overflow-x hidden." });
          break;
        }

        case "overflow_y_clip": {
          const clipped = findVerticalClipping();
          let count = 0;
          for (const el of clipped) {
            if (alreadyPatched(el)) continue;
            // Safe fix: allow overflow to be visible or auto
            el.style.overflow = "visible";
            markPatched(el, issue.id);
            count++;
          }
          results.push({ issueId: issue.id, patched: count > 0, message: `Unclipped ${count} elements.` });
          break;
        }

        case "text_clipping": {
          const textClips = findTextClipping();
          let count = 0;
          for (const el of textClips) {
            if (alreadyPatched(el)) continue;
            el.style.overflow = "visible";
            el.style.textOverflow = "unset";
            markPatched(el, issue.id);
            count++;
          }
          results.push({ issueId: issue.id, patched: count > 0, message: `Fixed ${count} text clips.` });
          break;
        }

        case "element_overlap": {
          const overlaps = findElementOverlaps();
          let count = 0;
          for (const { a, b } of overlaps) {
            if (alreadyPatched(b)) continue;
            // Add margin to resolve overlap
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            const overlapY = ra.bottom - rb.top;
            if (overlapY > 0 && overlapY < 40) {
              b.style.marginTop = `${Math.ceil(overlapY + 4)}px`;
              markPatched(b, issue.id);
              count++;
            }
          }
          results.push({ issueId: issue.id, patched: count > 0, message: `Resolved ${count} overlaps.` });
          break;
        }

        case "wrapper_strangling": {
          const strangled = findStranglingWrappers();
          let count = 0;
          for (const el of strangled) {
            if (alreadyPatched(el)) continue;
            el.style.overflow = "visible";
            markPatched(el, issue.id);
            count++;
          }
          results.push({ issueId: issue.id, patched: count > 0, message: `Freed ${count} strangling wrappers.` });
          break;
        }

        case "tiny_tap_targets": {
          const els = Array.from(
            document.querySelectorAll("button, a, [role='button'], input, select, textarea")
          ).filter((el): el is HTMLElement => el instanceof HTMLElement);

          let count = 0;
          for (const el of els) {
            if (alreadyPatched(el)) continue;
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && (rect.width < 40 || rect.height < 40)) {
              el.style.minWidth = "40px";
              el.style.minHeight = "40px";
              markPatched(el, issue.id);
              count++;
            }
          }
          results.push({ issueId: issue.id, patched: count > 0, message: `Expanded ${count} tiny tap targets.` });
          break;
        }

        case "dotted_labels":
        case "untranslated_keys": {
          // NOTE: previously rewrote `el.textContent` directly. That mutates
          // React-managed text nodes and causes "Failed to execute removeChild
          // on Node" crashes when React next re-renders the same subtree.
          // Reverted to a report-only path; the underlying i18n fix should be
          // made in source instead of patched in the live DOM.
          void titleize;
          results.push({ issueId: issue.id, patched: false, message: "Report-only (no DOM mutation)." });
          break;
        }

        case "broken_card_layout": {
          const cards = Array.from(
            document.querySelectorAll("[data-card='merchant'], [data-card='listing'], .merchant-card, .restaurant-card")
          ).filter((el): el is HTMLElement => el instanceof HTMLElement);

          let count = 0;
          for (const card of cards) {
            if (alreadyPatched(card)) continue;
            card.style.minHeight = "120px";
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.gap = "8px";
            card.style.overflow = "hidden";
            card.style.borderRadius = card.style.borderRadius || "16px";
            card.style.padding = card.style.padding || "12px";
            markPatched(card, issue.id);
            count++;
          }
          results.push({ issueId: issue.id, patched: count > 0, message: `Normalized ${count} cards.` });
          break;
        }

        case "empty_section": {
          // NOTE: previously assigned `section.innerHTML = "..."` to inject an
          // empty-state placeholder. That clobbers React-managed children and
          // causes "Failed to execute removeChild on Node" on the next render.
          // Reverted to a report-only path; empty-state UX should be authored
          // in the React tree, not patched into the DOM.
          results.push({ issueId: issue.id, patched: false, message: "Report-only (no DOM mutation)." });
          break;
        }

        case "missing_card_attribute": {
          const cards = findMissingCardAttributes();
          let count = 0;
          for (const card of cards) {
            if (alreadyPatched(card)) continue;
            card.setAttribute("data-card", "auto");
            markPatched(card, issue.id);
            count++;
          }
          results.push({ issueId: issue.id, patched: count > 0, message: `Tagged ${count} cards with data-card.` });
          break;
        }

        case "non_responsive_width": {
          const nonResp = findNonResponsiveWidths();
          let count = 0;
          for (const el of nonResp) {
            if (alreadyPatched(el)) continue;
            el.style.maxWidth = "100%";
            markPatched(el, issue.id);
            count++;
          }
          results.push({ issueId: issue.id, patched: count > 0, message: `Constrained ${count} fixed-width elements.` });
          break;
        }

        default:
          results.push({ issueId: issue.id, patched: false, message: "No safe patch for this issue." });
      }
    } catch (err) {
      results.push({
        issueId: issue.id,
        patched: false,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
