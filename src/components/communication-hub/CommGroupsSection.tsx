/**
 * CommGroupsSection — Groups, Channels & Communities for Orbit.
 * Fully wired to useGroupData hook — zero inline DB logic.
 */
import { useState, useEffect, useCallback } from "react";
import { updateGroupMemberRole, fetchGroupMembersById, fetchConversationParticipants, updateConversationParticipants } from "@/repositories/communication.repository";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import {
  UsersRound, Plus, Search, ArrowLeft, Send, Pin, PinOff,
  UserPlus, LogOut, Trash2, Crown, Users, Megaphone, Hash, Globe,
  ShieldCheck, Eye, ChevronDown, ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { formatOrbitTimestamp } from "@/lib/orbit/canonical-helpers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { guardDisplayName } from "@/lib/orbit/orbitTelemetry";
import { useGroupData, type Group, type GroupMember, type GroupMessage } from "@/hooks/groups/useGroupData";

// ── Types ──
type GroupType = "group" | "channel" | "community";
type MemberRole = "admin" | "member" | "viewer";

// ── Helpers ──
function formatMsgTime(d: string): string {
  return formatOrbitTimestamp(d);
}

const TYPE_ICONS: Record<GroupType, typeof UsersRound> = {
  group: UsersRound, channel: Hash, community: Globe,
};
const TYPE_LABELS: Record<GroupType, string> = {
  group: "Group", channel: "Channel", community: "Community",
};
const ROLE_LABELS: Record<MemberRole, string> = {
  admin: "Admin", member: "Member", viewer: "Viewer",
};

// ── Component ──
export default function CommGroupsSection() {
  const { user } = useAuth();
  const { t } = useI18n();

  // ── Wired hook: ALL data + actions from useGroupData ──
  const {
    groups, loading, loadError, activeGroup, messages, members, messagesEndRef,
    loadGroups, openGroupChat, createGroup, sendMessage: hookSendMessage,
    addMember: hookAddMember, removeMember: hookRemoveMember, leaveGroup: hookLeaveGroup,
    deleteGroup: hookDeleteGroup, setActiveGroup, setMessages,
  } = useGroupData();

  // ── Local UI state only ──
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", description: "", group_type: "group" as GroupType });
  const [creating, setCreating] = useState(false);
  const [msgInput, setMsgInput] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addMemberRole, setAddMemberRole] = useState<MemberRole>("member");
  const [showPinned, setShowPinned] = useState(false);

  // Derived
  const myMember = members.find(m => m.user_id === user?.id);
  const isAdmin = myMember?.role === "admin";
  const isViewer = myMember?.role === "viewer";
  const canPost = activeGroup
    ? activeGroup.posting_permission === "everyone" ? !isViewer : isAdmin
    : false;
  const pinnedMessages = messages.filter(m => m.is_pinned);

  // ── Handlers delegating to hook ──
  const handleCreate = async () => {
    if (!newGroup.name.trim()) return;
    setCreating(true);
    const created = await createGroup(newGroup.name, newGroup.group_type);
    if (created) {
      setShowCreate(false);
      setNewGroup({ name: "", description: "", group_type: "group" });
      await openGroupChat(created);
    }
    setCreating(false);
  };

  const handleSendMessage = async () => {
    if (!msgInput.trim() || !canPost) return;
    const content = msgInput.trim();
    setMsgInput("");
    const ok = await hookSendMessage(content);
    if (!ok) setMsgInput(content);
  };

  const handleAddMember = async () => {
    if (!addMemberEmail.trim()) return;
    const ok = await hookAddMember(addMemberEmail, addMemberRole);
    if (ok) {
      setAddMemberEmail("");
      setShowAddMember(false);
      await loadGroups();
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    // Also update participants in conversations_v2
    const member = members.find(m => m.id === memberId);
    await hookRemoveMember(memberId);
    if (member?.user_id && activeGroup) {
      const currentConv = await fetchConversationParticipants(activeGroup.id);
      const participants = (Array.isArray(currentConv?.participants) ? currentConv.participants : [])
        .filter((p: any) => p?.userId !== member.user_id && p?.user_id !== member.user_id);
      await updateConversationParticipants(activeGroup.id, participants);
    }
    await loadGroups();
  };

  const changeMemberRole = async (memberId: string, newRole: MemberRole) => {
    if (!isAdmin) return;
    try {
      await updateGroupMemberRole(memberId, newRole);
      haptic("light");
      toast.success(`Role updated to ${ROLE_LABELS[newRole]}`);
      if (activeGroup) {
        await fetchGroupMembersById(activeGroup.id);
      }
    } catch (e) { console.error(e); }
  };

  const togglePin = async (_message: GroupMessage) => {
    toast.info("Pinning is disabled on Orbit groups until pin metadata is fully connected.");
  };

  const togglePostingPermission = async () => {
    toast.info("Posting mode is derived from group type: channels are admin-only, groups and communities are open.");
  };

  const handleLeave = async () => {
    haptic("medium");
    await hookLeaveGroup();
  };

  // Realtime for active group messages
  useEffect(() => {
    if (!activeGroup) return;
    const channel = createRealtimeChannel(`group-${activeGroup.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "chat_messages_v2",
        filter: `conversation_id=eq.${activeGroup.id}`,
      }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_user_id !== user?.id) {
          setMessages(prev => [...prev, {
            id: msg.id, sender_id: msg.sender_user_id, content: msg.body,
            created_at: msg.created_at, is_pinned: msg.is_pinned,
          } as GroupMessage]);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
      })
      .subscribe();
    return () => { removeRealtimeChannel(channel); };
  }, [activeGroup?.id, user?.id, setMessages, messagesEndRef]);

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
          <button onClick={() => setShowPinned(!showPinned)} className="flex items-center gap-2 px-4 py-2 text-left shrink-0"
            style={{ background: "hsl(var(--hud-cyan) / 0.04)", borderBottom: "1px solid hsl(var(--hud-border) / 0.06)" }}>
            <Pin className="h-3 w-3" style={{ color: "hsl(var(--hud-cyan))" }} />
            <span className="text-[11px] font-medium flex-1" style={{ color: "hsl(var(--hud-cyan))" }}>
              {pinnedMessages.length} pinned message{pinnedMessages.length > 1 ? "s" : ""}
            </span>
            {showPinned ? <ChevronUp className="h-3 w-3" style={{ color: "hsl(var(--hud-cyan))" }} /> : <ChevronDown className="h-3 w-3" style={{ color: "hsl(var(--hud-cyan))" }} />}
          </button>
        )}

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
                <div className="max-w-[75%] px-3 py-2 rounded-2xl text-[13px] relative"
                  style={{
                    background: msg.is_pinned ? "hsl(var(--hud-cyan) / 0.08)" : isMine ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-surface))",
                    color: "hsl(var(--hud-text))",
                    borderBottomRightRadius: isMine ? 6 : undefined,
                    borderBottomLeftRadius: !isMine ? 6 : undefined,
                  }}>
                  {msg.is_pinned && <Pin className="h-2 w-2 absolute top-1 right-1.5" style={{ color: "hsl(var(--hud-cyan) / 0.5)" }} />}
                  {!isMine && (
                    <span className="text-[10px] font-semibold block mb-0.5" style={{ color: "hsl(var(--hud-cyan) / 0.7)" }}>
                      {msg.sender_name || "Member"}
                    </span>
                  )}
                  <p>{msg.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    {isAdmin && (
                      <button onClick={() => togglePin(msg)} className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-0.5">
                        {msg.is_pinned
                          ? <PinOff className="h-2.5 w-2.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
                          : <Pin className="h-2.5 w-2.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />}
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
              <Input value={msgInput} onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                placeholder={t("orbit.groups.message_placeholder") || "Message…"}
                className="flex-1 h-10 text-sm border-0 rounded-full px-4"
                style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }} />
              <button onClick={handleSendMessage} disabled={!msgInput.trim()}
                className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center shrink-0 disabled:opacity-30"
                style={{ background: "hsl(var(--hud-cyan))" }}>
                <Send className="h-4 w-4" style={{ color: "hsl(var(--hud-bg))" }} />
              </button>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-[11px] flex items-center justify-center gap-1.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                {isViewer ? <><Eye className="h-3 w-3" /> View only — you cannot post</> : <><Megaphone className="h-3 w-3" /> Only admins can post in this {TYPE_LABELS[activeGroup.group_type].toLowerCase()}</>}
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
                    {(m.profile_name || guardDisplayName(m.user_id, "M", { screen: "groups", component: "CommGroupsSection" })).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm line-clamp-1 break-words block" style={{ color: "hsl(var(--hud-text))" }}>
                      {m.user_id === user?.id ? "You" : (m.profile_name || guardDisplayName(m.user_id, "Member", { screen: "groups", component: "CommGroupsSection" }))}
                    </span>
                    <div className="flex items-center gap-1">
                      {m.role === "admin" && <span className="text-[10px] flex items-center gap-0.5" style={{ color: "hsl(var(--hud-cyan) / 0.7)" }}><Crown className="h-2.5 w-2.5" /> Admin</span>}
                      {m.role === "viewer" && <span className="text-[10px] flex items-center gap-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}><Eye className="h-2.5 w-2.5" /> Viewer</span>}
                      {m.role === "member" && <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Member</span>}
                    </div>
                  </div>
                  {isAdmin && m.user_id !== user?.id && (
                    <div className="flex items-center gap-1">
                      <select value={m.role} onChange={e => changeMemberRole(m.id, e.target.value as MemberRole)}
                        className="text-[10px] rounded px-1 py-0.5 border-0"
                        style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button onClick={() => handleRemoveMember(m.id)} className="p-1.5 rounded-full hover:bg-[hsl(var(--hud-surface)/0.5)]">
                        <Trash2 className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-danger))" }} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              {isAdmin && (
                <Button size="sm" className="flex-1 gap-1.5" style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}
                  onClick={() => { setShowMembers(false); setShowAddMember(true); }}>
                  <UserPlus className="h-3.5 w-3.5" /> {t("orbit.groups.add_member") || "Add Member"}
                </Button>
              )}
              <Button size="sm" variant="ghost" className="gap-1.5" style={{ color: "hsl(var(--hud-danger))" }} onClick={handleLeave}>
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
                <Input value={addMemberEmail} onChange={e => setAddMemberEmail(e.target.value)}
                  placeholder="user@example.com" className="mt-1 border-0"
                  style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }} />
              </div>
              <div>
                <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Role</Label>
                <div className="flex gap-2 mt-1">
                  {(["member", "viewer", "admin"] as MemberRole[]).map(r => (
                    <button key={r} onClick={() => setAddMemberRole(r)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background: addMemberRole === r ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-surface))",
                        color: addMemberRole === r ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim))",
                        border: addMemberRole === r ? "1px solid hsl(var(--hud-cyan) / 0.3)" : "1px solid transparent",
                      }}>
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full" disabled={!addMemberEmail.trim()} onClick={handleAddMember}
                style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
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
        <div className="flex items-center justify-end mb-3">
          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs"
            style={{ color: "hsl(var(--hud-cyan))" }} onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> {t("orbit.groups.create") || "Create"}
          </Button>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("orbit.groups.search") || "Search…"} className="pl-9 h-9 text-sm border-0"
            style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="divide-y" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="w-11 h-11 rounded-full shrink-0" />
                <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-3/5" /><Skeleton className="h-2.5 w-4/5" /></div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <ErrorState message={`Failed to load: ${loadError}`} onRetry={loadGroups} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <UsersRound className="h-10 w-10 mx-auto mb-3" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              {search ? "No results" : (t("orbit.groups.empty") || "No groups yet")}
            </p>
            {!search && (
              <Button size="sm" variant="ghost" className="gap-1.5 mt-2"
                style={{ color: "hsl(var(--hud-cyan))" }} onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" /> {t("orbit.groups.create_first") || "Create your first group"}
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
            {filtered.map(g => {
              const TypeIcon = TYPE_ICONS[g.group_type];
              return (
                <button key={g.id} onClick={() => openGroupChat(g)}
                  className="flex items-center gap-3 px-4 py-3.5 w-full text-left hover:bg-[hsl(var(--hud-surface)/0.3)] transition-colors">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}>
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold line-clamp-1 break-words" style={{ color: "hsl(var(--hud-text))" }}>{g.name}</span>
                      {g.group_type !== "group" && (
                        <span className="text-[9px] px-1 py-px rounded shrink-0"
                          style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                          {TYPE_LABELS[g.group_type]}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] line-clamp-1 mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                      {g.last_message || (t("orbit.groups.no_messages") || "No messages yet")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {g.last_message_at && (
                      <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.35)" }}>
                        {formatMsgTime(g.last_message_at)}
                      </span>
                    )}
                    {typeof g.member_count === "number" && g.member_count > 0 && (
                      <span className="text-[9px] flex items-center gap-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                        <Users className="h-2.5 w-2.5" /> {g.member_count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "hsl(var(--hud-text))" }}>{t("orbit.groups.create_title") || "New Group"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>{t("orbit.groups.name_label") || "Name"}</Label>
              <Input value={newGroup.name} onChange={e => setNewGroup(g => ({ ...g, name: e.target.value }))}
                placeholder={t("orbit.groups.name_placeholder") || "Group name"} className="mt-1 border-0"
                style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }} />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Type</Label>
              <div className="flex gap-2 mt-1">
                {(["group", "channel", "community"] as GroupType[]).map(gt => (
                  <button key={gt} onClick={() => setNewGroup(g => ({ ...g, group_type: gt }))}
                    className="flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                    style={{
                      background: newGroup.group_type === gt ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-surface))",
                      color: newGroup.group_type === gt ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim))",
                      border: newGroup.group_type === gt ? "1px solid hsl(var(--hud-cyan) / 0.3)" : "1px solid transparent",
                    }}>
                    {gt === "group" && <UsersRound className="h-3.5 w-3.5" />}
                    {gt === "channel" && <Hash className="h-3.5 w-3.5" />}
                    {gt === "community" && <Globe className="h-3.5 w-3.5" />}
                    {TYPE_LABELS[gt]}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" disabled={!newGroup.name.trim() || creating} onClick={handleCreate}
              style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
              {creating ? "…" : (t("orbit.groups.create_btn") || "Create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
