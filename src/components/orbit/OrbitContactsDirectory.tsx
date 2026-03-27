/**
 * OrbitContactsDirectory — Premium contacts with shop/pay actions.
 */
import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCall } from "@/components/call/CallProvider";
import { useNavigate } from "react-router-dom";
import { Search, MessageCircle, Phone, CreditCard, Store, Star, Clock, Users, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { haptic } from "@/lib/haptics";
import { getOrCreateDirectThread } from "@/lib/direct-thread";
import { toast } from "sonner";

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

const AVATAR_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210 70% 50%)",
  "hsl(280 60% 55%)",
  "hsl(340 65% 50%)",
  "hsl(160 60% 40%)",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const ContactRow = memo(function ContactRow({
  contact,
  onMessage,
  onCall,
  onPay,
  onShop,
}: {
  contact: OrbitContact;
  onMessage: (c: OrbitContact) => void;
  onCall: (c: OrbitContact) => void;
  onPay: (c: OrbitContact) => void;
  onShop: (c: OrbitContact) => void;
}) {
  const initials = (contact.name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const subtitle = contact.company || contact.email || contact.phone || "";
  const timeStr = contact.last_contacted_at
    ? new Date(contact.last_contacted_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  const avatarBg = getAvatarColor(contact.name || "?");
  const hasShop = contact.category === "merchant" || contact.category === "business";

  return (
    <div className="flex items-center gap-3 px-4 h-[64px] active:bg-muted/30 transition-colors cursor-pointer">
      {/* Avatar — fixed 44x44 */}
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
        style={{ background: contact.avatar_url ? undefined : avatarBg }}
      >
        {contact.avatar_url ? (
          <img src={contact.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-sm font-bold text-white">{initials}</span>
        )}
      </div>

      {/* Info — min-w-0 for truncation */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground truncate block max-w-[140px]">
            {contact.name}
          </span>
          {contact.is_favorite && <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate block max-w-[160px]">{subtitle}</p>
        )}
      </div>

      {/* Time */}
      {timeStr && (
        <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">{timeStr}</span>
      )}

      {/* Actions — consistent 44px touch targets */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 min-w-[36px] min-h-[36px] rounded-full"
          onClick={(e) => { e.stopPropagation(); haptic("light"); onMessage(contact); }}
          aria-label="Message"
        >
          <MessageCircle className="h-4 w-4 text-primary" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 min-w-[36px] min-h-[36px] rounded-full"
          onClick={(e) => { e.stopPropagation(); haptic("light"); onCall(contact); }}
          aria-label="Call"
        >
          <Phone className="h-4 w-4 text-emerald-500" />
        </Button>
        {contact.contact_user_id && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 min-w-[36px] min-h-[36px] rounded-full"
            onClick={(e) => { e.stopPropagation(); haptic("light"); onPay(contact); }}
            aria-label="Pay"
          >
            <CreditCard className="h-4 w-4 text-violet-500" />
          </Button>
        )}
        {hasShop && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 min-w-[36px] min-h-[36px] rounded-full"
            onClick={(e) => { e.stopPropagation(); haptic("light"); onShop(contact); }}
            aria-label="Shop"
          >
            <Store className="h-4 w-4 text-orange-500" />
          </Button>
        )}
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
      const { data } = await supabase
        .from("contacts")
        .select("id, name, email, phone, avatar_url, is_favorite, last_contacted_at, category, contact_user_id, company")
        .eq("owner_id", user.id)
        .order("last_contacted_at", { ascending: false, nullsFirst: false })
        .limit(100);
      setContacts((data as OrbitContact[]) || []);
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
      toast.info("Cannot message this contact yet");
      return;
    }
    try {
      const result = await getOrCreateDirectThread({
        currentUserId: user.id,
        targetUserId: contact.contact_user_id,
        targetName: contact.name,
      });
      const threadId = result?.v2ConversationId || result?.threadId || result?.contextId;
      if (threadId) navigate(`/dashboard/communication?thread=${threadId}`);
    } catch {
      toast.error("Failed to open conversation");
    }
  }, [user, navigate]);

  const { startCall, isInCall, isStartingCall } = useCall();

  const handleCall = useCallback(async (contact: OrbitContact) => {
    if (!contact.contact_user_id) { toast.info("Cannot call this contact yet"); return; }
    if (isInCall || isStartingCall) { toast.info("Already in a call"); return; }
    haptic("medium");
    try {
      // Resolve the contact's org membership for proper call routing
      const { data: contactOrg } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", contact.contact_user_id)
        .limit(1)
        .maybeSingle();

      await startCall({
        targetId: contactOrg?.org_id || orgId || contact.contact_user_id,
        peerName: contact.name,
        contextType: "contact",
        contextId: contact.id,
        isVideo: false,
      });
    } catch {
      toast.error("Failed to start call");
    }
  }, [startCall, isInCall, isStartingCall, orgId]);

  const handlePay = useCallback((contact: OrbitContact) => {
    if (!contact.contact_user_id) return;
    navigate(`/wallet/hub?action=send&to=${contact.contact_user_id}&name=${encodeURIComponent(contact.name)}`);
  }, [navigate]);

  const handleShop = useCallback((contact: OrbitContact) => {
    navigate(`/explore?merchant=${contact.contact_user_id || contact.id}`);
  }, [navigate]);

  const TABS: { id: Tab; label: string; icon: typeof Clock }[] = [
    { id: "recent", label: "Recent", icon: Clock },
    { id: "all", label: "All", icon: Users },
    { id: "favorites", label: "Favorites", icon: Star },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 space-y-3">
        <h2 className="text-base font-bold text-foreground">Contacts</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts"
            className="pl-9 h-9 text-sm rounded-xl bg-muted/30 border-border/20"
          />
        </div>
        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
                tab === id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground active:bg-muted/30"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
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
            <p className="text-sm font-medium text-muted-foreground">No contacts found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {search ? "Try a different search" : "Start conversations to see contacts here"}
            </p>
          </div>
        ) : (
          filtered.map((c) => (
            <ContactRow
              key={c.id}
              contact={c}
              onMessage={handleMessage}
              onCall={handleCall}
              onPay={handlePay}
              onShop={handleShop}
            />
          ))
        )}
      </div>
    </div>
  );
}
