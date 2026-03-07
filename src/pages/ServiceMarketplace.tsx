import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Store, Star, ShoppingCart, Users, Plus, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { format } from "date-fns";

const SERVICE_CATEGORIES = [
  { value: "cleaning", label: "Ménage", icon: "🧹" },
  { value: "maintenance", label: "Maintenance", icon: "🔧" },
  { value: "inspection", label: "Inspection", icon: "🔍" },
  { value: "checkin", label: "Check-in / Check-out", icon: "🔑" },
  { value: "management", label: "Gestion locative", icon: "📋" },
];

const ServiceMarketplace = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [bookOpen, setBookOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [filterCat, setFilterCat] = useState("all");
  const [bookingData, setBookingData] = useState({ service_date: format(new Date(), "yyyy-MM-dd"), notes: "", property_id: "" });

  const { data: org } = useQuery({
    queryKey: ["org", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("org_members").select("org_id").eq("user_id", user!.id).limit(1).single();
      if (!data) return null;
      const { data: o } = await supabase.from("orgs").select("*").eq("id", data.org_id).single();
      return o;
    },
    enabled: !!user,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id, label, city").eq("org_id", org!.id);
      return data || [];
    },
    enabled: !!org,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ["service_providers", filterCat],
    queryFn: async () => {
      let q = supabase.from("service_providers" as any).select("*").eq("active", true);
      if (filterCat !== "all") q = q.eq("category", filterCat);
      const { data } = await q.order("rating", { ascending: false }).limit(50);
      return (data || []) as unknown as Array<{
        id: string; name: string; email: string; phone: string; category: string;
        description: string; hourly_rate: number; currency: string; city: string;
        country: string; rating: number; reviews_count: number; verified: boolean;
      }>;
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["service_bookings", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_bookings" as any).select("*").eq("org_id", org!.id).order("created_at", { ascending: false });
      return (data || []) as unknown as Array<{
        id: string; provider_id: string; service_date: string; service_type: string;
        status: string; amount: number; currency: string; notes: string; rating: number | null;
      }>;
    },
    enabled: !!org,
  });

  const bookMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("service_bookings" as any).insert({
        org_id: org!.id, user_id: user!.id,
        provider_id: selectedProvider.id,
        property_id: bookingData.property_id || null,
        service_date: bookingData.service_date,
        service_type: selectedProvider.category,
        amount: selectedProvider.hourly_rate,
        currency: selectedProvider.currency,
        notes: bookingData.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service réservé avec succès !");
      qc.invalidateQueries({ queryKey: ["service_bookings"] });
      setBookOpen(false);
      setSelectedProvider(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getCatInfo = (cat: string) => SERVICE_CATEGORIES.find(c => c.value === cat) || SERVICE_CATEGORIES[0];

  const totalSpent = bookings.reduce((s, b) => s + Number(b.amount || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground break-words">Marketplace Services</h1>
            <p className="text-muted-foreground text-sm break-words">Trouvez et réservez des prestataires pour vos biens</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground uppercase">Prestataires</span></div>
            <p className="text-2xl font-bold text-foreground">{providers.length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground uppercase">Réservations</span></div>
            <p className="text-2xl font-bold text-foreground">{bookings.length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><Star className="h-4 w-4 text-[hsl(45,90%,50%)]" /><span className="text-xs text-muted-foreground uppercase">Note moyenne</span></div>
            <p className="text-2xl font-bold text-foreground">{providers.length > 0 ? (providers.reduce((s, p) => s + Number(p.rating), 0) / providers.length).toFixed(1) : "—"}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><Store className="h-4 w-4 text-foreground" /><span className="text-xs text-muted-foreground uppercase">Dépensé</span></div>
            <p className="text-2xl font-bold text-foreground">{totalSpent.toLocaleString()} €</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="browse">
          <TabsList>
            <TabsTrigger value="browse"><Store className="h-4 w-4 mr-1" />Prestataires</TabsTrigger>
            <TabsTrigger value="bookings"><ShoppingCart className="h-4 w-4 mr-1" />Mes réservations</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="mt-4">
            <div className="flex gap-2 mb-4 flex-wrap">
              <Button size="sm" variant={filterCat === "all" ? "default" : "outline"} onClick={() => setFilterCat("all")}>Tous</Button>
              {SERVICE_CATEGORIES.map(c => (
                <Button key={c.value} size="sm" variant={filterCat === c.value ? "default" : "outline"} onClick={() => setFilterCat(c.value)}>
                  {c.icon} {c.label}
                </Button>
              ))}
            </div>
            {providers.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun prestataire disponible pour le moment</p>
                <p className="text-xs text-muted-foreground mt-1">La marketplace se remplit progressivement</p>
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {providers.map(provider => {
                  const cat = getCatInfo(provider.category);
                  return (
                    <Card key={provider.id} className="hover:border-accent/50 transition-colors">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-accent/10 text-accent text-lg">{cat.icon}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">{provider.name}</h3>
                              {provider.verified && <CheckCircle2 className="h-4 w-4 text-accent" />}
                            </div>
                            <p className="text-xs text-muted-foreground">{provider.city}, {provider.country}</p>
                            <Badge variant="outline" className="text-xs mt-1">{cat.icon} {cat.label}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{provider.description || "Prestataire professionnel"}</p>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-[hsl(45,90%,50%)]" />
                            <span className="text-sm font-medium text-foreground">{Number(provider.rating).toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">({provider.reviews_count})</span>
                          </div>
                          <span className="font-bold text-foreground">{Number(provider.hourly_rate).toLocaleString()} €/h</span>
                        </div>
                        <Button className="w-full mt-3" size="sm" onClick={() => { setSelectedProvider(provider); setBookOpen(true); }}>
                          Réserver
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                {bookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucune réservation de service</p>
                ) : (
                  <div className="space-y-3">
                    {bookings.map(b => {
                      const prov = providers.find(p => p.id === b.provider_id);
                      const cat = getCatInfo(b.service_type);
                      return (
                        <div key={b.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{cat.icon}</span>
                            <div>
                              <p className="font-medium text-foreground">{prov?.name || "Prestataire"}</p>
                              <p className="text-xs text-muted-foreground">{b.service_date} — {cat.label}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={b.status === "completed" ? "default" : b.status === "confirmed" ? "secondary" : "outline"}>
                              {b.status === "completed" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                              {b.status}
                            </Badge>
                            <span className="font-bold text-foreground">{Number(b.amount).toLocaleString()} €</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Booking dialog */}
        <Dialog open={bookOpen} onOpenChange={v => { setBookOpen(v); if (!v) setSelectedProvider(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Réserver {selectedProvider?.name}</DialogTitle></DialogHeader>
            {selectedProvider && (
              <div className="space-y-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="font-medium text-foreground">{getCatInfo(selectedProvider.category).icon} {getCatInfo(selectedProvider.category).label}</p>
                  <p className="text-sm text-muted-foreground">{selectedProvider.hourly_rate} €/h — {selectedProvider.city}</p>
                </div>
                <Select value={bookingData.property_id || "none"} onValueChange={v => setBookingData(p => ({ ...p, property_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un bien" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Aucun —</SelectItem>
                    {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.label} — {p.city}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="date" value={bookingData.service_date} onChange={e => setBookingData(p => ({ ...p, service_date: e.target.value }))} />
                <Textarea placeholder="Instructions / notes" value={bookingData.notes} onChange={e => setBookingData(p => ({ ...p, notes: e.target.value }))} />
                <Button className="w-full" onClick={() => bookMut.mutate()} disabled={bookMut.isPending}>
                  {bookMut.isPending ? "Réservation..." : `Réserver — ${selectedProvider.hourly_rate} €`}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ServiceMarketplace;
