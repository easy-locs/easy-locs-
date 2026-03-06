import { useState, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Calendar, Link2, RefreshCw, Globe, AlertTriangle, CheckCircle2, Plus, Trash2, ExternalLink } from "lucide-react";
import { format, parseISO, eachDayOfInterval, isSameDay, isWithinInterval } from "date-fns";

const OTA_PLATFORMS = [
  { id: "airbnb", name: "Airbnb", color: "bg-[hsl(350,80%,55%)]", icon: "🏠" },
  { id: "booking", name: "Booking.com", color: "bg-[hsl(220,80%,45%)]", icon: "🅱️" },
  { id: "vrbo", name: "Vrbo", color: "bg-[hsl(200,70%,50%)]", icon: "🏡" },
  { id: "expedia", name: "Expedia", color: "bg-[hsl(45,90%,50%)]", icon: "✈️" },
  { id: "direct", name: "Direct", color: "bg-[hsl(var(--accent))]", icon: "📅" },
];

const ChannelManager = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [newConn, setNewConn] = useState({ provider: "airbnb", ical_url: "", property_id: "" });
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Fetch org
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

  // Fetch properties
  const { data: properties = [] } = useQuery({
    queryKey: ["properties", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id, label, city").eq("org_id", org!.id);
      return data || [];
    },
    enabled: !!org,
  });

  // Fetch OTA connections via RPC
  const { data: connections = [] } = useQuery({
    queryKey: ["ota_connections", org?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_ota_connections", { _org_id: org!.id });
      return (data || []) as Array<{
        id: string; provider: string; status: string; last_sync_at: string | null;
        linked_properties: any; created_at: string;
      }>;
    },
    enabled: !!org,
  });

  // Fetch reservations
  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("reservations" as any).select("*").eq("org_id", org!.id);
      return (data || []) as unknown as Array<{
        id: string; property_id: string; guest_name: string; check_in: string; check_out: string;
        status: string; ota_provider: string; amount: number;
      }>;
    },
    enabled: !!org,
  });

  // Sync iCal
  const syncMut = useMutation({
    mutationFn: async (conn: any) => {
      setSyncingId(conn.id);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("sync-ical", {
        body: {
          ical_url: conn.linked_properties?.[0]?.ical_url || "",
          property_id: conn.linked_properties?.[0]?.property_id || "",
          provider: conn.provider,
          org_id: org!.id,
        },
      });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Sync terminée : ${data.inserted} nouvelles, ${data.skipped} existantes`);
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["ota_connections"] });
      setSyncingId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setSyncingId(null);
    },
  });

  // Add connection
  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ota_connections").insert({
        org_id: org!.id,
        user_id: user!.id,
        provider: newConn.provider,
        status: "active",
        linked_properties: [{ property_id: newConn.property_id, ical_url: newConn.ical_url }],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Connexion OTA ajoutée");
      qc.invalidateQueries({ queryKey: ["ota_connections"] });
      setAddOpen(false);
      setNewConn({ provider: "airbnb", ical_url: "", property_id: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Delete connection
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ota_connections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Connexion supprimée");
      qc.invalidateQueries({ queryKey: ["ota_connections"] });
    },
  });

  // Calendar grid
  const calendarDays = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return eachDayOfInterval({ start, end });
  }, [selectedMonth]);

  const getReservationsForDay = (day: Date) =>
    reservations.filter(r => {
      try {
        return isWithinInterval(day, { start: parseISO(r.check_in), end: parseISO(r.check_out) });
      } catch { return false; }
    });

  const getPlatformInfo = (provider: string) => OTA_PLATFORMS.find(p => p.id === provider) || OTA_PLATFORMS[4];

  const totalRevenue = reservations.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const activeConns = connections.filter(c => c.status === "active").length;
  const conflicts = useMemo(() => {
    const issues: string[] = [];
    for (const day of calendarDays) {
      const dayRes = getReservationsForDay(day);
      const propMap = new Map<string, string[]>();
      dayRes.forEach(r => {
        const list = propMap.get(r.property_id) || [];
        list.push(r.guest_name);
        propMap.set(r.property_id, list);
      });
      propMap.forEach((guests, pid) => {
        if (guests.length > 1) issues.push(`${format(day, "dd/MM")} — ${guests.join(" vs ")}`);
      });
    }
    return issues;
  }, [calendarDays, reservations]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Channel Manager</h1>
            <p className="text-muted-foreground text-sm">Synchronisez vos calendriers OTA et gérez vos réservations</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Ajouter une connexion</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvelle connexion OTA</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Select value={newConn.provider} onValueChange={v => setNewConn(p => ({ ...p, provider: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OTA_PLATFORMS.filter(p => p.id !== "direct").map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.icon} {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newConn.property_id} onValueChange={v => setNewConn(p => ({ ...p, property_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un bien" /></SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.label} — {p.city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="URL iCal (https://...)" value={newConn.ical_url} onChange={e => setNewConn(p => ({ ...p, ical_url: e.target.value }))} />
                <Button className="w-full" onClick={() => addMut.mutate()} disabled={!newConn.ical_url || !newConn.property_id || addMut.isPending}>
                  {addMut.isPending ? "Ajout..." : "Ajouter"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Connexions actives</p>
            <p className="text-2xl font-bold text-foreground">{activeConns}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Réservations</p>
            <p className="text-2xl font-bold text-foreground">{reservations.length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Revenus OTA</p>
            <p className="text-2xl font-bold text-foreground">{totalRevenue.toLocaleString()} €</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Conflits</p>
            <p className={`text-2xl font-bold ${conflicts.length > 0 ? "text-destructive" : "text-accent"}`}>
              {conflicts.length}
            </p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="calendar">
          <TabsList>
            <TabsTrigger value="calendar"><Calendar className="h-4 w-4 mr-1" />Calendrier unifié</TabsTrigger>
            <TabsTrigger value="connections"><Link2 className="h-4 w-4 mr-1" />Connexions</TabsTrigger>
            <TabsTrigger value="reservations"><Globe className="h-4 w-4 mr-1" />Réservations</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Calendrier — {format(selectedMonth, "MMMM yyyy")}</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}>←</Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedMonth(new Date())}>Aujourd'hui</Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}>→</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">
                  {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                  ))}
                  {/* pad start */}
                  {Array.from({ length: (calendarDays[0]?.getDay() + 6) % 7 }).map((_, i) => (
                    <div key={`pad-${i}`} />
                  ))}
                  {calendarDays.map(day => {
                    const dayRes = getReservationsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div key={day.toISOString()} className={`min-h-[60px] border border-border rounded p-1 ${isToday ? "bg-accent/10 border-accent" : "bg-card"}`}>
                        <span className={`text-xs font-medium ${isToday ? "text-accent" : "text-foreground"}`}>{day.getDate()}</span>
                        <div className="space-y-0.5 mt-0.5">
                          {dayRes.slice(0, 2).map(r => {
                            const plat = getPlatformInfo(r.ota_provider);
                            return (
                              <div key={r.id} className={`text-[9px] text-white px-1 py-0.5 rounded truncate ${plat.color}`}>
                                {r.guest_name}
                              </div>
                            );
                          })}
                          {dayRes.length > 2 && <span className="text-[9px] text-muted-foreground">+{dayRes.length - 2}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-4">
                  {OTA_PLATFORMS.map(p => (
                    <div key={p.id} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded ${p.color}`} />
                      <span className="text-xs text-muted-foreground">{p.name}</span>
                    </div>
                  ))}
                </div>
                {conflicts.length > 0 && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-semibold text-destructive">Double-bookings détectés</span>
                    </div>
                    {conflicts.map((c, i) => (
                      <p key={i} className="text-xs text-destructive/80">{c}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="connections" className="mt-4">
            <div className="space-y-3">
              {connections.length === 0 && (
                <Card><CardContent className="py-8 text-center text-muted-foreground">Aucune connexion OTA. Cliquez "Ajouter une connexion" pour commencer.</CardContent></Card>
              )}
              {connections.map(conn => {
                const plat = getPlatformInfo(conn.provider);
                return (
                  <Card key={conn.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${plat.color} text-white`}>
                          {plat.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{plat.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Dernière sync : {conn.last_sync_at ? format(parseISO(conn.last_sync_at), "dd/MM/yyyy HH:mm") : "Jamais"}
                          </p>
                        </div>
                        <Badge variant={conn.status === "active" ? "default" : "secondary"}>
                          {conn.status === "active" ? <><CheckCircle2 className="h-3 w-3 mr-1" />Actif</> : conn.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => syncMut.mutate(conn)} disabled={syncingId === conn.id}>
                          <RefreshCw className={`h-4 w-4 mr-1 ${syncingId === conn.id ? "animate-spin" : ""}`} />
                          Sync
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMut.mutate(conn.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="reservations" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                {reservations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucune réservation importée</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 text-muted-foreground font-medium">Voyageur</th>
                          <th className="text-left py-2 text-muted-foreground font-medium">Plateforme</th>
                          <th className="text-left py-2 text-muted-foreground font-medium">Arrivée</th>
                          <th className="text-left py-2 text-muted-foreground font-medium">Départ</th>
                          <th className="text-left py-2 text-muted-foreground font-medium">Statut</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservations.map(r => {
                          const plat = getPlatformInfo(r.ota_provider);
                          return (
                            <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="py-2 font-medium text-foreground">{r.guest_name}</td>
                              <td className="py-2"><Badge variant="outline" className="text-xs">{plat.icon} {plat.name}</Badge></td>
                              <td className="py-2 text-muted-foreground">{r.check_in}</td>
                              <td className="py-2 text-muted-foreground">{r.check_out}</td>
                              <td className="py-2"><Badge variant={r.status === "confirmed" ? "default" : "secondary"}>{r.status}</Badge></td>
                              <td className="py-2 text-right font-medium text-foreground">{Number(r.amount || 0).toLocaleString()} €</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ChannelManager;
