import { useState, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Store, ShoppingCart, Star, Users, Search, MapPin, Share2, ExternalLink, Compass, Sparkles } from "lucide-react";
import ProviderProfileForm from "@/components/marketplace/ProviderProfileForm";
import ServiceForm, { type ServiceFormData } from "@/components/marketplace/ServiceForm";
import ServiceCard from "@/components/marketplace/ServiceCard";
import BookingsManager from "@/components/marketplace/BookingsManager";
import BookingDialog from "@/components/marketplace/BookingDialog";
import { MARKETPLACE_CATEGORIES, getCategoryInfo } from "@/components/marketplace/MarketplaceCategories";

const ActivitiesMarketplace = () => {
  const { user, orgId } = useAuth();
  const qc = useQueryClient();
  const [providerFormOpen, setProviderFormOpen] = useState(false);
  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [bookingService, setBookingService] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterCountry, setFilterCountry] = useState("");

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

  // --- Browse all active services ---
  const { data: allServices = [] } = useQuery({
    queryKey: ["browse_marketplace_services", filterCat, filterCountry],
    queryFn: async () => {
      let q = supabase.from("marketplace_services").select("*").eq("active", true);
      if (filterCat !== "all") q = q.eq("category", filterCat);
      if (filterCountry) q = q.ilike("country", `%${filterCountry}%`);
      const { data } = await q.order("created_at", { ascending: false }).limit(100);
      return (data || []);
    },
  });

  // --- All providers for display ---
  const { data: allProviders = [] } = useQuery({
    queryKey: ["browse_marketplace_providers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketplace_providers")
        .select("*")
        .eq("active", true)
        .order("rating", { ascending: false })
        .limit(200);
      return (data || []);
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
      const slug = data.display_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);
      const { error } = await supabase.from("marketplace_providers").insert({
        ...data,
        slug,
        user_id: user!.id,
        org_id: orgId!,
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
      const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);
      const insertData: Record<string, unknown> = {
        ...data,
        booking_slug: slug,
        provider_id: myProvider!.id,
        org_id: orgId!,
        user_id: user!.id,
      };
      const { error } = await supabase.from("marketplace_services").insert(insertData as any);
      if (error) throw error;
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
      toast.success("Service updated!");
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
      toast.success("Service deleted");
      qc.invalidateQueries({ queryKey: ["my_marketplace_services"] });
      qc.invalidateQueries({ queryKey: ["browse_marketplace_services"] });
    },
  });

  const submitBooking = useMutation({
    mutationFn: async (formData: any) => {
      const svc = bookingService;
      const prov = providersMap[svc.provider_id];
      const { error } = await supabase.from("marketplace_bookings").insert({
        service_id: svc.id,
        provider_id: svc.provider_id,
        org_id: prov?.org_id || svc.org_id,
        booker_user_id: user?.id || null,
        booker_name: formData.booker_name,
        booker_email: formData.booker_email,
        booker_phone: formData.booker_phone,
        service_date: formData.service_date,
        service_time: formData.service_time,
        quantity: formData.quantity,
        total_price: Number(svc.price) * formData.quantity,
        currency: svc.currency,
        notes: formData.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking request sent!");
      setBookingService(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateBookingStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
    if (status === "completed") updates.completed_at = new Date().toISOString();
    const { error } = await supabase.from("marketplace_bookings").update(updates).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Booking ${status}`);
      qc.invalidateQueries({ queryKey: ["my_marketplace_bookings"] });
    }
  };

  const sendPaymentLink = (booking: any) => {
    const svc = myServices.find((s: any) => s.id === booking.service_id);
    const link = svc?.payment_stripe_link || myProvider?.payment_stripe_link || svc?.payment_paypal_email || myProvider?.payment_paypal_email;
    if (link) {
      const mailLink = `mailto:${booking.booker_email}?subject=Payment for ${svc?.title || "service"}&body=Please complete your payment: ${link}`;
      window.open(mailLink, "_blank");
      supabase.from("marketplace_bookings").update({ payment_link_sent: true }).eq("id", booking.id).then(() => {
        qc.invalidateQueries({ queryKey: ["my_marketplace_bookings"] });
      });
    } else {
      toast.error("No payment link configured");
    }
  };

  const confirmPayment = async (id: string) => {
    const { error } = await supabase.from("marketplace_bookings").update({
      payment_confirmed: true,
      payment_confirmed_at: new Date().toISOString(),
      payment_method: "manual",
    }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Payment confirmed!");
      qc.invalidateQueries({ queryKey: ["my_marketplace_bookings"] });
    }
  };

  const storefrontUrl = myProvider?.slug
    ? `${window.location.origin}/provider/${myProvider.slug}`
    : null;

  const shareStorefront = () => {
    if (storefrontUrl) {
      navigator.clipboard.writeText(storefrontUrl);
      toast.success("Storefront link copied!");
    }
  };

  // Stats
  const totalBookings = myBookings.length;
  const pendingBookings = myBookings.filter((b: any) => b.status === "pending").length;
  const totalRevenue = myBookings.filter((b: any) => b.payment_confirmed).reduce((s: number, b: any) => s + Number(b.total_price || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Compass className="h-6 w-6 text-accent" /> Services Marketplace
            </h1>
            <p className="text-muted-foreground text-sm">Global dynamic marketplace for activities & services</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!myProvider ? (
              <Button onClick={() => setProviderFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Create Provider Profile
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setProviderFormOpen(true)}>Edit Profile</Button>
                <Button onClick={() => setServiceFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add Service
                </Button>
                {storefrontUrl && (
                  <Button variant="outline" size="sm" onClick={shareStorefront}>
                    <Share2 className="h-4 w-4 mr-1" /> Share Storefront
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* KPIs */}
        {myProvider && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4">
              <div className="flex items-center gap-2"><Store className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground uppercase">Services</span></div>
              <p className="text-2xl font-bold text-foreground">{myServices.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground uppercase">Bookings</span></div>
              <p className="text-2xl font-bold text-foreground">{totalBookings}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground uppercase">Pending</span></div>
              <p className="text-2xl font-bold text-foreground">{pendingBookings}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="flex items-center gap-2"><Star className="h-4 w-4 text-[hsl(45,90%,50%)]" /><span className="text-xs text-muted-foreground uppercase">Revenue</span></div>
              <p className="text-2xl font-bold text-foreground">{totalRevenue.toLocaleString()} €</p>
            </CardContent></Card>
          </div>
        )}

        <Tabs defaultValue="browse">
          <TabsList className="detail-tab-row">
            <TabsTrigger value="browse"><Compass className="h-4 w-4 mr-1" /> Browse</TabsTrigger>
            {myProvider && <TabsTrigger value="my-services"><Store className="h-4 w-4 mr-1" /> My Services</TabsTrigger>}
            {myProvider && <TabsTrigger value="bookings"><ShoppingCart className="h-4 w-4 mr-1" /> Bookings</TabsTrigger>}
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
                  placeholder="Search services, cities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10 w-full sm:w-40"
                  placeholder="Country..."
                  value={filterCountry}
                  onChange={(e) => setFilterCountry(e.target.value)}
                />
              </div>
            </div>

            {filterCat !== "all" && (
              <div className="flex gap-2 items-center">
                <Button size="sm" variant="outline" onClick={() => setFilterCat("all")}>← All Categories</Button>
                <Badge variant="secondary" className="text-sm">
                  {getCategoryInfo(filterCat).icon} {getCategoryInfo(filterCat).label}
                </Badge>
              </div>
            )}

            {filteredServices.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No services found</p>
                <p className="text-xs text-muted-foreground mt-1">Be the first to list a service!</p>
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
                <p className="text-sm text-muted-foreground">{myServices.length} services listed</p>
                {storefrontUrl && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={storefrontUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" /> View Storefront
                    </a>
                  </Button>
                )}
              </div>
              {myServices.length === 0 ? (
                <Card><CardContent className="py-12 text-center">
                  <Store className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No services yet</p>
                  <Button className="mt-4" onClick={() => setServiceFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add Your First Service
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

          {/* Bookings Tab */}
          {myProvider && (
            <TabsContent value="bookings" className="mt-4">
              <BookingsManager
                bookings={myBookings}
                services={myServices}
                onUpdateStatus={updateBookingStatus}
                onSendPaymentLink={sendPaymentLink}
                onConfirmPayment={confirmPayment}
              />
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
      </div>
    </DashboardLayout>
  );
};

export default ActivitiesMarketplace;
