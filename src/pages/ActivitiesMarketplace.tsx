import { useState, useMemo, useEffect } from "react";
import { useListingSync, useExploreRealtimeSync } from "@/hooks/useListingSync";
import { useAppStore } from "@/stores/useAppStore";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
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
import { useBookingLifecycle } from "@/hooks/useBookingLifecycle";
import BookingRequestCenter from "@/components/marketplace/BookingRequestCenter";
import BookingDialog from "@/components/marketplace/BookingDialog";
import { MARKETPLACE_CATEGORIES, getCategoryInfo } from "@/lib/taxonomy/category-tree";
import ReviewsManagerPanel from "@/components/marketplace/ReviewsManagerPanel";
import { computeExchangeRate } from "@/hooks/useCurrencyConversion";
import { useMarketplaceData } from "@/hooks/marketplace/useMarketplaceData";
import { useMarketplaceMutations } from "@/hooks/marketplace/useMarketplaceMutations";

const DISPLAY_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "MAD", "AED", "SAR", "XOF", "CAD", "AUD", "TND", "TRY", "JPY", "CNY", "INR", "BRL", "MXN", "ZAR", "NGN", "KES", "EGP"];

const ActivitiesMarketplace = () => {
  const { user, orgId, subscription } = useAuth();
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

  // Data layer (extracted hook)
  const {
    myProvider, myServices, myBookings, providersMap,
    revenueByCurrency, totalRevenueConverted, paidBookings,
    totalBookings, pendingBookings,
  } = useMarketplaceData(orgId, displayCurrency);

  // Mutations layer (extracted hook)
  const mutations = useMarketplaceMutations(myProvider, orgId);

  // Deep-link handling
  useEffect(() => {
    const bookingId = searchParams.get("booking");
    if (bookingId && bookingId !== lastAppliedBookingId) {
      setActiveTab("bookings");
      setDeepLinkedBookingId(String(bookingId));
      setLastAppliedBookingId(String(bookingId));
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("booking");
        return next;
      }, { replace: true });
    }
  }, [searchParams, lastAppliedBookingId, setSearchParams]);

  // Booking lifecycle
  const lifecycle = useBookingLifecycle({
    provider: myProvider,
    services: myServices,
    queryKeys: [["my_marketplace_bookings"]],
  });

  // Browse services
  const { data: allServices = [] } = useQuery({
    queryKey: ["browse_marketplace_services", filterCat, filterCountry],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_public_marketplace_services", {
        _category: filterCat !== "all" ? filterCat : null,
        _country: filterCountry || null,
      });
      return data || [];
    },
  });

  const filteredServices = useMemo(() => {
    if (!searchQuery) return allServices;
    const q = searchQuery.toLowerCase();
    return allServices.filter((s: any) =>
      s.title?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.country?.toLowerCase().includes(q)
    );
  }, [allServices, searchQuery]);

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

  const formatAmount = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
    } catch {
      return `${amount.toLocaleString()} ${currency}`;
    }
  };

  

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
          onSave={(data) => myProvider ? mutations.updateProvider.mutate(data) : mutations.createProvider.mutate(data)}
          isPending={mutations.createProvider.isPending || mutations.updateProvider.isPending}
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
          onSave={(data) => editingService ? mutations.updateService.mutate({ id: editingService.id, data }) : mutations.createService.mutate(data)}
          isPending={mutations.createService.isPending || mutations.updateService.isPending}
          allowVideo={subscription.subscribed}
        />

        {/* Booking Dialog */}
        {bookingService && (
          <BookingDialog
            open={!!bookingService}
            onOpenChange={(v) => !v && setBookingService(null)}
            service={bookingService}
            provider={providersMap[bookingService.provider_id]}
            onSubmit={(data) => mutations.submitBooking.mutate({ formData: data, service: bookingService, providersMap })}
            isPending={mutations.submitBooking.isPending}
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
                          <p className="text-foreground font-medium min-w-0 break-words leading-snug">{b.booker_name}</p>
                          <p className="text-[10px] text-muted-foreground min-w-0 break-words leading-snug">{svc?.title || "Service"} • {b.service_date || "—"}</p>
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
