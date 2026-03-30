/**
 * CommContactsSection — Premium Orbit contacts surface.
 * 3 actions: My QR · Scan · Add. Row tap=chat. Icons=call/video.
 */
import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { Search, UserPlus, Phone, Video, Star, User, QrCode, ScanLine, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { getOrCreateDirectThread } from "@/lib/direct-thread";
import { listOrbitContacts, upsertOrbitContact } from "@/lib/orbit/orbit-contacts-service";
import { useCall } from "@/components/call/CallProvider";
import QRContactCard from "./QRContactCard";
import { motion } from "framer-motion";

// ── Types ──
interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_favorite: boolean;
  contact_user_id: string | null;
}

type Tab = "all" | "favorites";

// ── Avatar color ──
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

// ── Contact Row ──
const ContactRow = memo(function ContactRow({
  contact, onMessage, onCall, onVideoCall,
}: {
  contact: Contact;
  onMessage: (c: Contact) => void;
  onCall: (c: Contact) => void;
  onVideoCall: (c: Contact) => void;
}) {
  const initials = (contact.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const canAct = !!contact.contact_user_id;

  return (
    <div
      className="flex items-center gap-3 px-4 h-16 active:bg-muted/40 transition-colors cursor-pointer"
      onClick={() => onMessage(contact)}
      role="button"
      tabIndex={0}
    >
      {/* Avatar */}
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

      {/* Identity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground truncate">{contact.name}</span>
          {contact.is_favorite && (
            <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
          )}
        </div>
        {(contact.email || contact.phone) && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            {contact.email || contact.phone}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
        <button
          className="h-9 w-9 rounded-full flex items-center justify-center transition-colors hover:bg-primary/10 active:bg-primary/20 disabled:opacity-30"
          disabled={!canAct}
          onClick={() => { haptic("light"); onCall(contact); }}
          aria-label="Audio call"
        >
          <Phone className="h-[18px] w-[18px] text-primary" />
        </button>
        <button
          className="h-9 w-9 rounded-full flex items-center justify-center transition-colors hover:bg-primary/10 active:bg-primary/20 disabled:opacity-30"
          disabled={!canAct}
          onClick={() => { haptic("light"); onVideoCall(contact); }}
          aria-label="Video call"
        >
          <Video className="h-[18px] w-[18px] text-primary" />
        </button>
      </div>
    </div>
  );
});

// ── Skeleton rows ──
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

// ── Header Action Button ──
function HeaderAction({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      className="flex flex-col items-center justify-center gap-1 w-16 py-2 rounded-xl transition-colors active:bg-muted/40"
      onClick={onClick}
    >
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
    </button>
  );
}

// ── Main ──
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
  const [saving, setSaving] = useState(false);

  const loadContacts = useCallback(async () => {
    if (!user?.id) { setContacts([]); setLoading(false); return; }
    setLoading(true);
    try {
      const rows = await listOrbitContacts(user.id);
      setContacts((rows || []).map((r: any) => {
        const identity = resolveCanonicalDisplayIdentity(r);
        return {
          id: r.id,
          name: identity.displayName,
          email: r.email,
          phone: r.phone,
          avatar_url: identity.avatarUrl,
          is_favorite: !!r.is_favorite,
          contact_user_id: r.peer_user_id,
        };
      }));
    } catch {
      toast.error(t("orbit.contacts.load_error"));
    } finally {
      setLoading(false);
    }
  }, [user?.id, t]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  // ── Filter + sort ──
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

  // ── Alpha grouping ──
  const grouped = useMemo(() => {
    const map: Record<string, Contact[]> = {};
    for (const c of filtered) {
      const letter = c.name[0]?.toUpperCase() || "#";
      (map[letter] ||= []).push(c);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // ── Actions ──
  const handleMessage = useCallback(async (contact: Contact) => {
    if (!user || !contact.contact_user_id) {
      toast.info(t("orbit.contacts.not_linked"));
      return;
    }
    try {
      const result = await getOrCreateDirectThread({
        currentUserId: user.id,
        targetUserId: contact.contact_user_id,
        targetName: contact.name,
      });
      const tid = result?.conversationId;
      if (tid) navigate(`/orbit?conversation=${tid}`);
    } catch {
      toast.error(t("orbit.contacts.open_error"));
    }
  }, [user, navigate, t]);

  const handleCall = useCallback(async (contact: Contact, isVideo: boolean) => {
    if (!contact.contact_user_id) {
      toast.info(t("orbit.contacts.not_linked"));
      return;
    }
    if (isInCall || isStartingCall) {
      toast.info(t("orbit.contacts.already_in_call"));
      return;
    }
    haptic("medium");
    try {
      await startCall({
        targetId: contact.contact_user_id,
        peerName: contact.name,
        entityType: "contact",
        entityId: contact.id,
        isVideo,
      });
    } catch {
      toast.error(t("orbit.contacts.call_error"));
    }
  }, [startCall, isInCall, isStartingCall, t]);

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
      await upsertOrbitContact({
        ownerUserId: user.id,
        displayName: newName.trim(),
        email: newEmail.trim() || null,
        phone: newPhone.trim() || null,
        source: "manual",
      });
      toast.success(t("orbit.contacts.added"));
      haptic("success");
      setShowAdd(false);
      setNewName(""); setNewEmail(""); setNewPhone("");
      loadContacts();
    } catch {
      toast.error(t("orbit.contacts.add_error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-1 shrink-0">
        <h2 className="text-lg font-bold text-foreground tracking-tight">
          {t("orbit.contacts.title")}
        </h2>
      </div>

      {/* ── 3 Actions: My QR · Scan · Add ── */}
      <div className="flex items-center justify-center gap-6 px-4 py-3 shrink-0">
        <HeaderAction icon={QrCode} label={t("orbit.contacts.my_qr")} onClick={() => setShowQR(true)} />
        <HeaderAction icon={ScanLine} label={t("orbit.contacts.scan_qr")} onClick={() => setShowScan(true)} />
        <HeaderAction icon={UserPlus} label={t("orbit.contacts.add")} onClick={() => setShowAdd(true)} />
      </div>

      {/* ── Search ── */}
      <div className="px-4 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("orbit.search_contacts")}
            className="pl-9 pr-8 h-10 text-sm rounded-xl bg-muted/30 border-border/20 placeholder:text-muted-foreground/50"
          />
          {search && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted flex items-center justify-center"
              onClick={() => setSearch("")}
              aria-label="Clear"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1.5 px-4 pb-2 shrink-0">
        {([
          { id: "all" as Tab, label: t("orbit.contacts.all") },
          { id: "favorites" as Tab, label: t("orbit.contacts.favorites") },
        ]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={[
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
              tab === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/40 active:bg-muted/60",
            ].join(" ")}
          >
            {label}
            {id === "all" && contacts.length > 0 && (
              <span className="ml-1.5 opacity-60">{contacts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── List ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <ContactSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center px-8"
          >
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
              <User className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              {search ? t("orbit.contacts.no_results") : t("orbit.contacts.empty")}
            </p>
            <p className="text-xs text-muted-foreground/60 max-w-[220px]">
              {search ? t("orbit.contacts.try_different") : t("orbit.contacts.empty_hint")}
            </p>
            {!search && (
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
              <div className="px-4 py-1 sticky top-0 bg-background/95 backdrop-blur-sm z-[1]">
                <span className="text-[11px] font-bold text-primary/70 uppercase tracking-wider">{letter}</span>
              </div>
              {list.map(c => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  onMessage={handleMessage}
                  onCall={c => handleCall(c, false)}
                  onVideoCall={c => handleCall(c, true)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* ── Add Contact Dialog ── */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground text-base">
              {t("orbit.contacts.add_title")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">
                {t("orbit.contacts.name")} *
              </Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={t("orbit.contacts.name_placeholder")}
                className="mt-1.5 bg-muted/20"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">
                {t("orbit.contacts.email")}
              </Label>
              <Input
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="email@example.com"
                type="email"
                className="mt-1.5 bg-muted/20"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">
                {t("orbit.contacts.phone")}
              </Label>
              <Input
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                placeholder="+971 50 000 0000"
                type="tel"
                className="mt-1.5 bg-muted/20"
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={saving || !newName.trim()}
              className="w-full gap-2 h-11 rounded-xl"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("orbit.add_contact")}
            </Button>
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
    </div>
  );
}
