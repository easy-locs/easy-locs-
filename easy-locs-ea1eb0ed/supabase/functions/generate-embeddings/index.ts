import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { getOpenAIApiKey } from "../_shared/openai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = getOpenAIApiKey();

  const resp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI Embeddings error [${resp.status}]: ${err}`);
  }

  const data = await resp.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = requireServiceRole(req);
  if (!auth.authorized) return auth.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { target, limit = 100 } = body;
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
          .limit(Math.min(limit, 200));

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

          const embeddings = await generateEmbeddings(nonEmpty);

          let embIdx = 0;
          for (let j = 0; j < batch.length; j++) {
            const text = texts[j];
            if (text.length === 0) continue;

            const embedding = embeddings[embIdx++];
            const vectorStr = `[${embedding.join(",")}]`;

            const { error: updateErr } = await supabase
              .from(config.table)
              .update({ [config.vectorColumn]: vectorStr })
              .eq(config.idColumn, batch[j][config.idColumn]);

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
