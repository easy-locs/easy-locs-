import { useState, useMemo, useEffect } from "react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useListingSync, useExploreRealtimeSync } from "@/hooks/useListingSync";
import { useAppStore } from "@/stores/useAppStore";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Store, ShoppingCart, Star, Users, Search, MapPin, Share2, ExternalLink, Compass, Sparkles, ArrowRightLeft, MessageSquare } from "lucide-react";
import ProviderProfileForm from "@/components/marketplace/ProviderProfileForm";
import ServiceForm, { type ServiceFormData } from "@/components/marketplace/ServiceForm";
import ServiceCard from "@/components/marketplace/ServiceCard";
import { type NotificationMeta } from "@/components/marketplace/BookingsManager";
import { dispatchSyncEvent, syncPaymentRequest } from "@/lib/shared/sync-engine";
import { useBookingLifecycle } from "@/hooks/useBookingLifecycle";
import BookingRequestCenter from "@/components/marketplace/BookingRequestCenter";
import BookingDialog from "@/components/marketplace/BookingDialog";
import { MARKETPLACE_CATEGORIES, getCategoryInfo } from "@/lib/taxonomy/category-tree";
import ReviewsManagerPanel from "@/components/marketplace/ReviewsManagerPanel";
import { computeExchangeRate, RATES_TO_EUR } from "@/hooks/useCurrencyConversion";
import { useEnsureOrg } from "@/hooks/useEnsureOrg";
import { checkServiceDuplicate } from "@/lib/geo/duplicateGuard";
import { assignZoneToService } from "@/lib/zones/autoAssignZone";

const DISPLAY_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "MAD", "AED", "SAR", "XOF", "CAD", "AUD", "TND", "TRY", "JPY", "CNY", "INR", "BRL", "MXN", "ZAR", "NGN", "KES", "EGP"];

const ActivitiesMarketplace = () => {
  const { user, orgId, subscription } = useAuth();
  const { ensureOrg, creating: creatingOrg } = useEnsureOrg();
  const qc = useQueryClient();
  const { changeStatus } = useListingSync();
  useExploreRealtimeSync();
  const [searchParams, setSearchParams] = useSearchParams();
  const [providerFormOpen, setProviderFormOpen] = useState(false);
  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [bookingService, setBookingService] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterCountry, setFilterCountry] = useState("");
  const [activeTab, setActiveTab] = useState("browse");
  const [revenueOpen, setRevenueOpen] = useState(false);
  const displayCurrency = useAppStore((s) => s.displayCurrency);
  const setDisplayCurrency = useAppStore((s) => s.setDisplayCurrency);
  const [deepLinkedBookingId, setDeepLinkedBookingId] = useState<string | null>(null);
  const [lastAppliedBookingId, setLastAppliedBookingId] = useState<string | null>(null);

  // Reactive deep-link: read ?booking=ID from searchParams (works on mount AND on subsequent navigations)
  useEffect(() => {
    const bookingId = searchParams.get("booking");
    if (bookingId && bookingId !== lastAppliedBookingId) {
      setActiveTab("bookings");
      setDeepLinkedBookingId(String(bookingId));
      setLastAppliedBookingId(String(bookingId));
      // Clean URL
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("booking");
        return next;
      }, { replace: true });
      console.log("[deep-link] marketplace booking param:", bookingId);
    }
  }, [searchParams, lastAppliedBookingId, setSearchParams]);


  // --- My Provider Profile ---
  const { data: myProvider } = useQuery({
    queryKey: ["my_marketplace_provider", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketplace_providers")
        .select("*")
        .eq("org_id", orgId!)
        .limit(1)
        .single();
      return data;
    },
    enabled: !!orgId,
  });

  // --- My Services ---
  const { data: myServices = [] } = useQuery({
    queryKey: ["my_marketplace_services", myProvider?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketplace_services")
        .select("*")
        .eq("provider_id", myProvider!.id)
        .order("sort_order");
      return (data || []);
    },
    enabled: !!myProvider?.id,
  });

  // --- My Bookings (received) ---
  const { data: myBookings = [] } = useQuery({
    queryKey: ["my_marketplace_bookings", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketplace_bookings")
        .select("*")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false });
      return (data || []);
    },
    enabled: !!orgId,
  });

  // Realtime: live updates for marketplace bookings
  useRealtimeSubscription({
    table: "marketplace_bookings",
    channelName: `marketplace-bookings-rt-${orgId}`,
    filter: orgId ? `org_id=eq.${orgId}` : undefined,
    queryKeys: [["my_marketplace_bookings", orgId]],
    enabled: !!orgId,
  });

  // --- Centralized Booking Lifecycle ---
  const lifecycle = useBookingLifecycle({
    provider: myProvider,
    services: myServices,
    queryKeys: [["my_marketplace_bookings"]],
  });

  // --- Browse all active services ---
  const { data: allServices = [] } = useQuery({
    queryKey: ["browse_marketplace_services", filterCat, filterCountry],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_public_marketplace_services", {
        _category: filterCat !== "all" ? filterCat : null,
        _country: filterCountry || null,
      });
      return (data || []);
    },
  });

  // --- All providers for display ---
  const { data: allProviders = [] } = useQuery({
    queryKey: ["browse_marketplace_providers"],
    queryFn: async () => {
      const { data } = await supabase
        .rpc("get_public_marketplace_providers", { p_active_only: true });
      return (data || []) as any[];
    },
  });

  const providersMap = useMemo(() => {
    const m: Record<string, any> = {};
    allProviders.forEach((p: any) => { m[p.id] = p; });
    return m;
  }, [allProviders]);

  const filteredServices = useMemo(() => {
    if (!searchQuery) return allServices;
    const q = searchQuery.toLowerCase();
    return allServices.filter((s: any) =>
      s.title?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.country?.toLowerCase().includes(q)
    );
  }, [allServices, searchQuery]);

  // --- Mutations ---
  const createProvider = useMutation({
    mutationFn: async (data: any) => {
      // Auto-create org for free accounts
      const resolvedOrgId = await ensureOrg();
      if (!resolvedOrgId) throw new Error("Impossible de créer votre espace. Veuillez vous reconnecter.");
      const slug = data.display_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);
      const { error } = await supabase.from("marketplace_providers").insert({
        ...data,
        slug,
        user_id: user!.id,
        org_id: resolvedOrgId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Provider profile created!");
      qc.invalidateQueries({ queryKey: ["my_marketplace_provider"] });
      setProviderFormOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateProvider = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("marketplace_providers").update(data).eq("id", myProvider!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated!");
      qc.invalidateQueries({ queryKey: ["my_marketplace_provider"] });
      setProviderFormOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createService = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const resolvedOrgId = orgId || await ensureOrg();
      if (!resolvedOrgId) throw new Error("Organisation introuvable");

      // Duplicate detection
      const dupCheck = await checkServiceDuplicate(data.title, (data as any).lat ?? null, (data as any).lng ?? null, (data as any).phone ?? null);
      if (dupCheck.blocked) {
        throw new Error(`Duplicate detected: similar service "${dupCheck.existingMatch?.name ?? "unknown"}" already exists nearby.`);
      }

      const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);
      const insertData: Record<string, unknown> = {
        ...data,
        booking_slug: slug,
        provider_id: myProvider!.id,
        org_id: resolvedOrgId,
        user_id: user!.id,
      };
      const { data: created, error } = await supabase.from("marketplace_services").insert(insertData as any).select("id, lat, lng").single();
      if (error) throw error;

      // Auto-assign zone
      if (created?.id && created.lat && created.lng) {
        assignZoneToService(created.id, created.lat, created.lng).catch(() => {});
      }
    },
    onSuccess: () => {
      toast.success("Service created!");
      qc.invalidateQueries({ queryKey: ["my_marketplace_services"] });
      qc.invalidateQueries({ queryKey: ["browse_marketplace_services"] });
      setServiceFormOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateService = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const { error } = await supabase.from("marketplace_services").update(data as any).eq("id", editingService!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service mis à jour !");
      qc.invalidateQueries({ queryKey: ["my_marketplace_services"] });
      qc.invalidateQueries({ queryKey: ["browse_marketplace_services"] });
      setServiceFormOpen(false);
      setEditingService(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketplace_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service supprimé");
      qc.invalidateQueries({ queryKey: ["my_marketplace_services"] });
      qc.invalidateQueries({ queryKey: ["browse_marketplace_services"] });
    },
  });

  const submitBooking = useMutation({
    mutationFn: async (formData: any) => {
      const svc = bookingService;
      const prov = providersMap[svc.provider_id];
      const provOrgId = prov?.org_id || svc.org_id;
      const totalPrice = formData.date_from && formData.date_to
        ? Number(svc.price) * Math.max(1, Math.ceil((new Date(formData.date_to).getTime() - new Date(formData.date_from).getTime()) / 86400000))
        : Number(svc.price) * (formData.quantity || 1);

      const { data: booking, error } = await supabase.from("marketplace_bookings").insert({
        service_id: svc.id,
        provider_id: svc.provider_id,
        org_id: provOrgId,
        booker_user_id: user?.id || null,
        booker_name: formData.booker_name,
        booker_email: formData.booker_email,
        booker_phone: formData.booker_phone,
        service_date: formData.service_date || formData.date_from,
        service_time: formData.service_time,
        date_from: formData.date_from || null,
        date_to: formData.date_to || null,
        quantity: formData.quantity || 1,
        total_price: totalPrice,
        currency: svc.currency,
        notes: formData.notes,
      }).select().single();
      if (error) throw error;

      // Sync engine: provider notification + email + thread
      await dispatchSyncEvent({
        type: "service_booking",
        context: {
          orgId: provOrgId,
          bookingId: booking?.id,
          propertyId: booking?.property_id || undefined,
          countryCode: svc.country || "",
        },
        actorUserId: user?.id || "",
        targetUserId: prov?.user_id || svc.user_id,
        targetEmail: prov?.email,
        clientName: formData.booker_name,
        serviceTitle: svc.title,
        serviceDate: formData.service_date || formData.date_from || "—",
        totalPrice,
        currency: svc.currency,
      });

      // Also notify the booker via sync engine (document_shared reused as confirmation)
      if (formData.booker_email) {
        const { sendCommunicationEvent } = await import("@/lib/shared/communication-pipeline");
        const { createDeepLinkMeta } = await import("@/lib/shared/notification-engine");
        const meta = createDeepLinkMeta({
          targetType: "marketplace_booking",
          targetId: booking?.id || "",
          module: "marketplace",
          countryCode: svc.country || "",
          bookingId: booking?.id,
          orgId: provOrgId,
        });
        await sendCommunicationEvent({
          orgId: provOrgId,
          recipientEmail: formData.booker_email,
          subject: `✅ Booking request sent: ${svc.title}`,
          message: `Hello ${formData.booker_name},\n\nYour booking for "${svc.title}" has been submitted.\nDate: ${formData.service_date || formData.date_from || "—"}\nAmount: ${totalPrice} ${svc.currency}\n\nYou will be notified when the provider confirms.\n\nThank you!`,
          category: "info",
          meta,
        });
      }
    },
    onSuccess: () => {
      toast.success("Demande de réservation envoyée !");
      setBookingService(null);
      qc.invalidateQueries({ queryKey: ["my_marketplace_bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateBookingStatus = async (id: string, status: string) => {
    await lifecycle.updateStatusById(myBookings, id, status as any);
  };

  const sendPaymentLink = (booking: any) => {
    lifecycle.sendPaymentLink(booking);
  };

  const confirmPayment = async (id: string) => {
    await lifecycle.confirmPaymentById(myBookings, id);
  };

  const storefrontUrl = myProvider?.slug
    ? `${window.location.origin}/provider/${myProvider.slug}`
    : null;

  const shareStorefront = () => {
    if (storefrontUrl) {
      navigator.clipboard.writeText(storefrontUrl);
      toast.success("Lien vitrine copié !");
    }
  };

  // Stats
  const totalBookings = myBookings.length;
  const pendingBookings = myBookings.filter((b: any) => b.status === "pending").length;

  // Revenue by currency
  const revenueByCurrency = useMemo(() => {
    const map: Record<string, number> = {};
    myBookings.filter((b: any) => b.payment_confirmed).forEach((b: any) => {
      const cur = b.currency || "EUR";
      map[cur] = (map[cur] || 0) + Number(b.total_price || 0);
    });
    return map;
  }, [myBookings]);

  const totalRevenueConverted = useMemo(() => {
    let total = 0;
    for (const [cur, amount] of Object.entries(revenueByCurrency)) {
      total += amount * computeExchangeRate(cur, displayCurrency);
    }
    return Math.round(total * 100) / 100;
  }, [revenueByCurrency, displayCurrency]);

  const formatAmount = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
    } catch {
      return `${amount.toLocaleString()} ${currency}`;
    }
  };

  const paidBookings = useMemo(() => myBookings.filter((b: any) => b.payment_confirmed), [myBookings]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Compass className="h-6 w-6 text-accent" /> Marketplace
            </h1>
            <p className="text-muted-foreground text-sm">Activités, services & prestataires à l'international</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!myProvider ? (
              <Button onClick={() => setProviderFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Créer un profil prestataire
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setProviderFormOpen(true)}>Modifier le profil</Button>
                <Button onClick={() => setServiceFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter un service
                </Button>
                {storefrontUrl && (
                  <Button variant="outline" size="sm" onClick={shareStorefront}>
                    <Share2 className="h-4 w-4 mr-1" /> Partager la vitrine
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* KPIs - Smart clickable synchronized with tab state */}
        {myProvider && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:shadow-card-hover hover:border-accent/40 transition-all group" onClick={() => setActiveTab("my-services")}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2"><Store className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground uppercase">Services</span></div>
                <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{myServices.length}</p>
                <p className="text-[10px] text-accent mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Mes services →</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-card-hover hover:border-accent/40 transition-all group" onClick={() => setActiveTab("bookings")}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground uppercase">Réservations</span></div>
                <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{totalBookings}</p>
                <p className="text-[10px] text-accent mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Voir les réservations →</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-card-hover hover:border-accent/40 transition-all group" onClick={() => setActiveTab("bookings")}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-warning" /><span className="text-xs text-muted-foreground uppercase">En attente</span></div>
                <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{pendingBookings}</p>
                <p className="text-[10px] text-accent mt-1 opacity-0 group-hover:opacity-100 transition-opacity">En attente →</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-card-hover hover:border-accent/40 transition-all group" onClick={() => setRevenueOpen(true)}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2"><Star className="h-4 w-4 text-[hsl(45,90%,50%)]" /><span className="text-xs text-muted-foreground uppercase">Revenus</span></div>
                <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{formatAmount(totalRevenueConverted, displayCurrency)}</p>
                {Object.keys(revenueByCurrency).length > 1 ? (
                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <ArrowRightLeft className="h-3 w-3" /> {Object.keys(revenueByCurrency).length} currencies
                  </p>
                ) : (
                  <p className="text-[10px] text-accent mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Détail revenus →</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="detail-tab-row">
            <TabsTrigger value="browse"><Compass className="h-4 w-4 mr-1" /> Explorer</TabsTrigger>
            {myProvider && <TabsTrigger value="my-services"><Store className="h-4 w-4 mr-1" /> Mes Services</TabsTrigger>}
            {myProvider && <TabsTrigger value="bookings"><ShoppingCart className="h-4 w-4 mr-1" /> Réservations</TabsTrigger>}
            {myProvider && <TabsTrigger value="reviews"><MessageSquare className="h-4 w-4 mr-1" /> Avis</TabsTrigger>}
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse" className="mt-4 space-y-4">
            {/* Category Grid */}
            {filterCat === "all" && !searchQuery && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                {MARKETPLACE_CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setFilterCat(c.value)}
                    className="group flex items-center gap-3 bg-card rounded-xl p-4 border border-border/50 shadow-card hover:shadow-card-hover hover:border-accent/30 transition-all text-left"
                  >
                    <span className="text-2xl">{c.icon}</span>
                    <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">{c.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Rechercher services, villes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10 w-full sm:w-40"
                  placeholder="Pays..."
                  value={filterCountry}
                  onChange={(e) => setFilterCountry(e.target.value)}
                />
              </div>
            </div>

            {filterCat !== "all" && (
              <div className="flex gap-2 items-center">
                <Button size="sm" variant="outline" onClick={() => setFilterCat("all")}>← Toutes les catégories</Button>
                <Badge variant="secondary" className="text-sm">
                  {getCategoryInfo(filterCat).icon} {getCategoryInfo(filterCat).label}
                </Badge>
              </div>
            )}

            {filteredServices.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun service trouvé</p>
                <p className="text-xs text-muted-foreground mt-1">Soyez le premier à proposer un service !</p>
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServices.map((s: any) => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    provider={providersMap[s.provider_id]}
                    onBook={() => setBookingService(s)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Services Tab */}
          {myProvider && (
            <TabsContent value="my-services" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{myServices.length} services proposés</p>
                {storefrontUrl && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={storefrontUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" /> Voir la vitrine
                    </a>
                  </Button>
                )}
              </div>
              {myServices.length === 0 ? (
                <Card><CardContent className="py-12 text-center">
                  <Store className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun service encore</p>
                  <Button className="mt-4" onClick={() => setServiceFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Ajouter votre premier service
                  </Button>
                </CardContent></Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myServices.map((s: any) => (
                    <ServiceCard
                      key={s.id}
                      service={s}
                      showActions
                      showCalendar
                      onEdit={() => { setEditingService(s); setServiceFormOpen(true); }}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* Bookings Tab — Full Booking Request Center */}
          {myProvider && (
            <TabsContent value="bookings" className="mt-4">
              <BookingRequestCenter
                bookings={myBookings}
                services={myServices}
                provider={myProvider}
                orgId={orgId || ""}
                onUpdateStatus={updateBookingStatus}
                onSendPaymentLink={sendPaymentLink}
                onConfirmPayment={confirmPayment}
                onModifyBooking={lifecycle.modifyBooking}
                onSendQuote={lifecycle.sendQuote}
                focusBookingId={deepLinkedBookingId}
              />
            </TabsContent>
          )}

          {/* Reviews Tab */}
          {myProvider && (
            <TabsContent value="reviews" className="mt-4">
              <ReviewsManagerPanel providerId={myProvider.id} />
            </TabsContent>
          )}
        </Tabs>

        {/* Provider Form */}
        <ProviderProfileForm
          open={providerFormOpen}
          onOpenChange={setProviderFormOpen}
          orgId={orgId || undefined}
          initialData={myProvider ? {
            provider_type: myProvider.provider_type,
            company_name: myProvider.company_name || "",
            display_name: myProvider.display_name,
            bio: myProvider.bio || "",
            email: myProvider.email || "",
            phone: myProvider.phone || "",
            whatsapp: myProvider.whatsapp || "",
            website_url: myProvider.website_url || "",
            country: myProvider.country,
            city: myProvider.city,
            address: myProvider.address || "",
            categories: myProvider.categories || [],
            payment_stripe_link: myProvider.payment_stripe_link || "",
            payment_paypal_email: myProvider.payment_paypal_email || "",
            payment_custom_url: myProvider.payment_custom_url || "",
            avatar_url: myProvider.avatar_url || "",
            invoicing_enabled: myProvider.invoicing_enabled || false,
            invoice_company_name: myProvider.invoice_company_name || "",
            invoice_address: myProvider.invoice_address || "",
            invoice_tax_id: myProvider.invoice_tax_id || "",
            invoice_prefix: myProvider.invoice_prefix || "INV",
            invoice_next_number: myProvider.invoice_next_number || 1,
          } : undefined}
          onSave={(data) => myProvider ? updateProvider.mutate(data) : createProvider.mutate(data)}
          isPending={createProvider.isPending || updateProvider.isPending}
        />

        {/* Service Form */}
        <ServiceForm
          open={serviceFormOpen}
          onOpenChange={(v) => { setServiceFormOpen(v); if (!v) setEditingService(null); }}
          orgId={orgId || undefined}
          initialData={editingService ? {
            title: editingService.title,
            description: editingService.description || "",
            category: editingService.category,
            price: editingService.price,
            currency: editingService.currency,
            price_type: editingService.price_type,
            duration_minutes: editingService.duration_minutes,
            country: editingService.country,
            city: editingService.city,
            location: editingService.location || "",
            max_capacity: editingService.max_capacity || 1,
            payment_stripe_link: editingService.payment_stripe_link || "",
            payment_paypal_email: editingService.payment_paypal_email || "",
            payment_custom_url: editingService.payment_custom_url || "",
            active: editingService.active,
            photo_urls: Array.isArray(editingService.photo_urls) ? editingService.photo_urls : [],
            requires_id_document: editingService.requires_id_document || false,
            source_contact_name: editingService.source_contact_name || "",
            source_contact_phone: editingService.source_contact_phone || "",
            source_contact_email: editingService.source_contact_email || "",
            source_contact_notes: editingService.source_contact_notes || "",
          } : undefined}
          providerCountry={myProvider?.country}
          providerCity={myProvider?.city}
          onSave={(data) => editingService ? updateService.mutate(data) : createService.mutate(data)}
          isPending={createService.isPending || updateService.isPending}
          allowVideo={subscription.subscribed}
        />

        {/* Booking Dialog */}
        {bookingService && (
          <BookingDialog
            open={!!bookingService}
            onOpenChange={(v) => !v && setBookingService(null)}
            service={bookingService}
            provider={providersMap[bookingService.provider_id]}
            onSubmit={(data) => submitBooking.mutate(data)}
            isPending={submitBooking.isPending}
          />
        )}

        {/* Revenue Detail Dialog */}
        <Dialog open={revenueOpen} onOpenChange={setRevenueOpen}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-[hsl(45,90%,50%)]" /> Détail des Revenus
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Currency Selector */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Afficher en :</span>
                <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISPLAY_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Total */}
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 text-center">
                <p className="text-xs text-muted-foreground uppercase">Revenu Total</p>
                <p className="text-3xl font-bold text-foreground tabular-nums">{formatAmount(totalRevenueConverted, displayCurrency)}</p>
              </div>

              {/* Breakdown by currency */}
              {Object.keys(revenueByCurrency).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Par devise d'origine</p>
                  {Object.entries(revenueByCurrency).map(([cur, amount]) => (
                    <div key={cur} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                      <div>
                        <span className="font-medium text-foreground">{cur}</span>
                        <p className="text-xs text-muted-foreground">
                          Rate: 1 {cur} = {computeExchangeRate(cur, displayCurrency).toFixed(4)} {displayCurrency}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground tabular-nums">{formatAmount(amount, cur)}</p>
                        {cur !== displayCurrency && (
                          <p className="text-xs text-accent tabular-nums">
                            ≈ {formatAmount(amount * computeExchangeRate(cur, displayCurrency), displayCurrency)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Transactions */}
              {paidBookings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Transactions payées ({paidBookings.length})</p>
                  {paidBookings.map((b: any) => {
                    const svc = myServices.find((s: any) => s.id === b.service_id);
                    return (
                      <div key={b.id} className="flex items-center justify-between p-2 rounded-md bg-card border border-border text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground font-medium truncate">{b.booker_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{svc?.title || "Service"} • {b.service_date || "—"}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="font-bold text-foreground tabular-nums">{formatAmount(Number(b.total_price || 0), b.currency || "EUR")}</p>
                          {(b.currency || "EUR") !== displayCurrency && (
                            <p className="text-[10px] text-accent tabular-nums">
                              ≈ {formatAmount(Number(b.total_price || 0) * computeExchangeRate(b.currency || "EUR", displayCurrency), displayCurrency)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {Object.keys(revenueByCurrency).length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-6">Aucun paiement confirmé pour le moment</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ActivitiesMarketplace;
