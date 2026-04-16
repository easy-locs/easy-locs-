import fs from "fs";
import path from "path";

const PILLAR_BUDGETS: Record<string, number> = {
  "pillar-dashboard": 300,
  "pillar-radar": 350,
  "pillar-orbit": 300,
  "pillar-wallet": 250,
  "pillar-me": 200,
};

const CRITICAL_BUDGET_KB = 250;
const GLOBAL_BUDGET_KB = 300;

const distDir = path.resolve(process.cwd(), "dist/assets");

if (!fs.existsSync(distDir)) {
  console.error("dist/assets not found. Run `npm run build` first.");
  process.exit(1);
}

const files = fs.readdirSync(distDir).filter((f) => f.endsWith(".js"));
const violations: string[] = [];
const warnings: string[] = [];

const criticalPatterns = ["vendor-react-core", "vendor-react-dom", "vendor-supabase"];

for (const file of files) {
  const filePath = path.join(distDir, file);
  const stat = fs.statSync(filePath);
  const sizeKB = Math.round(stat.size / 1024);

  const isCritical = criticalPatterns.some((p) => file.includes(p));
  const pillarMatch = Object.keys(PILLAR_BUDGETS).find((p) => file.includes(p));

  if (isCritical && sizeKB > CRITICAL_BUDGET_KB) {
    violations.push(`CRITICAL: ${file} is ${sizeKB}KB (limit: ${CRITICAL_BUDGET_KB}KB)`);
  } else if (pillarMatch && sizeKB > PILLAR_BUDGETS[pillarMatch]) {
    violations.push(`PILLAR: ${file} is ${sizeKB}KB (limit: ${PILLAR_BUDGETS[pillarMatch]}KB)`);
  } else if (sizeKB > GLOBAL_BUDGET_KB) {
    warnings.push(`CHUNK: ${file} is ${sizeKB}KB (limit: ${GLOBAL_BUDGET_KB}KB)`);
  }
}

if (warnings.length > 0) {
  console.warn(`\nChunk Size Warnings (${warnings.length}):`);
  for (const w of warnings) console.warn(`  ${w}`);
}

if (violations.length > 0) {
  console.error(`\nPerformance Budget Violations (${violations.length}):`);
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}

console.log("\nAll chunks within budget.");
process.exit(0);
