export function canDeleteLegacyFile(path: string) {
  const safeDeletePatterns = [
    "src/lib/types/orbit-chat.ts",
    "src/lib/types/chat.ts",
    "src/lib/chat/createCallSystemMessage.ts",
    "src/lib/orbit/live-voice-translate.ts",
    "src/lib/chat/conversationUi.ts",
  ];

  return safeDeletePatterns.includes(path);
}

export function mustKeepIsolated(path: string) {
  const isolatedPatterns = [
    "src/pages/tenant/",
    "src/pages/client/",
    "src/components/delivery/",
  ];

  return isolatedPatterns.some((prefix) => path.startsWith(prefix));
}
