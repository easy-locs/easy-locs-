import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CHANGELOG_FILE = path.join(ROOT, "CHANGELOG.md");

interface CommitEntry {
  hash: string;
  type: string;
  scope: string | null;
  subject: string;
  breaking: boolean;
  date: string;
}

interface ChangelogSection {
  features: CommitEntry[];
  fixes: CommitEntry[];
  breaking: CommitEntry[];
  perf: CommitEntry[];
  refactor: CommitEntry[];
  chore: CommitEntry[];
  other: CommitEntry[];
}

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

function getCommitsSinceTag(tag: string | null): CommitEntry[] {
  const range = tag ? `${tag}..HEAD` : "HEAD~50..HEAD";
  let raw: string;
  try {
    raw = execSync(
      `git log ${range} --pretty=format:"%H|%s|%ai" 2>/dev/null`,
      { cwd: ROOT, encoding: "utf-8" }
    );
  } catch {
    return [];
  }

  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, subject, date] = line.split("|");
      const conventionalMatch = subject.match(
        /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/
      );
      if (conventionalMatch) {
        return {
          hash: hash.slice(0, 8),
          type: conventionalMatch[1],
          scope: conventionalMatch[2] || null,
          subject: conventionalMatch[4],
          breaking: conventionalMatch[3] === "!",
          date: date?.split(" ")[0] || "",
        };
      }
      return {
        hash: hash.slice(0, 8),
        type: "other",
        scope: null,
        subject,
        breaking: false,
        date: date?.split(" ")[0] || "",
      };
    });
}

function categorize(commits: CommitEntry[]): ChangelogSection {
  const sections: ChangelogSection = {
    features: [],
    fixes: [],
    breaking: [],
    perf: [],
    refactor: [],
    chore: [],
    other: [],
  };

  for (const c of commits) {
    if (c.breaking) sections.breaking.push(c);
    else if (c.type === "feat") sections.features.push(c);
    else if (c.type === "fix") sections.fixes.push(c);
    else if (c.type === "perf") sections.perf.push(c);
    else if (c.type === "refactor") sections.refactor.push(c);
    else if (c.type === "chore" || c.type === "ci" || c.type === "build")
      sections.chore.push(c);
    else sections.other.push(c);
  }

  return sections;
}

function formatMarkdown(
  version: string,
  sections: ChangelogSection
): string {
  const lines: string[] = [];
  lines.push(`## ${version} (${new Date().toISOString().split("T")[0]})\n`);

  const render = (title: string, items: CommitEntry[]) => {
    if (items.length === 0) return;
    lines.push(`### ${title}\n`);
    for (const item of items) {
      const scope = item.scope ? `**${item.scope}:** ` : "";
      lines.push(`- ${scope}${item.subject} (${item.hash})`);
    }
    lines.push("");
  };

  render("⚠ Breaking Changes", sections.breaking);
  render("✨ Features", sections.features);
  render("🐛 Bug Fixes", sections.fixes);
  render("⚡ Performance", sections.perf);
  render("♻️ Refactoring", sections.refactor);
  render("🔧 Chores", sections.chore);
  render("📝 Other", sections.other);

  return lines.join("\n");
}

const lastTag = getLastTag();
const commits = getCommitsSinceTag(lastTag);
const sections = categorize(commits);
const version = lastTag ? `Next Release (since ${lastTag})` : "Unreleased";
const markdown = formatMarkdown(version, sections);

console.log(markdown);

const existingChangelog = fs.existsSync(CHANGELOG_FILE)
  ? fs.readFileSync(CHANGELOG_FILE, "utf-8")
  : "# Changelog\n\n";

const header = "# Changelog\n\n";
const body = existingChangelog.startsWith(header)
  ? existingChangelog.slice(header.length)
  : existingChangelog;

fs.writeFileSync(CHANGELOG_FILE, `${header}${markdown}\n${body}`, "utf-8");
const publicCopy = path.join(ROOT, "public/CHANGELOG.md");
const publicDir = path.dirname(publicCopy);
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
fs.copyFileSync(CHANGELOG_FILE, publicCopy);
console.log(`\n✅ Changelog updated: ${CHANGELOG_FILE}`);
console.log(`   Browser copy: ${publicCopy}`);
console.log(`   ${commits.length} commits processed.`);
