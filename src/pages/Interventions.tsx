import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { dispatchSyncEvent } from "@/lib/shared/sync-engine";
import { useCountryFilter } from "@/hooks/useCountryFilter";
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
import { PermissionGate } from "@/components/auth/PermissionGate";

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

const CATEGORY_KEYS = ["repair", "maintenance", "renovation", "plumbing", "electrical", "painting", "locksmith", "heating", "other"];

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent/20 text-accent-foreground",
  high: "bg-destructive/20 text-destructive",
  urgent: "bg-destructive text-destructive-foreground",
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  scheduled: Calendar,
  in_progress: Wrench,
  completed: CheckCircle2,
  cancelled: X,
};

const emptyForm = {
  title: "", description: "", category: "repair", priority: "medium", status: "pending",
  scheduled_date: "", completed_date: "", provider_name: "", provider_phone: "",
  estimated_cost: 0, actual_cost: 0, notes: "", property_id: "", tenant_id: "",
};

const Interventions = () => {
  const countryFilter = useCountryFilter();
  const { t } = useI18n();
  const { user, orgId } = useAuth();
  const { toast } = useToast();

  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [properties, setProperties] = useState<{ id: string; label: string; country?: string }[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string; property_id: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterStatus, setFilterStatus] = useState("all");

  const CATEGORIES = useMemo(() => CATEGORY_KEYS.map(v => ({ value: v, label: t(`page.interventions.cat_${v}`) })), [t]);
  const PRIORITIES = useMemo(() => ["low", "medium", "high", "urgent"].map(v => ({ value: v, label: t(`page.interventions.priority_${v}`), color: PRIORITY_COLORS[v] })), [t]);
  const STATUSES = useMemo(() => ["pending", "scheduled", "in_progress", "completed", "cancelled"].map(v => ({ value: v, label: t(`page.interventions.status_${v}`), icon: STATUS_ICONS[v] })), [t]);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    let propQuery = supabase.from("properties").select("id, label, country").eq("org_id", orgId).order("label");
    if (countryFilter) propQuery = propQuery.eq("country", countryFilter);
    const { data: propData } = await propQuery;
    const filteredProps = propData || [];
    setProperties(filteredProps.map(p => ({ id: p.id, label: p.label, country: p.country })));
    const propIds = filteredProps.map(p => p.id);

    let intQuery = supabase.from("interventions").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
    if (countryFilter && propIds.length > 0) {
      intQuery = intQuery.in("property_id", propIds);
    } else if (countryFilter) {
      setInterventions([]); setTenants([]); setLoading(false); return;
    }
    const { data: intData } = await intQuery;

    let tenQuery = supabase.from("tenants").select("id, name, property_id").eq("org_id", orgId).order("name");
    const { data: tenData } = await tenQuery;
    let filteredTenants = tenData || [];
    if (countryFilter) {
      const propIdSet = new Set(propIds);
      filteredTenants = filteredTenants.filter(t => t.property_id && propIdSet.has(t.property_id));
    }

    if (intData) setInterventions(intData as any);
    setTenants(filteredTenants);
    setLoading(false);
  }, [orgId, countryFilter]);

  useEffect(() => { load(); }, [load]);

  // Realtime: live updates for interventions
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel("interventions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "interventions", filter: `org_id=eq.${orgId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, load]);

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
      toast({ title: t("page.common.error"), description: t("page.interventions.title_required"), variant: "destructive" });
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
      if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return; }
      toast({ title: t("page.interventions.modified") });
    } else {
      const { data: inserted, error } = await supabase.from("interventions").insert(record).select().single();
      if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return; }
      toast({ title: t("page.interventions.added") });

      // Sync engine: intervention_created
      const prop = properties.find(p => p.id === form.property_id);
      dispatchSyncEvent({
        type: "intervention_created",
        context: {
          orgId: orgId!,
          propertyId: inserted.property_id || undefined,
          tenantId: inserted.tenant_id || undefined,
          countryCode: prop?.country || "",
        },
        actorUserId: user.id,
        title: inserted.title,
        priority: inserted.priority,
        propertyLabel: prop?.label || "—",
      });
    }
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("interventions").delete().eq("id", id);
    if (error) { toast({ title: t("page.common.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("page.interventions.deleted") });
    load();
  };

  const filtered = filterStatus === "all" ? interventions : interventions.filter(i => i.status === filterStatus);
  const getPropLabel = (id: string | null) => properties.find(p => p.id === id)?.label || "—";
  const getTenantName = (id: string | null) => tenants.find(tn => tn.id === id)?.name || "";
  const getPriorityBadge = (p: string) => PRIORITIES.find(x => x.value === p) || PRIORITIES[1];
  const getStatusInfo = (s: string) => STATUSES.find(x => x.value === s) || STATUSES[0];
  const getCatLabel = (c: string) => CATEGORIES.find(x => x.value === c)?.label || c;

  return (
    <DashboardLayout>
      <FeatureGate feature="unlimited_properties" featureLabel={t("page.interventions.title")}>
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="page-header mb-0">
              <h1>{t("page.interventions.title")}</h1>
              <p>{t("page.interventions.subtitle")}</p>
            </div>
            <PermissionGate permission="interventions:write">
              <Button onClick={openNew} className="btn-primary shrink-0">
                <Plus className="h-4 w-4 mr-2" />{t("page.interventions.new")}
              </Button>
            </PermissionGate>
          </motion.div>

          <div className="flex gap-1.5 flex-wrap">
            <Button variant={filterStatus === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("all")} className="text-xs h-8">{t("page.interventions.all")}</Button>
            {STATUSES.map(s => (
              <Button key={s.value} variant={filterStatus === s.value ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(s.value)} className="text-xs h-8">
                <s.icon className="h-3 w-3 me-1" />{s.label}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{t("page.interventions.loading")}</div>
          ) : filtered.length === 0 ? (
            <div className="bg-card rounded-xl p-8 border border-border/50 shadow-card text-center">
              <Wrench className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{t("page.interventions.empty")}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filtered.map((i, idx) => {
                const pri = getPriorityBadge(i.priority);
                const sti = getStatusInfo(i.status);
                const StatusIcon = sti.icon;
                return (
                  <motion.div key={i.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                    className="bg-card rounded-xl p-5 border border-border/50 shadow-card hover:shadow-card-hover hover:border-accent/30 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
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
                          {getCatLabel(i.category)}
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
                      <div className="flex gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(i)} className="h-8 w-8 sm:h-8 sm:w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(i.id)} className="h-8 w-8 sm:h-8 sm:w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? t("page.interventions.edit") : t("page.interventions.create_title")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 mt-2">
              <div>
                <label className="text-sm font-medium">{t("page.interventions.title_label")} *</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t("page.interventions.title_placeholder")} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm font-medium">{t("page.interventions.property")}</label>
                  <Select value={form.property_id} onValueChange={v => setForm(f => ({ ...f, property_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={t("page.interventions.select_property")} /></SelectTrigger>
                    <SelectContent>
                      {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t("page.interventions.tenant")}</label>
                  <Select value={form.tenant_id} onValueChange={v => setForm(f => ({ ...f, tenant_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={t("page.interventions.select_tenant")} /></SelectTrigger>
                    <SelectContent>
                      {tenants.map(tn => <SelectItem key={tn.id} value={tn.id}>{tn.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">{t("page.interventions.category")}</label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t("page.interventions.priority")}</label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t("page.interventions.status")}</label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{t("page.interventions.description")}</label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder={t("page.interventions.description_placeholder")} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm font-medium">{t("page.interventions.scheduled_date")}</label>
                  <Input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("page.interventions.completed_date")}</label>
                  <Input type="date" value={form.completed_date} onChange={e => setForm(f => ({ ...f, completed_date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm font-medium">{t("page.interventions.provider")}</label>
                  <Input value={form.provider_name} onChange={e => setForm(f => ({ ...f, provider_name: e.target.value }))} placeholder={t("page.interventions.provider_placeholder")} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("page.interventions.provider_phone")}</label>
                  <Input value={form.provider_phone} onChange={e => setForm(f => ({ ...f, provider_phone: e.target.value }))} placeholder="06 …" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t("page.interventions.estimated_cost")}</label>
                  <Input type="number" value={form.estimated_cost || ""} onFocus={e => { if (Number(e.target.value) === 0) setForm(f => ({ ...f, estimated_cost: 0 })); }} onChange={e => setForm(f => ({ ...f, estimated_cost: Number(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("page.interventions.actual_cost")}</label>
                  <Input type="number" value={form.actual_cost || ""} onFocus={e => { if (Number(e.target.value) === 0) setForm(f => ({ ...f, actual_cost: 0 })); }} onChange={e => setForm(f => ({ ...f, actual_cost: Number(e.target.value) || 0 }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{t("page.interventions.notes")}</label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("page.common.cancel")}</Button>
                <Button onClick={save} className="bg-accent text-accent-foreground">{editId ? t("page.common.save") : t("page.interventions.new")}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default Interventions;
