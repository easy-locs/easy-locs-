/**
 * Universal link builder + share helper — hash-aware.
 */

export function buildAppLink(path: string): string {
  const base = window.location.origin;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const isHash = window.location.href.includes("/#/");
  return isHash ? `${base}/#${normalized}` : `${base}${normalized}`;
}

export async function shareLink(url: string): Promise<void> {
  try {
    if (navigator.share) {
      await navigator.share({
        title: "Easy Locs",
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied");
    }
  } catch (e) {
    console.error("Share failed", e);
  }
}
