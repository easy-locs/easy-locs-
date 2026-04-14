import type { OrchestratorConfig, CostBudget } from "./types.js";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

const today = new Date().toISOString().split("T")[0];
const month = today.slice(0, 7);

const defaultBudget: CostBudget = {
  dailyLimitUsd: parseFloat(optionalEnv("COST_DAILY_LIMIT_USD", "10")),
  monthlyLimitUsd: parseFloat(optionalEnv("COST_MONTHLY_LIMIT_USD", "200")),
  currentDailyUsd: 0,
  currentMonthlyUsd: 0,
  lastResetDaily: today,
  lastResetMonthly: month,
};

export function loadConfig(): OrchestratorConfig {
  return {
    githubAppId: requireEnv("GITHUB_APP_ID"),
    githubPrivateKey: requireEnv("GITHUB_PRIVATE_KEY"),
    githubInstallationId: requireEnv("GITHUB_INSTALLATION_ID"),
    githubWebhookSecret: requireEnv("GITHUB_WEBHOOK_SECRET"),
    githubOwner: requireEnv("GITHUB_OWNER"),
    githubRepo: requireEnv("GITHUB_REPO"),
    openaiApiKey: requireEnv("OPENAI_API_KEY"),
    openaiModel: optionalEnv("OPENAI_MODEL", "gpt-4o"),
    port: parseInt(optionalEnv("PORT", "3001"), 10),
    adminToken: requireEnv("ORCHESTRATOR_ADMIN_TOKEN"),
    costBudget: defaultBudget,
    vercelToken: process.env["VERCEL_TOKEN"],
    vercelProjectId: process.env["VERCEL_PROJECT_ID"],
    vercelTeamId: process.env["VERCEL_TEAM_ID"],
    supabaseUrl: process.env["SUPABASE_URL"],
    supabaseServiceKey: process.env["SUPABASE_SERVICE_ROLE_KEY"],
    supabaseProjectRef: process.env["SUPABASE_PROJECT_REF"],
    supabaseManagementToken: process.env["SUPABASE_MANAGEMENT_TOKEN"],
  };
}
