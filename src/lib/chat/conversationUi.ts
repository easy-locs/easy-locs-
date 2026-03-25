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
  if (message.type === "call") return `📞 ${message.body}`;
  if (message.type === "image") return "🖼️ Photo";
  if (message.type === "file") return "📎 Document";
  if (message.type === "location") return "📍 Location";
  return message.body ?? "";
}
