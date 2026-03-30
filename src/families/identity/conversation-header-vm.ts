/**
 * ConversationHeaderViewModel — Canonical view model for thread headers.
 * Unified for direct conversations and groups.
 */
import { resolvePeerIdentity, type PeerIdentity } from "@/lib/orbit/canonical-helpers";

export interface ConversationHeaderViewModel {
  displayName: string;
  avatarUrl: string | null;
  initials: string;
  subtitle: string;
  isGroup: boolean;
  memberCount: number | null;
  isOnline: boolean;
  isTyping: boolean;
  /** Tappable to open contact/group profile */
  tappable: boolean;
}

export function buildConversationHeaderVM(params: {
  thread: {
    conversationType?: string | null;
    type?: string | null;
    name?: string | null;
    title?: string | null;
    email?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
    avatar_url?: string | null;
    peerUserId?: string | null;
    peerOrbitId?: string | null;
    participants?: any[] | null;
  } | null;
  currentUserId?: string | null;
  isTyping?: boolean;
}): ConversationHeaderViewModel {
  const { thread, currentUserId, isTyping = false } = params;

  if (!thread) {
    return {
      displayName: "Conversation", avatarUrl: null, initials: "?",
      subtitle: "", isGroup: false, memberCount: null,
      isOnline: false, isTyping: false, tappable: false,
    };
  }

  const isGroup = thread.conversationType === "group" || thread.type === "group";

  if (isGroup) {
    const name = thread.title || thread.name || "Group";
    const members = Array.isArray(thread.participants) ? thread.participants.length : null;
    const initials = name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() || "G";

    return {
      displayName: name,
      avatarUrl: thread.avatarUrl || thread.avatar_url || null,
      initials,
      subtitle: members ? `${members} members` : "",
      isGroup: true,
      memberCount: members,
      isOnline: false,
      isTyping,
      tappable: true,
    };
  }

  // Direct conversation
  const peer = resolvePeerIdentity(thread, currentUserId);
  return {
    displayName: peer.displayName,
    avatarUrl: peer.avatarUrl,
    initials: peer.initials,
    subtitle: peer.email || peer.phone || "",
    isGroup: false,
    memberCount: null,
    isOnline: false,
    isTyping,
    tappable: !!peer.userId,
  };
}
