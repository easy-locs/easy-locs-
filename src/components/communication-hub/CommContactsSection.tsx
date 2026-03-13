/**
 * CommContactsSection — Real contacts with presence indicators and operational actions.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePresenceStatus, PresenceDot, presenceLabel } from "@/hooks/usePresenceStatus";
import { Search, UserPlus, MessageCircle, Phone, Video, Star, Users, Briefcase, Heart, Clock, QrCode, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import ScrollableFilterBar, { type FilterOption } from "@/components/ui/ScrollableFilterBar";
import QRContactCard from "./QRContactCard";
import { getOrCreateDirectThread } from "@/lib/direct-thread";
import { useCall } from "@/components/call/CallProvider";

type ContactCategory = "all" | "client" | "team" | "professional" | "favorite" | "recent";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  category: string;
  is_favorite: boolean;
  avatar_url: string | null;
  last_contacted_at: string | null;
  contact_user_id: string | null;
}

const CATEGORY_TABS: { id: ContactCategory; label: string; icon: typeof Users }[] = [
  { id: "all", label: "All", icon: Users },
  { id: "client", label: "Clients", icon: Users },
  { id: "team", label: "Team", icon: Users },
  { id: "professional", label: "Pros", icon: Briefcase },
  { id: "favorite", label: "Favorites", icon: Heart },
  { id: "recent", label: "Recent", icon: Clock },
];

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

export default function CommContactsSection() {
  const { user, orgId } = useAuth();
  const navigate = useNavigate();
  const { startCall: initiateCall, isStartingCall } = useCall();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ContactCategory>("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({ name: "", email: "", phone: "", company: "", category: "client" });
  const [saving, setSaving] = useState(false);

  // Get presence for contacts that have user IDs
  const contactUserIds = contacts.filter(c => c.contact_user_id).map(c => c.contact_user_id!);
  const presenceMap = usePresenceStatus(contactUserIds);

  const loadContacts = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("owner_id", user.id)
      .order("name");
    setContacts((data as Contact[]) || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const filtered = contacts.filter(c => {
    if (category === "favorite" && !c.is_favorite) return false;
    if (category === "recent" && !c.last_contacted_at) return false;
    if (["client", "team", "professional"].includes(category) && c.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q) || (c.company || "").toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
    if (category === "recent") return new Date(b.last_contacted_at || 0).getTime() - new Date(a.last_contacted_at || 0).getTime();
    if (category === "favorite") return (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0);
    return a.name.localeCompare(b.name);
  });

  const grouped = category === "all" || category === "favorite" ?
    filtered.reduce((acc, c) => {
      const letter = c.name[0]?.toUpperCase() || "#";
      if (!acc[letter]) acc[letter] = [];
      acc[letter].push(c);
      return acc;
    }, {} as Record<string, Contact[]>) : null;

  const handleAddContact = async () => {
    if (!user?.id || !newContact.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("contacts").insert({
      owner_id: user.id,
      org_id: orgId || null,
      name: newContact.name.trim(),
      email: newContact.email.trim() || null,
      phone: newContact.phone.trim() || null,
      company: newContact.company.trim() || null,
      category: newContact.category,
    } as any);
    setSaving(false);
    if (error) { toast.error("Failed to add contact"); return; }
    toast.success("Contact added");
    haptic("success");
    setShowAdd(false);
    setNewContact({ name: "", email: "", phone: "", company: "", category: "client" });
    loadContacts();
  };

  const toggleFavorite = async (contact: Contact) => {
    haptic("light");
    const newVal = !contact.is_favorite;
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, is_favorite: newVal } : c));
    await supabase.from("contacts").update({ is_favorite: newVal } as any).eq("id", contact.id);
  };

  const startChat = async (contact: Contact) => {
    haptic("medium");
    if (!user) return;
    setActionLoading(`msg-${contact.id}`);
    try {
      const targetUserId = contact.contact_user_id;
      if (targetUserId) {
        const thread = await getOrCreateDirectThread({
          currentUserId: user.id,
          targetUserId,
          targetName: contact.name,
        });
        if (thread) {
          navigate(`/dashboard/communication?thread=${thread.contextId}`);
          return;
        }
      }
      // Fallback: search by name
      navigate(`/dashboard/communication?section=chats&search=${encodeURIComponent(contact.name)}`);
    } catch {
      toast.error("Could not open conversation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCall = async (contact: Contact, isVideo: boolean) => {
    haptic("medium");
    if (!user) return;

    // If contact has no linked user, try to auto-link by email
    let contactUserId = contact.contact_user_id;
    if (!contactUserId && contact.email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", contact.email)
        .maybeSingle();
      if (profile?.id) {
        contactUserId = profile.id;
        // Auto-link for future use
        await supabase.from("contacts").update({ contact_user_id: profile.id } as any).eq("id", contact.id);
        setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, contact_user_id: profile.id } : c));
      }
    }

    if (!contactUserId) {
      toast.error("Ce contact n'est pas lié à un compte utilisateur. Ajoutez son email pour le synchroniser.");
      return;
    }

    setActionLoading(`${isVideo ? "video" : "call"}-${contact.id}`);
    try {
      // Find target org
      const { data: targetMembership } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", contactUserId)
        .limit(1)
        .single();
      
      if (!targetMembership?.org_id) {
        toast.error("Utilisateur non joignable");
        return;
      }
      
      await initiateCall({
        orgId: targetMembership.org_id,
        contextType: "direct",
        contextId: `direct:${[user.id, contactUserId].sort().join(":")}`,
        contextLabel: `Call with ${contact.name}`,
        peerName: contact.name,
        isVideo,
      });
    } catch {
      toast.error("L'appel a échoué");
    } finally {
      setActionLoading(null);
    }
  };

  const renderContact = (contact: Contact) => {
    const presence = contact.contact_user_id ? presenceMap[contact.contact_user_id] : null;
    const isMsgLoading = actionLoading === `msg-${contact.id}`;
    const isCallLoading = actionLoading === `call-${contact.id}`;
    const isVideoLoading = actionLoading === `video-${contact.id}`;
    const anyLoading = !!actionLoading;

    return (
      <div key={contact.id}
        className="flex items-center gap-3 px-3 py-2.5 active:bg-[hsl(var(--hud-surface)/0.5)] transition-colors cursor-pointer"
        onClick={() => startChat(contact)}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {/* Avatar with presence */}
        <div className="relative shrink-0">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: contact.avatar_url ? `url(${contact.avatar_url}) center/cover` : "hsl(var(--hud-cyan) / 0.1)",
              color: "hsl(var(--hud-cyan))",
            }}>
            {!contact.avatar_url && getInitials(contact.name)}
          </div>
          {presence && (
            <div className="absolute -bottom-0.5 -right-0.5">
              <PresenceDot status={presence.status} size={10} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>
              {contact.name}
            </span>
            {contact.is_favorite && <Star className="h-3 w-3 fill-current shrink-0" style={{ color: "hsl(var(--hud-warning))" }} />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {presence && presence.status !== "offline" && (
              <span className="text-[10px] font-medium" style={{ color: presenceColor(presence.status) }}>
                {presenceLabel(presence.status)}
              </span>
            )}
            {contact.company && (
              <span className="text-[11px] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                {contact.company}
              </span>
            )}
          </div>
        </div>

        {/* Actions — 44px min touch targets */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={() => toggleFavorite(contact)}
            className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ WebkitTapHighlightColor: "transparent" }}>
            <Star className="h-4 w-4"
              fill={contact.is_favorite ? "hsl(var(--hud-warning))" : "none"}
              style={{ color: contact.is_favorite ? "hsl(var(--hud-warning))" : "hsl(var(--hud-text-dim) / 0.2)" }} />
          </button>
          <button onClick={() => startChat(contact)} disabled={anyLoading}
            className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "hsl(var(--hud-cyan) / 0.08)", WebkitTapHighlightColor: "transparent" }}>
            {isMsgLoading ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(var(--hud-cyan))" }} />
              : <MessageCircle className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />}
          </button>
          <button onClick={() => handleCall(contact, false)} disabled={anyLoading || isStartingCall}
            className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "hsl(var(--hud-cyan) / 0.08)", WebkitTapHighlightColor: "transparent" }}>
            {isCallLoading ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(var(--hud-cyan))" }} />
              : <Phone className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />}
          </button>
          <button onClick={() => handleCall(contact, true)} disabled={anyLoading || isStartingCall}
            className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "hsl(var(--hud-cyan) / 0.08)", WebkitTapHighlightColor: "transparent" }}>
            {isVideoLoading ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(var(--hud-cyan))" }} />
              : <Video className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--hud-bg))" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: "hsl(var(--hud-text))" }}>Contacts</h2>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
              style={{ color: "hsl(var(--hud-cyan))" }} onClick={() => setShowQR(true)}>
              <QrCode className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs"
              style={{ color: "hsl(var(--hud-cyan))" }} onClick={() => setShowAdd(true)}>
              <UserPlus className="h-4 w-4" /> Add
            </Button>
          </div>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..."
            className="pl-9 h-9 text-sm border-0" style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }} />
        </div>
        <ScrollableFilterBar<ContactCategory>
          options={CATEGORY_TABS.map(t => ({ id: t.id, label: t.label, icon: t.icon }))}
          value={category}
          onChange={setCategory}
        />
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "hsl(var(--hud-cyan) / 0.3)", borderTopColor: "hsl(var(--hud-cyan))" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Users className="h-10 w-10 mb-3" style={{ color: "hsl(var(--hud-text-dim) / 0.2)" }} />
            <p className="text-sm" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              {search ? "No contacts found" : "No contacts yet"}
            </p>
            <Button size="sm" variant="ghost" className="mt-3 gap-1.5" style={{ color: "hsl(var(--hud-cyan))" }}
              onClick={() => setShowAdd(true)}>
              <UserPlus className="h-4 w-4" /> Add your first contact
            </Button>
          </div>
        ) : grouped ? (
          Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([letter, list]) => (
            <div key={letter}>
              <div className="px-4 py-1.5 sticky top-0" style={{ background: "hsl(var(--hud-bg))", zIndex: 1 }}>
                <span className="text-[11px] font-bold" style={{ color: "hsl(var(--hud-cyan) / 0.6)" }}>{letter}</span>
              </div>
              {list.map(renderContact)}
            </div>
          ))
        ) : (
          <div className="divide-y" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
            {filtered.map(renderContact)}
          </div>
        )}
      </div>

      {/* Add Contact Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "hsl(var(--hud-text))" }}>Add Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Name *</Label>
              <Input value={newContact.name} onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))}
                className="mt-1 border-0" style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }} />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Email</Label>
              <Input value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))}
                className="mt-1 border-0" style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }} />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Phone</Label>
              <Input value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))}
                className="mt-1 border-0" style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }} />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Company</Label>
              <Input value={newContact.company} onChange={e => setNewContact(p => ({ ...p, company: e.target.value }))}
                className="mt-1 border-0" style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }} />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>Category</Label>
              <Select value={newContact.category} onValueChange={v => setNewContact(p => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1 border-0" style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={!newContact.name.trim() || saving} onClick={handleAddContact}
              style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
              {saving ? "Adding..." : "Add Contact"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Contact Card */}
      <QRContactCard open={showQR} onOpenChange={setShowQR} onContactAdded={loadContacts} />
    </div>
  );
}

function presenceColor(status: string): string {
  const colors: Record<string, string> = {
    online: "hsl(var(--hud-success))",
    away: "hsl(var(--hud-warning))",
    busy: "hsl(var(--hud-danger))",
    in_call: "hsl(var(--hud-purple))",
    dnd: "hsl(var(--hud-danger))",
  };
  return colors[status] || "hsl(var(--hud-text-dim) / 0.4)";
}
