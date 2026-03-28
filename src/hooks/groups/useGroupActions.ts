/**
 * useGroupActions — All group CRUD, member management, and messaging actions.
 */
import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { trackOrbitEvent } from "@/lib/orbit/orbitTelemetry";
import * as groupsRepo from "@/repositories/groups.repository";

type GroupType = "group" | "channel" | "community";
type MemberRole = "admin" | "member" | "viewer";

interface Group {
  id: string; name: string; description: string | null; photo_url: string | null;
  created_by: string; created_at: string; group_type: GroupType;
  posting_permission: "everyone" | "admins_only";
  member_count?: number; last_message?: string; last_message_at?: string;
}

interface GroupMember {
  id: string; user_id: string; role: MemberRole; joined_at: string; profile_name?: string;
}

interface GroupMessage {
  id: string; sender_id: string; content: string; created_at: string;
  sender_name?: string; is_pinned?: boolean;
}

const ROLE_LABELS: Record<MemberRole, string> = { admin: "Admin", member: "Member", viewer: "Viewer" };

export function useGroupActions() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [creating, setCreating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const myMember = members.find(m => m.user_id === user?.id);
  const isAdmin = myMember?.role === "admin";
  const isViewer = myMember?.role === "viewer";
  const canPost = activeGroup
    ? activeGroup.posting_permission === "everyone" ? !isViewer : isAdmin
    : false;

  const loadGroups = useCallback(async () => {
    if (!user?.id) { setGroups([]); setLoadError(null); setLoading(false); return; }
    setLoading(true); setLoadError(null);
    try {
      const memberGroupIds = await groupsRepo.fetchUserGroupIds(user.id);
      const data = await groupsRepo.fetchConversationsByTypes(["group", "channel", "community"]);
      const filtered = (data || []).filter((g: any) => {
        if (memberGroupIds.includes(g.id)) return true;
        const participants = Array.isArray(g.participants) ? g.participants : [];
        return participants.some((p: any) => (p?.userId || p?.user_id || p?.id) === user.id);
      });
      const enriched = await Promise.all(filtered.map(async (g: any) => {
        const count = await groupsRepo.fetchGroupMemberCount(g.id);
        const lastMsg = await groupsRepo.fetchLastMessage(g.id);
        return {
          id: g.id, name: g.title || "Untitled group", description: null, photo_url: null,
          created_by: g.created_by_orbit_id, created_at: g.created_at,
          group_type: (g.type || "group") as GroupType,
          posting_permission: g.type === "channel" ? "admins_only" : "everyone",
          member_count: count, last_message: lastMsg?.body || null,
          last_message_at: lastMsg?.created_at || g.created_at,
        } as Group;
      }));
      setGroups(enriched);
    } catch (e: any) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const refreshMembers = useCallback(async (groupId: string) => {
    const data = await groupsRepo.fetchGroupMembers(groupId);
    setMembers((data as GroupMember[]) || []);
  }, []);

  const openGroupChat = useCallback(async (group: Group) => {
    trackOrbitEvent("orbit.group.joined", { screen: "groups", component: "CommGroupsSection", action: "open_group", payload: { groupId: group.id, type: group.group_type }, result: "success" });
    setActiveGroup(group); haptic("light");
    const msgs = await groupsRepo.fetchGroupMessages(group.id);
    setMessages(((msgs as any[]) || []).map((m: any) => ({
      id: m.id, sender_id: m.sender_user_id || m.sender_id,
      content: m.body || m.content, created_at: m.created_at,
      sender_name: m.sender_name, is_pinned: false,
    })));
    await refreshMembers(group.id);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [refreshMembers]);

  const createGroup = useCallback(async (newGroup: { name: string; description: string; group_type: GroupType }) => {
    if (!user?.id || !newGroup.name.trim()) return;
    setCreating(true);
    try {
      const myOrbit = await groupsRepo.fetchOrbitProfile(user.id);
      const participants = [{ userId: user.id, orbitId: myOrbit?.orbit_id || null, displayName: myOrbit?.display_name || "You", email: myOrbit?.email || null, avatarUrl: myOrbit?.avatar_url || null }];
      const created = await groupsRepo.createConversation({
        type: newGroup.group_type, title: newGroup.name.trim(), participants,
        created_by_orbit_id: myOrbit?.orbit_id || null, last_message_at: new Date().toISOString(),
      });
      await groupsRepo.insertGroupMember(created.id, user.id, "admin");
      haptic("success");
      toast.success(newGroup.group_type === "channel" ? "Channel created" : newGroup.group_type === "community" ? "Community created" : (t("orbit.groups.created") || "Group created"));
      await loadGroups();
      await openGroupChat({
        id: created.id, name: created.title || newGroup.name.trim(), description: null, photo_url: null,
        created_by: created.created_by_orbit_id || user.id, created_at: created.created_at,
        group_type: (created.type || newGroup.group_type) as GroupType,
        posting_permission: created.type === "channel" ? "admins_only" : "everyone",
        member_count: 1, last_message: undefined, last_message_at: created.created_at,
      });
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setCreating(false);
    }
  }, [user, t, loadGroups, openGroupChat]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !activeGroup || !user?.id || !canPost) return;
    haptic("light");
    try {
      const myOrbit = await groupsRepo.fetchOrbitProfile(user.id);
      const data = await groupsRepo.insertChatMessage({
        conversation_id: activeGroup.id, sender_user_id: user.id,
        sender_orbit_id: myOrbit?.orbit_id || null, type: "text", body: content.trim(),
      });
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, { id: data.id, sender_id: data.sender_user_id, content: data.body, created_at: data.created_at, sender_name: "You", is_pinned: false }]);
      await groupsRepo.updateConversation(activeGroup.id, { last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    }
  }, [activeGroup, user, canPost]);

  const addMember = useCallback(async (email: string, role: MemberRole) => {
    if (!email.trim() || !activeGroup) return;
    const normalizedEmail = email.trim().toLowerCase();
    const profile = await groupsRepo.fetchProfileByEmail(normalizedEmail);
    if (!profile) { toast.error(t("orbit.groups.user_not_found") || "User not found"); return; }
    const orbitProfile = await groupsRepo.fetchOrbitProfile(profile.id);
    const currentConv = await groupsRepo.fetchConversationParticipants(activeGroup.id);
    if (!currentConv) return;
    const participants = Array.isArray(currentConv.participants) ? [...currentConv.participants] : [];
    if (participants.some((p: any) => p?.userId === profile.id || p?.user_id === profile.id)) { toast.info("Already a member"); return; }
    participants.push({ userId: profile.id, orbitId: orbitProfile?.orbit_id || null, displayName: orbitProfile?.display_name || normalizedEmail, email: orbitProfile?.email || normalizedEmail, avatarUrl: orbitProfile?.avatar_url || null });
    await groupsRepo.updateConversation(activeGroup.id, { participants, updated_at: new Date().toISOString() });
    try {
      await groupsRepo.insertGroupMember(activeGroup.id, profile.id, role);
    } catch (e: any) {
      toast.error(e.message?.includes("duplicate") ? "Already a member" : "Failed"); return;
    }
    haptic("success"); toast.success(t("orbit.groups.member_added") || "Member added");
    await refreshMembers(activeGroup.id); await loadGroups();
  }, [activeGroup, t, refreshMembers, loadGroups]);

  const changeMemberRole = useCallback(async (memberId: string, newRole: MemberRole) => {
    if (!isAdmin) return;
    await groupsRepo.updateGroupMemberRole(memberId, newRole);
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    haptic("light"); toast.success(`Role updated to ${ROLE_LABELS[newRole]}`);
  }, [isAdmin]);

  const leaveGroup = useCallback(async () => {
    if (!activeGroup || !user?.id) return;
    await groupsRepo.deleteGroupMemberByUser(activeGroup.id, user.id);
    haptic("medium"); toast.success(t("orbit.groups.left") || "Left group");
    setActiveGroup(null); loadGroups();
  }, [activeGroup, user, t, loadGroups]);

  const removeMember = useCallback(async (memberId: string) => {
    if (!activeGroup) return;
    const member = members.find(m => m.id === memberId);
    await groupsRepo.deleteGroupMember(memberId);
    if (member?.user_id) {
      const currentConv = await groupsRepo.fetchConversationParticipants(activeGroup.id);
      const parts = (Array.isArray(currentConv?.participants) ? currentConv.participants : []).filter((p: any) => p?.userId !== member.user_id && p?.user_id !== member.user_id);
      await groupsRepo.updateConversation(activeGroup.id, { participants: parts, updated_at: new Date().toISOString() });
    }
    haptic("light"); toast.success(t("orbit.groups.member_removed") || "Member removed");
    await refreshMembers(activeGroup.id); await loadGroups();
  }, [activeGroup, members, t, refreshMembers, loadGroups]);

  return {
    groups, loading, loadError, activeGroup, messages, members, creating,
    messagesEndRef, myMember, isAdmin, isViewer, canPost,
    loadGroups, openGroupChat, createGroup, sendMessage,
    addMember, changeMemberRole, leaveGroup, removeMember,
    setActiveGroup, setMessages,
    pinnedMessages: messages.filter(m => m.is_pinned),
  };
}

export type { Group, GroupMember, GroupMessage, GroupType, MemberRole };
