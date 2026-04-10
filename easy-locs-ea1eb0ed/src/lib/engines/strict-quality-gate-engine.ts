import { db } from "@/services/db";

interface GateResult {
  shopId: string;
  name: string;
  decision: "publish" | "block" | "review";
  reasons: string[];
}

export async function runStrictQualityGate() {
  const { data: shops } = await db
    .from("storefront_pages")
    .select("id, name, banner_url, logo_url, description, vertical, category, address, phone, email, status")
    .limit(300);

  if (!shops || shops.length === 0) {
    return { status: "completed", results: [], published: 0, blocked: 0 };
  }

  const results: GateResult[] = [];
  let published = 0;
  let blocked = 0;

  for (const shop of shops) {
    const reasons: string[] = [];

    if (!shop.name || shop.name.length < 2) reasons.push("Name too short");
    if (!shop.vertical) reasons.push("No vertical assigned");
    if (!shop.banner_url && !shop.logo_url) reasons.push("No visual assets");
    if (!shop.description || shop.description.length < 10) reasons.push("Description missing or too short");
    if (!shop.address) reasons.push("No address");

    let decision: "publish" | "block" | "review";
    if (reasons.length === 0) {
      decision = "publish";
      published++;
    } else if (reasons.length >= 3) {
      decision = "block";
      blocked++;
    } else {
      decision = "review";
    }

    results.push({ shopId: shop.id, name: shop.name, decision, reasons });
  }

  return { status: "completed", results, published, blocked };
}
