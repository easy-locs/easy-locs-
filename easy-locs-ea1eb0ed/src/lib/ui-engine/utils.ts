export function uiUid(prefix = "ui"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

export function titleize(input: string): string {
  if (/^\d+(\.\d+)+$/.test(input.trim())) return input;
  return input
    .replace(/([a-zA-ZÀ-ÿ])\.([a-zA-ZÀ-ÿ])/g, "$1 $2")
    .replace(/\.{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function isProbablyUntranslatedKey(text: string): boolean {
  return /^[a-z0-9_.-]+$/.test(text) && text.includes(".");
}

export function getText(el: Element | null | undefined): string {
  return (el?.textContent ?? "").trim();
}

export function isVisible(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    rect.width > 0 &&
    rect.height > 0
  );
}

export function hasHorizontalOverflow(): boolean {
  const doc = document.documentElement;
  const body = document.body;
  return Math.max(doc.scrollWidth, body.scrollWidth) > Math.max(doc.clientWidth, window.innerWidth);
}

export function findTinyTapTargets(minSize = 40): HTMLElement[] {
  return Array.from(document.querySelectorAll("button, a, [role='button'], input, select, textarea"))
    .filter((el): el is HTMLElement => el instanceof HTMLElement)
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.width < minSize || rect.height < minSize);
    });
}

export function findDottedLabels(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll("*"))
    .filter((el): el is HTMLElement => el instanceof HTMLElement)
    .filter((el) => {
      if (!isVisible(el)) return false;
      const text = getText(el);
      if (!text || text.length > 80) return false;
      return /[A-Za-zÀ-ÿ]\.[A-Za-zÀ-ÿ]/.test(text);
    });
}

export function findUntranslatedKeys(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll("*"))
    .filter((el): el is HTMLElement => el instanceof HTMLElement)
    .filter((el) => {
      if (!isVisible(el)) return false;
      const text = getText(el);
      if (!text || text.length > 80) return false;
      return isProbablyUntranslatedKey(text);
    });
}

export function findDuplicateHeadings(): HTMLElement[] {
  const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
    .filter((el): el is HTMLElement => el instanceof HTMLElement)
    .filter(isVisible);

  const seen = new Map<string, number>();
  const duplicates: HTMLElement[] = [];

  for (const h of headings) {
    const text = getText(h).toLowerCase();
    if (!text) continue;
    const count = seen.get(text) ?? 0;
    seen.set(text, count + 1);
    if (count >= 1) duplicates.push(h);
  }

  return duplicates;
}

export function findBrokenCards(selectors: string[]): HTMLElement[] {
  const cards = selectors.flatMap((s) =>
    Array.from(document.querySelectorAll(s)).filter((el): el is HTMLElement => el instanceof HTMLElement)
  );

  return cards.filter((card) => {
    if (!isVisible(card)) return false;
    const rect = card.getBoundingClientRect();
    const text = getText(card);
    return rect.height < 60 || rect.width < 120 || text.length === 0;
  });
}

export function findEmptySections(selectors: string[]): HTMLElement[] {
  const sections = selectors.flatMap((s) =>
    Array.from(document.querySelectorAll(s)).filter((el): el is HTMLElement => el instanceof HTMLElement)
  );

  return sections.filter((section) => {
    if (!isVisible(section)) return false;
    const text = getText(section);
    const hasImage = section.querySelector("img");
    const hasCard = section.querySelector("[data-card], .card, .rounded-2xl, .rounded-xl");
    return text.length < 4 && !hasImage && !hasCard;
  });
}
