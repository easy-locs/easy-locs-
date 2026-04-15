/**
 * enrichment.ai-description.generate — AI-powered storefront description + SEO meta-tags.
 * Delegates to the storefront-description Supabase Edge Function so that OpenAI keys
 * remain strictly server-side. Falls back to template-based copy if the edge function
 * is unavailable or returns an error.
 */

export interface AIDescriptionInput {
  name: string;
  vertical: string;
  subcategory?: string | null;
  city?: string | null;
  country?: string | null;
  district?: string | null;
  menuItemCount?: number;
  serviceCount?: number;
  productCount?: number;
  phone?: string | null;
  website?: string | null;
}

export interface AIDescriptionOutput {
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  generatedBy: "llm" | "template";
}

function buildTemplateDescription(input: AIDescriptionInput): string {
  const location = [input.district, input.city, input.country].filter(Boolean).join(", ");
  const catalogHint = input.menuItemCount
    ? `with ${input.menuItemCount} menu items`
    : input.serviceCount
    ? `offering ${input.serviceCount} services`
    : input.productCount
    ? `featuring ${input.productCount} products`
    : "";

  const verticalLabel: Record<string, string> = {
    food: "restaurant",
    grocery: "grocery store",
    shops: "retail shop",
    services: "service provider",
    healthcare: "healthcare facility",
    stay: "hotel",
    hotel: "hotel",
    mobility: "transportation service",
    property: "property",
    experiences: "experience & activity",
    utility: "utility service",
    education: "educational institution",
    finance: "financial service",
    beauty: "beauty & wellness salon",
    retail: "retail store",
    delivery: "delivery service",
    events: "event venue",
    flight: "airline & flight service",
  };

  const type = verticalLabel[input.vertical] ?? "business";
  const sub = input.subcategory ? input.subcategory.replace(/_/g, " ") : "";
  const subLabel = sub ? ` specializing in ${sub}` : "";
  const locationLabel = location ? ` located in ${location}` : "";
  const catalogLabel = catalogHint ? `, ${catalogHint}` : "";

  return `${input.name} is a ${type}${subLabel}${locationLabel}${catalogLabel}. Visit us for quality products and excellent service.`;
}

function buildTemplateSEO(input: AIDescriptionInput): { title: string; description: string; keywords: string[] } {
  const location = [input.city, input.country].filter(Boolean).join(", ");
  const sub = input.subcategory ? input.subcategory.replace(/_/g, " ") : input.vertical;
  const title = location ? `${input.name} — ${sub} in ${location}` : `${input.name} — ${sub}`;
  const description = `${input.name} offers ${sub} services${location ? ` in ${location}` : ""}. Find contact details, hours, and more.`;
  const keywords = [
    input.name,
    sub,
    input.vertical,
    input.city,
    input.country,
    input.district,
    "near me",
  ].filter((k): k is string => Boolean(k));

  return { title, description, keywords };
}

async function callEdgeFunction(input: AIDescriptionInput): Promise<{
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
} | null> {
  const { supabase } = await import("@/integrations/supabase/client");

  try {
    const { data, error } = await supabase.functions.invoke("storefront-description", {
      body: {
        name: input.name,
        vertical: input.vertical,
        subcategory: input.subcategory ?? null,
        city: input.city ?? null,
        country: input.country ?? null,
        district: input.district ?? null,
        menuItemCount: input.menuItemCount,
        serviceCount: input.serviceCount,
        productCount: input.productCount,
      },
    });

    if (error) return null;

    const parsed = data as {
      description?: string;
      seoTitle?: string;
      seoDescription?: string;
      seoKeywords?: string[];
      source?: string;
    };

    if (!parsed?.description || !parsed?.seoTitle) return null;
    if (parsed.source === "fallback") return null;

    return {
      description: parsed.description,
      seoTitle: parsed.seoTitle,
      seoDescription: parsed.seoDescription ?? "",
      seoKeywords: parsed.seoKeywords ?? [],
    };
  } catch {
    return null;
  }
}

export async function generateAIDescription(
  input: AIDescriptionInput,
): Promise<AIDescriptionOutput> {
  const llm = await callEdgeFunction(input).catch(() => null);

  if (llm) {
    return {
      description: llm.description,
      seoTitle: llm.seoTitle,
      seoDescription: llm.seoDescription,
      seoKeywords: llm.seoKeywords,
      generatedBy: "llm",
    };
  }

  const seo = buildTemplateSEO(input);
  return {
    description: buildTemplateDescription(input),
    seoTitle: seo.title,
    seoDescription: seo.description,
    seoKeywords: seo.keywords,
    generatedBy: "template",
  };
}
