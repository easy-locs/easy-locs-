/**
 * CommContactsSection — Full pipeline: Contact → Message → Call
 * Each contact has a resolved state: internal | external | unresolved
 * Actions are enabled/disabled based on state.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  resolveProfilesByEmail, resolveProfilesByPhone, resolveOrgMemberships, sendInviteEmail,
} from "@/repositories/communication.repository";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { usePresenceStatus, PresenceDot, presenceLabel } from "@/hooks/usePresenceStatus";
import { Search, UserPlus, MessageCircle, Phone, Video, Star, Users, Briefcase, Heart, Clock, QrCode, Loader2, UserX, Send, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import ScrollableFilterBar from "@/components/ui/ScrollableFilterBar";
import QRContactCard from "./QRContactCard";
import { getOrCreateDirectThread } from "@/lib/direct-thread";
import { resolveDirectPeer } from "@/lib/orbit/resolveDirectPeer";
import { listOrbitContacts, toggleFavoriteContact, upsertOrbitContact } from "@/lib/orbit/orbit-contacts-service";
import { useCall } from "@/components/call/CallProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { trackOrbitEvent, guardDisplayName } from "@/lib/orbit/orbitTelemetry";

type ContactCategory = "all" | "client" | "team" | "professional" | "favorite" | "recent";

/** Contact state after resolution */
type ContactAppState = "internal" | "external" | "unresolved";

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

/** Resolved contact with capabilities */
interface ResolvedContact extends Contact {
  appState: ContactAppState;
  canMessage: boolean;
  canCall: boolean;
  targetOrgId: string | null;
}

// Category tabs will use i18n at render time
const CATEGORY_IDS: { id: ContactCategory; labelKey: string; fallback: string; icon: typeof Users }[] = [
  { id: "all", labelKey: "orbit.contacts.all", fallback: "All", icon: Users },
  { id: "client", labelKey: "orbit.contacts.clients", fallback: "Clients", icon: Users },
  { id: "team", labelKey: "orbit.contacts.team", fallback: "Team", icon: Users },
  { id: "professional", labelKey: "orbit.contacts.pros", fallback: "Pros", icon: Briefcase },
  { id: "favorite", labelKey: "orbit.contacts.favorites", fallback: "Favorites", icon: Heart },
  { id: "recent", labelKey: "orbit.contacts.recent", fallback: "Recent", icon: Clock },
];

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function presenceColor(status: string): string {
  switch (status) {
    case "online": return "hsl(var(--hud-success))";
    case "busy":
    case "in_call": return "hsl(var(--hud-error))";
    case "away": return "hsl(var(--hud-warning))";
    default: return "hsl(var(--hud-text-dim) / 0.4)";
  }
}

export default function CommContactsSection() {
  const { user, orgId } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { startCall: initiateCall, isStartingCall } = useCall();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [category, setCategory] = useState<ContactCategory>("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({ name: "", email: "", phone: "", company: "", category: "client" });
  const [saving, setSaving] = useState(false);

  // Org membership cache for resolved contacts
  const [orgMembershipMap, setOrgMembershipMap] = useState<Record<string, string>>({});

  const contactUserIds = contacts.filter(c => c.contact_user_id).map(c => c.contact_user_id!);
  const presenceMap = usePresenceStatus(contactUserIds);

  // ── Batch auto-link: resolve all unlinked contacts on load ──
  // ── Batch auto-link: resolve by email AND phone ──
  const batchAutoLink = useCallback(async (rawContacts: Contact[]) => {
    const unlinked = rawContacts.filter(c => !c.contact_user_id && (c.email?.trim() || c.phone?.trim()));
    if (unlinked.length === 0) return rawContacts;

    // Step 1: Match by email
    const emails = unlinked.filter(c => c.email?.trim()).map(c => c.email!.trim().toLowerCase());
    const emailToProfileId = new Map<string, string>();
    if (emails.length > 0) {
      const emailProfiles = await resolveProfilesByEmail(emails);
      emailProfiles.forEach(p => {
        if (p.email) emailToProfileId.set(p.email.toLowerCase(), p.id);
      });
    }

    // Step 2: Match by phone (normalize: strip spaces, dashes, dots)
    const normalizePhone = (p: string) => p.replace(/[\s\-\.\(\)]/g, "");
    const phonesToMatch = unlinked
      .filter(c => c.phone?.trim() && !emailToProfileId.has(c.email?.trim().toLowerCase() || ""))
      .map(c => normalizePhone(c.phone!.trim()));

    const phoneToProfileId = new Map<string, string>();
    if (phonesToMatch.length > 0) {
      const phoneProfiles = await resolveProfilesByPhone();

      phoneProfiles.forEach(p => {
        if (p.phone) {
          const normalized = normalizePhone(p.phone);
          phoneToProfileId.set(normalized, p.id);
          // Also check without country code prefix variations
          if (normalized.startsWith("+")) {
            phoneToProfileId.set(normalized.slice(1), p.id);
          }
        }
        if (p.whatsapp_number) {
          const normalized = normalizePhone(p.whatsapp_number);
          phoneToProfileId.set(normalized, p.id);
        }
      });
    }

    const updates: { contactId: string; profileId: string }[] = [];
    const updated = rawContacts.map(c => {
      if (c.contact_user_id) return c;

      // Try email match first
      const email = c.email?.trim().toLowerCase();
      if (email && emailToProfileId.has(email)) {
        const profileId = emailToProfileId.get(email)!;
        updates.push({ contactId: c.id, profileId });
        return { ...c, contact_user_id: profileId };
      }

      // Then try phone match
      const phone = c.phone?.trim();
      if (phone) {
        const normalized = normalizePhone(phone);
        // Try exact, without +, and common variants
        const profileId = phoneToProfileId.get(normalized)
          || phoneToProfileId.get(normalized.replace(/^0/, ""))
          || (normalized.startsWith("+") ? phoneToProfileId.get(normalized.slice(1)) : undefined);
        if (profileId) {
          updates.push({ contactId: c.id, profileId });
          return { ...c, contact_user_id: profileId };
        }
      }

      return c;
    });

    // Persist links in background
    for (const u of updates) {
      upsertOrbitContact({ ownerUserId: user!.id, peerUserId: u.profileId }).then(() => {});
    }

    return updated;
  }, []);

  // ── Batch resolve org memberships for internal contacts ──
  const batchResolveOrgs = useCallback(async (resolvedContacts: Contact[]) => {
    const userIds = resolvedContacts.filter(c => c.contact_user_id).map(c => c.contact_user_id!);
    if (userIds.length === 0) return;

    const memberships = await resolveOrgMemberships(userIds);

    const map: Record<string, string> = {};
    memberships.forEach(m => { map[m.user_id] = m.org_id; });
    setOrgMembershipMap(map);
  }, []);

  const loadContacts = useCallback(async () => {
    if (!user?.id) {
      setContacts([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await listOrbitContacts(user.id);
      const raw = (rows || []).map((row: any) => ({
        id: row.id,
        name: row.display_name || row.email || row.phone || "Contact",
        email: row.email,
        phone: row.phone,
        company: null,
        category: row.source || "client",
        is_favorite: !!row.is_favorite,
        avatar_url: row.avatar_url,
        last_contacted_at: row.metadata?.last_contacted_at || null,
        contact_user_id: row.peer_user_id,
      })) as Contact[];
      const linked = await batchAutoLink(raw);
      setContacts(linked);
      await batchResolveOrgs(linked);
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [user?.id, batchAutoLink, batchResolveOrgs]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`contacts-sync-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orbit_contacts_v2", filter: `owner_user_id=eq.${user.id}` }, () => loadContacts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, loadContacts]);

  // ── Resolve contact capabilities ──
  const resolvedContacts: ResolvedContact[] = useMemo(() => {
    return contacts.map(c => {
      const hasUserId = !!c.contact_user_id;
      const targetOrgId = hasUserId ? (orgMembershipMap[c.contact_user_id!] || null) : null;

      let appState: ContactAppState;
      if (hasUserId) {
        appState = "internal";
      } else if (c.email || c.phone) {
        appState = "external";
      } else {
        appState = "unresolved";
      }

      return {
        ...c,
        appState,
        canMessage: hasUserId,
        canCall: hasUserId,
        targetOrgId,
      };
    });
  }, [contacts, orgMembershipMap]);

  const filtered = resolvedContacts.filter(c => {
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
    }, {} as Record<string, ResolvedContact[]>) : null;

  // ── Actions ──
  const handleAddContact = async () => {
    if (!user?.id || !newContact.name.trim()) return;
    setSaving(true);

    // ── Duplicate detection ──
    const trimName = newContact.name.trim().toLowerCase();
    const trimEmail = newContact.email.trim().toLowerCase();
    const trimPhone = newContact.phone.trim();

    const existingDuplicate = contacts.find(c => {
      // Exact name match
      if (c.name.toLowerCase() === trimName) return true;
      // Email match
      if (trimEmail && c.email?.trim().toLowerCase() === trimEmail) return true;
      // Phone match (normalized)
      if (trimPhone && c.phone) {
        const normalize = (p: string) => p.replace(/[\s\-\.\(\)]/g, "");
        if (normalize(c.phone) === normalize(trimPhone)) return true;
      }
      return false;
    });

    if (existingDuplicate) {
      setSaving(false);
      toast.error(`Un contact similaire existe déjà : "${existingDuplicate.name}"`, {
        description: existingDuplicate.email || existingDuplicate.phone || "",
        duration: 5000,
      });
      return;
    }

    try {
      await upsertOrbitContact({
        ownerUserId: user.id,
        displayName: newContact.name.trim(),
        email: newContact.email.trim() || null,
        phone: newContact.phone.trim() || null,
        source: newContact.category,
        metadata: {
          company: newContact.company.trim() || null,
          last_contacted_at: new Date().toISOString(),
        },
      });
    } catch {
      setSaving(false);
      toast.error("Failed to add contact");
      return;
    }
    setSaving(false);
    toast.success("Contact added");
    haptic("success");
    setShowAdd(false);
    setNewContact({ name: "", email: "", phone: "", company: "", category: "client" });
    loadContacts();
  };

  const toggleFavorite = async (contact: ResolvedContact) => {
    haptic("light");
    const newVal = !contact.is_favorite;
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, is_favorite: newVal } : c));
    try {
      await toggleFavoriteContact(contact.id, newVal);
    } catch {
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, is_favorite: !newVal } : c));
      toast.error("Failed to update favorite");
    }
  };

  const startChat = async (contact: ResolvedContact) => {
    haptic("medium");
    if (!user) return;

    // ── Canonical resolution via resolveDirectPeer ──
    setActionLoading(`msg-${contact.id}`);
    try {
      const peer = await resolveDirectPeer({
        userId: contact.contact_user_id,
        email: contact.email,
        phone: contact.phone,
        contact: { id: contact.id, name: contact.name, email: contact.email ?? undefined, phone: contact.phone ?? undefined, avatar_url: contact.avatar_url ?? undefined },
      });

      if (!peer.resolvable || !peer.peerUserId) {
        if (contact.email || contact.phone) {
          toast("Ce contact n'a pas de compte dans l'application. Invitez-le !", {
            action: { label: "Inviter", onClick: () => handleInvite(contact) },
          });
        } else {
          toast.error("Ajoutez un email à ce contact pour le synchroniser.");
        }
        setActionLoading(null);
        return;
      }

      const thread = await getOrCreateDirectThread({
        currentUserId: user.id,
        targetUserId: peer.peerUserId,
        targetName: peer.displayName,
      });
      if (thread) {
        navigate(`/orbit?thread=${thread.contextId}`);
      } else {
        toast.error("Impossible d'ouvrir la conversation");
      }
    } catch {
      toast.error("Erreur lors de l'ouverture de la conversation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCall = async (contact: ResolvedContact, isVideo: boolean) => {
    haptic("medium");
    if (!user) return;

    // ── Canonical resolution via resolveDirectPeer ──
    setActionLoading(`${isVideo ? "video" : "call"}-${contact.id}`);
    try {
      const peer = await resolveDirectPeer({
        userId: contact.contact_user_id,
        email: contact.email,
        phone: contact.phone,
        contact: { id: contact.id, name: contact.name, email: contact.email ?? undefined, phone: contact.phone ?? undefined, avatar_url: contact.avatar_url ?? undefined },
      });

      if (!peer.resolvable || !peer.peerUserId) {
        toast("Ce contact n'est pas joignable. Ajoutez son email pour le synchroniser.", { icon: "📞" });
        setActionLoading(null);
        return;
      }

      const thread = await getOrCreateDirectThread({
        currentUserId: user.id,
        targetUserId: peer.peerUserId,
        targetName: peer.displayName,
      });

      await initiateCall({
        targetId: peer.peerOrbitId || peer.peerUserId,
        threadId: thread?.v2ConversationId || thread?.threadId,
        contextType: "direct",
        contextId: thread?.v2ConversationId || thread?.contextId || "",
        contextLabel: `Appel avec ${peer.displayName}`,
        peerName: peer.displayName,
        isVideo,
      });
    } catch {
      toast.error("L'appel a échoué");
    } finally {
      setActionLoading(null);
    }
  };

  const handleInvite = async (contact: ResolvedContact) => {
    haptic("medium");
    const inviteUrl = `${window.location.origin}/auth`;

    // If contact has email, send real invitation via edge function
    if (contact.email?.trim()) {
      try {
        const inviteUrl = `${window.location.origin}/auth`;
        await sendInviteEmail(
          contact.email.trim(),
          `${user?.email || "Un utilisateur"} vous invite sur Easy-Locs`,
          `Bonjour ${contact.name},\n\nVous avez été invité(e) à rejoindre Easy-Locs pour communiquer directement via l'application.\n\nCréez votre compte gratuit pour échanger des messages et passer des appels sécurisés.`,
          inviteUrl,
          "Créer mon compte",
        );
        toast.success(`Invitation envoyée par email à ${contact.name}`);

        // Update last_contacted_at
        await upsertOrbitContact({
          ownerUserId: user!.id,
          peerUserId: contact.contact_user_id,
          displayName: contact.name,
          email: contact.email,
          phone: contact.phone,
          source: contact.category,
          metadata: { last_contacted_at: new Date().toISOString() },
        });
      } catch {
        // Fallback to clipboard
        navigator.clipboard.writeText(inviteUrl).then(() => {
          toast.success(`Lien copié ! Envoyez-le à ${contact.name}.`);
        });
      }
    } else {
      // No email — copy link
      navigator.clipboard.writeText(inviteUrl).then(() => {
        toast.success(`Lien d'invitation copié ! Envoyez-le à ${contact.name}.`);
      }).catch(() => {
        toast.info(`Invitez ${contact.name} : ${inviteUrl}`);
      });
    }
  };

  // ── State badge helper ──
  const getStateBadge = (contact: ResolvedContact) => {
    switch (contact.appState) {
      case "internal":
        return (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: "hsl(var(--hud-success) / 0.1)", color: "hsl(var(--hud-success))" }}>
            App
          </span>
        );
      case "external":
        return (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: "hsl(var(--hud-warning) / 0.1)", color: "hsl(var(--hud-warning))" }}>
            Externe
          </span>
        );
      case "unresolved":
        return (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: "hsl(var(--hud-error) / 0.1)", color: "hsl(var(--hud-error))" }}>
            Incomplet
          </span>
        );
    }
  };

  const renderContact = (contact: ResolvedContact) => {
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
              opacity: contact.appState === "unresolved" ? 0.5 : 1,
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
            <span className="text-sm font-semibold line-clamp-2 break-words" style={{ color: "hsl(var(--hud-text))" }}>
              {contact.name}
            </span>
            {contact.is_favorite && <Star className="h-3 w-3 fill-current shrink-0" style={{ color: "hsl(var(--hud-warning))" }} />}
            {getStateBadge(contact)}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {presence && presence.status !== "offline" && (
              <span className="text-[10px] font-medium" style={{ color: presenceColor(presence.status) }}>
                {presenceLabel(presence.status)}
              </span>
            )}
            {contact.company && (
              <span className="text-[11px] line-clamp-1 break-words" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                {contact.company}
              </span>
            )}
            {contact.email && !contact.contact_user_id && (
              <span className="text-[10px] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                {contact.email}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={() => toggleFavorite(contact)}
            className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ WebkitTapHighlightColor: "transparent" }}>
            <Star className="h-4 w-4"
              fill={contact.is_favorite ? "hsl(var(--hud-warning))" : "none"}
              style={{ color: contact.is_favorite ? "hsl(var(--hud-warning))" : "hsl(var(--hud-text-dim) / 0.2)" }} />
          </button>

          {/* Message button — always visible, contextual behavior */}
          <button onClick={() => startChat(contact)} disabled={anyLoading}
            className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{
              background: contact.canMessage ? "hsl(var(--hud-cyan) / 0.08)" : "hsl(var(--hud-text-dim) / 0.04)",
              WebkitTapHighlightColor: "transparent",
            }}>
            {isMsgLoading ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(var(--hud-cyan))" }} />
              : contact.canMessage
                ? <MessageCircle className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
                : <Send className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />}
          </button>

          {/* Call button */}
          <button onClick={() => handleCall(contact, false)} disabled={anyLoading || isStartingCall || !contact.canCall}
            className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{
              background: contact.canCall ? "hsl(var(--hud-cyan) / 0.08)" : "hsl(var(--hud-text-dim) / 0.04)",
              WebkitTapHighlightColor: "transparent",
              opacity: contact.canCall ? 1 : 0.4,
            }}>
            {isCallLoading ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(var(--hud-cyan))" }} />
              : <Phone className="h-4 w-4" style={{ color: contact.canCall ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.3)" }} />}
          </button>

          {/* Video button */}
          <button onClick={() => handleCall(contact, true)} disabled={anyLoading || isStartingCall || !contact.canCall}
            className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{
              background: contact.canCall ? "hsl(var(--hud-cyan) / 0.08)" : "hsl(var(--hud-text-dim) / 0.04)",
              WebkitTapHighlightColor: "transparent",
              opacity: contact.canCall ? 1 : 0.4,
            }}>
            {isVideoLoading ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(var(--hud-cyan))" }} />
              : <Video className="h-4 w-4" style={{ color: contact.canCall ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.3)" }} />}
          </button>

          {/* Invite button for external contacts */}
          {contact.appState === "external" && (
            <button onClick={() => handleInvite(contact)}
              className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: "hsl(var(--hud-warning) / 0.08)", WebkitTapHighlightColor: "transparent" }}>
              <UserPlus className="h-4 w-4" style={{ color: "hsl(var(--hud-warning))" }} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--hud-bg))" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: "hsl(var(--hud-text))" }}>{t("orbit.contacts.title") || "Contacts"}</h2>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-0"
              style={{ color: "hsl(var(--hud-cyan))" }} onClick={() => setShowQR(true)}>
              <QrCode className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 min-h-[44px] sm:min-h-0 gap-1.5 text-xs"
              style={{ color: "hsl(var(--hud-cyan))" }} onClick={() => setShowAdd(true)}>
              <UserPlus className="h-4 w-4" /> {t("orbit.contacts.add") || "Add"}
            </Button>
          </div>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("orbit.contacts.search") || "Search contacts…"}
            className="pl-9 h-9 text-sm border-0" style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }} />
        </div>
        <ScrollableFilterBar<ContactCategory>
          options={CATEGORY_IDS.map(c => ({ id: c.id, label: t(c.labelKey) || c.fallback, icon: c.icon }))}
          value={category}
          onChange={setCategory}
        />
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-0.5 px-1 py-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <Skeleton className="w-11 h-11 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <div className="flex gap-1 shrink-0">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <Skeleton className="w-8 h-8 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Users className="h-10 w-10 mb-3" style={{ color: "hsl(var(--destructive) / 0.4)" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
              {t("orbit.contacts.failed_load") || "Failed to load contacts"}
            </p>
            <p className="text-xs mb-4" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
              {loadError}
            </p>
            <button
              onClick={loadContacts}
              className="text-xs font-semibold px-4 py-2 rounded-lg min-h-[44px] transition-colors"
              style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}
            >
              {t("orbit.contacts.retry") || "Retry"}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Users className="h-10 w-10 mb-3" style={{ color: "hsl(var(--hud-text-dim) / 0.2)" }} />
            <p className="text-sm" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              {search ? (t("orbit.contacts.no_found") || "No contacts found") : (t("orbit.contacts.no_contacts") || "No contacts yet")}
            </p>
            <Button size="sm" variant="ghost" className="mt-3 gap-1.5" style={{ color: "hsl(var(--hud-cyan))" }}
              onClick={() => setShowAdd(true)}>
              <UserPlus className="h-4 w-4" /> {t("orbit.contacts.add_first") || "Add your first contact"}
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
            <DialogTitle style={{ color: "hsl(var(--hud-text))" }}>{t("orbit.contacts.add_title") || "Add Contact"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>{t("orbit.contacts.name") || "Name *"}</Label>
              <Input value={newContact.name} onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))}
                className="mt-1 border-0" style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }} />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>{t("orbit.contacts.email") || "Email"}</Label>
              <Input value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))}
                className="mt-1 border-0" style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }} />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>{t("orbit.contacts.phone") || "Phone"}</Label>
              <Input value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))}
                className="mt-1 border-0" style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }} />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>{t("orbit.contacts.company") || "Company"}</Label>
              <Input value={newContact.company} onChange={e => setNewContact(p => ({ ...p, company: e.target.value }))}
                className="mt-1 border-0" style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }} />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>{t("orbit.contacts.category") || "Category"}</Label>
              <Select value={newContact.category} onValueChange={v => setNewContact(p => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1 border-0" style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] flex items-center gap-1" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              <Info className="h-3 w-3" /> {t("orbit.contacts.email_sync_hint") || "Email enables auto-sync with app users."}
            </p>
            <Button onClick={handleAddContact} disabled={saving || !newContact.name.trim()} className="w-full gap-2"
              style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("orbit.contacts.add_title") || "Add Contact"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Dialog */}
      <QRContactCard open={showQR} onOpenChange={setShowQR} onContactAdded={() => { setShowQR(false); loadContacts(); }} />
    </div>
  );
}
