/**
 * OrbitContactsDirectory — Recent contacts + directory + search.
 * WhatsApp-style contact list with fast actions.
 */
import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Search, MessageCircle, Phone, CreditCard, Store, Star, Clock, Users, User, Loader2 } from "lucide-react";
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

const ContactRow = memo(function ContactRow({
  contact,
  onMessage,
  onCall,
}: {
  contact: OrbitContact;
  onMessage: (c: OrbitContact) => void;
  onCall: (c: OrbitContact) => void;
}) {
  const initials = (contact.name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const subtitle = contact.company || contact.email || contact.phone || contact.category;
  const timeStr = contact.last_contacted_at
    ? new Date(contact.last_contacted_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 active:bg-muted/30 transition-colors">
      {/* Avatar */}
      <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
        {contact.avatar_url ? (
          <img src={contact.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-primary">{initials}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground truncate">{contact.name}</span>
          {contact.is_favorite && <Star className="h-3 w-3 text-warning fill-warning shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>

      {/* Time */}
      {timeStr && (
        <span className="text-[10px] text-muted-foreground shrink-0">{timeStr}</span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={(e) => { e.stopPropagation(); haptic("light"); onMessage(contact); }}
        >
          <MessageCircle className="h-4 w-4 text-primary" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={(e) => { e.stopPropagation(); haptic("light"); onCall(contact); }}
        >
          <Phone className="h-4 w-4 text-success" />
        </Button>
      </div>
    </div>
  );
});

function ContactSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-11 h-11 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-8 w-8 rounded-full" />
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
    if (!user || !orgId) return;
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
  }, [user, orgId]);

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
    if (!user || !orgId || !contact.contact_user_id) {
      toast.info("Cannot message this contact yet");
      return;
    }
    try {
      const result = await getOrCreateDirectThread({
        currentUserId: user.id,
        targetUserId: contact.contact_user_id,
        targetName: contact.name,
      });
      if (result) {
        navigate(`/dashboard/communication?thread=${result.contextId}`);
      }
    } catch {
      toast.error("Failed to open conversation");
    }
  }, [user, orgId, navigate]);

  const handleCall = useCallback((contact: OrbitContact) => {
    if (!contact.contact_user_id) {
      toast.info("Cannot call this contact yet");
      return;
    }
    navigate(`/dashboard/communication?section=calls&target=${contact.contact_user_id}`);
  }, [navigate]);

  const TABS: { id: Tab; label: string; icon: typeof Clock }[] = [
    { id: "recent", label: "Recent", icon: Clock },
    { id: "all", label: "All", icon: Users },
    { id: "favorites", label: "Favorites", icon: Star },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 space-y-3">
        <h2 className="text-base font-bold text-foreground">Contacts</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="pl-9 h-9 text-sm rounded-xl bg-muted/30 border-border/20"
          />
        </div>
        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/30"
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
          <div className="flex flex-col items-center justify-center py-12 text-center px-8">
            <User className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No contacts found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {search ? "Try a different search" : "Start conversations to see contacts here"}
            </p>
          </div>
        ) : (
          filtered.map((c) => (
            <ContactRow key={c.id} contact={c} onMessage={handleMessage} onCall={handleCall} />
          ))
        )}
      </div>
    </div>
  );
}
