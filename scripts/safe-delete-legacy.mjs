import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SAFE_DELETE = [
  "src/lib/types/orbit-chat.ts",
  "src/lib/types/chat.ts",
  "src/lib/chat/createCallSystemMessage.ts",
  "src/lib/orbit/live-voice-translate.ts",
  "src/lib/chat/conversationUi.ts",
];

for (const rel of SAFE_DELETE) {
  const full = path.join(ROOT, rel);
  if (fs.existsSync(full)) {
    fs.unlinkSync(full);
    console.log(`[SAFE DELETE] removed ${rel}`);
  } else {
    console.log(`[SAFE DELETE] missing ${rel} (already removed)`);
  }
}
