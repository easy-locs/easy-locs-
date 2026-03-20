import { getMyOrbitProfile, getOrbitProfileByEmail, getOrbitProfileByOrbitId } from "@/lib/orbit/orbitResolvers";
import { createOrGetDirectConversation } from "@/lib/chat/conversationService";

export async function openChatByEmail(email: string) {
  const me = await getMyOrbitProfile();
  if (!me) throw new Error("Not authenticated");

  const peer = await getOrbitProfileByEmail(email);
  if (!peer) throw new Error("User not found by email");

  return createOrGetDirectConversation({
    myOrbitId: me.orbit_id,
    myEmail: me.email,
    myDisplayName: me.display_name,
    peerOrbitId: peer.orbit_id,
    peerEmail: peer.email,
    peerDisplayName: peer.display_name,
  });
}

export async function openChatByOrbitId(peerOrbitId: string) {
  const me = await getMyOrbitProfile();
  if (!me) throw new Error("Not authenticated");

  const peer = await getOrbitProfileByOrbitId(peerOrbitId);
  if (!peer) throw new Error("User not found by orbit id");

  return createOrGetDirectConversation({
    myOrbitId: me.orbit_id,
    myEmail: me.email,
    myDisplayName: me.display_name,
    peerOrbitId: peer.orbit_id,
    peerEmail: peer.email,
    peerDisplayName: peer.display_name,
  });
}
