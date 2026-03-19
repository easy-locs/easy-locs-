import type { SafePatchResult, UiIssue } from "./types";
import { titleize } from "./utils";

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
              el.style.display = el.style.display || "inline-flex";
              el.style.alignItems = "center";
              el.style.justifyContent = "center";
              markPatched(el, issue.id);
              count++;
            }
          }
          results.push({ issueId: issue.id, patched: count > 0, message: `Expanded ${count} tiny tap targets.` });
          break;
        }

        case "dotted_labels":
        case "untranslated_keys": {
          const els = Array.from(document.querySelectorAll("*")).filter(
            (el): el is HTMLElement => el instanceof HTMLElement
          );

          let count = 0;
          for (const el of els) {
            if (alreadyPatched(el)) continue;
            const text = (el.textContent ?? "").trim();
            if (!text || text.length > 80) continue;

            const shouldPatch =
              issue.type === "dotted_labels"
                ? /[A-Za-zÀ-ÿ]\.[A-Za-zÀ-ÿ]/.test(text)
                : /^[a-z0-9_.-]+$/.test(text) && text.includes(".");

            if (shouldPatch) {
              el.textContent = titleize(text);
              markPatched(el, issue.id);
              count++;
            }
          }
          results.push({ issueId: issue.id, patched: count > 0, message: `Sanitized ${count} labels.` });
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
          const sections = Array.from(
            document.querySelectorAll("[data-empty-state], [data-empty-section]")
          ).filter((el): el is HTMLElement => el instanceof HTMLElement);

          let count = 0;
          for (const section of sections) {
            if (alreadyPatched(section)) continue;
            if ((section.textContent ?? "").trim().length < 4) {
              section.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:24px;">
                  <p style="font-size:14px;color:#888;">Nothing to show yet</p>
                  <p style="font-size:12px;color:#aaa;">This section will appear when content is available.</p>
                </div>
              `;
              markPatched(section, issue.id);
              count++;
            }
          }
          results.push({ issueId: issue.id, patched: count > 0, message: `Patched ${count} empty sections.` });
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
