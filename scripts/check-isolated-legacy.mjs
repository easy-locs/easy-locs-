import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const isolated = [
  "src/pages/tenant/TenantMessages.tsx",
  "src/pages/client/ClientMessages.tsx",
  "src/components/delivery/InMissionChat.tsx",
  "src/components/delivery/LiveDeliveryChat.tsx",
];

for (const rel of isolated) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.error(`[ISOLATED CHECK] missing file: ${rel}`);
    process.exit(1);
  }
}

console.log("[ISOLATED CHECK] PASS");
