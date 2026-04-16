import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PKG_FILE = path.join(ROOT, "package.json");

function getLastTag(): string | null {
  try {
    return execSync("git describe --tags --abbrev=0 2>/dev/null", {
      cwd: ROOT,
      encoding: "utf-8",
    }).trim();
  } catch {
    return null;
  }
}

function getCurrentVersion(): string {
  const pkg = JSON.parse(fs.readFileSync(PKG_FILE, "utf-8"));
  return pkg.version || "0.0.0";
}

function parseVersion(v: string): [number, number, number] {
  const clean = v.replace(/^v/, "");
  const parts = clean.split(".").map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function getCommitTypes(tag: string | null): Set<string> {
  const range = tag ? `${tag}..HEAD` : "HEAD~50..HEAD";
  let raw: string;
  try {
    raw = execSync(`git log ${range} --pretty=format:"%s" 2>/dev/null`, {
      cwd: ROOT,
      encoding: "utf-8",
    });
  } catch {
    return new Set();
  }

  const types = new Set<string>();
  for (const line of raw.split("\n").filter(Boolean)) {
    const match = line.match(/^(\w+)(?:\([^)]*\))?(!)?:/);
    if (match) {
      types.add(match[1]);
      if (match[2] === "!") types.add("BREAKING");
    }
  }
  return types;
}

function calculateBump(
  current: [number, number, number],
  types: Set<string>
): { version: string; bump: "major" | "minor" | "patch" | "none" } {
  if (types.has("BREAKING")) {
    return {
      version: `${current[0] + 1}.0.0`,
      bump: "major",
    };
  }
  if (types.has("feat")) {
    return {
      version: `${current[0]}.${current[1] + 1}.0`,
      bump: "minor",
    };
  }
  if (types.has("fix") || types.has("perf") || types.has("refactor")) {
    return {
      version: `${current[0]}.${current[1]}.${current[2] + 1}`,
      bump: "patch",
    };
  }
  return { version: current.join("."), bump: "none" };
}

const lastTag = getLastTag();
const currentVersion = getCurrentVersion();
const parsed = parseVersion(lastTag || currentVersion);
const types = getCommitTypes(lastTag);
const result = calculateBump(parsed, types);

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║              Semantic Version Bump Calculator               ║");
console.log("╠══════════════════════════════════════════════════════════════╣");
console.log(`║  Current version: ${currentVersion.padEnd(42)}║`);
console.log(`║  Last tag:        ${(lastTag || "none").padEnd(42)}║`);
console.log(`║  Commit types:    ${[...types].join(", ").padEnd(42)}║`);
console.log(`║  Bump type:       ${result.bump.padEnd(42)}║`);
console.log(`║  Next version:    ${result.version.padEnd(42)}║`);
console.log("╚══════════════════════════════════════════════════════════════╝\n");

if (process.argv.includes("--apply") && result.bump !== "none") {
  const pkg = JSON.parse(fs.readFileSync(PKG_FILE, "utf-8"));
  pkg.version = result.version;
  fs.writeFileSync(PKG_FILE, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  console.log(`✅ package.json updated to ${result.version}`);
}
