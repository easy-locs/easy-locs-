import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function walk(dir, out = []) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (["node_modules", "dist", ".git"].includes(item)) continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(item)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(path.join(ROOT, "src"));
const contentMap = new Map(files.map((f) => [f, fs.readFileSync(f, "utf8")]));

function basenameNoExt(file) {
  return path.basename(file).replace(/\.(ts|tsx)$/, "");
}

const maybeDead = [];

for (const file of files) {
  const base = basenameNoExt(file);
  const importHits = files.filter((other) => {
    if (other === file) return false;
    const c = contentMap.get(other) || "";
    return (
      c.includes(`/${base}"`) ||
      c.includes(`/${base}'`) ||
      c.includes(`./${base}"`) ||
      c.includes(`./${base}'`)
    );
  });

  if (importHits.length === 0) {
    maybeDead.push(path.relative(ROOT, file));
  }
}

console.log(JSON.stringify(maybeDead, null, 2));
