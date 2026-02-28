import { useState, useEffect, useCallback } from "react";
import FeatureGate from "@/components/subscription/FeatureGate";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Wrench, Plus, Pencil, Trash2, Calendar, Phone, Euro, CheckCircle2, Clock, AlertTriangle, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Intervention {
  id: string;
  property_id: string | null;
  tenant_id: string | null;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  scheduled_date: string | null;
  completed_date: string | null;
  provider_name: string;
  provider_phone: string;
  estimated_cost: number;
  actual_cost: number;
  notes: string;
  created_at: string;
}

const CATEGORIES = [
  { value: "repair", label: "Réparation" },
  { value: "maintenance", label: "Entretien" },
  { value: "renovation", label: "Rénovation" },
  { value: "plumbing", label: "Plomberie" },
  { value: "electrical", label: "Électricité" },
  { value: "painting", label: "Peinture" },
  { value: "locksmith", label: "Serrurerie" },
  { value: "heating", label: "Chauffage / Climatisation" },
  { value: "other", label: "Autre" },
];

const PRIORITIES = [
  { value: "low", label: "Basse", color: "bg-muted text-muted-foreground" },
  { value: "medium", label: "Moyenne", color: "bg-accent/20 text-accent-foreground" },
  { value: "high", label: "Haute", color: "bg-destructive/20 text-destructive" },
  { value: "urgent", label: "Urgente", color: "bg-destructive text-destructive-foreground" },
];

const STATUSES = [
  { value: "pending", label: "En attente", icon: Clock },
  { value: "scheduled", label: "Planifiée", icon: Calendar },
  { value: "in_progress", label: "En cours", icon: Wrench },
  { value: "completed", label: "Terminée", icon: CheckCircle2 },
  { value: "cancelled", label: "Annulée", icon: X },
];

const emptyForm = {
  title: "", description: "", category: "repair", priority: "medium", status: "pending",
  scheduled_date: "", completed_date: "", provider_name: "", provider_phone: "",
  estimated_cost: 0, actual_cost: 0, notes: "", property_id: "", tenant_id: "",
};

const Interventions = () => {
  const { t } = useI18n();
  const { user, orgId } = useAuth();
  const { toast } = useToast();

  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [properties, setProperties] = useState<{ id: string; label: string }[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string; property_id: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterStatus, setFilterStatus] = useState("all");

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const [{ data: intData }, { data: propData }, { data: tenData }] = await Promise.all([
      supabase.from("interventions").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      supabase.from("properties").select("id, label").eq("org_id", orgId).order("label"),
      supabase.from("tenants").select("id, name, property_id").eq("org_id", orgId).order("name"),
    ]);
    if (intData) setInterventions(intData as any);
    if (propData) setProperties(propData);
    if (tenData) setTenants(tenData);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (i: Intervention) => {
    setEditId(i.id);
    setForm({
      title: i.title, description: i.description || "", category: i.category, priority: i.priority,
      status: i.status, scheduled_date: i.scheduled_date || "", completed_date: i.completed_date || "",
      provider_name: i.provider_name || "", provider_phone: i.provider_phone || "",
      estimated_cost: i.estimated_cost || 0, actual_cost: i.actual_cost || 0,
      notes: i.notes || "", property_id: i.property_id || "", tenant_id: i.tenant_id || "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!orgId || !user || !form.title.trim()) {
      toast({ title: "Erreur", description: "Le titre est obligatoire", variant: "destructive" });
      return;
    }
    const record = {
      org_id: orgId, user_id: user.id, title: form.title.trim(), description: form.description,
      category: form.category, priority: form.priority, status: form.status,
      scheduled_date: form.scheduled_date || null, completed_date: form.completed_date || null,
      provider_name: form.provider_name, provider_phone: form.provider_phone,
      estimated_cost: form.estimated_cost || 0, actual_cost: form.actual_cost || 0,
      notes: form.notes, property_id: form.property_id || null, tenant_id: form.tenant_id || null,
    };
    if (editId) {
      const { error } = await supabase.from("interventions").update(record).eq("id", editId);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Intervention modifiée" });
    } else {
      const { error } = await supabase.from("interventions").insert(record);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Intervention ajoutée" });
    }
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("interventions").delete().eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Intervention supprimée" });
    load();
  };

  const filtered = filterStatus === "all" ? interventions : interventions.filter(i => i.status === filterStatus);
  const getPropLabel = (id: string | null) => properties.find(p => p.id === id)?.label || "—";
  const getTenantName = (id: string | null) => tenants.find(t => t.id === id)?.name || "";
  const getPriorityBadge = (p: string) => PRIORITIES.find(x => x.value === p) || PRIORITIES[1];
  const getStatusInfo = (s: string) => STATUSES.find(x => x.value === s) || STATUSES[0];

  return (
    <DashboardLayout>
      <FeatureGate feature="unlimited_properties" featureLabel={t("page.interventions.title")}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("page.interventions.title")}</h1>
              <p className="text-muted-foreground mt-1">{t("page.interventions.subtitle")}</p>
            </div>
            <Button onClick={openNew} className="bg-accent text-accent-foreground hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />{t("page.interventions.new")}
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <Button variant={filterStatus === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("all")}>Tout</Button>
            {STATUSES.map(s => (
              <Button key={s.value} variant={filterStatus === s.value ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(s.value)}>
                <s.icon className="h-3.5 w-3.5 mr-1" />{s.label}
              </Button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="bg-card rounded-xl p-8 border border-border/50 shadow-card text-center">
              <Wrench className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{t("page.interventions.empty")}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filtered.map(i => {
                const pri = getPriorityBadge(i.priority);
                const sti = getStatusInfo(i.status);
                const StatusIcon = sti.icon;
                return (
                  <div key={i.id} className="bg-card rounded-xl p-5 border border-border/50 shadow-card hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-foreground truncate">{i.title}</h3>
                          <Badge variant="outline" className={pri.color}>{pri.label}</Badge>
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <StatusIcon className="h-3 w-3" />{sti.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {CATEGORIES.find(c => c.value === i.category)?.label || i.category}
                          {i.property_id && <> · <span className="font-medium">{getPropLabel(i.property_id)}</span></>}
                          {i.tenant_id && <> · {getTenantName(i.tenant_id)}</>}
                        </p>
                        {i.description && <p className="text-sm text-muted-foreground line-clamp-2">{i.description}</p>}
                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                          {i.scheduled_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(i.scheduled_date).toLocaleDateString()}</span>}
                          {i.provider_name && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{i.provider_name}{i.provider_phone ? ` · ${i.provider_phone}` : ""}</span>}
                          {(i.estimated_cost > 0 || i.actual_cost > 0) && (
                            <span className="flex items-center gap-1">
                              <Euro className="h-3 w-3" />
                              {i.actual_cost > 0 ? `${i.actual_cost} €` : `~${i.estimated_cost} €`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Modifier l'intervention" : "Nouvelle intervention"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 mt-2">
              <div>
                <label className="text-sm font-medium">Titre *</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Fuite robinet cuisine" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Bien</label>
                  <Select value={form.property_id} onValueChange={v => setForm(f => ({ ...f, property_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un bien" /></SelectTrigger>
                    <SelectContent>
                      {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Locataire</label>
                  <Select value={form.tenant_id} onValueChange={v => setForm(f => ({ ...f, tenant_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Catégorie</label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Priorité</label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Statut</label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Décrivez l'intervention…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Date prévue</label>
                  <Input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Date réalisée</label>
                  <Input type="date" value={form.completed_date} onChange={e => setForm(f => ({ ...f, completed_date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Prestataire</label>
                  <Input value={form.provider_name} onChange={e => setForm(f => ({ ...f, provider_name: e.target.value }))} placeholder="Nom de l'artisan / société" />
                </div>
                <div>
                  <label className="text-sm font-medium">Téléphone prestataire</label>
                  <Input value={form.provider_phone} onChange={e => setForm(f => ({ ...f, provider_phone: e.target.value }))} placeholder="06 …" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Coût estimé (€)</label>
                  <Input type="number" value={form.estimated_cost || ""} onFocus={e => { if (Number(e.target.value) === 0) setForm(f => ({ ...f, estimated_cost: 0 })); }} onChange={e => setForm(f => ({ ...f, estimated_cost: Number(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Coût réel (€)</label>
                  <Input type="number" value={form.actual_cost || ""} onFocus={e => { if (Number(e.target.value) === 0) setForm(f => ({ ...f, actual_cost: 0 })); }} onChange={e => setForm(f => ({ ...f, actual_cost: Number(e.target.value) || 0 }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                <Button onClick={save} className="bg-accent text-accent-foreground">{editId ? "Enregistrer" : "Créer"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default Interventions;
