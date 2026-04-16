// Next-Gen IA — automated content enrichment pipeline.
// Generates descriptions, tags, SEO (title/meta/keywords), and image alt text
// for an entity in a single tool-call pass, and persists to content_enrichments.
//
// Service-role or authenticated. POST body:
//   { entityType: "listing" | "seed_product" | "marketplace_service",
//     entityId: uuid,
//     force?: boolean }        // bypass input_hash cache
//
// Bulk form:
//   { entityType, limit?: number, missingOnly?: boolean }

import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { aiRoute } from "../_shared/ai-router.ts";
import { applyGuardrails, sanitizeAssistantOutput } from "../_shared/ai-guardrails.ts";
import { logAiInteraction, checkAiQuota } from "../_shared/ai-cost-tracker.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EntityType = "listing" | "seed_product" | "marketplace_service";

interface EntitySource {
  table: string;
  idColumn: string;
  textColumns: string[];
  imageUrlsColumn?: string;             // array column or jsonb array of image URLs
  ownerColumns: string[];               // any column whose value must equal auth.uid() for owner access
}

const SOURCES: Record<EntityType, EntitySource> = {
  listing:              { table: "listings",             idColumn: "id", textColumns: ["title", "description", "category", "city"], imageUrlsColumn: "images", ownerColumns: ["user_id", "owner_id", "created_by", "seller_id", "provider_id"] },
  seed_product:         { table: "seed_products",        idColumn: "id", textColumns: ["name", "description", "category"],          imageUrlsColumn: "images", ownerColumns: ["user_id", "merchant_id", "owner_id", "created_by"] },
  marketplace_service:  { table: "marketplace_services", idColumn: "id", textColumns: ["title", "description", "category"],         imageUrlsColumn: "images", ownerColumns: ["user_id", "provider_id", "owner_id", "created_by"] },
};

interface EnrichmentOutput {
  description: string;
  tags: string[];
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  image_alts: Record<string, string>;
  quality_score: number;
}

async function hashInput(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function buildInputText(row: Record<string, unknown>, cols: string[]): string {
  return cols
    .map((c) => (typeof row[c] === "string" ? (row[c] as string).trim() : ""))
    .filter(Boolean).join(" | ");
}

function extractImageUrls(row: Record<string, unknown>, col?: string): string[] {
  if (!col) return [];
  const v = row[col];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string").slice(0, 8);
  if (typeof v === "string") return [v];
  return [];
}

const ENRICHMENT_SYSTEM_PROMPT = `You are a professional content enrichment engine for a global marketplace.
Produce concise, accurate, multilingual-safe copy.
Never invent factual claims (prices, addresses, ratings). Use only what is provided.
Respect the target length limits strictly.
Return ONLY a call to the enrich_content tool — no prose.`;

function enrichUserPrompt(inputText: string, imageUrls: string[]): string {
  return `Entity facts:
${inputText}

${imageUrls.length > 0 ? `Images to describe (generate descriptive, SEO-friendly alt text for each, max 120 chars each):\n${imageUrls.map((u, i) => `  ${i + 1}. ${u}`).join("\n")}` : "No images provided."}`;
}

function enrichTool() {
  return [{
    type: "function",
    function: {
      name: "enrich_content",
      description: "Generate enriched content for an entity.",
      parameters: {
        type: "object",
        properties: {
          description:      { type: "string", description: "150-250 word marketing description." },
          tags:             { type: "array", items: { type: "string" }, description: "5-12 concise topical tags." },
          seo_title:        { type: "string", description: "<=60 char SEO title." },
          seo_description:  { type: "string", description: "<=155 char meta description." },
          seo_keywords:     { type: "array", items: { type: "string" }, description: "5-10 SEO keywords." },
          image_alts:       { type: "object", additionalProperties: { type: "string" }, description: "Map of image URL -> alt text (<=120 chars each)." },
          quality_score:    { type: "number", description: "0..1 self-estimated quality." },
        },
        required: ["description", "tags", "seo_title", "seo_description", "seo_keywords", "image_alts", "quality_score"],
      },
    },
  }];
}

function parseEnrichment(provider: "openai" | "anthropic", data: unknown): EnrichmentOutput | null {
  const obj = data as Record<string, unknown>;
  try {
    if (provider === "anthropic") {
      const content = obj.content as Array<{ type: string; text?: string; input?: unknown; name?: string }> | undefined;
      const toolUse = content?.find((b) => b.type === "tool_use");
      if (toolUse?.input && typeof toolUse.input === "object") return toolUse.input as EnrichmentOutput;
      const text = content?.find((b) => b.type === "text")?.text ?? "";
      return JSON.parse(text) as EnrichmentOutput;
    }
    const choices = obj.choices as Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }>; content?: string } }> | undefined;
    const tool = choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (tool) return JSON.parse(tool) as EnrichmentOutput;
    const text = choices?.[0]?.message?.content ?? "";
    return JSON.parse(text) as EnrichmentOutput;
  } catch {
    return null;
  }
}

function clampEnrichment(e: EnrichmentOutput, imageUrls: string[]): EnrichmentOutput {
  const clampStr = (s: string, max: number) => (typeof s === "string" ? s.slice(0, max) : "");
  const clampArr = (a: unknown, max: number) => (Array.isArray(a) ? a.filter((x): x is string => typeof x === "string").slice(0, max) : []);
  const alts: Record<string, string> = {};
  for (const url of imageUrls) {
    const raw = e.image_alts?.[url];
    if (typeof raw === "string") alts[url] = clampStr(sanitizeAssistantOutput(raw), 120);
  }
  return {
    description:     clampStr(sanitizeAssistantOutput(e.description ?? ""), 2000),
    tags:            clampArr(e.tags, 12).map((t) => clampStr(t, 40)),
    seo_title:       clampStr(sanitizeAssistantOutput(e.seo_title ?? ""), 60),
    seo_description: clampStr(sanitizeAssistantOutput(e.seo_description ?? ""), 155),
    seo_keywords:    clampArr(e.seo_keywords, 10).map((t) => clampStr(t, 40)),
    image_alts:      alts,
    quality_score:   Math.max(0, Math.min(1, Number(e.quality_score ?? 0))),
  };
}

function isOwnerOf(row: Record<string, unknown>, ownerColumns: string[], userId: string | null): boolean {
  if (!userId) return false;
  for (const col of ownerColumns) {
    if (row[col] === userId) return true;
  }
  return false;
}

async function isAdminUser(db: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data } = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
  const role = (data as { role?: string } | null)?.role;
  return role === "admin" || role === "superadmin" || role === "owner";
}

interface EnrichResult { ok: true; entityId: string; cached: boolean; output?: EnrichmentOutput }
interface EnrichError  { ok: false; entityId: string; error: string }

async function enrichOne(
  db: ReturnType<typeof createClient>,
  userId: string | null,
  entityType: EntityType,
  entityId: string,
  force: boolean,
  isPrivileged: boolean,
): Promise<EnrichResult | EnrichError> {
  const cfg = SOURCES[entityType];
  // Select * so the function is resilient to schema drift — we then pluck
  // only the columns we know about; absent ones are simply ignored.
  const { data: row, error: fetchErr } = await db
    .from(cfg.table).select("*").eq(cfg.idColumn, entityId).maybeSingle();
  if (fetchErr || !row) {
    return { ok: false, entityId, error: fetchErr?.message ?? "entity not found" };
  }

  // Authorization: service-role / admin can enrich anything; otherwise the caller must own the entity.
  if (!isPrivileged && !isOwnerOf(row as Record<string, unknown>, cfg.ownerColumns, userId)) {
    return { ok: false, entityId, error: "forbidden" };
  }

  const inputText = buildInputText(row as Record<string, unknown>, cfg.textColumns);
  if (!inputText) return { ok: false, entityId, error: "no textual data to enrich" };

  const imageUrls = extractImageUrls(row as Record<string, unknown>, cfg.imageUrlsColumn);
  const inputHash = await hashInput(`${entityType}|${inputText}|${imageUrls.join(",")}`);

  if (!force) {
    const { data: existing } = await db
      .from("content_enrichments")
      .select("input_hash")
      .eq("entity_type", entityType).eq("entity_id", entityId).maybeSingle();
    if (existing?.input_hash === inputHash) {
      return { ok: true, entityId, cached: true };
    }
  }

  const guard = await applyGuardrails(inputText, { blockOnPii: false, checkModeration: false });
  if (!guard.allowed) {
    return { ok: false, entityId, error: `guardrail_blocked:${guard.reason}` };
  }

  const start = Date.now();
  const { response, provider, fallbackUsed } = await aiRoute({
    messages: [
      { role: "system", content: ENRICHMENT_SYSTEM_PROMPT },
      { role: "user",   content: enrichUserPrompt(guard.sanitized, imageUrls) },
    ],
    max_tokens: 1200,
    temperature: 0.4,
    tools: enrichTool(),
    tool_choice: { type: "function", function: { name: "enrich_content" } },
  });
  if (!response.ok) {
    const errText = await response.text();
    return { ok: false, entityId, error: `provider_${response.status}: ${errText.slice(0, 240)}` };
  }
  const data = await response.json();
  const parsed = parseEnrichment(provider, data);
  if (!parsed) return { ok: false, entityId, error: "failed_to_parse_enrichment" };
  const clean = clampEnrichment(parsed, imageUrls);

  const usage = (data as { usage?: { prompt_tokens?: number; completion_tokens?: number; input_tokens?: number; output_tokens?: number } }).usage ?? {};
  const promptTokens     = usage.prompt_tokens ?? usage.input_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? usage.output_tokens ?? 0;
  const model = (data as { model?: string }).model ?? (provider === "anthropic" ? "claude-3-5-haiku-20241022" : "gpt-4o-mini");

  const { error: upsertErr } = await db.from("content_enrichments").upsert({
    entity_type: entityType,
    entity_id: entityId,
    description: clean.description,
    tags: clean.tags,
    seo_title: clean.seo_title,
    seo_description: clean.seo_description,
    seo_keywords: clean.seo_keywords,
    image_alts: clean.image_alts,
    quality_score: clean.quality_score,
    generator_model: model,
    generator_provider: provider,
    input_hash: inputHash,
    approved: false,
  }, { onConflict: "entity_type,entity_id" });

  if (upsertErr) return { ok: false, entityId, error: `persist_failed:${upsertErr.message}` };

  await logAiInteraction({
    userId, feature: "ai-content-enrichment",
    provider, model, promptTokens, completionTokens,
    latencyMs: Date.now() - start,
    fallbackUsed,
    metadata: { entity_type: entityType, entity_id: entityId, images: imageUrls.length },
  });

  return { ok: true, entityId, cached: false, output: clean };
}

Deno.serve(async (req) => {
  const __qs = rejectQuerySecrets(req); if (__qs.rejected) return __qs.response!;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;

  const authHeader = req.headers.get("Authorization") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const isServiceRole = authHeader.replace("Bearer ", "") === serviceKey && serviceKey.length > 0;

  let userId: string | null = null;
  let isAdmin = false;
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (!isServiceRole) {
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    userId = user.id;
    isAdmin = await isAdminUser(db, userId);
    const q = await checkAiQuota(userId, "ai-content-enrichment");
    if (!q.allowed) {
      return new Response(
        JSON.stringify({ error: "Daily AI quota reached", reason: q.reason, used: q.used, limits: q.limits }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  const isPrivileged = isServiceRole || isAdmin;

  try {
    const body = await req.json().catch(() => ({}));
    const entityType = body.entityType as EntityType | undefined;
    if (!entityType || !SOURCES[entityType]) {
      return new Response(JSON.stringify({ error: "Unknown entityType" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.entityId) {
      const res = await enrichOne(db, userId, entityType, body.entityId, !!body.force, isPrivileged);
      const status = !res.ok && res.error === "forbidden" ? 403 : 200;
      return new Response(JSON.stringify(res), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bulk: only service-role or admin may enrich in bulk across entities
    // they do not own. Regular users are restricted to their own entities.
    const limit = Math.min(Math.max(Number(body.limit ?? 10), 1), 50);
    const cfg = SOURCES[entityType];
    let candidateQuery = db.from(cfg.table).select("*");
    if (!isPrivileged) {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Restrict candidates to rows the user owns via any configured owner column.
      const ownerFilter = cfg.ownerColumns.map((c) => `${c}.eq.${userId}`).join(",");
      candidateQuery = candidateQuery.or(ownerFilter);
    }
    const { data: rows, error } = await candidateQuery.limit(limit * 3);
    if (error) throw error;
    const candidateIds = (rows ?? []).map((r: Record<string, unknown>) => r[cfg.idColumn] as string);

    // `force: true` re-enriches existing rows. Otherwise default `missingOnly` to true
    // so bulk runs only pick rows without a prior enrichment.
    const missingOnly = body.force === true ? body.missingOnly === true : body.missingOnly !== false;
    let existingIds = new Set<string>();
    if (missingOnly && candidateIds.length > 0) {
      const { data: existing } = await db
        .from("content_enrichments").select("entity_id")
        .eq("entity_type", entityType).in("entity_id", candidateIds);
      existingIds = new Set((existing ?? []).map((r: { entity_id: string }) => r.entity_id));
    }
    const todo = candidateIds.filter((id) => !existingIds.has(id)).slice(0, limit);

    const results: Array<EnrichResult | EnrichError> = [];
    for (const id of todo) {
      // Re-check quota inside the loop for authenticated users so we stop as
      // soon as the user crosses their daily budget.
      if (!isPrivileged && userId) {
        const q = await checkAiQuota(userId, "ai-content-enrichment");
        if (!q.allowed) {
          results.push({ ok: false, entityId: id, error: `quota_exceeded:${q.reason}` });
          break;
        }
      }
      results.push(await enrichOne(db, userId, entityType, id, !!body.force, isPrivileged));
    }
    const processed = results.filter((r) => r.ok).length;
    return new Response(JSON.stringify({
      processed, total: results.length,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[ai-content-enrichment]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
