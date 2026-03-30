/**
 * CommGroupsSection — Groups, Channels & Communities for Orbit.
 * Group list + create dialog only. Opening a group navigates to /orbit/:conversationId.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import {
  UsersRound, Plus, Search, Users, Hash, Globe,
} from "lucide-react";
import { formatOrbitTimestamp } from "@/lib/orbit/canonical-helpers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useGroupData, type Group } from "@/hooks/groups/useGroupData";

type GroupType = "group" | "channel" | "community";

const TYPE_ICONS: Record<GroupType, typeof UsersRound> = {
  group: UsersRound, channel: Hash, community: Globe,
};
const TYPE_LABELS: Record<GroupType, string> = {
  group: "Group", channel: "Channel", community: "Community",
};

export default function CommGroupsSection() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const {
    groups, loading, loadError,
    loadGroups, createGroup,
  } = useGroupData();

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", description: "", group_type: "group" as GroupType });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const handleCreate = async () => {
    if (!newGroup.name.trim()) return;
    setCreating(true);
    const created = await createGroup(newGroup.name, newGroup.group_type);
    if (created) {
      setShowCreate(false);
      setNewGroup({ name: "", description: "", group_type: "group" });
      // Navigate to the new group in Orbit
      navigate(`/orbit/${created.id}`);
    }
    setCreating(false);
  };

  const handleOpenGroup = (group: Group) => {
    navigate(`/orbit/${group.id}`);
  };

  const filtered = groups.filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()));

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
                <button key={g.id} onClick={() => handleOpenGroup(g)}
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
                        {formatOrbitTimestamp(g.last_message_at)}
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
