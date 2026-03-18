/**
 * MyListingsPanel — Owner lifecycle management for marketplace listings.
 * Tabs: Active / Expired / Draft / Archived with status-specific actions.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { motion, AnimatePresence } from "framer-motion";
import {
  republishListing,
  archiveListing,
  disableListing,
  saveDraft,
  isListingExpired,
  getDisplayStatus,
  type ListingStatus,
} from "@/lib/listing-lifecycle";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Package,
  RotateCcw,
  Pencil,
  Archive,
  Trash2,
  Ban,
  Clock,
  CheckCircle2,
  FileText,
  ShoppingBag,
  Wrench,
  Store,
  AlertCircle,
} from "lucide-react";

/* ─── Types ─── */
interface Listing {
  id: string;
  title: string;
  listing_type: string | null;
  status: string;
  active: boolean | null;
  auto_expire: boolean;
  listing_expires_at: string | null;
  published_at: string | null;
  archived_at: string | null;
  price: number;
  currency: string;
  city: string;
  category: string;
  photo_urls: any;
  created_at: string;
}

type Tab = "active" | "expired" | "draft" | "archived";

const TAB_META: { value: Tab; label: string; icon: typeof CheckCircle2 }[] = [
  { value: "active", label: "Active", icon: CheckCircle2 },
  { value: "expired", label: "Expired", icon: Clock },
  { value: "draft", label: "Draft", icon: FileText },
  { value: "archived", label: "Archived", icon: Archive },
];

/* ─── Status badge ─── */
function StatusBadge({ status }: { status: ListingStatus }) {
  const map: Record<ListingStatus, { bg: string; dot: string; label: string }> = {
    active: { bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", label: "Active" },
    expired: { bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400", dot: "bg-amber-500", label: "Expired" },
    draft: { bg: "bg-muted text-muted-foreground", dot: "bg-muted-foreground", label: "Draft" },
    archived: { bg: "bg-muted text-muted-foreground", dot: "bg-muted-foreground", label: "Archived" },
    disabled: { bg: "bg-destructive/10 text-destructive", dot: "bg-destructive", label: "Disabled" },
  };
  const s = map[status] || map.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

/* ─── Type icon ─── */
function TypeIcon({ type }: { type: string | null }) {
  if (type === "service") return <Wrench className="h-4 w-4 text-primary" />;
  if (type === "shop") return <Store className="h-4 w-4 text-primary" />;
  return <ShoppingBag className="h-4 w-4 text-primary" />;
}

/* ─── Expiry info ─── */
function ExpiryInfo({ listing }: { listing: Listing }) {
  if (!listing.auto_expire || !listing.listing_expires_at) return null;
  const exp = new Date(listing.listing_expires_at);
  const now = Date.now();
  const diff = exp.getTime() - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (diff < 0) {
    return <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Expired {Math.abs(days)}d ago</span>;
  }
  if (days <= 5) {
    return <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Expires in {days}d</span>;
  }
  return <span className="text-[10px] text-muted-foreground">{days}d remaining</span>;
}

/* ─── Main ─── */
export default function MyListingsPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["owner-listings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("marketplace_services")
        .select("id, title, listing_type, status, active, auto_expire, listing_expires_at, published_at, archived_at, price, currency, city, category, photo_urls, created_at")
        .eq("user_id", user.id)
        .neq("status", "deleted" as any)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Listing[];
    },
    enabled: !!user?.id,
  });

  /* Categorize listings into tabs */
  const grouped: Record<Tab, Listing[]> = { active: [], expired: [], draft: [], archived: [] };
  for (const l of listings) {
    const ds = getDisplayStatus(l);
    if (ds === "active") grouped.active.push(l);
    else if (ds === "expired") grouped.expired.push(l);
    else if (ds === "draft") grouped.draft.push(l);
    else grouped.archived.push(l); // archived + disabled
  }

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["owner-listings"] });
    qc.invalidateQueries({ queryKey: ["my_listings"] });
    qc.invalidateQueries({ queryKey: ["my_marketplace_services"] });
    qc.invalidateQueries({ queryKey: ["browse_marketplace_services"] });
  };

  /* ─── Actions ─── */
  const handleRepublish = async (id: string) => {
    setBusy(id);
    haptic("medium");
    const res = await republishListing(id);
    if (res.success) { toast.success("Listing republished — 30 days renewed"); invalidate(); }
    else toast.error(res.error || "Failed to republish");
    setBusy(null);
  };

  const handleArchive = async (id: string) => {
    setBusy(id);
    haptic("light");
    const res = await archiveListing(id);
    if (res.success) { toast.success("Listing archived"); invalidate(); }
    else toast.error(res.error || "Failed to archive");
    setBusy(null);
  };

  const handleDisable = async (id: string) => {
    setBusy(id);
    haptic("light");
    const res = await disableListing(id);
    if (res.success) { toast.success("Listing disabled"); invalidate(); }
    else toast.error(res.error || "Failed to disable");
    setBusy(null);
  };

  const handleDelete = async (id: string) => {
    setBusy(id);
    haptic("warning");
    const { error } = await supabase
      .from("marketplace_services")
      .update({ status: "deleted" as any, active: false, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (!error) { toast.success("Listing deleted"); invalidate(); }
    else toast.error("Failed to delete");
    setBusy(null);
  };

  const handleEdit = (id: string) => {
    haptic("light");
    navigate(`/dashboard/create-listing?edit=${id}`);
  };

  /* ─── Action buttons per status ─── */
  const renderActions = (listing: Listing, displayStatus: ListingStatus) => {
    const isBusy = busy === listing.id;
    const isSale = listing.listing_type === "sale";
    const isServiceOrShop = listing.listing_type === "service" || listing.listing_type === "shop";

    const btn = (label: string, icon: React.ReactNode, onClick: () => void, variant: "primary" | "outline" | "danger" = "outline") => {
      const base = "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-[0.96]";
      const styles = {
        primary: "bg-primary text-primary-foreground hover:opacity-90",
        outline: "border border-border bg-background text-foreground hover:bg-muted",
        danger: "border border-destructive/30 text-destructive hover:bg-destructive/10",
      };
      return (
        <button key={label} disabled={isBusy} onClick={onClick} className={`${base} ${styles[variant]} ${isBusy ? "opacity-50 pointer-events-none" : ""}`}>
          {icon}{label}
        </button>
      );
    };

    if (displayStatus === "expired" && isSale) {
      return (
        <div className="flex flex-wrap gap-2">
          {btn("Republish", <RotateCcw className="h-3.5 w-3.5" />, () => handleRepublish(listing.id), "primary")}
          {btn("Edit", <Pencil className="h-3.5 w-3.5" />, () => handleEdit(listing.id))}
          {btn("Archive", <Archive className="h-3.5 w-3.5" />, () => handleArchive(listing.id))}
          {btn("Delete", <Trash2 className="h-3.5 w-3.5" />, () => handleDelete(listing.id), "danger")}
        </div>
      );
    }

    if (displayStatus === "active" && isServiceOrShop) {
      return (
        <div className="flex flex-wrap gap-2">
          {btn("Edit", <Pencil className="h-3.5 w-3.5" />, () => handleEdit(listing.id))}
          {btn("Disable", <Ban className="h-3.5 w-3.5" />, () => handleDisable(listing.id))}
          {btn("Archive", <Archive className="h-3.5 w-3.5" />, () => handleArchive(listing.id))}
        </div>
      );
    }

    if (displayStatus === "active" && isSale) {
      return (
        <div className="flex flex-wrap gap-2">
          {btn("Edit", <Pencil className="h-3.5 w-3.5" />, () => handleEdit(listing.id))}
          {btn("Archive", <Archive className="h-3.5 w-3.5" />, () => handleArchive(listing.id))}
        </div>
      );
    }

    if (displayStatus === "draft") {
      return (
        <div className="flex flex-wrap gap-2">
          {btn("Edit", <Pencil className="h-3.5 w-3.5" />, () => handleEdit(listing.id), "primary")}
          {btn("Delete", <Trash2 className="h-3.5 w-3.5" />, () => handleDelete(listing.id), "danger")}
        </div>
      );
    }

    // archived / disabled
    return (
      <div className="flex flex-wrap gap-2">
        {btn("Republish", <RotateCcw className="h-3.5 w-3.5" />, () => handleRepublish(listing.id), "primary")}
        {btn("Delete", <Trash2 className="h-3.5 w-3.5" />, () => handleDelete(listing.id), "danger")}
      </div>
    );
  };

  /* ─── Listing Card ─── */
  const renderCard = (listing: Listing, i: number) => {
    const ds = getDisplayStatus(listing);
    const thumb = Array.isArray(listing.photo_urls) && listing.photo_urls.length > 0 ? listing.photo_urls[0] : null;

    return (
      <motion.div
        key={listing.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, delay: i * 0.03 }}
        className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm"
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            {thumb ? (
              <img src={thumb} alt={listing.title} className="w-12 h-12 rounded-xl object-cover shrink-0 ring-1 ring-border/20" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                <TypeIcon type={listing.listing_type} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{listing.title}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <StatusBadge status={ds} />
                <ExpiryInfo listing={listing} />
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{listing.price} {listing.currency}</span>
                {listing.city && <span>· {listing.city}</span>}
                {listing.category && <span>· {listing.category}</span>}
              </div>
            </div>
          </div>

          {/* Actions */}
          {renderActions(listing, ds)}
        </div>
      </motion.div>
    );
  };

  /* ─── Empty state ─── */
  const renderEmpty = (tab: Tab) => {
    const msgs: Record<Tab, { title: string; desc: string }> = {
      active: { title: "No active listings", desc: "Publish a listing to see it here." },
      expired: { title: "No expired listings", desc: "Sale listings expire after 30 days." },
      draft: { title: "No drafts", desc: "Start creating a listing to save it as draft." },
      archived: { title: "No archived listings", desc: "Archive listings you no longer need." },
    };
    const m = msgs[tab];
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">{m.title}</p>
        <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
      </div>
    );
  };

  return (
    <div className="w-full">
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-4">
          {TAB_META.map(t => {
            const count = grouped[t.value].length;
            return (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
                {count > 0 && (
                  <span className="ml-1 min-w-[1.25rem] h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center px-1.5">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {TAB_META.map(t => (
          <TabsContent key={t.value} value={t.value}>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-muted/40 animate-pulse" />)}
              </div>
            ) : grouped[t.value].length === 0 ? (
              renderEmpty(t.value)
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {grouped[t.value].map((l, i) => renderCard(l, i))}
                </div>
              </AnimatePresence>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
