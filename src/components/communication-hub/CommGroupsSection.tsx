/**
 * CommGroupsSection — Groups, Channels & Communities for Orbit.
 * Supports group_type: group | channel | community
 * Supports posting_permission: everyone | admins_only
 * Supports pinned messages, viewer role, broadcast indicator.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import {
  UsersRound, Plus, Search, ArrowLeft, Send, Pin, PinOff,
  UserPlus, LogOut, Trash2, Crown, Users, Megaphone, Hash, Globe,
  ShieldCheck, Eye, ChevronDown, ChevronUp,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { trackOrbitEvent, guardDisplayName } from "@/lib/orbit/orbitTelemetry";

// ── Types ──

type GroupType = "group" | "channel" | "community";
type PostingPermission = "everyone" | "admins_only";
type MemberRole = "admin" | "member" | "viewer";

interface Group {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  created_by: string;
  created_at: string;
  group_type: GroupType;
  posting_permission: PostingPermission;
  member_count?: number;
  last_message?: string;
  last_message_at?: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  profile_name?: string;
}

interface GroupMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  is_pinned?: boolean;
  pinned_at?: string;
  pinned_by?: string;
}

// ── Helpers ──

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function formatMsgTime(d: string): string {
  const date = new Date(d);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "dd/MM");
}

const TYPE_ICONS: Record<GroupType, typeof UsersRound> = {
  group: UsersRound,
  channel: Hash,
  community: Globe,
};

const TYPE_LABELS: Record<GroupType, string> = {
  group: "Group",
  channel: "Channel",
  community: "Community",
};

const ROLE_LABELS: Record<MemberRole, string> = {
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

// ── Component ──

export default function CommGroupsSection() {
  const { user, orgId } = useAuth();
  const { t } = useI18n();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", description: "", group_type: "group" as GroupType });
  const [creating, setCreating] = useState(false);

  // Chat state
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addMemberRole, setAddMemberRole] = useState<MemberRole>("member");
  const [showPinned, setShowPinned] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derived
  const myMember = members.find(m => m.user_id === user?.id);
  const isAdmin = myMember?.role === "admin";
  const isViewer = myMember?.role === "viewer";
  const canPost = activeGroup
    ? activeGroup.posting_permission === "everyone"
      ? !isViewer
      : isAdmin
    : false;
  const pinnedMessages = messages.filter(m => m.is_pinned);

  // ── Data Loading ──

  const loadGroups = useCallback(async () => {
    if (!user?.id) {
      setGroups([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);

    // First get groups where user is a member
    const { data: memberRows, error: memberErr } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);

    if (memberErr) { setLoadError(memberErr.message); setLoading(false); return; }
    const memberGroupIds = (memberRows || []).map((r: any) => r.group_id).filter(Boolean);

    // Also get groups from conversations_v2 where user is participant
    const { data, error } = await (supabase as any)
      .from("conversations_v2")
      .select("*")
      .in("type", ["group", "channel", "community"])
      .order("updated_at", { ascending: false });

    if (error) { setLoadError(error.message); setLoading(false); return; }

    // Filter: user must be in participant_ids OR in group_members
    const filtered = (data || []).filter((g: any) => {
      if (memberGroupIds.includes(g.id)) return true;
      const pIds = Array.isArray(g.participant_ids) ? g.participant_ids : [];
      if (pIds.includes(user.id)) return true;
      const participants = Array.isArray(g.participants) ? g.participants : [];
      return participants.some((p: any) => p?.userId === user.id || p?.user_id === user.id);
    });
    if (filtered) {
      const enriched = await Promise.all(filtered.map(async (g: any) => {
        const { count } = await supabase
          .from("group_members")
          .select("*", { count: "exact", head: true })
          .eq("group_id", g.id);
        const { data: lastMsg } = await (supabase as any)
          .from("chat_messages_v2")
          .select("body, created_at")
          .eq("conversation_id", g.id)
          .order("created_at", { ascending: false })
          .limit(1);
        return {
          id: g.id,
          name: g.title || "Untitled group",
          description: null,
          photo_url: null,
          created_by: g.created_by_orbit_id,
          created_at: g.created_at,
          group_type: (g.type || "group") as GroupType,
          posting_permission: g.type === "channel" ? "admins_only" : "everyone",
          member_count: count || 0,
          last_message: lastMsg?.[0]?.body || null,
          last_message_at: lastMsg?.[0]?.created_at || g.created_at,
        } as Group;
      }));
      setGroups(enriched);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  // ── Actions ──

  const refreshMembers = useCallback(async (groupId: string) => {
    const { data: mems } = await supabase.from("group_members").select("*").eq("group_id", groupId);
    setMembers((mems as GroupMember[]) || []);
  }, []);

  const openGroupChat = useCallback(async (group: Group) => {
    trackOrbitEvent("orbit.group.joined", { screen: "groups", component: "CommGroupsSection", action: "open_group", payload: { groupId: group.id, type: group.group_type }, result: "success" });
    setActiveGroup(group);
    haptic("light");
    const { data: msgs } = await (supabase as any)
      .from("chat_messages_v2")
      .select("*")
      .eq("conversation_id", group.id)
      .order("created_at", { ascending: true })
      .limit(200);
    const mapped = ((msgs as any[]) || []).map((m: any) => ({
      id: m.id,
      sender_id: m.sender_user_id || m.sender_id,
      content: m.body || m.content,
      created_at: m.created_at,
      sender_name: m.sender_name,
      is_pinned: false,
      pinned_at: undefined,
      pinned_by: undefined,
    }));
    setMessages(mapped as GroupMessage[]);
    await refreshMembers(group.id);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [refreshMembers]);

  const handleCreate = async () => {
    if (!user?.id || !newGroup.name.trim()) return;
    setCreating(true);

    const { data: myOrbit } = await (supabase as any)
      .from("orbit_profiles_v2")
      .select("orbit_id, display_name, email, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const participants = [{
      userId: user.id,
      orbitId: myOrbit?.orbit_id || null,
      displayName: myOrbit?.display_name || "You",
      email: myOrbit?.email || null,
      avatarUrl: myOrbit?.avatar_url || null,
    }];

    const { data: created, error } = await (supabase as any).from("conversations_v2").insert({
      type: newGroup.group_type,
      title: newGroup.name.trim(),
      participants,
      created_by_orbit_id: myOrbit?.orbit_id || null,
      last_message_at: new Date().toISOString(),
    } as any).select("id, type, title, created_at, created_by_orbit_id").single();

    if (error || !created) { toast.error(error?.message || "Failed to create"); setCreating(false); return; }

    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: created.id,
      user_id: user.id,
      role: "admin",
    } as any);

    if (memberError) {
      toast.error(memberError.message || "Failed to add creator to group");
      setCreating(false);
      return;
    }

    const createdGroup: Group = {
      id: created.id,
      name: created.title || newGroup.name.trim(),
      description: null,
      photo_url: null,
      created_by: created.created_by_orbit_id || user.id,
      created_at: created.created_at,
      group_type: (created.type || newGroup.group_type) as GroupType,
      posting_permission: created.type === "channel" ? "admins_only" : "everyone",
      member_count: 1,
      last_message: null,
      last_message_at: created.created_at,
    };

    haptic("success");
    toast.success(
      newGroup.group_type === "channel" ? "Channel created" :
        newGroup.group_type === "community" ? "Community created" :
          (t("orbit.groups.created") || "Group created")
    );
    setShowCreate(false);
    setNewGroup({ name: "", description: "", group_type: "group" });
    setCreating(false);
    await loadGroups();
    await openGroupChat(createdGroup);
  };

  const sendMessage = async () => {
    if (!msgInput.trim() || !activeGroup || !user?.id || !canPost) return;
    const content = msgInput.trim();
    setMsgInput("");
    haptic("light");

    const { data: myOrbit } = await (supabase as any)
      .from("orbit_profiles_v2")
      .select("orbit_id")
      .eq("id", user.id)
      .maybeSingle();

    const { data, error } = await (supabase as any).from("chat_messages_v2").insert({
      conversation_id: activeGroup.id,
      sender_user_id: user.id,
      sender_orbit_id: myOrbit?.orbit_id || null,
      type: "text",
      body: content,
    } as any).select().single();
    if (!error && data) {
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, {
        id: data.id,
        sender_id: data.sender_user_id,
        content: data.body,
        created_at: data.created_at,
        sender_name: "You",
        is_pinned: false,
      } as GroupMessage]);
      await (supabase as any).from("conversations_v2").update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", activeGroup.id);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } else if (error) {
      toast.error(error.message || "Failed to send message");
      setMsgInput(content);
    }
  };

  const togglePin = async (_message: GroupMessage) => {
    toast.info("Pinning is disabled on Orbit groups until pin metadata is fully connected.");
  };

  const handleAddMember = async () => {
    if (!addMemberEmail.trim() || !activeGroup) return;

    const normalizedEmail = addMemberEmail.trim().toLowerCase();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .single();
    if (!profile) { toast.error(t("orbit.groups.user_not_found") || "User not found"); return; }

    const { data: orbitProfile } = await (supabase as any)
      .from("orbit_profiles_v2")
      .select("orbit_id, display_name, email, avatar_url")
      .eq("id", profile.id)
      .maybeSingle();

    const { data: currentConv, error: convErr } = await (supabase as any)
      .from("conversations_v2")
      .select("participants")
      .eq("id", activeGroup.id)
      .single();
    if (convErr || !currentConv) {
      toast.error(convErr?.message || "Failed to resolve group participants");
      return;
    }

    const participants = Array.isArray(currentConv.participants) ? [...currentConv.participants] : [];
    const alreadyParticipant = participants.some((p: any) => p?.userId === profile.id || p?.user_id === profile.id);
    if (alreadyParticipant) {
      toast.info("Already a member");
      return;
    }

    participants.push({
      userId: profile.id,
      orbitId: orbitProfile?.orbit_id || null,
      displayName: orbitProfile?.display_name || normalizedEmail,
      email: orbitProfile?.email || normalizedEmail,
      avatarUrl: orbitProfile?.avatar_url || null,
    });

    const { error: participantsError } = await (supabase as any)
      .from("conversations_v2")
      .update({ participants, updated_at: new Date().toISOString() })
      .eq("id", activeGroup.id);
    if (participantsError) {
      toast.error(participantsError.message || "Failed to update group participants");
      return;
    }

    const { error } = await supabase.from("group_members").insert({
      group_id: activeGroup.id,
      user_id: profile.id,
      role: addMemberRole,
    } as any);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Already a member" : "Failed to add member");
      return;
    }
    haptic("success");
    toast.success(t("orbit.groups.member_added") || "Member added");
    setAddMemberEmail("");
    setShowAddMember(false);
    await refreshMembers(activeGroup.id);
    await loadGroups();
  };

  const changeMemberRole = async (memberId: string, newRole: MemberRole) => {
    if (!isAdmin) return;
    const { error } = await supabase.from("group_members").update({ role: newRole } as any).eq("id", memberId);
    if (!error) {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      haptic("light");
      toast.success(`Role updated to ${ROLE_LABELS[newRole]}`);
    }
  };

  const togglePostingPermission = async () => {
    toast.info("Posting mode is derived from group type: channels are admin-only, groups and communities are open.");
  };

  const leaveGroup = async () => {
    if (!activeGroup || !user?.id) return;
    await supabase.from("group_members").delete().eq("group_id", activeGroup.id).eq("user_id", user.id);
    haptic("medium");
    toast.success(t("orbit.groups.left") || "Left group");
    setActiveGroup(null);
    loadGroups();
  };

  const removeMember = async (memberId: string) => {
    if (!activeGroup) return;
    const member = members.find(m => m.id === memberId);
    await supabase.from("group_members").delete().eq("id", memberId);

    if (member?.user_id) {
      const { data: currentConv } = await (supabase as any)
        .from("conversations_v2")
        .select("participants")
        .eq("id", activeGroup.id)
        .single();
      const participants = (Array.isArray(currentConv?.participants) ? currentConv.participants : []).filter((p: any) => p?.userId !== member.user_id && p?.user_id !== member.user_id);
      await (supabase as any).from("conversations_v2").update({ participants, updated_at: new Date().toISOString() }).eq("id", activeGroup.id);
    }

    haptic("light");
    toast.success(t("orbit.groups.member_removed") || "Member removed");
    await refreshMembers(activeGroup.id);
    await loadGroups();
  };

  // Realtime
  useEffect(() => {
    if (!activeGroup) return;
    const channel = supabase
      .channel(`group-${activeGroup.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages_v2",
        filter: `conversation_id=eq.${activeGroup.id}`,
      }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_user_id !== user?.id) {
          setMessages(prev => [...prev, {
            id: msg.id,
            sender_id: msg.sender_user_id,
            content: msg.body,
            created_at: msg.created_at,
            is_pinned: msg.is_pinned,
          } as GroupMessage]);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeGroup?.id, user?.id]);

  const filtered = groups.filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()));

  // ═══════════════════════════════
  //  GROUP CHAT VIEW
  // ═══════════════════════════════
  if (activeGroup) {
    const TypeIcon = TYPE_ICONS[activeGroup.group_type];
    const isBroadcast = activeGroup.posting_permission === "admins_only";

    return (
      <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--hud-bg))" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-3 py-2.5 shrink-0" style={{ borderBottom: "1px solid hsl(var(--hud-border) / 0.08)" }}>
          <button onClick={() => { setActiveGroup(null); haptic("light"); }} className="p-1.5 rounded-full hover:bg-[hsl(var(--hud-surface)/0.5)] min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" style={{ color: "hsl(var(--hud-text))" }} />
          </button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "hsl(var(--hud-cyan) / 0.12)", color: "hsl(var(--hud-cyan))" }}>
            <TypeIcon className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold line-clamp-2 break-words block" style={{ color: "hsl(var(--hud-text))" }}>
              {activeGroup.name}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                {members.length} {t("orbit.groups.members") || "members"}
              </span>
              {isBroadcast && (
                <span className="inline-flex items-center gap-0.5 px-1 py-px rounded text-[8px] font-semibold"
                  style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}>
                  <Megaphone className="h-2 w-2" /> BROADCAST
                </span>
              )}
              <span className="text-[9px] px-1 py-px rounded"
                style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                {TYPE_LABELS[activeGroup.group_type]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <button onClick={togglePostingPermission} className="p-2 rounded-full" title={isBroadcast ? "Allow everyone to post" : "Admins only"}>
                <Megaphone className="h-4 w-4" style={{ color: isBroadcast ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.3)" }} />
              </button>
            )}
            <button onClick={() => setShowMembers(true)} className="p-2 rounded-full" style={{ color: "hsl(var(--hud-cyan))" }}>
              <Users className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Pinned bar */}
        {pinnedMessages.length > 0 && (
          <button
            onClick={() => setShowPinned(!showPinned)}
            className="flex items-center gap-2 px-4 py-2 text-left shrink-0"
            style={{ background: "hsl(var(--hud-cyan) / 0.04)", borderBottom: "1px solid hsl(var(--hud-border) / 0.06)" }}
          >
            <Pin className="h-3 w-3" style={{ color: "hsl(var(--hud-cyan))" }} />
            <span className="text-[11px] font-medium flex-1" style={{ color: "hsl(var(--hud-cyan))" }}>
              {pinnedMessages.length} pinned message{pinnedMessages.length > 1 ? "s" : ""}
            </span>
            {showPinned ? <ChevronUp className="h-3 w-3" style={{ color: "hsl(var(--hud-cyan))" }} /> : <ChevronDown className="h-3 w-3" style={{ color: "hsl(var(--hud-cyan))" }} />}
          </button>
        )}

        {/* Pinned messages expanded */}
        {showPinned && pinnedMessages.length > 0 && (
          <div className="px-3 py-2 space-y-1.5 max-h-32 overflow-y-auto shrink-0" style={{ background: "hsl(var(--hud-cyan) / 0.02)", borderBottom: "1px solid hsl(var(--hud-border) / 0.06)" }}>
            {pinnedMessages.map(pm => (
              <div key={pm.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg" style={{ background: "hsl(var(--hud-surface) / 0.5)" }}>
                <Pin className="h-2.5 w-2.5 mt-1 shrink-0" style={{ color: "hsl(var(--hud-cyan) / 0.6)" }} />
                <p className="text-[11px] flex-1 line-clamp-2" style={{ color: "hsl(var(--hud-text))" }}>{pm.content}</p>
                {isAdmin && (
                  <button onClick={() => togglePin(pm)} className="p-1 shrink-0">
                    <PinOff className="h-3 w-3" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <TypeIcon className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
              <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{t("orbit.groups.start_conversation") || "Start the conversation"}</p>
            </div>
          )}
          {messages.map(msg => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} group/msg`}>
                <div
                  className="max-w-[75%] px-3 py-2 rounded-2xl text-[13px] relative"
                  style={{
                    background: msg.is_pinned
                      ? "hsl(var(--hud-cyan) / 0.08)"
                      : isMine ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-surface))",
                    color: "hsl(var(--hud-text))",
                    borderBottomRightRadius: isMine ? 6 : undefined,
                    borderBottomLeftRadius: !isMine ? 6 : undefined,
                  }}
                >
                  {msg.is_pinned && (
                    <Pin className="h-2 w-2 absolute top-1 right-1.5" style={{ color: "hsl(var(--hud-cyan) / 0.5)" }} />
                  )}
                  {!isMine && (
                    <span className="text-[10px] font-semibold block mb-0.5" style={{ color: "hsl(var(--hud-cyan) / 0.7)" }}>
                      {msg.sender_name || "Member"}
                    </span>
                  )}
                  <p>{msg.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    {isAdmin && (
                      <button
                        onClick={() => togglePin(msg)}
                        className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-0.5"
                      >
                        {msg.is_pinned
                          ? <PinOff className="h-2.5 w-2.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
                          : <Pin className="h-2.5 w-2.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
                        }
                      </button>
                    )}
                    <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.35)" }}>
                      {format(new Date(msg.created_at), "HH:mm")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="px-3 py-2 shrink-0" style={{ borderTop: "1px solid hsl(var(--hud-border) / 0.06)" }}>
          {canPost ? (
            <div className="flex items-center gap-2">
              <Input
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder={t("orbit.groups.message_placeholder") || "Message…"}
                className="flex-1 h-10 text-sm border-0 rounded-full px-4"
                style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
              />
              <button
                onClick={sendMessage}
                disabled={!msgInput.trim()}
                className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center shrink-0 disabled:opacity-30"
                style={{ background: "hsl(var(--hud-cyan))" }}
              >
                <Send className="h-4 w-4" style={{ color: "hsl(var(--hud-bg))" }} />
              </button>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-[11px] flex items-center justify-center gap-1.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                {isViewer ? (
                  <><Eye className="h-3 w-3" /> View only — you cannot post</>
                ) : (
                  <><Megaphone className="h-3 w-3" /> Only admins can post in this {TYPE_LABELS[activeGroup.group_type].toLowerCase()}</>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Members dialog */}
        <Dialog open={showMembers} onOpenChange={setShowMembers}>
          <DialogContent style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)" }}>
            <DialogHeader>
              <DialogTitle style={{ color: "hsl(var(--hud-text))" }}>{t("orbit.groups.members") || "Members"} ({members.length})</DialogTitle>
            </DialogHeader>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-2 py-2 rounded-lg">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}>
                    {m.user_id.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm line-clamp-1 break-words block" style={{ color: "hsl(var(--hud-text))" }}>
                      {m.user_id === user?.id ? "You" : (m.profile_name || guardDisplayName(m.user_id, "Member", { screen: "groups", component: "CommGroupsSection" }))}
                    </span>
                    <div className="flex items-center gap-1">
                      {m.role === "admin" && (
                        <span className="text-[10px] flex items-center gap-0.5" style={{ color: "hsl(var(--hud-cyan) / 0.7)" }}>
                          <Crown className="h-2.5 w-2.5" /> Admin
                        </span>
                      )}
                      {m.role === "viewer" && (
                        <span className="text-[10px] flex items-center gap-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                          <Eye className="h-2.5 w-2.5" /> Viewer
                        </span>
                      )}
                      {m.role === "member" && (
                        <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Member</span>
                      )}
                    </div>
                  </div>
                  {isAdmin && m.user_id !== user?.id && (
                    <div className="flex items-center gap-1">
                      <select
                        value={m.role}
                        onChange={e => changeMemberRole(m.id, e.target.value as MemberRole)}
                        className="text-[10px] rounded px-1 py-0.5 border-0"
                        style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button onClick={() => removeMember(m.id)} className="p-1.5 rounded-full hover:bg-[hsl(var(--hud-surface)/0.5)]">
                        <Trash2 className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-danger))" }} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              {isAdmin && (
                <Button
                  size="sm" className="flex-1 gap-1.5"
                  style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}
                  onClick={() => { setShowMembers(false); setShowAddMember(true); }}
                >
                  <UserPlus className="h-3.5 w-3.5" /> {t("orbit.groups.add_member") || "Add Member"}
                </Button>
              )}
              <Button size="sm" variant="ghost" className="gap-1.5" style={{ color: "hsl(var(--hud-danger))" }} onClick={leaveGroup}>
                <LogOut className="h-3.5 w-3.5" /> {t("orbit.groups.leave") || "Leave"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add member dialog */}
        <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
          <DialogContent style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)" }}>
            <DialogHeader>
              <DialogTitle style={{ color: "hsl(var(--hud-text))" }}>{t("orbit.groups.add_member") || "Add Member"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Email</Label>
                <Input
                  value={addMemberEmail}
                  onChange={e => setAddMemberEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="mt-1 border-0"
                  style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
                />
              </div>
              <div>
                <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Role</Label>
                <div className="flex gap-2 mt-1">
                  {(["member", "viewer", "admin"] as MemberRole[]).map(r => (
                    <button
                      key={r}
                      onClick={() => setAddMemberRole(r)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background: addMemberRole === r ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-surface))",
                        color: addMemberRole === r ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim))",
                        border: addMemberRole === r ? "1px solid hsl(var(--hud-cyan) / 0.3)" : "1px solid transparent",
                      }}
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!addMemberEmail.trim()}
                onClick={handleAddMember}
                style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}
              >
                Add {ROLE_LABELS[addMemberRole]}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═══════════════════════════════
  //  GROUP LIST VIEW
  // ═══════════════════════════════
  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--hud-bg))" }}>
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: "hsl(var(--hud-text))" }}>
            {t("orbit.groups.title") || "Communities"}
          </h2>
          <Button
            size="sm" variant="ghost"
            className="h-8 gap-1.5 text-xs"
            style={{ color: "hsl(var(--hud-cyan))" }}
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" /> {t("orbit.groups.create") || "Create"}
          </Button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("orbit.groups.search") || "Search…"}
            className="pl-9 h-9 text-sm border-0"
            style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="divide-y" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="w-11 h-11 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-3/5" />
                  <Skeleton className="h-2.5 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <ErrorState message={`Failed to load: ${loadError}`} onRetry={loadGroups} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <UsersRound className="h-10 w-10 mb-3" style={{ color: "hsl(var(--hud-text-dim) / 0.2)" }} />
            <p className="text-sm" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              {search ? "No results" : "No groups yet"}
            </p>
            <Button size="sm" variant="ghost" className="mt-3 gap-1.5" style={{ color: "hsl(var(--hud-cyan))" }} onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Create your first
            </Button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
            {filtered.map(group => {
              const GIcon = TYPE_ICONS[group.group_type];
              return (
                <button
                  key={group.id}
                  onClick={() => openGroupChat(group)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[hsl(var(--hud-surface)/0.3)] transition-colors text-left min-h-[44px]"
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}>
                    <GIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-semibold line-clamp-2 break-words" style={{ color: "hsl(var(--hud-text))" }}>
                          {group.name}
                        </span>
                        {group.group_type !== "group" && (
                          <span className="text-[8px] px-1 py-px rounded font-medium shrink-0"
                            style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text-dim) / 0.6)" }}>
                            {TYPE_LABELS[group.group_type]}
                          </span>
                        )}
                        {group.posting_permission === "admins_only" && (
                          <Megaphone className="h-2.5 w-2.5 shrink-0" style={{ color: "hsl(var(--hud-cyan) / 0.5)" }} />
                        )}
                      </div>
                      <span className="text-[10px] shrink-0 ml-2" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                        {group.last_message_at ? formatMsgTime(group.last_message_at) : ""}
                      </span>
                    </div>
                    <span className="text-[11px] line-clamp-1 break-words block mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                      {group.last_message || group.description || "No messages yet"}
                    </span>
                    <span className="text-[10px] mt-0.5 block" style={{ color: "hsl(var(--hud-text-dim) / 0.35)" }}>
                      {group.member_count} members
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "hsl(var(--hud-text))" }}>Create</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Type selector */}
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Type</Label>
              <div className="flex gap-2 mt-1">
                {(["group", "channel", "community"] as GroupType[]).map(gt => {
                  const Icon = TYPE_ICONS[gt];
                  return (
                    <button
                      key={gt}
                      onClick={() => setNewGroup(p => ({ ...p, group_type: gt }))}
                      className="flex-1 flex flex-col items-center gap-1 py-3 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background: newGroup.group_type === gt ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-surface))",
                        color: newGroup.group_type === gt ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim))",
                        border: newGroup.group_type === gt ? "1px solid hsl(var(--hud-cyan) / 0.3)" : "1px solid transparent",
                      }}
                    >
                      <Icon className="h-5 w-5" />
                      {TYPE_LABELS[gt]}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                {newGroup.group_type === "group" && "Private group — everyone can post"}
                {newGroup.group_type === "channel" && "Broadcast channel — only admins can post"}
                {newGroup.group_type === "community" && "Open community — everyone can post and discover"}
              </p>
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Name *</Label>
              <Input
                value={newGroup.name}
                onChange={e => setNewGroup(p => ({ ...p, name: e.target.value }))}
                placeholder={
                  newGroup.group_type === "channel" ? "e.g. Announcements" :
                    newGroup.group_type === "community" ? "e.g. Local Landlords" :
                      "e.g. Property Team"
                }
                className="mt-1 border-0"
                style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
              />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Description</Label>
              <Input
                value={newGroup.description}
                onChange={e => setNewGroup(p => ({ ...p, description: e.target.value }))}
                placeholder="What's this about?"
                className="mt-1 border-0"
                style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
              />
            </div>
            <Button
              className="w-full"
              disabled={!newGroup.name.trim() || creating}
              onClick={handleCreate}
              style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}
            >
              {creating ? "Creating…" : `Create ${TYPE_LABELS[newGroup.group_type]}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
