/**
 * CommContactsSection — Clean Orbit contacts surface.
 * Actions: My QR · Scan · Add · Row tap=chat · Phone=call · Video=video call.
 * No mixed logic. No complicated branching. Simple & premium.
 */
import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { Search, UserPlus, Phone, Video, Star, Users, User, QrCode, ScanLine, Loader2 } from "lucide-react";
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
const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(210 70% 50%)", "hsl(280 60% 55%)", "hsl(340 65% 50%)", "hsl(160 60% 40%)"];
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
    <div className="flex items-center gap-3 px-4 h-[60px] active:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => onMessage(contact)}>
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
        style={{ background: contact.avatar_url ? undefined : avatarColor(contact.name || "?") }}>
        {contact.avatar_url
          ? <img src={contact.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          : <span className="text-xs font-bold text-white">{initials}</span>}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground line-clamp-1">{contact.name}</span>
          {contact.is_favorite && <Star className="h-3 w-3 fill-amber-400 shrink-0" style={{ color: "hsl(45 93% 58%)" }} />}
        </div>
        <p className="text-[11px] text-muted-foreground line-clamp-1">{contact.email || contact.phone || ""}</p>
      </div>

      {/* Call / Video */}
      <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" disabled={!canAct}
          onClick={() => { haptic("light"); onCall(contact); }} aria-label="Call">
          <Phone className="h-4 w-4 text-primary" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" disabled={!canAct}
          onClick={() => { haptic("light"); onVideoCall(contact); }} aria-label="Video call">
          <Video className="h-4 w-4 text-primary" />
        </Button>
      </div>
    </div>
  );
});

// ── Skeleton ──
function ContactSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 h-[60px]">
      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-3 w-20" /></div>
      <Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-9 w-9 rounded-full" />
    </div>
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
      setContacts((rows || []).map((r: any) => ({
        id: r.id,
        name: r.display_name || r.email || r.phone || t("orbit.contacts.unnamed") || "Contact",
        email: r.email,
        phone: r.phone,
        avatar_url: r.avatar_url,
        is_favorite: !!r.is_favorite,
        contact_user_id: r.peer_user_id,
      })));
    } catch { toast.error(t("orbit.contacts.load_error") || "Failed to load contacts"); }
    finally { setLoading(false); }
  }, [user?.id, t]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  // ── Filter + sort ──
  const filtered = useMemo(() => {
    let list = contacts;
    if (tab === "favorites") list = list.filter(c => c.is_favorite);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q) || (c.phone || "").includes(q));
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
      toast.info(t("orbit.contacts.not_linked") || "This contact is not yet on the platform");
      return;
    }
    try {
      const result = await getOrCreateDirectThread({ currentUserId: user.id, targetUserId: contact.contact_user_id, targetName: contact.name });
      const tid = result?.v2ConversationId || result?.threadId || result?.contextId;
      if (tid) navigate(`/orbit?thread=${tid}`);
    } catch { toast.error(t("orbit.contacts.open_error") || "Failed to open conversation"); }
  }, [user, navigate, t]);

  const handleCall = useCallback(async (contact: Contact, isVideo: boolean) => {
    if (!contact.contact_user_id) { toast.info(t("orbit.contacts.not_linked") || "This contact is not yet on the platform"); return; }
    if (isInCall || isStartingCall) { toast.info(t("orbit.contacts.already_in_call") || "Already in a call"); return; }
    haptic("medium");
    try {
      await startCall({ targetId: contact.contact_user_id, peerName: contact.name, contextType: "contact", contextId: contact.id, isVideo });
    } catch { toast.error(t("orbit.contacts.call_error") || "Failed to start call"); }
  }, [startCall, isInCall, isStartingCall, t]);

  const handleAdd = async () => {
    if (!user?.id || !newName.trim()) return;
    // Duplicate check
    const trimName = newName.trim().toLowerCase();
    if (contacts.some(c => c.name.toLowerCase() === trimName || (newEmail && c.email?.toLowerCase() === newEmail.trim().toLowerCase()))) {
      toast.error(t("orbit.contacts.duplicate") || "Contact already exists");
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
      toast.success(t("orbit.contacts.added") || "Contact added");
      haptic("success");
      setShowAdd(false);
      setNewName(""); setNewEmail(""); setNewPhone("");
      loadContacts();
    } catch { toast.error(t("orbit.contacts.add_error") || "Failed to add contact"); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">{t("orbit.contacts.title") || "Contacts"}</h2>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onClick={() => setShowQR(true)} aria-label={t("orbit.contacts.my_qr") || "My QR"}>
              <QrCode className="h-4 w-4 text-primary" />
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onClick={() => setShowAdd(true)} aria-label={t("orbit.contacts.add") || "Add"}>
              <UserPlus className="h-4 w-4 text-primary" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("orbit.contacts.search") || "Search contacts…"}
            className="pl-9 h-9 text-sm rounded-xl bg-muted/30 border-border/20" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {([
            { id: "all" as Tab, label: t("orbit.contacts.all") || "All", icon: Users },
            { id: "favorites" as Tab, label: t("orbit.contacts.favorites") || "Favorites", icon: Star },
          ]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === id ? "bg-primary/10 text-primary" : "text-muted-foreground active:bg-muted/30"}`}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <ContactSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8">
            <User className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {search ? (t("orbit.contacts.no_found") || "No contacts found") : (t("orbit.contacts.empty") || "No contacts yet")}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {t("orbit.contacts.empty_hint") || "Add contacts via QR or manually"}
            </p>
          </div>
        ) : (
          grouped.map(([letter, list]) => (
            <div key={letter}>
              <div className="px-4 py-1 sticky top-0 bg-background z-[1]">
                <span className="text-[11px] font-bold text-primary/60">{letter}</span>
              </div>
              {list.map(c => (
                <ContactRow key={c.id} contact={c} onMessage={handleMessage}
                  onCall={c => handleCall(c, false)} onVideoCall={c => handleCall(c, true)} />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Add Contact Dialog — simple: name + email/phone */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t("orbit.contacts.add_title") || "Add Contact"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">{t("orbit.contacts.name") || "Name"} *</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t("orbit.contacts.name_placeholder") || "Contact name"} className="mt-1 bg-muted/30" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("orbit.contacts.email") || "Email"}</Label>
              <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@example.com" className="mt-1 bg-muted/30" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("orbit.contacts.phone") || "Phone"}</Label>
              <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+971 50 000 0000" className="mt-1 bg-muted/30" />
            </div>
            <p className="text-[10px] text-muted-foreground/60">
              {t("orbit.contacts.email_sync_hint") || "Email enables auto-sync with platform users"}
            </p>
            <Button onClick={handleAdd} disabled={saving || !newName.trim()} className="w-full gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("orbit.contacts.add") || "Add Contact"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Dialog */}
      <QRContactCard open={showQR} onOpenChange={setShowQR} onContactAdded={() => { setShowQR(false); loadContacts(); }} />
    </div>
  );
}
