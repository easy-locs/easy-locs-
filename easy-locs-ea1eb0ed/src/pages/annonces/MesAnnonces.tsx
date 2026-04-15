import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, Eye, Heart, MoreHorizontal, RefreshCw, CheckCircle,
  Trash2, Clock, TrendingUp, Package, ShoppingBag, HandCoins, ChevronRight,
  BarChart3, Edit,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { c2cService } from "@/services/domain/c2c.service";
import type { C2CListingRow, C2COfferRow } from "@/repositories/domain/c2c.repo";
import { renewListing } from "@/lib/c2c/listing-lifecycle";
import SubPageShell from "@/components/layout/SubPageShell";
import SEOHead from "@/components/SEOHead";
import C2CCounterOfferSheet from "@/components/c2c/C2CCounterOfferSheet";

const TABS = [
  { id: "active", label: "Actives", icon: Package },
  { id: "draft", label: "Brouillons", icon: Edit },
  { id: "sold", label: "Vendues", icon: ShoppingBag },
  { id: "expired", label: "Expirées", icon: Clock },
  { id: "archived", label: "Archivées", icon: Trash2 },
];

function formatPrice(price: number, currency: string): string {
  if (price === 0) return "Gratuit";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "À l'instant";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function MesAnnonces() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState("active");
  const [listings, setListings] = useState<C2CListingRow[]>([]);
  const [offers, setOffers] = useState<(C2COfferRow & { marketplace_services?: { id: string; title: string; photo_urls: string[]; price: number; currency: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [counterOfferTarget, setCounterOfferTarget] = useState<{ offerId: string; amount: number; currency: string; title: string } | null>(null);
  const [allStats, setAllStats] = useState<{ active: number; sold: number; draft: number; totalViews: number; totalFavs: number }>({
    active: 0, sold: 0, draft: 0, totalViews: 0, totalFavs: 0,
  });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [data, offersData] = await Promise.all([
        c2cService.getMyListings(user.id, tab),
        tab === "active" ? c2cService.getOffersForSeller(user.id) : Promise.resolve([]),
      ]);
      setListings(data);
      setOffers(offersData);

      if (tab === "active") {
        const totalViews = data.reduce((s: number, l: C2CListingRow) => s + (l.view_count || 0), 0);
        const totalFavs = data.reduce((s: number, l: C2CListingRow) => s + (l.favorite_count || 0), 0);

        const [soldData, draftData] = await Promise.all([
          c2cService.getMyListings(user.id, "sold"),
          c2cService.getMyListings(user.id, "draft"),
        ]);
        setAllStats({
          active: data.length,
          sold: soldData.length,
          draft: draftData.length,
          totalViews,
          totalFavs,
        });
      }
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [user, tab]);

  useEffect(() => { load(); }, [load]);

  const handleRenew = async (id: string) => {
    await renewListing(id);
    toast.success("Annonce renouvelée pour 30 jours");
    load();
  };

  const handleMarkSold = async (id: string) => {
    await c2cService.markAsSold(id);
    toast.success("Annonce marquée comme vendue");
    load();
  };

  const handleDelete = async (id: string) => {
    await c2cService.updateListing(id, { active: false, status: "archived" } as Partial<import("@/repositories/domain/c2c.repo").C2CListingRow>);
    toast.success("Annonce archivée");
    load();
  };

  const handleAcceptOffer = async (offerId: string) => {
    if (!user) return;
    await c2cService.acceptOffer(offerId, user.id);
    toast.success("Offre acceptée ! L'acheteur sera notifié.");
    load();
  };

  const handleDeclineOffer = async (offerId: string) => {
    await c2cService.declineOffer(offerId);
    toast.info("Offre refusée");
    load();
  };

  const handleCounterOffer = async (amount: number) => {
    if (!counterOfferTarget) return;
    await c2cService.counterOffer(counterOfferTarget.offerId, amount);
    toast.success(`Contre-offre envoyée`);
    setCounterOfferTarget(null);
    load();
  };

  const pendingOffers = offers.filter((o) => o.status === "pending");

  const daysLeft = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const d = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
    return d > 0 ? d : 0;
  };

  return (
    <SubPageShell>
      <SEOHead title="Mes annonces — Easy-Locs" noindex />
      <div className="max-w-lg mx-auto pb-12">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted active:scale-95 transition-transform"><ArrowLeft className="h-4 w-4" /></button>
          <h1 className="text-lg font-extrabold flex-1">Mes annonces</h1>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/annonces/publier")}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-3.5 py-2 rounded-xl shadow-lg shadow-primary/20"
          >
            <Plus className="h-3.5 w-3.5" /> Créer
          </motion.button>
        </div>

        {tab === "active" && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5"
          >
            {[
              { label: "Actives", value: allStats.active, icon: Package, color: "text-primary" },
              { label: "Vendues", value: allStats.sold, icon: ShoppingBag, color: "text-emerald-600" },
              { label: "Vues", value: allStats.totalViews, icon: Eye, color: "text-blue-600" },
              { label: "Favoris", value: allStats.totalFavs, icon: Heart, color: "text-red-500" },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="bg-card border border-border/50 rounded-xl p-2.5 text-center">
                  <Icon className={`h-3.5 w-3.5 mx-auto mb-1 ${stat.color}`} />
                  <p className="text-base font-extrabold">{stat.value}</p>
                  <p className="text-[9px] text-muted-foreground font-medium">{stat.label}</p>
                </div>
              );
            })}
          </motion.div>
        )}

        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 hide-scrollbar">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all ${
                  tab === t.id
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-muted/50 text-muted-foreground border border-border/30"
                }`}
              >
                <Icon className="h-3 w-3" />
                {t.label}
              </button>
            );
          })}
        </div>

        {pendingOffers.length > 0 && tab === "active" && (
          <div className="mb-5 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-amber-500/10">
                <HandCoins className="h-4 w-4 text-amber-600" />
              </div>
              <h2 className="text-sm font-bold">Offres en attente ({pendingOffers.length})</h2>
            </div>
            {pendingOffers.map((offer) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card border border-amber-500/20 rounded-xl p-3.5 space-y-2.5"
              >
                <div className="flex items-center gap-3">
                  {offer.marketplace_services?.photo_urls?.[0] && (
                    <img src={offer.marketplace_services.photo_urls[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{offer.marketplace_services?.title || "Annonce"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">Offre :</span>
                      <span className="text-sm font-extrabold text-primary">{formatPrice(offer.amount, offer.currency)}</span>
                      {offer.marketplace_services?.price && (
                        <span className="text-[10px] text-muted-foreground line-through">{formatPrice(offer.marketplace_services.price, offer.currency)}</span>
                      )}
                    </div>
                  </div>
                </div>
                {offer.message && (
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 italic">"{offer.message}"</p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => handleAcceptOffer(offer.id)} className="flex-1 bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-xl active:scale-[0.98] transition-transform shadow-sm">
                    Accepter
                  </button>
                  <button onClick={() => setCounterOfferTarget({ offerId: offer.id, amount: offer.amount, currency: offer.currency, title: offer.marketplace_services?.title || "Annonce" })} className="flex-1 bg-amber-500/10 text-amber-700 text-xs font-bold py-2.5 rounded-xl active:scale-[0.98]">
                    Contre-offre
                  </button>
                  <button onClick={() => handleDeclineOffer(offer.id)} className="px-4 bg-muted text-muted-foreground text-xs font-bold py-2.5 rounded-xl active:scale-[0.98]">
                    Refuser
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card border border-border/50 rounded-xl p-3.5 flex gap-3">
                <div className="w-16 h-16 rounded-lg bg-muted/60 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3.5 bg-muted/60 animate-pulse rounded-full w-3/4" />
                  <div className="h-4 bg-muted/60 animate-pulse rounded-full w-1/3" />
                  <div className="h-2.5 bg-muted/40 animate-pulse rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 text-muted-foreground"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Package className="h-7 w-7 opacity-40" />
            </div>
            <p className="font-bold text-foreground">Aucune annonce</p>
            <p className="text-sm mt-1">Commencez par publier votre première annonce !</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/annonces/publier")}
              className="mt-5 bg-primary text-primary-foreground text-sm font-bold px-6 py-3 rounded-xl shadow-lg shadow-primary/20"
            >
              Publier une annonce
            </motion.button>
          </motion.div>
        ) : (
          <div className="space-y-2.5">
            {listings.map((l, i) => {
              const remaining = daysLeft(l.listing_expires_at);
              return (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-card border border-border/50 rounded-xl p-3.5 cursor-pointer hover:border-border transition-colors active:scale-[0.99]"
                  onClick={() => navigate(`/annonces/${l.slug || l.id}`)}
                >
                  <div className="flex gap-3">
                    {l.photo_urls?.[0] ? (
                      <img src={l.photo_urls[0]} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-muted/50 shrink-0 flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{l.title}</p>
                      <p className="text-sm font-extrabold text-primary">{formatPrice(l.price, l.currency || "EUR")}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                        <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {l.view_count || 0}</span>
                        <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" /> {l.favorite_count || 0}</span>
                        <span>{timeAgo(l.created_at)}</span>
                        {remaining != null && remaining <= 7 && (
                          <span className="flex items-center gap-0.5 text-amber-600 font-semibold"><Clock className="h-3 w-3" /> {remaining}j</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setActionMenu(actionMenu === l.id ? null : l.id); }}
                      className="p-1.5 rounded-full hover:bg-muted self-start active:scale-95 transition-transform"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>

                  {actionMenu === l.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex gap-2 mt-3 flex-wrap overflow-hidden"
                      onClick={e => e.stopPropagation()}
                    >
                      {l.status === "published" && (
                        <>
                          <button onClick={() => handleRenew(l.id)} className="flex items-center gap-1 text-xs bg-muted px-3 py-2 rounded-lg font-medium active:scale-95 transition-transform"><RefreshCw className="h-3 w-3" /> Renouveler</button>
                          <button onClick={() => handleMarkSold(l.id)} className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-600 px-3 py-2 rounded-lg font-medium active:scale-95 transition-transform"><CheckCircle className="h-3 w-3" /> Vendu</button>
                        </>
                      )}
                      <button onClick={() => handleDelete(l.id)} className="flex items-center gap-1 text-xs bg-red-500/10 text-red-600 px-3 py-2 rounded-lg font-medium active:scale-95 transition-transform"><Trash2 className="h-3 w-3" /> Supprimer</button>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {counterOfferTarget && (
        <C2CCounterOfferSheet
          currentAmount={counterOfferTarget.amount}
          currency={counterOfferTarget.currency}
          listingTitle={counterOfferTarget.title}
          onSubmit={handleCounterOffer}
          onClose={() => setCounterOfferTarget(null)}
        />
      )}
    </SubPageShell>
  );
}
