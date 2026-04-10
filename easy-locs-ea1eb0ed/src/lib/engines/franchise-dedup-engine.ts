import { db } from "@/services/db";

interface DedupResult {
  shopId: string;
  name: string;
  duplicateOf: string;
  duplicateShopId: string;
  similarity: number;
}

export async function runFranchiseDedup() {
  const { data: shops } = await db
    .from("storefront_pages")
    .select("id, name, slug, address, city, vertical, org_id")
    .eq("status", "published")
    .limit(500);

  if (!shops || shops.length < 2) {
    return { status: "completed", results: [], flagged: 0 };
  }

  const results: DedupResult[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < shops.length; i++) {
    for (let j = i + 1; j < shops.length; j++) {
      const a = shops[i];
      const b = shops[j];
      if (a.org_id === b.org_id) continue;

      const nameA = normalize(a.name);
      const nameB = normalize(b.name);
      const sim = similarity(nameA, nameB);

      if (sim >= 0.85 && a.city === b.city && a.vertical === b.vertical) {
        const key = [a.id, b.id].sort().join(":");
        if (seen.has(key)) continue;
        seen.add(key);

        results.push({
          shopId: b.id,
          name: b.name,
          duplicateOf: a.name,
          duplicateShopId: a.id,
          similarity: Math.round(sim * 100),
        });
      }
    }
  }

  return { status: "completed", results, flagged: results.length };
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;
  const editDist = levenshtein(longer, shorter);
  return (longer.length - editDist) / longer.length;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
