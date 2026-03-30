/**
 * GroupCreateFlow — Full group creation flow.
 * Steps: 1) Member selection → 2) Group naming + avatar → 3) Create.
 */
import { useState, useMemo, useCallback } from "react";
import { X, Check, Search, Camera, ArrowRight, Loader2, Users } from "lucide-react";
import { IdentityAvatar } from "@/components/orbit/IdentityAvatar";
import { GroupCreate, type GroupPayload } from "@/families/groups/group-create";
import { useOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface GroupCreateFlowProps {
  open: boolean;
  onClose: () => void;
  /** Available contacts to pick from */
  contacts: Array<{
    userId: string;
    displayName: string;
    avatarUrl?: string | null;
    email?: string | null;
  }>;
  onGroupCreated?: (groupId: string) => void;
}

type Step = "members" | "details";

export function GroupCreateFlow({ open, onClose, contacts, onGroupCreated }: GroupCreateFlowProps) {
  const { t } = useI18n();
  const identity = useOrbitIdentity();
  const [step, setStep] = useState<Step>("members");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(c =>
      c.displayName.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const toggleMember = useCallback((userId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const handleCreate = useCallback(async () => {
    if (!identity || !groupName.trim() || selectedIds.size === 0) return;
    setCreating(true);
    try {
      const payload: GroupPayload = {
        title: groupName.trim(),
        memberIds: Array.from(selectedIds),
        createdByUserId: identity.userId,
        createdByOrbitId: identity.orbitId,
      };
      const result = await GroupCreate.execute(payload);
      if (result) {
        toast.success(t("group.created") || "Group created");
        onGroupCreated?.(result.id);
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  }, [identity, groupName, selectedIds, onClose, onGroupCreated, t]);

  const reset = useCallback(() => {
    setStep("members");
    setSelectedIds(new Set());
    setSearch("");
    setGroupName("");
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="group-create"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-[9999] flex flex-col"
        style={{ background: "hsl(var(--background))" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid hsl(var(--border) / 0.1)" }}>
          <button onClick={handleClose} className="p-2 -ml-2">
            <X className="h-5 w-5" style={{ color: "hsl(var(--foreground))" }} />
          </button>
          <h1 className="text-base font-bold" style={{ color: "hsl(var(--foreground))" }}>
            {step === "members"
              ? (t("group.select_members") || "Select Members")
              : (t("group.new_group") || "New Group")}
          </h1>
          {step === "members" ? (
            <button
              onClick={() => setStep("details")}
              disabled={selectedIds.size === 0}
              className="p-2 -mr-2 disabled:opacity-30"
            >
              <ArrowRight className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating || !groupName.trim()}
              className="p-2 -mr-2 disabled:opacity-30"
            >
              {creating
                ? <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--primary))" }} />
                : <Check className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />}
            </button>
          )}
        </div>

        {step === "members" ? (
          <>
            {/* Selected chips */}
            {selectedIds.size > 0 && (
              <div className="flex gap-2 px-4 py-2 overflow-x-auto"
                style={{ borderBottom: "1px solid hsl(var(--border) / 0.05)" }}>
                {Array.from(selectedIds).map(id => {
                  const c = contacts.find(c => c.userId === id);
                  if (!c) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => toggleMember(id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
                      style={{ background: "hsl(var(--primary) / 0.08)" }}
                    >
                      <IdentityAvatar name={c.displayName} avatarUrl={c.avatarUrl} size="xs" />
                      <span className="text-xs font-medium whitespace-nowrap" style={{ color: "hsl(var(--primary))" }}>
                        {c.displayName}
                      </span>
                      <X className="h-3 w-3" style={{ color: "hsl(var(--primary))" }} />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Search */}
            <div className="px-4 py-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "hsl(var(--muted) / 0.5)" }}>
                <Search className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--muted-foreground))" }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t("group.search_contacts") || "Search contacts..."}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: "hsl(var(--foreground))" }}
                />
              </div>
            </div>

            {/* Contact list */}
            <div className="flex-1 overflow-y-auto px-2">
              {filtered.map(contact => {
                const selected = selectedIds.has(contact.userId);
                return (
                  <button
                    key={contact.userId}
                    onClick={() => toggleMember(contact.userId)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                    style={{ background: selected ? "hsl(var(--primary) / 0.04)" : "transparent" }}
                  >
                    <IdentityAvatar name={contact.displayName} avatarUrl={contact.avatarUrl} size="sm" />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                        {contact.displayName}
                      </p>
                      {contact.email && (
                        <p className="text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                          {contact.email}
                        </p>
                      )}
                    </div>
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors"
                      style={{
                        borderColor: selected ? "hsl(var(--primary))" : "hsl(var(--border))",
                        background: selected ? "hsl(var(--primary))" : "transparent",
                      }}
                    >
                      {selected && <Check className="h-3 w-3" style={{ color: "hsl(var(--primary-foreground))" }} />}
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Users className="h-10 w-10 mb-3" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }} />
                  <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {t("group.no_contacts") || "No contacts found"}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Step 2: Group details */
          <div className="flex-1 flex flex-col items-center px-6 pt-8">
            {/* Group avatar placeholder */}
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-6 cursor-pointer"
              style={{ background: "hsl(var(--primary) / 0.08)", border: "2px dashed hsl(var(--primary) / 0.2)" }}
            >
              <Camera className="h-8 w-8" style={{ color: "hsl(var(--primary) / 0.4)" }} />
            </div>

            {/* Group name input */}
            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder={t("group.name_placeholder") || "Group name"}
              className="w-full text-center text-lg font-bold bg-transparent outline-none pb-4 mb-4"
              style={{
                color: "hsl(var(--foreground))",
                borderBottom: "2px solid hsl(var(--primary) / 0.15)",
              }}
              autoFocus
            />

            {/* Member count */}
            <p className="text-sm mb-6" style={{ color: "hsl(var(--muted-foreground))" }}>
              {selectedIds.size} {selectedIds.size === 1
                ? (t("group.member_singular") || "member")
                : (t("group.member_plural") || "members")}
            </p>

            {/* Selected members preview */}
            <div className="w-full space-y-1">
              {Array.from(selectedIds).slice(0, 5).map(id => {
                const c = contacts.find(c => c.userId === id);
                if (!c) return null;
                return (
                  <div key={id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                    style={{ background: "hsl(var(--muted) / 0.3)" }}>
                    <IdentityAvatar name={c.displayName} avatarUrl={c.avatarUrl} size="sm" />
                    <span className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                      {c.displayName}
                    </span>
                  </div>
                );
              })}
              {selectedIds.size > 5 && (
                <p className="text-xs text-center py-2" style={{ color: "hsl(var(--muted-foreground))" }}>
                  +{selectedIds.size - 5} more
                </p>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
