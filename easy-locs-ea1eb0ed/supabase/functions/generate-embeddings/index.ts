import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
// LB1 Track 1 (#841) — embedding generation goes through the platform agent
// registry. Direct fetches against the OpenAI embeddings HTTP endpoint are no
// longer permitted; the AI_EMBEDDING adapter handles provider selection,
// quota and ai_interactions persistence.
import { dispatchAiEmbedding } from "../_shared/execution/ai-dispatch.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 50;

interface EmbeddingTarget {
  table: string;
  vectorColumn: string;
  textColumns: string[];
  idColumn: string;
  filter?: string;
}

const TARGETS: Record<string, EmbeddingTarget> = {
  listings: {
    table: "listings",
    vectorColumn: "embedding",
    textColumns: ["title", "description", "category", "city"],
    idColumn: "id",
  },
  products: {
    table: "seed_products",
    vectorColumn: "embedding",
    textColumns: ["name", "description", "category"],
    idColumn: "id",
  },
  services: {
    table: "marketplace_services",
    vectorColumn: "embedding",
    textColumns: ["title", "description", "category"],
    idColumn: "id",
    filter: "active.in.(true)",
  },
  profiles: {
    table: "profiles",
    vectorColumn: "embedding",
    textColumns: ["full_name", "bio", "city"],
    idColumn: "id",
  },
};

async function generateEmbeddings(texts: string[], target: string): Promise<number[][]> {
  const outcome = await dispatchAiEmbedding(
    {
      feature: `generate-embeddings.${target}`,
      input: texts,
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
    },
    { feature: `generate-embeddings.${target}` },
  );

  if (outcome.status !== "succeeded" || !outcome.output) {
    throw new Error(
      `AI_EMBEDDING dispatch ${outcome.status}` +
        (outcome.errorCode ? ` [${outcome.errorCode}]` : "") +
        (outcome.errorMessage ? `: ${outcome.errorMessage}` : ""),
    );
  }
  return outcome.output.vectors;
}

function buildEmbeddingText(row: Record<string, unknown>, columns: string[]): string {
  return columns
    .map((col) => {
      const val = row[col];
      return typeof val === "string" ? val.trim() : "";
    })
    .filter(Boolean)
    .join(" | ");
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const auth = requireServiceRole(req);
  if (!auth.authorized) return auth.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { target, limit = 500 } = body;
    const targetNames = target ? [target] : Object.keys(TARGETS);

    const results: Record<string, unknown> = {};
    let totalEmbedded = 0;

    for (const name of targetNames) {
      const config = TARGETS[name];
      if (!config) {
        results[name] = { error: "Unknown target" };
        continue;
      }

      try {
        let query = supabase
          .from(config.table)
          .select([config.idColumn, ...config.textColumns].join(", "))
          .is(config.vectorColumn, null)
          .limit(Math.min(limit, 1000));

        if (config.filter) {
          const dotIdx = config.filter.indexOf(".");
          if (dotIdx > 0) {
            const col = config.filter.substring(0, dotIdx);
            const op = config.filter.substring(dotIdx + 1);
            if (op.startsWith("in.")) {
              const valuesStr = op.substring(3);
              const values = valuesStr.replace(/^\(/, "").replace(/\)$/, "").split(",");
              query = query.in(col, values);
            }
          }
        }

        const { data: rows, error } = await query;
        if (error) {
          results[name] = { error: error.message };
          continue;
        }

        if (!rows || rows.length === 0) {
          results[name] = { embedded: 0, message: "No rows to embed" };
          continue;
        }

        let embedded = 0;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          const texts = batch.map((row) => buildEmbeddingText(row, config.textColumns));
          const nonEmpty = texts.filter((t) => t.length > 0);

          if (nonEmpty.length === 0) continue;

          const embeddings = await generateEmbeddings(nonEmpty, name);

          let embIdx = 0;
          for (let j = 0; j < batch.length; j++) {
            const text = texts[j];
            if (text.length === 0) continue;

            const embedding = embeddings[embIdx++];
            const vectorStr = `[${embedding.join(",")}]`;

            // Guard against the stale-overwrite race: only write when the
            // embedding column is still NULL. If a concurrent update (e.g. a
            // text edit firing the embedding-stale trigger) has nulled it
            // again or another worker has filled it, this no-ops.
            const { error: updateErr } = await supabase
              .from(config.table)
              .update({ [config.vectorColumn]: vectorStr })
              .eq(config.idColumn, batch[j][config.idColumn])
              .is(config.vectorColumn, null);

            if (updateErr) {
              console.error(`[generate-embeddings] Update failed for ${config.table}/${batch[j][config.idColumn]}:`, updateErr.message);
              continue;
            }

            embedded++;
          }
        }

        results[name] = { embedded };
        totalEmbedded += embedded;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results[name] = { error: msg };
      }
    }

    return new Response(
      JSON.stringify({ results, totalEmbedded, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate-embeddings] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
