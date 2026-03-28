import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { CheckSquare, Plus, Calendar, AlertTriangle, Clock, Trash2, Edit, X, Building2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import * as tasksRepo from "@/repositories/tasks.repository";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr, enUS, es, de, it, pt } from "@/lib/date-locales";

interface Task {
  id: string;
  org_id: string;
  user_id: string;
  property_id: string | null;
  tenant_id: string | null;
  assigned_to: string | null;
  subject: string;
  description: string | null;
  due_date: string;
  recurrence: string;
  priority: string;
  status: string;
  notify_participants: boolean;
  created_at: string;
}

interface Property {
  id: string;
  label: string;
}

interface Tenant {
  id: string;
  name: string;
}

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent/20 text-accent-foreground",
  high: "bg-destructive/20 text-destructive",
  urgent: "bg-destructive text-destructive-foreground",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  done: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-muted text-muted-foreground",
};

const emptyForm = {
  property_id: "",
  tenant_id: "",
  assigned_to: "",
  subject: "",
  description: "",
  due_date: "",
  recurrence: "once",
  priority: "medium",
  notify_participants: true,
};

const DATE_LOCALES: Record<string, any> = { fr, en: enUS, es, de, it, pt };

const Tasks = () => {
  const { t, locale } = useI18n();
  const { user, orgId } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const fetchData = async () => {
    if (!orgId) return;
    setLoading(true);
    const result = await tasksRepo.fetchTasksData(orgId);
    setTasks(result.tasks as Task[]);
    setProperties(result.properties);
    setTenants(result.tenants);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [orgId]);

  const openNewForm = () => { setEditingTask(null); setForm(emptyForm); setValidationErrors([]); setShowForm(true); };
  const openEditForm = (task: Task) => {
    setEditingTask(task);
    setForm({ property_id: task.property_id || "", tenant_id: task.tenant_id || "", assigned_to: task.assigned_to || "", subject: task.subject, description: task.description || "", due_date: task.due_date, recurrence: task.recurrence, priority: task.priority, notify_participants: task.notify_participants });
    setValidationErrors([]); setShowForm(true);
  };

  const validate = (): string[] => {
    const errors: string[] = [];
    if (!form.due_date) errors.push(t("page.tasks.due_date"));
    if (!form.subject.trim()) errors.push(t("page.tasks.subject"));
    if (!form.description.trim()) errors.push(t("page.tasks.description"));
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validate();
    if (errors.length > 0) { setValidationErrors(errors); return; }
    if (!user || !orgId) return;
    const payload = { org_id: orgId, user_id: user.id, property_id: form.property_id || null, tenant_id: form.tenant_id || null, assigned_to: form.assigned_to || null, subject: form.subject.trim(), description: form.description.trim() || null, due_date: form.due_date, recurrence: form.recurrence, priority: form.priority, notify_participants: form.notify_participants };
    try {
      if (editingTask) {
        await tasksRepo.updateTask(editingTask.id, payload);
        toast.success(t("page.tasks.modified"));
      } else {
        await tasksRepo.insertTask(payload);
        toast.success(t("page.tasks.created"));
      }
    } catch {
      toast.error(editingTask ? t("page.tasks.error_modify") : t("page.tasks.error_create"));
      return;
    }
    setShowForm(false); fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTaskId) return;
    try {
      await tasksRepo.deleteTask(deleteTaskId);
      toast.success(t("page.tasks.deleted"));
    } catch {
      toast.error(t("page.tasks.error_delete"));
      return;
    }
    setDeleteTaskId(null); fetchData();
  };

  const toggleStatus = async (task: Task) => {
    const next = task.status === "done" ? "pending" : task.status === "pending" ? "in_progress" : "done";
    await tasksRepo.updateTaskStatus(task.id, next);
    fetchData();
  };

  const isOverdue = (task: Task) => task.status !== "done" && new Date(task.due_date) < new Date();
  const pendingTasks = tasks.filter(t => t.status !== "done" && t.status !== "cancelled");
  const completedTasks = tasks.filter(t => t.status === "done");
  const overdueTasks = tasks.filter(t => isOverdue(t));

  const priorityLabel = (p: string) => t(`page.tasks.priority_${p}`);
  const statusLabel = (s: string) => t(`page.tasks.status_${s}`);
  const recurrenceLabel = (r: string) => t(`page.tasks.recurrence_${r}`);
  const dateLoc = DATE_LOCALES[locale] || fr;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("page.tasks.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("page.tasks.subtitle")}</p>
          </div>
          <Button onClick={openNewForm} className="gap-2"><Plus className="h-4 w-4" />{t("page.tasks.new")}</Button>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Clock, value: pendingTasks.length, label: t("page.tasks.in_progress"), bg: "bg-primary/10", iconColor: "text-primary" },
            { icon: AlertTriangle, value: overdueTasks.length, label: t("page.tasks.overdue"), bg: "bg-destructive/10", iconColor: "text-destructive" },
            { icon: CheckSquare, value: completedTasks.length, label: t("page.tasks.completed"), bg: "bg-success/10", iconColor: "text-success" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.05 }}
              className="bg-card rounded-xl p-4 border border-border/50 shadow-card relative overflow-hidden group hover:shadow-card-hover hover:border-accent/30 transition-all">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}><stat.icon className={`h-5 w-5 ${stat.iconColor}`} /></div>
                <div><p className="text-2xl font-bold text-foreground tabular-nums">{stat.value}</p><p className="text-xs text-muted-foreground">{stat.label}</p></div>
              </div>
            </motion.div>
          ))}
        </div>

        {overdueTasks.length > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-destructive">{overdueTasks.length} {t("page.tasks.overdue").toLowerCase()}</p>
              <p className="text-sm text-destructive/80">{overdueTasks.map(t => t.subject).join(", ")}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-card rounded-xl p-8 border border-border/50 shadow-card text-center">
            <p className="text-muted-foreground">{t("page.common.loading")}</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-card rounded-xl p-8 border border-border/50 shadow-card text-center">
            <CheckSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{t("page.tasks.empty")}</p>
            <Button onClick={openNewForm} variant="outline" className="mt-4 gap-2"><Plus className="h-4 w-4" /> {t("page.tasks.create_task")}</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task, idx) => {
              const propLabel = properties.find(p => p.id === task.property_id)?.label;
              return (
                <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                  className={`bg-card rounded-xl p-4 border shadow-card flex items-start gap-4 group transition-all hover:shadow-card-hover ${isOverdue(task) ? "border-destructive/50 bg-destructive/5" : "border-border/50 hover:border-accent/30"}`}>
                  <button onClick={() => toggleStatus(task)} className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${task.status === "done" ? "bg-success border-success text-success-foreground" : task.status === "in_progress" ? "border-info bg-info/10" : "border-muted-foreground/40"}`}>
                    {task.status === "done" && <CheckSquare className="h-3 w-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.subject}</span>
                      <Badge variant="outline" className={priorityColors[task.priority]}>{priorityLabel(task.priority)}</Badge>
                      <Badge variant="outline" className={statusColors[task.status]}>{statusLabel(task.status)}</Badge>
                      {isOverdue(task) && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> {t("page.tasks.overdue")}</Badge>}
                    </div>
                    {task.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(task.due_date), "dd MMM yyyy", { locale: dateLoc })}</span>
                      {propLabel && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {propLabel}</span>}
                      {task.recurrence !== "once" && <span>🔄 {recurrenceLabel(task.recurrence)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" onClick={() => openEditForm(task)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 text-destructive" onClick={() => setDeleteTaskId(task.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? t("page.tasks.edit_task") : t("page.tasks.new")}</DialogTitle>
          </DialogHeader>
          {validationErrors.length > 0 && (
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <p className="font-semibold text-foreground">{t("page.tasks.fill_required")}</p>
              <div className="text-sm text-muted-foreground">{validationErrors.map(e => <span key={e} className="block">{e} *</span>)}</div>
              <Button variant="outline" size="sm" onClick={() => setValidationErrors([])}>OK</Button>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-4 bg-muted/30 rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("page.tasks.general_info")}</p>
              <div><Label>{t("page.tasks.property")}</Label>
                <Select value={form.property_id} onValueChange={v => setForm(f => ({ ...f, property_id: v }))}><SelectTrigger><SelectValue placeholder={t("page.tasks.select_property")} /></SelectTrigger><SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>{t("page.tasks.due_date")} <span className="text-destructive">*</span></Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              <div><Label>{t("page.tasks.recurrence")}</Label>
                <Select value={form.recurrence} onValueChange={v => setForm(f => ({ ...f, recurrence: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                  <SelectItem value="once">{t("page.tasks.recurrence_once")}</SelectItem>
                  <SelectItem value="weekly">{t("page.tasks.recurrence_weekly")}</SelectItem>
                  <SelectItem value="monthly">{t("page.tasks.recurrence_monthly")}</SelectItem>
                  <SelectItem value="yearly">{t("page.tasks.recurrence_yearly")}</SelectItem>
                </SelectContent></Select>
              </div>
              <div><Label>{t("page.tasks.assigned_to")}</Label>
                <Select value={form.tenant_id} onValueChange={v => setForm(f => ({ ...f, tenant_id: v }))}><SelectTrigger><SelectValue placeholder={t("page.tasks.select_tenant")} /></SelectTrigger><SelectContent>{tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>{t("page.tasks.priority")}</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                  <SelectItem value="low">{t("page.tasks.priority_low")}</SelectItem>
                  <SelectItem value="medium">{t("page.tasks.priority_medium")}</SelectItem>
                  <SelectItem value="high">{t("page.tasks.priority_high")}</SelectItem>
                  <SelectItem value="urgent">{t("page.tasks.priority_urgent")}</SelectItem>
                </SelectContent></Select>
              </div>
            </div>
            <div className="space-y-4 bg-muted/30 rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("page.tasks.content")}</p>
              <div><Label>{t("page.tasks.subject")} <span className="text-destructive">*</span></Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
              <div><Label>{t("page.tasks.description")} <span className="text-destructive">*</span></Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
              <div className="flex items-center gap-3"><Switch checked={form.notify_participants} onCheckedChange={v => setForm(f => ({ ...f, notify_participants: v }))} /><Label>{t("page.tasks.notify")}</Label></div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
              <Button className="flex-1" onClick={handleSubmit}>{editingTask ? t("common.save") : t("page.tasks.create_task")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("page.tasks.delete_confirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("page.tasks.delete_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Tasks;
