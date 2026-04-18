#!/usr/bin/env node
// db-snapshot.mjs — read-only structural snapshot of the live Supabase DB.
//
// Reads the live DB via the Supabase Management API SQL endpoint and writes
// a timestamped directory of JSON files under docs/db-snapshots/<UTC-ts>/.
//
// Performs ZERO writes against the database. SELECT-only queries.
// Required env: SUPABASE_ACCESS_TOKEN, VITE_SUPABASE_PROJECT_ID

import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PROJ = process.env.VITE_SUPABASE_PROJECT_ID;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!PROJ || !TOKEN) {
  console.error("Missing VITE_SUPABASE_PROJECT_ID or SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const API = `https://api.supabase.com/v1/projects/${PROJ}/database/query`;

async function runSql(query) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`SQL ${res.status}: ${txt}`);
  }
  return res.json();
}

const APP_SCHEMAS = ["public", "system"];
const SCHEMA_LIST_SQL = `'${APP_SCHEMAS.join("','")}'`;

const QUERIES = {
  meta: `
    SELECT current_database() AS db,
           current_user AS user,
           version() AS version,
           pg_postmaster_start_time() AS server_start,
           now() AS snapshot_at,
           pg_size_pretty(pg_database_size(current_database())) AS db_size;
  `,
  schemas: `
    SELECT schema_name
    FROM information_schema.schemata
    ORDER BY schema_name;
  `,
  extensions: `
    SELECT e.extname, e.extversion, n.nspname AS schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    ORDER BY e.extname;
  `,
  tables: `
    SELECT t.table_schema AS schema,
           t.table_name AS name,
           c.relrowsecurity AS rls_enabled,
           obj_description(c.oid, 'pg_class') AS comment
    FROM information_schema.tables t
    JOIN pg_class c ON c.relname = t.table_name
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
    WHERE t.table_schema IN (${SCHEMA_LIST_SQL})
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_schema, t.table_name;
  `,
  columns: `
    SELECT table_schema AS schema,
           table_name AS table,
           column_name AS name,
           ordinal_position AS pos,
           data_type,
           udt_name,
           is_nullable,
           column_default,
           character_maximum_length AS max_len,
           numeric_precision AS num_prec,
           numeric_scale AS num_scale,
           is_identity,
           identity_generation,
           is_generated,
           generation_expression
    FROM information_schema.columns
    WHERE table_schema IN (${SCHEMA_LIST_SQL})
    ORDER BY table_schema, table_name, ordinal_position;
  `,
  constraints: `
    SELECT n.nspname AS schema,
           cl.relname AS table,
           c.conname AS name,
           c.contype AS type,
           pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname IN (${SCHEMA_LIST_SQL})
    ORDER BY n.nspname, cl.relname, c.conname;
  `,
  indexes: `
    SELECT schemaname AS schema,
           tablename AS table,
           indexname AS name,
           indexdef AS definition
    FROM pg_indexes
    WHERE schemaname IN (${SCHEMA_LIST_SQL})
    ORDER BY schemaname, tablename, indexname;
  `,
  policies: `
    SELECT schemaname AS schema,
           tablename AS table,
           policyname AS name,
           permissive,
           roles,
           cmd,
           qual,
           with_check
    FROM pg_policies
    WHERE schemaname IN (${SCHEMA_LIST_SQL})
    ORDER BY schemaname, tablename, policyname;
  `,
  functions: `
    SELECT n.nspname AS schema,
           p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args,
           pg_get_function_result(p.oid) AS returns,
           l.lanname AS language,
           CASE WHEN p.prosecdef THEN 'definer' ELSE 'invoker' END AS security,
           p.provolatile AS volatility,
           p.prokind AS kind
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname IN (${SCHEMA_LIST_SQL})
    ORDER BY n.nspname, p.proname, args;
  `,
  triggers: `
    SELECT trigger_schema AS schema,
           event_object_table AS table,
           trigger_name AS name,
           action_timing,
           event_manipulation AS event,
           action_orientation,
           action_statement
    FROM information_schema.triggers
    WHERE trigger_schema IN (${SCHEMA_LIST_SQL})
    ORDER BY trigger_schema, event_object_table, trigger_name;
  `,
  sequences: `
    SELECT sequence_schema AS schema,
           sequence_name AS name,
           data_type,
           start_value,
           minimum_value,
           maximum_value,
           increment
    FROM information_schema.sequences
    WHERE sequence_schema IN (${SCHEMA_LIST_SQL})
    ORDER BY sequence_schema, sequence_name;
  `,
  views: `
    SELECT table_schema AS schema,
           table_name AS name,
           view_definition AS definition
    FROM information_schema.views
    WHERE table_schema IN (${SCHEMA_LIST_SQL})
    ORDER BY table_schema, table_name;
  `,
  enums: `
    SELECT n.nspname AS schema,
           t.typname AS name,
           array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname IN (${SCHEMA_LIST_SQL})
    GROUP BY n.nspname, t.typname
    ORDER BY n.nspname, t.typname;
  `,
  grants: `
    SELECT table_schema AS schema,
           table_name AS table,
           grantee,
           privilege_type AS privilege,
           is_grantable
    FROM information_schema.role_table_grants
    WHERE table_schema IN (${SCHEMA_LIST_SQL})
      AND grantee IN ('anon','authenticated','service_role','postgres','PUBLIC')
    ORDER BY table_schema, table_name, grantee, privilege_type;
  `,
  counts: `
    SELECT
      (SELECT count(*) FROM information_schema.tables    WHERE table_schema IN (${SCHEMA_LIST_SQL}) AND table_type='BASE TABLE') AS tables,
      (SELECT count(*) FROM information_schema.views     WHERE table_schema IN (${SCHEMA_LIST_SQL}))                              AS views,
      (SELECT count(*) FROM information_schema.routines  WHERE routine_schema IN (${SCHEMA_LIST_SQL}))                            AS functions,
      (SELECT count(*) FROM pg_indexes                   WHERE schemaname IN (${SCHEMA_LIST_SQL}))                                AS indexes,
      (SELECT count(*) FROM pg_policies                  WHERE schemaname IN (${SCHEMA_LIST_SQL}))                                AS policies,
      (SELECT count(*) FROM information_schema.triggers  WHERE trigger_schema IN (${SCHEMA_LIST_SQL}))                            AS triggers,
      (SELECT count(*) FROM pg_extension)                                                                                       AS extensions;
  `,
};

function utcStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const outDir = join(repoRoot, "docs", "db-snapshots", utcStamp());

async function main() {
  mkdirSync(outDir, { recursive: true });
  console.log(`[snapshot] writing to ${outDir}`);
  const summary = { snapshot_at: new Date().toISOString(), files: {} };
  for (const [name, sql] of Object.entries(QUERIES)) {
    process.stdout.write(`[snapshot] ${name} ... `);
    const rows = await runSql(sql.trim());
    const path = join(outDir, `${name}.json`);
    writeFileSync(path, JSON.stringify(rows, null, 2) + "\n");
    summary.files[name] = { rows: Array.isArray(rows) ? rows.length : 1 };
    console.log(`${Array.isArray(rows) ? rows.length : 1} rows`);
  }
  writeFileSync(join(outDir, "_summary.json"), JSON.stringify(summary, null, 2) + "\n");
  console.log(`[snapshot] done. summary: ${JSON.stringify(summary.files)}`);
  console.log(outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
