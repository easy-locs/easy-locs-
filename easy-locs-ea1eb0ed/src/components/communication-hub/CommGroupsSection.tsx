/**
 * CommGroupsSection — Groups, Channels & Communities for Orbit.
 * Group list + create dialog + long-press context actions.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import {
  UsersRound, Plus, Search, Users, Hash, Globe,
  LogOut, Info, BellOff, Trash2, Check, X,
} from "lucide-react";
import { formatOrbitTimestamp } from "@/lib/orbit/canonical-helpers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useGroupData, type Group } from "@/hooks/groups/useGroupData";
import { listOrbitContacts } from "@/lib/orbit/orbit-contacts-service";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface ContactOption {
  id: string;
  name: string;
  email: string | null;
  userId: string | null;
}

type GroupType = "group" | "channel" | "community";

const TYPE_ICONS: Record<GroupType, typeof UsersRound> = {
  group: UsersRound, channel: Hash, community: Globe,
};
const TYPE_LABEL_KEYS: Record<GroupType, string> = {
  group: "orbit.groups.type_group", channel: "orbit.groups.type_channel", community: "orbit.groups.type_community",
};

export default function CommGroupsSection() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const {
    groups, loading, loadError,
    loadGroups, createGroup, addMemberToGroup, leaveGroup, deleteGroup,
  } = useGroupData();

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", description: "", group_type: "group" as GroupType });
  const [creating, setCreating] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<ContactOption[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState("");

  const [contextGroup, setContextGroup] = useState<Group | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [mutedGroups, setMutedGroups] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("orbit_muted_groups");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => { loadGroups(); }, [loadGroups]);

  useEffect(() => {
    if (showCreate && user?.id) {
      listOrbitContacts(user.id).then((contacts: any[]) => {
        setAvailableContacts(contacts.map((c: any) => ({
          id: c.id,
          name: c.display_name || c.name || t("orbit.contact"),
          email: c.email || null,
          userId: c.peer_user_id || c.contact_user_id || null,
        })).filter((c: ContactOption) => c.userId));
      }).catch(() => {});
    }
  }, [showCreate, user?.id]);

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return availableContacts;
    const q = contactSearch.toLowerCase();
    return availableContacts.filter(c =>
      c.name.toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q)
    );
  }, [availableContacts, contactSearch]);

  const toggleContact = useCallback((id: string) => {
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    haptic("selection");
  }, []);

  const handleCreate = async () => {
    if (!newGroup.name.trim()) return;
    setCreating(true);
    const created = await createGroup(newGroup.name, newGroup.group_type);
    if (created) {
      for (const cId of selectedContactIds) {
        const contact = availableContacts.find(c => c.id === cId);
        if (contact?.email) {
          try { await addMemberToGroup(created.id, contact.email, "member"); } catch {}
        }
      }
      setShowCreate(false);
      setNewGroup({ name: "", description: "", group_type: "group" });
      setSelectedContactIds(new Set());
      setContactSearch("");
      navigate(`/orbit?thread=${created.id}`);
    }
    setCreating(false);
  };

  const handleOpenGroup = (group: Group) => {
    navigate(`/orbit?thread=${group.id}`);
  };

  const handleLongPress = useCallback((group: Group) => {
    haptic("medium");
    setContextGroup(group);
    setShowContext(true);
  }, []);

  const handleToggleMute = useCallback(() => {
    if (!contextGroup) return;
    setMutedGroups(prev => {
      const next = new Set(prev);
      if (next.has(contextGroup.id)) {
        next.delete(contextGroup.id);
        toast.success(t("orbit.groups.unmuted"));
      } else {
        next.add(contextGroup.id);
        toast.success(t("orbit.groups.muted"));
      }
      localStorage.setItem("orbit_muted_groups", JSON.stringify([...next]));
      return next;
    });
    haptic("success");
    setShowContext(false);
  }, [contextGroup, t]);

  const handleLeaveGroup = useCallback(async () => {
    if (!contextGroup) return;
    setShowContext(false);
    await leaveGroup(contextGroup.id);
    haptic("success");
  }, [contextGroup, leaveGroup]);

  const handleDeleteGroup = useCallback(async () => {
    if (!contextGroup) return;
    setShowContext(false);
    await deleteGroup(contextGroup.id);
    haptic("success");
  }, [contextGroup, deleteGroup]);

  const filtered = groups.filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--background))" }}>
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-end mb-3">
          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs"
            style={{ color: "hsl(var(--primary))" }} onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> {t("orbit.groups.create")}
          </Button>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }} />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("orbit.groups.search")} className="pl-9 h-9 text-sm border-0"
            style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="divide-y" style={{ borderColor: "hsl(var(--border) / 0.06)" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="w-11 h-11 rounded-full shrink-0" />
                <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-3/5" /><Skeleton className="h-2.5 w-4/5" /></div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <ErrorState message={`${t("orbit.groups.load_error")}: ${loadError}`} onRetry={loadGroups} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <UsersRound className="h-10 w-10 mx-auto mb-3" style={{ color: "hsl(var(--muted-foreground) / 0.15)" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
              {search ? t("orbit.groups.no_results") : t("orbit.groups.empty")}
            </p>
            {!search && (
              <Button size="sm" variant="ghost" className="gap-1.5 mt-2"
                style={{ color: "hsl(var(--primary))" }} onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" /> {t("orbit.groups.create_first")}
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "hsl(var(--border) / 0.06)" }}>
            {filtered.map(g => (
              <GroupRow
                key={g.id}
                group={g}
                isMuted={mutedGroups.has(g.id)}
                onTap={handleOpenGroup}
                onLongPress={handleLongPress}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "hsl(var(--foreground))" }}>{t("orbit.groups.create_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{t("orbit.groups.name_label")}</Label>
              <Input value={newGroup.name} onChange={e => setNewGroup(g => ({ ...g, name: e.target.value }))}
                placeholder={t("orbit.groups.name_placeholder")} className="mt-1 border-0"
                style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{t("orbit.groups.type_label")}</Label>
              <div className="flex gap-2 mt-1">
                {(["group", "channel", "community"] as GroupType[]).map(gt => (
                  <button key={gt} onClick={() => setNewGroup(g => ({ ...g, group_type: gt }))}
                    className="flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                    style={{
                      background: newGroup.group_type === gt ? "hsl(var(--primary) / 0.15)" : "hsl(var(--card))",
                      color: newGroup.group_type === gt ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                      border: newGroup.group_type === gt ? "1px solid hsl(var(--primary) / 0.3)" : "1px solid transparent",
                    }}>
                    {gt === "group" && <UsersRound className="h-3.5 w-3.5" />}
                    {gt === "channel" && <Hash className="h-3.5 w-3.5" />}
                    {gt === "community" && <Globe className="h-3.5 w-3.5" />}
                    {t(TYPE_LABEL_KEYS[gt])}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                {t("orbit.groups.invite_members")} ({selectedContactIds.size} {t("orbit.groups.selected")})
              </Label>
              {selectedContactIds.size > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
                  {Array.from(selectedContactIds).map(cId => {
                    const c = availableContacts.find(x => x.id === cId);
                    if (!c) return null;
                    return (
                      <span key={cId} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[0.6875rem] font-medium"
                        style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}>
                        {c.name}
                        <button type="button" onClick={() => toggleContact(cId)} className="hover:opacity-70">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <Input value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                placeholder={t("orbit.groups.search_contacts")} className="mt-1 border-0"
                style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
              <div className="mt-2 max-h-36 overflow-y-auto rounded-lg"
                style={{ background: "hsl(var(--card) / 0.3)" }}>
                {filteredContacts.length === 0 ? (
                  <p className="text-[0.6875rem] text-center py-3" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}>
                    {availableContacts.length === 0 ? t("orbit.groups.no_platform_contacts") : t("orbit.groups.no_matches")}
                  </p>
                ) : (
                  filteredContacts.map(c => (
                    <button key={c.id} type="button" onClick={() => toggleContact(c.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[hsl(var(--card)/0.5)]">
                      <div className="w-5 h-5 rounded border flex items-center justify-center shrink-0"
                        style={{
                          borderColor: selectedContactIds.has(c.id) ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.2)",
                          background: selectedContactIds.has(c.id) ? "hsl(var(--primary))" : "transparent",
                        }}>
                        {selectedContactIds.has(c.id) && <Check className="h-3 w-3" style={{ color: "hsl(var(--background))" }} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium block truncate" style={{ color: "hsl(var(--foreground))" }}>{c.name}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
            <Button className="w-full" disabled={!newGroup.name.trim() || creating} onClick={handleCreate}
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--background))" }}>
              {creating ? t("orbit.groups.creating") : t("orbit.groups.create_btn")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showContext} onOpenChange={setShowContext}>
        <DialogContent className="max-w-xs" style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)" }}>
          <DialogHeader>
            <DialogTitle className="text-sm" style={{ color: "hsl(var(--foreground))" }}>
              {contextGroup?.name || t("orbit.groups.type_group")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <button onClick={() => { if (contextGroup) { setShowContext(false); handleOpenGroup(contextGroup); } }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-[hsl(var(--card)/0.4)]"
              style={{ color: "hsl(var(--foreground))" }}>
              <Info className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} /> {t("orbit.groups.open")}
            </button>
            <button onClick={handleToggleMute}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-[hsl(var(--card)/0.4)] min-h-[44px]"
              style={{ color: "hsl(var(--foreground))" }}>
              <BellOff className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--muted-foreground))" }} />
              {contextGroup && mutedGroups.has(contextGroup.id) ? t("orbit.groups.unmute") : t("orbit.groups.mute")}
            </button>
            <button onClick={handleLeaveGroup}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-[hsl(var(--card)/0.4)] min-h-[44px]"
              style={{ color: "hsl(var(--foreground))" }}>
              <LogOut className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--muted-foreground))" }} /> {t("orbit.groups.leave")}
            </button>
            <button onClick={handleDeleteGroup}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-destructive/5 min-h-[44px]"
              style={{ color: "hsl(var(--destructive))" }}>
              <Trash2 className="h-4 w-4 shrink-0" /> {t("orbit.groups.delete")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GroupRow({ group, isMuted, onTap, onLongPress }: {
  group: Group;
  isMuted: boolean;
  onTap: (g: Group) => void;
  onLongPress: (g: Group) => void;
}) {
  const { t } = useI18n();
  const TypeIcon = TYPE_ICONS[group.group_type];
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressedRef = useRef(false);

  const handlePointerDown = () => {
    pressedRef.current = false;
    longPressRef.current = setTimeout(() => {
      pressedRef.current = true;
      onLongPress(group);
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  };

  const handleClick = () => {
    if (pressedRef.current) return;
    onTap(group);
  };

  return (
    <div
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="flex items-center gap-3 px-4 py-3.5 w-full text-left hover:bg-[hsl(var(--card)/0.3)] transition-colors cursor-pointer"
      role="button"
      tabIndex={0}
    >
      <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
        <TypeIcon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold line-clamp-1 break-words" style={{ color: "hsl(var(--foreground))" }}>{group.name}</span>
          {group.group_type !== "group" && (
            <span className="text-[0.625rem] px-1 py-px rounded shrink-0"
              style={{ background: "hsl(var(--card))", color: "hsl(var(--muted-foreground) / 0.5)" }}>
              {t(TYPE_LABEL_KEYS[group.group_type])}
            </span>
          )}
          {isMuted && (
            <BellOff className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
          )}
        </div>
        <p className="text-[0.6875rem] line-clamp-1 mt-0.5" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
          {group.last_message || ""}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {group.last_message_at && (
          <span className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground) / 0.35)" }}>
            {formatOrbitTimestamp(group.last_message_at)}
          </span>
        )}
        {typeof group.member_count === "number" && group.member_count > 0 && (
          <span className="text-[0.625rem] flex items-center gap-0.5" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }}>
            <Users className="h-2.5 w-2.5" /> {group.member_count}
          </span>
        )}
      </div>
    </div>
  );
}
