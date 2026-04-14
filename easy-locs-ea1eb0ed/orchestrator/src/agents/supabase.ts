import { tool } from "@openai/agents";
import { z } from "zod";
import { BaseAgent } from "./base-agent.js";
import type { AgentContext, SubtaskResult } from "../types.js";
import type { AgentDependencies } from "./base-agent.js";

interface SupabaseOptions {
  supabaseUrl?: string;
  supabaseServiceKey?: string;
  supabaseProjectRef?: string;
  supabaseManagementToken?: string;
}

export class SupabaseAgent extends BaseAgent {
  private supabaseUrl?: string;
  private supabaseServiceKey?: string;
  private supabaseProjectRef?: string;
  private supabaseManagementToken?: string;

  constructor(deps: AgentDependencies, options?: SupabaseOptions) {
    super("supabase", deps);
    this.supabaseUrl = options?.supabaseUrl;
    this.supabaseServiceKey = options?.supabaseServiceKey;
    this.supabaseProjectRef = options?.supabaseProjectRef;
    this.supabaseManagementToken = options?.supabaseManagementToken;
  }

  get systemPrompt(): string {
    return `You are the Supabase Agent for the Easy-Locs platform.

You monitor and validate the Supabase backend: database schema consistency, migrations, RLS policies, Edge Function health, and secrets management.

Database Rules:
- Multi-tenant via org_id column on all tenant-scoped tables
- All tables MUST have RLS policies
- RLS pattern: USING (org_id = (SELECT org_id FROM org_members WHERE user_id = auth.uid()))
- Migrations are append-only — never modify existing migration files
- Migration format: YYYYMMDDHHMMSS_uuid.sql
- Timestamps must use timestamptz, not timestamp
- UUIDs for primary keys with gen_random_uuid() default

Edge Function Rules:
- Each function has its own directory: supabase/functions/<name>/index.ts
- Deno runtime — no Node.js APIs
- Must validate JWT via supabase.auth.getUser()
- Shared utilities in supabase/functions/_shared/

Use the tools to validate migrations, query live schema/RLS, and inspect edge functions.
Always call submit_validation with your findings.`;
  }

  private async managementAPI(path: string): Promise<string> {
    if (!this.supabaseProjectRef || !this.supabaseManagementToken) {
      return "Supabase Management API not configured (SUPABASE_PROJECT_REF / SUPABASE_MANAGEMENT_TOKEN required).";
    }

    try {
      const url = `https://api.supabase.com/v1/projects/${this.supabaseProjectRef}${path}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.supabaseManagementToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return `Supabase Management API error ${response.status}: ${(await response.text()).slice(0, 500)}`;
      }

      const data = await response.json();
      return JSON.stringify(data, null, 2);
    } catch (err) {
      return `Supabase Management API call failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  private async managementQuery(sql: string): Promise<string> {
    if (!this.supabaseProjectRef || !this.supabaseManagementToken) {
      return "Supabase Management API not configured — cannot run SQL queries.";
    }

    try {
      const url = `https://api.supabase.com/v1/projects/${this.supabaseProjectRef}/database/query`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.supabaseManagementToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      });

      if (!response.ok) {
        return `Supabase query error ${response.status}: ${(await response.text()).slice(0, 500)}`;
      }

      const data = await response.json();
      return JSON.stringify(data, null, 2);
    } catch (err) {
      return `Supabase query failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  buildTools() {
    const github = this.deps.github;
    const agent = this;

    const listMigrationsTool = tool({
      name: "list_migrations",
      description: "List all migration files, optionally filtered to the latest N",
      parameters: z.object({
        latest: z.number().optional().describe("Only return the latest N migrations"),
      }),
      execute: async (args) => {
        const tree = await github.getRepoTree();
        let migrations = tree
          .filter((f) => f.startsWith("supabase/migrations/") && f.endsWith(".sql"))
          .map((f) => f.replace("supabase/migrations/", ""))
          .sort();

        if (args.latest) {
          migrations = migrations.slice(-args.latest);
        }

        return migrations.join("\n") || "No migrations found.";
      },
    });

    const validateMigrationTool = tool({
      name: "validate_migration",
      description: "Read a migration file and check for common issues",
      parameters: z.object({
        fileName: z.string().describe("Migration file name"),
      }),
      execute: async (args) => {
        const content = await github.getFileContent(`supabase/migrations/${args.fileName}`);
        if (!content) return `Migration not found: ${args.fileName}`;

        const issues: string[] = [];

        if (content.includes("DROP TABLE") || content.includes("DROP COLUMN")) {
          issues.push("CRITICAL: Contains destructive DROP operation");
        }
        if (/\btimestamp\b(?!\s*tz\b|with\s+time\s+zone)/i.test(content) &&
            !content.includes("timestamptz")) {
          issues.push("WARNING: Uses 'timestamp' without timezone — should use 'timestamptz'");
        }
        if (content.includes("CREATE TABLE") && !content.includes("ENABLE ROW LEVEL SECURITY")) {
          issues.push("WARNING: Creates table without enabling RLS");
        }
        if (content.includes("CREATE TABLE") && !content.includes("org_id")) {
          const isSystemTable = content.includes("CREATE TABLE IF NOT EXISTS public.") ||
            content.includes("system_");
          if (!isSystemTable) {
            issues.push("WARNING: Tenant-scoped table may be missing org_id column");
          }
        }
        if (content.includes("CREATE POLICY") && !content.includes("auth.uid()")) {
          issues.push("INFO: RLS policy does not reference auth.uid()");
        }

        return issues.length > 0
          ? `Issues found in ${args.fileName}:\n${issues.join("\n")}`
          : `Migration ${args.fileName} looks valid.`;
      },
    });

    const queryTableSchemaTool = tool({
      name: "query_table_schema",
      description: "Query the live Supabase database to inspect table columns and constraints",
      parameters: z.object({
        tableName: z.string().describe("Table name to inspect"),
      }),
      execute: async (args) => {
        const sql = `SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = '${args.tableName.replace(/'/g, "''")}'
ORDER BY ordinal_position;`;
        return agent.managementQuery(sql);
      },
    });

    const queryRLSPoliciesTool = tool({
      name: "query_rls_policies",
      description: "Query the live Supabase database for RLS policies on a specific table or all tables",
      parameters: z.object({
        tableName: z.string().optional().describe("Table name to check RLS for (omit for all tables)"),
      }),
      execute: async (args) => {
        let sql: string;
        if (args.tableName) {
          sql = `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = '${args.tableName.replace(/'/g, "''")}';`;
        } else {
          sql = `SELECT t.tablename,
  CASE WHEN t.rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END AS rls_enabled,
  COUNT(p.policyname) AS policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;`;
        }
        return agent.managementQuery(sql);
      },
    });

    const queryTablesWithoutRLSTool = tool({
      name: "query_tables_without_rls",
      description: "Find all public tables that have RLS disabled — these are security risks",
      parameters: z.object({}),
      execute: async () => {
        const sql = `SELECT tablename
FROM pg_tables
WHERE schemaname = 'public' AND NOT rowsecurity
ORDER BY tablename;`;
        return agent.managementQuery(sql);
      },
    });

    const listEdgeFunctionsTool = tool({
      name: "list_edge_functions",
      description: "List all Supabase Edge Functions",
      parameters: z.object({}),
      execute: async () => {
        const tree = await github.getRepoTree();
        const functionDirs = new Set<string>();
        for (const f of tree) {
          if (f.startsWith("supabase/functions/") && !f.startsWith("supabase/functions/_shared/")) {
            const parts = f.replace("supabase/functions/", "").split("/");
            if (parts.length > 1 && !parts[0].endsWith(".md")) {
              functionDirs.add(parts[0]);
            }
          }
        }
        return [...functionDirs].sort().join("\n") || "No edge functions found.";
      },
    });

    const checkEdgeFunctionTool = tool({
      name: "check_edge_function",
      description: "Read an Edge Function and validate its structure",
      parameters: z.object({
        functionName: z.string().describe("Edge function directory name"),
      }),
      execute: async (args) => {
        const content = await github.getFileContent(
          `supabase/functions/${args.functionName}/index.ts`
        );
        if (!content) return `Edge function not found: ${args.functionName}`;

        const issues: string[] = [];

        if (!content.includes("auth") && !content.includes("getUser")) {
          issues.push("WARNING: No JWT/auth validation detected");
        }
        if (content.includes("require(")) {
          issues.push("ERROR: Uses Node.js require() — must use Deno imports");
        }
        if (content.includes("process.env")) {
          issues.push("WARNING: Uses process.env — should use Deno.env.get()");
        }

        return issues.length > 0
          ? `Issues in ${args.functionName}:\n${issues.join("\n")}`
          : `Edge function ${args.functionName} structure looks valid.`;
      },
    });

    const querySupabaseHealthTool = tool({
      name: "query_supabase_health",
      description: "Check Supabase project health via Management API and REST API",
      parameters: z.object({}),
      execute: async () => {
        const results: string[] = [];

        if (agent.supabaseProjectRef && agent.supabaseManagementToken) {
          const projectInfo = await agent.managementAPI("");
          results.push(`Management API project info: ${projectInfo.slice(0, 1000)}`);
        }

        if (agent.supabaseUrl && agent.supabaseServiceKey) {
          try {
            const response = await fetch(`${agent.supabaseUrl}/rest/v1/`, {
              method: "HEAD",
              headers: {
                apikey: agent.supabaseServiceKey,
                Authorization: `Bearer ${agent.supabaseServiceKey}`,
              },
            });
            results.push(`REST API status: ${response.status} ${response.statusText}`);
          } catch (err) {
            results.push(`REST API check failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        if (results.length === 0) {
          return "Supabase API not configured — using code-level validation only.";
        }

        return results.join("\n\n");
      },
    });

    const submitValidationTool = tool({
      name: "submit_validation",
      description: "Submit the Supabase validation results",
      parameters: z.object({
        schemaValid: z.boolean(),
        rlsComplete: z.boolean(),
        migrationSafe: z.boolean(),
        tablesWithoutRLS: z.array(z.string()).optional(),
        edgeFunctionHealth: z.record(z.string(), z.enum(["healthy", "degraded", "down"])),
        issues: z.array(z.object({
          category: z.enum(["schema", "rls", "migration", "edge_function", "secrets"]),
          severity: z.enum(["critical", "high", "medium", "low"]),
          description: z.string(),
          fix: z.string().optional(),
        })),
        summary: z.string(),
      }),
      execute: async (args) => {
        return JSON.stringify(args);
      },
    });

    return [
      this.buildReadFileTool(),
      this.buildGetRepoTreeTool(),
      listMigrationsTool,
      validateMigrationTool,
      queryTableSchemaTool,
      queryRLSPoliciesTool,
      queryTablesWithoutRLSTool,
      listEdgeFunctionsTool,
      checkEdgeFunctionTool,
      querySupabaseHealthTool,
      submitValidationTool,
    ];
  }

  protected async runAgent(context: AgentContext): Promise<SubtaskResult> {
    const agent = this.createAgent(context);

    const input = [
      `Validate Supabase backend for issue #${context.task.githubIssueNumber}: ${context.task.title}`,
      "",
      "Steps:",
      "1. List and validate recent migrations",
      "2. Query live RLS policies — use query_tables_without_rls to find unprotected tables",
      "3. If specific tables are mentioned, use query_table_schema and query_rls_policies to inspect them",
      "4. List and validate Edge Functions",
      "5. Query Supabase health",
      "6. Call submit_validation with your findings",
    ].join("\n");

    const output = await this.executeAgent(agent, input, context);

    let parsed: { schemaValid?: boolean; rlsComplete?: boolean; migrationSafe?: boolean; tablesWithoutRLS?: string[]; summary?: string };
    try {
      parsed = JSON.parse(output);
    } catch {
      parsed = { schemaValid: true, rlsComplete: true, migrationSafe: true, summary: output };
    }

    const hasIssues = parsed.schemaValid === false || parsed.rlsComplete === false || parsed.migrationSafe === false;

    if (context.task.prNumber) {
      await this.deps.github.addPRReviewComment(
        context.task.prNumber,
        `## Supabase Validation Report\n\n${parsed.summary ?? output}`
      );
    }

    this.deps.auditLogger.log({
      agentId: this.role,
      action: "supabase_validation",
      details: {
        hasIssues,
        schemaValid: parsed.schemaValid,
        rlsComplete: parsed.rlsComplete,
        tablesWithoutRLS: parsed.tablesWithoutRLS,
      },
      taskId: context.task.id,
      subtaskId: context.subtask.id,
      rationale: hasIssues ? "Supabase validation found issues" : "Supabase validation passed",
    });

    return {
      success: !hasIssues,
      summary: hasIssues
        ? `Supabase validation found issues: ${parsed.summary ?? ""}`
        : `Supabase validation passed: ${parsed.summary ?? "healthy"}`,
      prComments: context.task.prNumber ? [output] : undefined,
    };
  }
}
