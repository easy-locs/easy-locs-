export function getConversationPeer(conversation: any, myOrbitId: string) {
  const participants = Array.isArray(conversation?.participants) ? conversation.participants : [];
  return participants.find((p: any) => p?.orbitId && p.orbitId !== myOrbitId) ?? null;
}

export function getConversationTitle(conversation: any, myOrbitId: string) {
  const peer = getConversationPeer(conversation, myOrbitId);
  if (conversation?.type === "direct" && peer) {
    return peer?.displayName || peer?.email || peer?.orbitId || "Conversation";
  }
  if (conversation?.title) return conversation.title;
  return peer?.displayName || peer?.email || peer?.orbitId || "Conversation";
}

export function getConversationSubtitle(conversation: any, myOrbitId: string) {
  const peer = getConversationPeer(conversation, myOrbitId);
  return peer?.email || peer?.orbitId || "";
}

export function getMessagePreview(message: any) {
  if (!message) return "";
  if (message.type === "call") {
    // Format call events - strip raw event keys
    const body = message.body ?? "";
    const clean = body.replace(/\s*\[[^\]]+\]/g, "").trim();
    return clean ? `📞 ${clean}` : "📞 Call";
  }
  if (message.type === "image") return "🖼️ Photo";
  if (message.type === "file") return "📎 Document";
  if (message.type === "location") return "📍 Location";
  // Strip any raw event brackets from regular messages too
  const body = message.body ?? "";
  return body.replace(/\s*\[[^\]]+\]/g, "").trim();
}
