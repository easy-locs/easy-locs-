/**
 * OrbitContactsDirectory — WhatsApp-like contacts with canonical identity rendering.
 */
import { useState, useEffect, useMemo, memo, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCall } from "@/components/call/CallProvider";
import { useNavigate } from "react-router-dom";
import { Search, MessageCircle, Phone, Video, Star, Clock, Users, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { haptic } from "@/lib/haptics";
import { getOrCreateDirectThread } from "@/lib/direct-thread";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { IdentityAvatar } from "@/components/orbit/IdentityAvatar";
import { useResolvedIdentity } from "@/hooks/useResolvedIdentity";

interface OrbitContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_favorite: boolean;
  last_contacted_at: string | null;
  category: string;
  contact_user_id: string | null;
  company: string | null;
}

type Tab = "recent" | "all" | "favorites";

const ContactRow = memo(function ContactRow({
  contact,
  onMessage,
  onCall,
  onVideoCall,
}: {
  contact: OrbitContact;
  onMessage: (c: OrbitContact) => void;
  onCall: (c: OrbitContact) => void;
  onVideoCall: (c: OrbitContact) => void;
}) {
  const { displayName: _name, subtitle } = useResolvedIdentity(contact);
  const timeStr = contact.last_contacted_at
    ? new Date(contact.last_contacted_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <div className="flex items-center gap-3 px-4 h-[64px] active:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => onMessage(contact)}
    >
      <IdentityAvatar avatarUrl={contact.avatar_url} name={contact.name} size="md" />

      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground break-words line-clamp-1">
            {contact.name}
          </span>
          {contact.is_favorite && <Star className="h-3 w-3 fill-amber-400 shrink-0" style={{ color: "hsl(45 93% 58%)" }} />}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground break-words line-clamp-1">{subtitle}</p>
        )}
      </div>

      {timeStr && (
        <span className="text-[0.625rem] text-muted-foreground shrink-0 whitespace-nowrap">{timeStr}</span>
      )}

      <div className="flex items-center gap-0.5 shrink-0">
        <Button variant="ghost" size="icon" className="h-9 w-9 min-w-[36px] min-h-[36px] rounded-full"
          onClick={(e) => { e.stopPropagation(); haptic("light"); onMessage(contact); }} aria-label={t("contact.action.message")}>
          <MessageCircle className="h-4 w-4 text-primary" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 min-w-[36px] min-h-[36px] rounded-full"
          onClick={(e) => { e.stopPropagation(); haptic("light"); onCall(contact); }} aria-label={t("contact.action.audio")}>
          <Phone className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 min-w-[36px] min-h-[36px] rounded-full"
          onClick={(e) => { e.stopPropagation(); haptic("light"); onVideoCall(contact); }} aria-label={t("contact.action.video")}>
          <Video className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
        </Button>
      </div>
    </div>
  );
});

function ContactSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 h-[64px]">
      <Skeleton className="w-11 h-11 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-9 w-9 rounded-full" />
      <Skeleton className="h-9 w-9 rounded-full" />
    </div>
  );
}

export default function OrbitContactsDirectory() {
  const { t } = useI18n();
  const { user, orgId } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<OrbitContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("recent");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { listOrbitContacts } = await import("@/lib/orbit/orbit-contacts-service");
      const rows = await listOrbitContacts(user.id);
      const { resolveCanonicalDisplayIdentity } = await import("@/lib/orbit/canonical-helpers");
      setContacts(((rows || []).map((row: any) => {
        const identity = resolveCanonicalDisplayIdentity(row);
        return {
          id: row.id,
          name: identity.displayName,
          email: row.email,
          phone: row.phone,
          avatar_url: identity.avatarUrl,
          is_favorite: !!row.is_favorite,
          last_contacted_at: row.metadata?.last_contacted_at || null,
          category: row.source || "contact",
          contact_user_id: row.peer_user_id,
          company: row.metadata?.company || null,
        };
      }) as OrbitContact[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    let list = contacts;
    if (tab === "favorites") list = list.filter((c) => c.is_favorite);
    if (tab === "recent") list = list.filter((c) => c.last_contacted_at);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.company?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [contacts, tab, search]);

  const handleMessage = useCallback(async (contact: OrbitContact) => {
    if (!user || !contact.contact_user_id) {
      toast.info(t("orbit.cannot_message"));
      return;
    }
    try {
      const result = await getOrCreateDirectThread({
        currentUserId: user.id,
        targetUserId: contact.contact_user_id,
        targetName: contact.name,
      });
      const conversationId = result?.conversationId;
      if (conversationId) navigate(`/orbit/${conversationId}`);
    } catch {
      toast.error(t("orbit.conversation_failed"));
    }
  }, [user, navigate]);

  const { startCall, isInCall, isStartingCall } = useCall();
  const callLockRef = useRef(false);

  const handleCallInternal = useCallback(async (contact: OrbitContact, isVideo: boolean) => {
    if (callLockRef.current) return;
    callLockRef.current = true;
    try {
      if (!contact.contact_user_id) { toast.info(t("orbit.not_on_platform")); return; }
      if (isInCall || isStartingCall) { toast.info(t("orbit.already_in_call")); return; }
      haptic("medium");
      try {
        const success = await startCall({
          targetId: contact.contact_user_id,
          peerName: contact.name,
          entityType: "contact",
          entityId: contact.id,
          isVideo,
        });
        if (!success) {
          toast.error(isVideo ? t("orbit.video_not_started") : t("orbit.call_not_started"));
        }
      } catch {
        toast.error(isVideo ? t("orbit.video_start_failed") : t("orbit.call_start_failed"));
      }
    } finally {
      setTimeout(() => { callLockRef.current = false; }, 500);
    }
  }, [startCall, isInCall, isStartingCall]);

  const handleCall = useCallback((contact: OrbitContact) => handleCallInternal(contact, false), [handleCallInternal]);
  const handleVideoCall = useCallback((contact: OrbitContact) => handleCallInternal(contact, true), [handleCallInternal]);

  const TABS: { id: Tab; label: string; icon: typeof Clock }[] = [
    { id: "recent", label: t("orbit.tab_recent"), icon: Clock },
    { id: "all", label: t("orbit.tab_all"), icon: Users },
    { id: "favorites", label: t("orbit.tab_favorites"), icon: Star },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-4 pt-4 pb-2 space-y-3">
        <h2 className="text-base font-bold text-foreground">{t("orbit.contacts_title")}</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.search")} className="pl-9 h-9 text-sm rounded-xl bg-muted/30 border-border/20" />
        </div>
        <div className="flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
                tab === id ? "bg-primary/10 text-primary" : "text-muted-foreground active:bg-muted/30"
              }`}>
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <ContactSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8">
            <User className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">{t("orbit.contacts.empty")}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {search ? t("orbit.contacts.try_search") : t("orbit.contacts.start_conversations")}
            </p>
          </div>
        ) : (
          filtered.map((c) => (
            <ContactRow key={c.id} contact={c}
              onMessage={handleMessage} onCall={handleCall} onVideoCall={handleVideoCall} />
          ))
        )}
      </div>
    </div>
  );
}
