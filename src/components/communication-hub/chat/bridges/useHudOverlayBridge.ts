/**
 * useHudOverlayBridge — Manages all overlay/dialog open-close flags for HudChatPanel.
 * Owns: contact profile, multi-photo, peer profile fetch.
 */
import { useState, useEffect, useMemo } from "react";
import { fetchPeerProfileCreatedAt } from "@/repositories/profile.repository";
import type { ConversationThread } from "../../types";

export function useHudOverlayBridge(thread: ConversationThread | null) {
  const [showContactProfile, setShowContactProfile] = useState(false);
  const [showMultiPhoto, setShowMultiPhoto] = useState(false);
  const [peerProfileCreatedAt, setPeerProfileCreatedAt] = useState<string | null>(null);
  const peerProfileCacheRef = useMemo(() => ({ lastPeerId: null as string | null }), []);

  // Fetch peer profile created_at (cached)
  useEffect(() => {
    const peerId = thread?.peerUserId || null;
    if (!peerId) { setPeerProfileCreatedAt(null); return; }
    if (peerProfileCacheRef.lastPeerId === peerId) return;
    peerProfileCacheRef.lastPeerId = peerId;
    fetchPeerProfileCreatedAt(peerId).then(setPeerProfileCreatedAt);
  }, [thread?.peerUserId]);

  const contactProfileEntity = useMemo(() => {
    if (!thread) return null;
    return {
      display_name: thread.name,
      email: thread.email,
      avatar_url: thread.avatarUrl,
      phone: (thread as any).phone || null,
      user_id: thread.peerUserId || null,
      orbit_id: thread.peerOrbitId || null,
      created_at: peerProfileCreatedAt,
    };
  }, [thread?.name, thread?.email, thread?.avatarUrl, thread?.peerUserId, thread?.peerOrbitId, peerProfileCreatedAt]);

  return {
    showContactProfile,
    setShowContactProfile,
    showMultiPhoto,
    setShowMultiPhoto,
    contactProfileEntity,
  };
}
