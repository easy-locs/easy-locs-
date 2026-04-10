/**
 * CommContactsSection — Premium Orbit contacts surface.
 * 3 actions: My QR · Scan · Add. Row tap=chat. Icons=call/video.
 * Long-press=contact detail sheet. Star=toggle favorite. Swipe=delete.
 */
import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { Search, UserPlus, Phone, Video, Star, User, QrCode, ScanLine, Loader2, X, MessageCircle, Trash2, Ban, Edit3, MoreVertical, Mail, PhoneCall, Wallet, Share2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateDirectThread } from "@/lib/direct-thread";
import {
  listOrbitContacts,
  upsertOrbitContact,
  updateOrbitContact,
  toggleFavoriteContact,
  deleteOrbitContact,
  toggleBlockedContact,
  resolveUserByEmail,
  resolveUserByPhone,
  linkContactToUser,
} from "@/lib/orbit/orbit-contacts-service";
import { resolveCanonicalDisplayIdentity } from "@/lib/orbit/canonical-helpers";
import { useCall } from "@/components/call/CallProvider";
import QRContactCard from "./QRContactCard";
import { motion, AnimatePresence } from "framer-motion";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_favorite: boolean;
  contact_user_id: string | null;
  is_blocked?: boolean;
}

type Tab = "all" | "favorites";

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--accent))",
  "hsl(210 70% 50%)", "hsl(280 60% 55%)",
  "hsl(340 65% 50%)", "hsl(160 60% 40%)",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

function ActionButton({ icon: Icon, label, onPress }: { icon: React.ElementType; label: string; onPress: () => void }) {
  return (
    <button
      type="button"
      className="h-11 w-11 rounded-full flex items-center justify-center bg-primary/10 active:bg-primary/25 active:scale-90 transition-transform"
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onPress(); }}
      onPointerDown={(e) => { e.stopPropagation(); }}
      onTouchStart={(e) => { e.stopPropagation(); }}
      aria-label={label}
    >
      <Icon className="h-[18px] w-[18px] text-primary" />
    </button>
  );
}

const ContactRow = memo(function ContactRow({
  contact, onMessage, onCall, onVideoCall, onToggleFavorite, onOpenDetail,
}: {
  contact: Contact;
  onMessage: (c: Contact) => void;
  onCall: (c: Contact) => void;
  onVideoCall: (c: Contact) => void;
  onToggleFavorite: (c: Contact) => void;
  onOpenDetail: (c: Contact) => void;
}) {
  const { t } = useI18n();
  const initials = (contact.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer active:opacity-70 transition-opacity"
        style={{ touchAction: "manipulation" }}
        onClick={() => onOpenDetail(contact)}
        role="button"
        tabIndex={0}
      >
        <div className="relative shrink-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ring-1 ring-border/10"
            style={{ background: contact.avatar_url ? undefined : avatarColor(contact.name || "?") }}
          >
            {contact.avatar_url ? (
              <img src={contact.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <span className="text-xs font-bold text-white select-none">{initials}</span>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>{contact.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); haptic("light"); onToggleFavorite(contact); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="shrink-0 active:scale-90 transition-transform"
              aria-label={contact.is_favorite ? t("orbit.contacts.remove_favorite") : t("orbit.contacts.add_favorite")}
            >
              <Star className={`h-3.5 w-3.5 ${contact.is_favorite ? "fill-amber-400 text-amber-400" : "hover:text-amber-400/60"}`} style={contact.is_favorite ? undefined : { color: "hsl(var(--muted-foreground) / 0.3)" }} />
            </button>
          </div>
          {contact.contact_user_id && (
            <p className="text-[11px] truncate mt-0.5 font-mono" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
              EL-{contact.contact_user_id.replace(/-/g, "").substring(0, 8).toUpperCase()}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <ActionButton icon={MessageCircle} label={t("contact.action.message")} onPress={() => onMessage(contact)} />
        <ActionButton icon={Phone} label={t("contact.action.audio")} onPress={() => onCall(contact)} />
        <ActionButton icon={Video} label={t("contact.action.video")} onPress={() => onVideoCall(contact)} />
      </div>
    </div>
  );
});

function ContactSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 h-16">
      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-28 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
      <div className="flex gap-1">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    </div>
  );
}

function HeaderAction({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      className="flex flex-col items-center justify-center gap-1 w-16 py-2 rounded-xl transition-colors active:opacity-70"
      onClick={onClick}
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
        <Icon className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
      </div>
      <span className="text-[10px] font-medium" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>{label}</span>
    </button>
  );
}

export default function CommContactsSection() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { startCall, isInCall, isStartingCall } = useCall();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [showQR, setShowQR] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newElId, setNewElId] = useState("");
  const [saving, setSaving] = useState(false);

  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadContacts = useCallback(async () => {
    if (!user?.id) { setContacts([]); setLoading(false); return; }
    setLoading(true);
    try {
      const rows = await listOrbitContacts(user.id);
      const mapped = (rows || []).map((r: any) => {
        const identity = resolveCanonicalDisplayIdentity(r);
        return {
          id: r.id,
          name: identity.displayName,
          email: r.email,
          phone: r.phone,
          avatar_url: identity.avatarUrl,
          is_favorite: !!r.is_favorite,
          contact_user_id: r.peer_user_id,
          is_blocked: !!r.is_blocked,
        };
      });

      const unlinked = mapped.filter(c => !c.contact_user_id && (c.email || c.phone));
      if (unlinked.length > 0) {
        await Promise.all(unlinked.map(async (c) => {
          try {
            let found = c.email ? await resolveUserByEmail(c.email) : null;
            if (!found && c.phone) {
              found = await resolveUserByPhone(c.phone);
            }
            if (found) {
              await linkContactToUser(c.id, found.userId, found.orbitId, found.avatarUrl);
              c.contact_user_id = found.userId;
              if (found.avatarUrl) c.avatar_url = found.avatarUrl;
            }
          } catch { /* silent */ }
        }));
      }

      const linkedIds = mapped.filter(c => c.contact_user_id).map(c => c.contact_user_id!);
      if (linkedIds.length > 0) {
        const { batchLookupProfiles } = await import("@/lib/orbit/orbit-data-gateway");
        const orbitProfileMap = await batchLookupProfiles(linkedIds);
        const profiles = Array.from(orbitProfileMap.values());
        if (profiles.length) {
          const profileById = new Map(profiles.map((p: any) => [p.id, p]));
          for (const c of mapped) {
            if (!c.contact_user_id) continue;
            const p = profileById.get(c.contact_user_id);
            if (p?.avatar_url && !c.avatar_url) c.avatar_url = p.avatar_url;
          }
        }
      }

      setContacts(mapped);
    } catch {
      toast.error(t("orbit.contacts.load_error"));
    } finally {
      setLoading(false);
    }
  }, [user?.id, t]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const filtered = useMemo(() => {
    let list = contacts;
    if (tab === "favorites") list = list.filter(c => c.is_favorite);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q),
      );
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts, tab, search]);

  const grouped = useMemo(() => {
    const map: Record<string, Contact[]> = {};
    for (const c of filtered) {
      const letter = c.name[0]?.toUpperCase() || "#";
      (map[letter] ||= []).push(c);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const tryResolveAndLink = useCallback(async (contact: Contact): Promise<string | null> => {
    if (contact.contact_user_id) return contact.contact_user_id;
    try {
      let found = contact.email ? await resolveUserByEmail(contact.email) : null;
      if (!found && contact.phone) {
        found = await resolveUserByPhone(contact.phone);
      }
      if (found) {
        await linkContactToUser(contact.id, found.userId, found.orbitId, found.avatarUrl);
        contact.contact_user_id = found.userId;
        setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, contact_user_id: found.userId, avatar_url: found.avatarUrl || c.avatar_url } : c));
        return found.userId;
      }
    } catch {}
    return null;
  }, []);

  const messageLockRef = useRef(false);
  const handleMessage = useCallback(async (contact: Contact) => {
    if (messageLockRef.current) return;
    messageLockRef.current = true;
    haptic("light");
    try {
      if (!user) return;

      const targetUserId = await tryResolveAndLink(contact);

      if (!targetUserId) {
        toast.info(t("orbit.contacts.not_on_platform"));
        return;
      }

      let lastErr: any = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await getOrCreateDirectThread({
            currentUserId: user.id,
            targetUserId,
            targetName: contact.name,
          });
          const tid = result?.conversationId;
          if (tid) {
            navigate(`/orbit?thread=${tid}`);
            return;
          }
        } catch (err) {
          lastErr = err;
          console.warn(`[CommContacts] thread creation attempt ${attempt + 1} failed:`, err);
          if (attempt === 0) await new Promise(r => setTimeout(r, 500));
        }
      }
      console.error("[CommContacts] thread creation exhausted:", lastErr);
      toast.error(t("orbit.contacts.message_error"));
    } finally {
      setTimeout(() => { messageLockRef.current = false; }, 500);
    }
  }, [user, navigate, t, tryResolveAndLink]);

  const callLockRef = useRef(false);
  const handleCall = useCallback(async (contact: Contact, isVideo: boolean) => {
    if (callLockRef.current) return;
    callLockRef.current = true;
    haptic("medium");
    try {
      if (isInCall || isStartingCall) {
        toast.info(t("orbit.contacts.already_in_call"));
        return;
      }

      const targetUserId = await tryResolveAndLink(contact);

      if (!targetUserId) {
        toast.info(t("orbit.contacts.not_on_platform"));
        return;
      }

      try {
        const success = await startCall({
          targetId: targetUserId,
          peerName: contact.name,
          entityType: "contact",
          entityId: contact.id,
          isVideo,
        });
        if (success) return;
        toast.error(t("orbit.contacts.call_failed"));
      } catch (err) {
        console.warn("[CommContacts] in-app call failed:", err);
        toast.error(t("orbit.contacts.call_failed"));
      }
    } finally {
      setTimeout(() => { callLockRef.current = false; }, 500);
    }
  }, [startCall, isInCall, isStartingCall, t, tryResolveAndLink]);

  const handleToggleFavorite = useCallback(async (contact: Contact) => {
    const next = !contact.is_favorite;
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, is_favorite: next } : c));
    if (detailContact?.id === contact.id) {
      setDetailContact(prev => prev ? { ...prev, is_favorite: next } : prev);
    }
    haptic("light");
    try {
      await toggleFavoriteContact(contact.id, next);
      toast.success(next ? (t("orbit.contacts.favorited")) : (t("orbit.contacts.unfavorited")));
    } catch {
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, is_favorite: !next } : c));
      toast.error(t("orbit.contacts.favorite_error"));
    }
  }, [t, detailContact?.id]);

  const handleDelete = useCallback(async (contact: Contact) => {
    setDeleting(true);
    try {
      await deleteOrbitContact(contact.id);
      haptic("success");
      toast.success(t("orbit.contacts.deleted"));
      setContacts(prev => prev.filter(c => c.id !== contact.id));
      setDetailContact(null);
    } catch {
      toast.error(t("orbit.contacts.delete_error"));
    } finally {
      setDeleting(false);
    }
  }, [t]);

  const handleToggleBlock = useCallback(async (contact: Contact) => {
    const next = !contact.is_blocked;
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, is_blocked: next } : c));
    if (detailContact?.id === contact.id) {
      setDetailContact(prev => prev ? { ...prev, is_blocked: next } : prev);
    }
    haptic("medium");
    try {
      await toggleBlockedContact(contact.id, next);
      toast.success(next ? (t("orbit.contacts.blocked")) : (t("orbit.contacts.unblocked")));
    } catch {
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, is_blocked: !next } : c));
      toast.error(t("orbit.contacts.block_error"));
    }
  }, [t, detailContact?.id]);

  const handleOpenEdit = useCallback((contact: Contact) => {
    setEditName(contact.name);
    setEditEmail(contact.email || "");
    setEditPhone(contact.phone || "");
    setShowEdit(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!detailContact || !editName.trim()) return;
    setEditSaving(true);
    try {
      await updateOrbitContact(detailContact.id, {
        displayName: editName.trim(),
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
      });
      haptic("success");
      toast.success(t("orbit.contacts.updated"));
      setShowEdit(false);
      setDetailContact(prev => prev ? {
        ...prev,
        name: editName.trim(),
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
      } : prev);
      loadContacts();
    } catch {
      toast.error(t("orbit.contacts.update_error"));
    } finally {
      setEditSaving(false);
    }
  }, [detailContact, editName, editEmail, editPhone, t, loadContacts]);

  const handleAdd = async () => {
    if (!user?.id || !newName.trim()) return;
    const trimName = newName.trim().toLowerCase();
    if (contacts.some(c =>
      c.name.toLowerCase() === trimName ||
      (newEmail && c.email?.toLowerCase() === newEmail.trim().toLowerCase()),
    )) {
      toast.error(t("orbit.contacts.duplicate"));
      return;
    }
    setSaving(true);
    try {
      let resolvedPeerUserId: string | null = null;
      let resolvedPeerOrbitId: string | null = null;
      let resolvedAvatar: string | null = null;

      const elIdTrimmed = newElId.trim().toUpperCase().replace(/^EL-?/, "");
      if (elIdTrimmed.length >= 6) {
        const orbitIdGuess = `orbit_${elIdTrimmed.toLowerCase()}`;
        const { resolveUserByOrbitId } = await import("@/lib/orbit/orbit-data-gateway");
        const resolved = await resolveUserByOrbitId(orbitIdGuess);
        if (resolved && resolved.id !== user.id) {
          resolvedPeerUserId = resolved.id;
          resolvedPeerOrbitId = resolved.orbit_id;
          resolvedAvatar = resolved.avatar_url;
        }
      }

      const result = await upsertOrbitContact({
        ownerUserId: user.id,
        peerUserId: resolvedPeerUserId,
        peerOrbitId: resolvedPeerOrbitId,
        displayName: newName.trim(),
        email: newEmail.trim() || null,
        phone: newPhone.trim() || null,
        avatarUrl: resolvedAvatar,
        source: "manual",
      });
      if (result?.resolvedUserId || resolvedPeerUserId) {
        toast.success(`${newName.trim()} — ${t("orbit.contacts.linked_success")}`);
      } else {
        toast.success(t("orbit.contacts.added"));
      }
      haptic("success");
      setShowAdd(false);
      setNewName(""); setNewEmail(""); setNewPhone(""); setNewElId("");
      loadContacts();
    } catch {
      toast.error(t("orbit.contacts.add_error"));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDetail = useCallback((contact: Contact) => {
    setDetailContact(contact);
  }, []);

  const detailInitials = detailContact
    ? (detailContact.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "";

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--background))" }}>

      <div className="flex items-center justify-center gap-4 px-4 py-3 shrink-0">
        <HeaderAction icon={QrCode} label={t("orbit.contacts.my_qr")} onClick={() => setShowQR(true)} />
        <HeaderAction icon={ScanLine} label={t("orbit.contacts.scan_qr")} onClick={() => setShowScan(true)} />
        <HeaderAction icon={Share2} label={t("wallet.shareNearby")} onClick={async () => {
          if (!user?.id) return;
          const profileUrl = `${window.location.origin}/orbit/add?userId=${user.id}`;
          const displayName = user.user_metadata?.full_name || user.user_metadata?.display_name || user.email?.split("@")[0] || t("orbit.contact");
          if (navigator.share) {
            try {
              await navigator.share({ title: `${displayName} — Easy-Locs`, text: t("wallet.nearbyDesc"), url: profileUrl });
            } catch { /* user cancelled */ }
          } else {
            try {
              await navigator.clipboard.writeText(profileUrl);
              toast.success(t("orbit.qr.copied"));
            } catch {
              toast.error(t("orbit.contacts.copy_failed"));
            }
          }
        }} />
        <HeaderAction icon={UserPlus} label={t("orbit.contacts.add")} onClick={() => setShowAdd(true)} />
      </div>

      <div className="px-4 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("orbit.search_contacts")}
            className="pl-9 pr-8 h-10 text-sm rounded-xl border-0"
            style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
          />
          {search && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full flex items-center justify-center"
              style={{ background: "hsl(var(--card))" }}
              onClick={() => setSearch("")}
              aria-label={t("common.clear")}
            >
              <X className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }} />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1.5 px-4 pb-2 shrink-0">
        {([
          { id: "all" as Tab, label: t("orbit.contacts.all") },
          { id: "favorites" as Tab, label: t("orbit.contacts.favorites") },
        ]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: tab === id ? "hsl(var(--primary) / 0.12)" : "hsl(var(--card) / 0.5)",
              color: tab === id ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.6)",
              border: `1px solid ${tab === id ? "hsl(var(--primary) / 0.2)" : "transparent"}`,
            }}
          >
            {label}
            {id === "all" && contacts.length > 0 && (
              <span className="ml-1.5 opacity-60">{contacts.length}</span>
            )}
            {id === "favorites" && (
              <span className="ml-1.5 opacity-60">{contacts.filter(c => c.is_favorite).length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <ContactSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center px-8"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "hsl(var(--card))" }}>
              <User className="h-7 w-7" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
              {search ? t("orbit.contacts.no_results") : tab === "favorites" ? (t("orbit.contacts.no_favorites")) : t("orbit.contacts.empty")}
            </p>
            <p className="text-xs max-w-[220px]" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}>
              {search ? t("orbit.contacts.try_different") : tab === "favorites" ? (t("orbit.contacts.favorites_hint")) : t("orbit.contacts.empty_hint")}
            </p>
            {!search && tab === "all" && (
              <div className="flex gap-2 mt-5">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setShowScan(true)}>
                  <ScanLine className="h-3.5 w-3.5" />
                  {t("orbit.contacts.scan_qr")}
                </Button>
                <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowAdd(true)}>
                  <UserPlus className="h-3.5 w-3.5" />
                  {t("orbit.contacts.add")}
                </Button>
              </div>
            )}
          </motion.div>
        ) : (
          grouped.map(([letter, list]) => (
            <div key={letter}>
              <div className="px-4 py-1 sticky top-0 backdrop-blur-sm z-[1]" style={{ background: "hsl(var(--background) / 0.95)" }}>
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "hsl(var(--primary) / 0.7)" }}>{letter}</span>
              </div>
              {list.map(c => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  onMessage={handleMessage}
                  onCall={c => handleCall(c, false)}
                  onVideoCall={c => handleCall(c, true)}
                  onToggleFavorite={handleToggleFavorite}
                  onOpenDetail={handleOpenDetail}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* ── Add Contact Dialog ── */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm rounded-2xl" style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base" style={{ color: "hsl(var(--foreground))" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
                <UserPlus className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
              </div>
              {t("orbit.contacts.add_title")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <Label className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
                {t("orbit.contacts.name")} *
              </Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={t("orbit.contacts.name_placeholder")}
                className="mt-1.5 h-11 rounded-xl border-0"
                style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                autoFocus
                onKeyDown={e => { if (e.key === "Enter" && newName.trim()) handleAdd(); }}
              />
            </div>
            <div>
              <Label className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
                {t("orbit.contacts.el_id")}
              </Label>
              <Input
                value={newElId}
                onChange={e => setNewElId(e.target.value)}
                placeholder={t("orbit.contacts.el_id_placeholder")}
                className="mt-1.5 h-11 rounded-xl font-mono uppercase border-0"
                style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                onKeyDown={e => { if (e.key === "Enter" && newName.trim()) handleAdd(); }}
              />
              <p className="text-[10px] mt-1 px-1" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}>
                {t("orbit.contacts.el_id_hint")}
              </p>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {t("orbit.contacts.email")}
                </Label>
                <Input
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="email@example.com"
                  type="email"
                  className="mt-1.5 h-11 rounded-xl border-0"
                  style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                  onKeyDown={e => { if (e.key === "Enter" && newName.trim()) handleAdd(); }}
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {t("orbit.contacts.phone")}
                </Label>
                <Input
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="+971 50 000 0000"
                  type="tel"
                  className="mt-1.5 h-11 rounded-xl border-0"
                  style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                  onKeyDown={e => { if (e.key === "Enter" && newName.trim()) handleAdd(); }}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => { setShowAdd(false); setNewName(""); setNewEmail(""); setNewPhone(""); setNewElId(""); }}
                className="flex-1 h-11 rounded-xl"
                style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))", borderColor: "hsl(var(--border) / 0.2)" }}
              >
                {t("orbit.cancel")}
              </Button>
              <Button
                onClick={handleAdd}
                disabled={saving || !newName.trim()}
                className="flex-1 gap-2 h-11 rounded-xl"
                style={{ background: "hsl(var(--primary))", color: "hsl(var(--background))" }}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("orbit.add_contact")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── QR Dialogs ── */}
      <QRContactCard
        open={showQR}
        onOpenChange={setShowQR}
        initialMode="show"
        onContactAdded={() => { setShowQR(false); loadContacts(); }}
      />
      <QRContactCard
        open={showScan}
        onOpenChange={setShowScan}
        initialMode="scan"
        onContactAdded={() => { setShowScan(false); loadContacts(); }}
      />

      {/* ── Contact Detail Sheet ── */}
      <Sheet open={!!detailContact} onOpenChange={(open) => { if (!open) setDetailContact(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0 max-h-[80dvh]" style={{ background: "hsl(var(--background))" }}>
          {detailContact && (
            <div className="flex flex-col">
              <SheetHeader className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                    style={{ background: detailContact.avatar_url ? undefined : avatarColor(detailContact.name || "?"), boxShadow: "0 0 0 2px hsl(var(--border) / 0.1)" }}
                  >
                    {detailContact.avatar_url ? (
                      <img src={detailContact.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-white select-none">{detailInitials}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-lg font-bold truncate" style={{ color: "hsl(var(--foreground))" }}>{detailContact.name}</SheetTitle>
                    {detailContact.contact_user_id && (
                      <p className="text-xs truncate mt-0.5 font-mono" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
                        EL-{detailContact.contact_user_id.replace(/-/g, "").substring(0, 8).toUpperCase()}
                      </p>
                    )}
                  </div>
                </div>
              </SheetHeader>

              <div className="flex items-center justify-center gap-4 px-5 pb-4" style={{ borderBottom: "1px solid hsl(var(--border) / 0.08)" }}>
                <button
                  type="button"
                  onClick={() => { const c = detailContact; setDetailContact(null); if (c) setTimeout(() => handleMessage(c), 200); }}
                  className="flex flex-col items-center gap-1 w-16 active:scale-90 transition-transform"
                  style={{ touchAction: "manipulation" }}
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
                    <MessageCircle className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
                  </div>
                  <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>{t("contact.action.message")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { const c = detailContact; setDetailContact(null); if (c) setTimeout(() => handleCall(c, false), 200); }}
                  className="flex flex-col items-center gap-1 w-16 active:scale-90 transition-transform"
                  style={{ touchAction: "manipulation" }}
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
                    <Phone className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
                  </div>
                  <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>{t("contact.action.audio")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { const c = detailContact; setDetailContact(null); if (c) setTimeout(() => handleCall(c, true), 200); }}
                  className="flex flex-col items-center gap-1 w-16 active:scale-90 transition-transform"
                  style={{ touchAction: "manipulation" }}
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
                    <Video className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
                  </div>
                  <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>{t("contact.action.video")}</span>
                </button>
                {detailContact.contact_user_id && (
                  <button
                    type="button"
                    onClick={() => { const uid = detailContact.contact_user_id; setDetailContact(null); navigate(`/wallet/transfer?to=${uid}`); }}
                    className="flex flex-col items-center gap-1 w-16 active:scale-90 transition-transform"
                    style={{ touchAction: "manipulation" }}
                  >
                    <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--hud-success) / 0.1)" }}>
                      <Wallet className="h-5 w-5" style={{ color: "hsl(var(--hud-success))" }} />
                    </div>
                    <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>{t("orbit.send")}</span>
                  </button>
                )}
              </div>

              <div className="px-3 py-2 space-y-0.5">
                {(detailContact.email || detailContact.contact_user_id) && (
                  <button
                    type="button"
                    onClick={() => { const c = detailContact; setDetailContact(null); if (c) setTimeout(() => handleMessage(c), 200); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left hover:bg-[hsl(var(--card)/0.4)]"
                    style={{ touchAction: "manipulation" }}
                  >
                    <MessageCircle className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.contacts.send_message")}</p>
                      <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{t("orbit.contacts.in_app")}</p>
                    </div>
                  </button>
                )}
                {detailContact.contact_user_id && (
                  <button
                    type="button"
                    onClick={() => { const c = detailContact; setDetailContact(null); if (c) setTimeout(() => handleCall(c, false), 200); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left hover:bg-[hsl(var(--card)/0.4)]"
                    style={{ touchAction: "manipulation" }}
                  >
                    <PhoneCall className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.contacts.call_inapp")}</p>
                      <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{t("orbit.contacts.free_call")}</p>
                    </div>
                  </button>
                )}

                <div className="h-px my-1" style={{ background: "hsl(var(--border) / 0.08)" }} />

                <button
                  onClick={() => handleToggleFavorite(detailContact)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left hover:bg-[hsl(var(--card)/0.4)]"
                >
                  <Star className={`h-4 w-4 shrink-0 ${detailContact.is_favorite ? "fill-amber-400 text-amber-400" : ""}`} style={detailContact.is_favorite ? undefined : { color: "hsl(var(--muted-foreground) / 0.3)" }} />
                  <span className="text-sm" style={{ color: "hsl(var(--foreground))" }}>
                    {detailContact.is_favorite ? (t("orbit.contacts.remove_favorite")) : (t("orbit.contacts.add_favorite"))}
                  </span>
                </button>

                <button
                  onClick={() => handleOpenEdit(detailContact)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left hover:bg-[hsl(var(--card)/0.4)]"
                >
                  <Edit3 className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }} />
                  <span className="text-sm" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.contacts.edit")}</span>
                </button>

                <button
                  onClick={() => handleToggleBlock(detailContact)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left hover:bg-[hsl(var(--card)/0.4)]"
                >
                  <Ban className="h-4 w-4 shrink-0" style={{ color: detailContact.is_blocked ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground) / 0.5)" }} />
                  <span className="text-sm" style={{ color: detailContact.is_blocked ? "hsl(var(--destructive))" : "hsl(var(--foreground))" }}>
                    {detailContact.is_blocked ? (t("orbit.contacts.unblock")) : (t("orbit.contacts.block"))}
                  </span>
                </button>

                <button
                  onClick={() => handleDelete(detailContact)}
                  disabled={deleting}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/5 transition-colors text-left"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" style={{ color: "hsl(var(--destructive))" }} />
                  ) : (
                    <Trash2 className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--destructive))" }} />
                  )}
                  <span className="text-sm" style={{ color: "hsl(var(--destructive))" }}>{t("orbit.contacts.delete")}</span>
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Edit Contact Dialog ── */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-sm rounded-2xl" style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base" style={{ color: "hsl(var(--foreground))" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
                <Edit3 className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
              </div>
              {t("orbit.contacts.edit_title")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <Label className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
                {t("orbit.contacts.name")} *
              </Label>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder={t("orbit.contacts.name_placeholder")}
                className="mt-1.5 h-11 rounded-xl border-0"
                style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                autoFocus
                onKeyDown={e => { if (e.key === "Enter" && editName.trim()) handleSaveEdit(); }}
              />
            </div>
            <div>
              <Label className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
                {t("orbit.contacts.email")}
              </Label>
              <Input
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                placeholder="email@example.com"
                type="email"
                className="mt-1.5 h-11 rounded-xl border-0"
                style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                onKeyDown={e => { if (e.key === "Enter" && editName.trim()) handleSaveEdit(); }}
              />
            </div>
            <div>
              <Label className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
                {t("orbit.contacts.phone")}
              </Label>
              <Input
                value={editPhone}
                onChange={e => setEditPhone(e.target.value)}
                placeholder="+971 50 000 0000"
                type="tel"
                className="mt-1.5 h-11 rounded-xl border-0"
                style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                onKeyDown={e => { if (e.key === "Enter" && editName.trim()) handleSaveEdit(); }}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setShowEdit(false)}
                className="flex-1 h-11 rounded-xl"
                style={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))", borderColor: "hsl(var(--border) / 0.2)" }}
              >
                {t("orbit.cancel")}
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={editSaving || !editName.trim()}
                className="flex-1 gap-2 h-11 rounded-xl"
                style={{ background: "hsl(var(--primary))", color: "hsl(var(--background))" }}
              >
                {editSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("orbit.contacts.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
