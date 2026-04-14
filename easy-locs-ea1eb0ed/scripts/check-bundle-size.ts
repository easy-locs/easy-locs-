import * as fs from "node:fs";
import * as path from "node:path";

const DIST_DIR = path.resolve("dist/assets");
const MAX_CHUNK_SIZE_KB = 200;

interface ChunkInfo {
  name: string;
  sizeKB: number;
  oversized: boolean;
}

function analyzeChunks(): ChunkInfo[] {
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`[bundle-check] dist/assets not found. Run "npm run build" first.`);
    process.exit(1);
  }

  const files = fs.readdirSync(DIST_DIR).filter(f => f.endsWith(".js"));
  const chunks: ChunkInfo[] = [];

  for (const file of files) {
    const stat = fs.statSync(path.join(DIST_DIR, file));
    const sizeKB = Math.round(stat.size / 1024 * 100) / 100;
    chunks.push({
      name: file,
      sizeKB,
      oversized: sizeKB > MAX_CHUNK_SIZE_KB,
    });
  }

  return chunks.sort((a, b) => b.sizeKB - a.sizeKB);
}

function printReport(chunks: ChunkInfo[]): void {
  const totalKB = chunks.reduce((sum, c) => sum + c.sizeKB, 0);
  const oversized = chunks.filter(c => c.oversized);

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║              Bundle Size Analysis Report                    ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Total chunks: ${chunks.length.toString().padEnd(44)}║`);
  console.log(`║  Total size:   ${(totalKB / 1024).toFixed(2)} MB${" ".repeat(38)}║`.slice(0, 65) + "║");
  console.log(`║  Threshold:    ${MAX_CHUNK_SIZE_KB} KB per chunk${" ".repeat(32)}║`);
  console.log(`║  Oversized:    ${oversized.length} chunk(s)${" ".repeat(36)}║`);
  console.log("╠══════════════════════════════════════════════════════════════╣");

  if (oversized.length > 0) {
    console.log("║  ⚠ OVERSIZED CHUNKS:                                       ║");
    for (const c of oversized) {
      const line = `║    ${c.name.slice(0, 40).padEnd(40)} ${c.sizeKB.toFixed(1).padStart(8)} KB  ║`;
      console.log(line.slice(0, 65) + "║");
    }
    console.log("╠══════════════════════════════════════════════════════════════╣");
  }

  console.log("║  Top 15 largest chunks:                                     ║");
  for (const c of chunks.slice(0, 15)) {
    const marker = c.oversized ? " ⚠" : "  ";
    const line = `║  ${marker} ${c.name.slice(0, 38).padEnd(38)} ${c.sizeKB.toFixed(1).padStart(8)} KB  ║`;
    console.log(line.slice(0, 65) + "║");
  }
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
}

const chunks = analyzeChunks();
printReport(chunks);

const oversized = chunks.filter(c => c.oversized);
if (oversized.length > 0) {
  console.error(`\n❌ FAIL: ${oversized.length} chunk(s) exceed ${MAX_CHUNK_SIZE_KB}KB threshold:`);
  for (const c of oversized) {
    console.error(`   - ${c.name}: ${c.sizeKB.toFixed(1)}KB`);
  }
  process.exit(1);
} else {
  console.log(`✅ PASS: All ${chunks.length} chunks are within the ${MAX_CHUNK_SIZE_KB}KB threshold.`);
}
