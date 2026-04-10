import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import * as candRepo from "@/repositories/candidates.repository";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Star, UserCheck, UserX, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PermissionGate } from "@/components/auth/PermissionGate";

const STATUSES = [
  { value: "new", labelKey: "page.candidates.status_new", icon: Clock, color: "text-blue-500" },
  { value: "shortlisted", labelKey: "page.candidates.status_shortlisted", icon: Star, color: "text-warning" },
  { value: "accepted", labelKey: "page.candidates.status_accepted", icon: UserCheck, color: "text-success" },
  { value: "rejected", labelKey: "page.candidates.status_rejected", icon: UserX, color: "text-destructive" },
];

interface Candidate {
  id: string; property_id: string | null; name: string; email: string; phone: string;
  profession: string; monthly_income: number; guarantor_info: string; notes: string;
  status: string; score: number; applied_at: string;
}

interface Property { id: string; label: string; }

const Candidates = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [form, setForm] = useState({ property_id: "", name: "", email: "", phone: "", profession: "", monthly_income: 0, guarantor_info: "", notes: "", score: 0 });

  const load = useCallback(async () => {
    if (!orgId) return;
    const { candidates: c, properties: p } = await candRepo.fetchCandidatesAndProperties(orgId);
    setCandidates(c as Candidate[]);
    setProperties(p);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!orgId || !user || !form.name) return;
    try {
      await candRepo.insertCandidate({
        org_id: orgId, user_id: user.id, property_id: form.property_id || null,
        name: form.name, email: form.email, phone: form.phone, profession: form.profession,
        monthly_income: form.monthly_income, guarantor_info: form.guarantor_info,
        notes: form.notes, score: form.score,
      });
      toast({ title: t("page.candidates.added") });
      setShowForm(false);
      setForm({ property_id: "", name: "", email: "", phone: "", profession: "", monthly_income: 0, guarantor_info: "", notes: "", score: 0 });
      await load();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await candRepo.updateCandidateStatus(id, status);
    toast({ title: t("page.candidates.status_updated") });
    await load();
  };

  const remove = async (id: string) => {
    await candRepo.deleteCandidate(id);
    toast({ title: t("page.candidates.deleted") });
    await load();
  };

  const filtered = candidates.filter(c => !filterStatus || c.status === filterStatus);
  const propName = (id: string | null) => properties.find(p => p.id === id)?.label || "—";

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="page-header mb-0">
            <h1>{t("page.candidates.title")}</h1>
            <p>{t("page.candidates.subtitle")}</p>
          </div>
          <PermissionGate permission="leads:write">
            <button onClick={() => setShowForm(true)} className="btn-primary shrink-0">
              <Plus className="h-4 w-4" /> {t("page.candidates.add")}
            </button>
          </PermissionGate>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {STATUSES.map(s => {
            const count = candidates.filter(c => c.status === s.value).length;
            return (
              <button key={s.value} onClick={() => setFilterStatus(filterStatus === s.value ? "" : s.value)}
                className={`bg-card rounded-xl border p-4 text-left transition-colors ${filterStatus === s.value ? "border-primary" : "border-border/50 hover:border-border"}`}>
                <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
                <p className="text-2xl font-bold text-foreground">{count}</p>
                <p className="text-xs text-muted-foreground">{t(s.labelKey)}</p>
              </button>
            );
          })}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-card rounded-xl border border-border/50 p-6 mb-6 space-y-4">
            <h3 className="font-semibold text-foreground">{t("page.candidates.new_candidate")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.candidates.name_label")} *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.candidates.email_label")}</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.candidates.phone_label")}</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.candidates.profession_label")}</label><input value={form.profession} onChange={e => setForm(f => ({ ...f, profession: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.candidates.income_label")}</label><input type="number" value={form.monthly_income} onChange={e => setForm(f => ({ ...f, monthly_income: +e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.candidates.property_label")}</label><select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"><option value="">{t("page.candidates.no_property")}</option>{properties.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.candidates.score_label")}</label><input type="number" min={0} max={100} value={form.score} onChange={e => setForm(f => ({ ...f, score: +e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.candidates.guarantor_label")}</label><input value={form.guarantor_info} onChange={e => setForm(f => ({ ...f, guarantor_info: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div><label className="block text-sm font-medium text-foreground mb-1">{t("page.candidates.notes_label")}</label><textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm resize-none" /></div>
            <div className="flex gap-3">
               <button onClick={save} className="bg-gradient-gold text-accent-foreground px-6 py-2 rounded-lg text-sm font-semibold shadow-gold hover:opacity-90">{t("page.common.save")}</button>
               <button onClick={() => setShowForm(false)} className="border border-border text-foreground px-6 py-2 rounded-lg text-sm hover:bg-muted">{t("page.common.cancel")}</button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {loading ? <p className="text-center text-muted-foreground py-8">{t("page.common.loading")}</p> :
            filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">{t("page.candidates.no_candidate")}</p> :
              filtered.map(c => {
                const st = STATUSES.find(s => s.value === c.status) || STATUSES[0];
                return (
                  <div key={c.id} className="bg-card rounded-xl border border-border/50 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground truncate">{c.name}</p>
                        {c.score > 0 && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{c.score}/100</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{c.profession || "—"} · {c.monthly_income > 0 ? `${c.monthly_income} €/mois` : "—"} · {propName(c.property_id)}</p>
                      {c.email && <p className="text-xs text-muted-foreground">{c.email} {c.phone && `· ${c.phone}`}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={c.status} onChange={e => updateStatus(c.id, e.target.value)} className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs">
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
                      </select>
                      <button onClick={() => remove(c.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Candidates;
