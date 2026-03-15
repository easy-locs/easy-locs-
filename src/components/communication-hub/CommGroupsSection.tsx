/**
 * CommGroupsSection — Real group management with create, list, chat, members. Fully i18n'd.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import {
  UsersRound, Plus, Search, ArrowLeft, Send, Settings2,
  UserPlus, LogOut, Trash2, Crown, Users,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";

interface Group {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
  last_message?: string;
  last_message_at?: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile_name?: string;
}

interface GroupMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
}

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function formatMsgTime(d: string): string {
  const date = new Date(d);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "dd/MM");
}

export default function CommGroupsSection() {
  const { user, orgId } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);

  // Chat state
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadGroups = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .order("updated_at", { ascending: false });
    
    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return;
    }
    
    if (data) {
      // Get member counts and last messages
      const enriched = await Promise.all(data.map(async (g: any) => {
        const { count } = await supabase
          .from("group_members")
          .select("*", { count: "exact", head: true })
          .eq("group_id", g.id);
        
        const { data: lastMsg } = await supabase
          .from("group_messages")
          .select("content, created_at")
          .eq("group_id", g.id)
          .order("created_at", { ascending: false })
          .limit(1);
        
        return {
          ...g,
          member_count: count || 0,
          last_message: lastMsg?.[0]?.content || null,
          last_message_at: lastMsg?.[0]?.created_at || g.created_at,
        };
      }));
      setGroups(enriched);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const handleCreate = async () => {
    if (!user?.id || !orgId || !newGroup.name.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.from("groups").insert({
      org_id: orgId,
      name: newGroup.name.trim(),
      description: newGroup.description.trim() || null,
      created_by: user.id,
    } as any).select().single();
    
    if (error || !data) {
      toast.error("Failed to create group");
      setCreating(false);
      return;
    }
    
    // Add creator as admin
    await supabase.from("group_members").insert({
      group_id: (data as any).id,
      user_id: user.id,
      role: "admin",
    } as any);
    
    haptic("success");
    toast.success("Group created");
    setShowCreate(false);
    setNewGroup({ name: "", description: "" });
    setCreating(false);
    loadGroups();
  };

  const openGroupChat = async (group: Group) => {
    setActiveGroup(group);
    haptic("light");
    
    // Load messages
    const { data: msgs } = await supabase
      .from("group_messages")
      .select("*")
      .eq("group_id", group.id)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((msgs as GroupMessage[]) || []);
    
    // Load members
    const { data: mems } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", group.id);
    setMembers((mems as GroupMember[]) || []);
    
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const sendMessage = async () => {
    if (!msgInput.trim() || !activeGroup || !user?.id) return;
    const content = msgInput.trim();
    setMsgInput("");
    haptic("light");
    
    const { data, error } = await supabase.from("group_messages").insert({
      group_id: activeGroup.id,
      sender_id: user.id,
      content,
    } as any).select().single();
    
    if (!error && data) {
      setMessages(prev => [...prev, data as GroupMessage]);
      // Update group timestamp
      await supabase.from("groups").update({ updated_at: new Date().toISOString() } as any).eq("id", activeGroup.id);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  const handleAddMember = async () => {
    if (!addMemberEmail.trim() || !activeGroup) return;
    // Look up user by email in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", addMemberEmail.trim().toLowerCase())
      .single();
    
    if (!profile) {
      toast.error("User not found");
      return;
    }
    
    const { error } = await supabase.from("group_members").insert({
      group_id: activeGroup.id,
      user_id: profile.id,
      role: "member",
    } as any);
    
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Already a member" : "Failed to add member");
      return;
    }
    
    haptic("success");
    toast.success("Member added");
    setAddMemberEmail("");
    setShowAddMember(false);
    // Reload members
    const { data: mems } = await supabase.from("group_members").select("*").eq("group_id", activeGroup.id);
    setMembers((mems as GroupMember[]) || []);
  };

  const leaveGroup = async () => {
    if (!activeGroup || !user?.id) return;
    const { error } = await supabase.from("group_members").delete().eq("group_id", activeGroup.id).eq("user_id", user.id);
    if (error) { toast.error("Failed to leave group"); return; }
    haptic("medium");
    toast.success("Left group");
    setActiveGroup(null);
    loadGroups();
  };

  const removeMember = async (memberId: string) => {
    if (!activeGroup) return;
    const { error } = await supabase.from("group_members").delete().eq("id", memberId);
    if (error) { toast.error("Failed to remove member"); return; }
    haptic("light");
    toast.success("Member removed");
    const { data: mems } = await supabase.from("group_members").select("*").eq("group_id", activeGroup.id);
    setMembers((mems as GroupMember[]) || []);
  };

  const isAdmin = members.some(m => m.user_id === user?.id && m.role === "admin");

  // Realtime subscription for active group
  useEffect(() => {
    if (!activeGroup) return;
    const channel = supabase
      .channel(`group-${activeGroup.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "group_messages",
        filter: `group_id=eq.${activeGroup.id}`,
      }, (payload) => {
        const msg = payload.new as GroupMessage;
        if (msg.sender_id !== user?.id) {
          setMessages(prev => [...prev, msg]);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [activeGroup?.id, user?.id]);

  const filtered = groups.filter(g => {
    if (!search) return true;
    return g.name.toLowerCase().includes(search.toLowerCase());
  });

  // ═══ Group Chat View ═══
  if (activeGroup) {
    return (
      <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--hud-bg))" }}>
        {/* Chat header */}
        <div className="flex items-center gap-3 px-3 py-2.5 shrink-0" style={{ borderBottom: "1px solid hsl(var(--hud-border) / 0.08)" }}>
          <button onClick={() => { setActiveGroup(null); haptic("light"); }} className="p-1.5 rounded-full hover:bg-[hsl(var(--hud-surface)/0.5)]">
            <ArrowLeft className="h-5 w-5" style={{ color: "hsl(var(--hud-text))" }} />
          </button>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "hsl(var(--hud-cyan) / 0.12)", color: "hsl(var(--hud-cyan))" }}
          >
            {getInitials(activeGroup.name)}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold truncate block" style={{ color: "hsl(var(--hud-text))" }}>
              {activeGroup.name}
            </span>
            <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              {members.length} members
            </span>
          </div>
          <button
            onClick={() => setShowMembers(true)}
            className="p-2 rounded-full"
            style={{ color: "hsl(var(--hud-cyan))" }}
          >
            <Users className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <UsersRound className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
              <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Start the conversation</p>
            </div>
          )}
          {messages.map(msg => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[75%] px-3 py-2 rounded-2xl text-[13px]"
                  style={{
                    background: isMine ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-surface))",
                    color: "hsl(var(--hud-text))",
                    borderBottomRightRadius: isMine ? 6 : undefined,
                    borderBottomLeftRadius: !isMine ? 6 : undefined,
                  }}
                >
                  {!isMine && (
                    <span className="text-[10px] font-semibold block mb-0.5" style={{ color: "hsl(var(--hud-cyan) / 0.7)" }}>
                      {msg.sender_id.slice(0, 8)}
                    </span>
                  )}
                  <p>{msg.content}</p>
                  <span className="text-[9px] mt-1 block text-right" style={{ color: "hsl(var(--hud-text-dim) / 0.35)" }}>
                    {format(new Date(msg.created_at), "HH:mm")}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="px-3 py-2 shrink-0" style={{ borderTop: "1px solid hsl(var(--hud-border) / 0.06)" }}>
          <div className="flex items-center gap-2">
            <Input
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Message..."
              className="flex-1 h-10 text-sm border-0 rounded-full px-4"
              style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
            />
            <button
              onClick={sendMessage}
              disabled={!msgInput.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-30"
              style={{ background: "hsl(var(--hud-cyan))" }}
            >
              <Send className="h-4 w-4" style={{ color: "hsl(var(--hud-bg))" }} />
            </button>
          </div>
        </div>

        {/* Members sheet */}
        <Dialog open={showMembers} onOpenChange={setShowMembers}>
          <DialogContent style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)" }}>
            <DialogHeader>
              <DialogTitle style={{ color: "hsl(var(--hud-text))" }}>Members ({members.length})</DialogTitle>
            </DialogHeader>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-2 py-2 rounded-lg">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}>
                    {m.user_id.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm truncate block" style={{ color: "hsl(var(--hud-text))" }}>
                      {m.user_id === user?.id ? "You" : m.user_id.slice(0, 8)}
                    </span>
                    {m.role === "admin" && (
                      <span className="text-[10px] flex items-center gap-1" style={{ color: "hsl(var(--hud-cyan) / 0.7)" }}>
                        <Crown className="h-2.5 w-2.5" /> Admin
                      </span>
                    )}
                  </div>
                  {isAdmin && m.user_id !== user?.id && (
                    <button onClick={() => removeMember(m.id)} className="p-1.5 rounded-full hover:bg-[hsl(var(--hud-surface)/0.5)]">
                      <Trash2 className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-danger))" }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              {isAdmin && (
                <Button
                  size="sm"
                  className="flex-1 gap-1.5"
                  style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}
                  onClick={() => { setShowMembers(false); setShowAddMember(true); }}
                >
                  <UserPlus className="h-3.5 w-3.5" /> Add Member
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5"
                style={{ color: "hsl(var(--hud-danger))" }}
                onClick={leaveGroup}
              >
                <LogOut className="h-3.5 w-3.5" /> Leave
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add member dialog */}
        <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
          <DialogContent style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)" }}>
            <DialogHeader>
              <DialogTitle style={{ color: "hsl(var(--hud-text))" }}>Add Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>User email</Label>
                <Input
                  value={addMemberEmail}
                  onChange={e => setAddMemberEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="mt-1 border-0"
                  style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
                />
              </div>
              <Button
                className="w-full"
                disabled={!addMemberEmail.trim()}
                onClick={handleAddMember}
                style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}
              >
                Add Member
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═══ Group List View ═══
  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--hud-bg))" }}>
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: "hsl(var(--hud-text))" }}>Groups</h2>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 text-xs"
            style={{ color: "hsl(var(--hud-cyan))" }}
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search groups..."
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
                  <Skeleton className="h-2 w-1/4" />
                </div>
                <Skeleton className="h-2.5 w-10 shrink-0" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <ErrorState
            message={`Failed to load groups: ${loadError}`}
            onRetry={loadGroups}
          />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <UsersRound className="h-10 w-10 mb-3" style={{ color: "hsl(var(--hud-text-dim) / 0.2)" }} />
            <p className="text-sm" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              {search ? "No groups found" : "No groups yet"}
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="mt-3 gap-1.5"
              style={{ color: "hsl(var(--hud-cyan))" }}
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-4 w-4" />
              Create your first group
            </Button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
            {filtered.map(group => (
              <button
                key={group.id}
                onClick={() => openGroupChat(group)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[hsl(var(--hud-surface)/0.3)] transition-colors text-left"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}
                >
                  {getInitials(group.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>
                      {group.name}
                    </span>
                    <span className="text-[10px] shrink-0 ml-2" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                      {group.last_message_at ? formatMsgTime(group.last_message_at) : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                      {group.last_message || group.description || "No messages yet"}
                    </span>
                  </div>
                  <span className="text-[10px] mt-0.5 block" style={{ color: "hsl(var(--hud-text-dim) / 0.35)" }}>
                    {group.member_count} members
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "hsl(var(--hud-text))" }}>Create Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Group Name *</Label>
              <Input
                value={newGroup.name}
                onChange={e => setNewGroup(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Property Team"
                className="mt-1 border-0"
                style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
              />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Description</Label>
              <Input
                value={newGroup.description}
                onChange={e => setNewGroup(p => ({ ...p, description: e.target.value }))}
                placeholder="What's this group about?"
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
              {creating ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
