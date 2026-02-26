import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { CheckSquare, Plus, Calendar, AlertTriangle, Clock, Trash2, Edit, X, Building2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
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
import { fr } from "date-fns/locale";

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

const Tasks = () => {
  const { t } = useI18n();
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
    const [tasksRes, propsRes, tenantsRes] = await Promise.all([
      supabase.from("tasks").select("*").eq("org_id", orgId).order("due_date", { ascending: true }),
      supabase.from("properties").select("id, label").eq("org_id", orgId),
      supabase.from("tenants").select("id, name").eq("org_id", orgId),
    ]);
    if (tasksRes.data) setTasks(tasksRes.data as Task[]);
    if (propsRes.data) setProperties(propsRes.data);
    if (tenantsRes.data) setTenants(tenantsRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [orgId]);

  const openNewForm = () => {
    setEditingTask(null);
    setForm(emptyForm);
    setValidationErrors([]);
    setShowForm(true);
  };

  const openEditForm = (task: Task) => {
    setEditingTask(task);
    setForm({
      property_id: task.property_id || "",
      tenant_id: task.tenant_id || "",
      assigned_to: task.assigned_to || "",
      subject: task.subject,
      description: task.description || "",
      due_date: task.due_date,
      recurrence: task.recurrence,
      priority: task.priority,
      notify_participants: task.notify_participants,
    });
    setValidationErrors([]);
    setShowForm(true);
  };

  const validate = (): string[] => {
    const errors: string[] = [];
    if (!form.due_date) errors.push("Échéance");
    if (!form.subject.trim()) errors.push("Sujet");
    if (!form.description.trim()) errors.push("Description");
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validate();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    if (!user || !orgId) return;

    const payload = {
      org_id: orgId,
      user_id: user.id,
      property_id: form.property_id || null,
      tenant_id: form.tenant_id || null,
      assigned_to: form.assigned_to || null,
      subject: form.subject.trim(),
      description: form.description.trim() || null,
      due_date: form.due_date,
      recurrence: form.recurrence,
      priority: form.priority,
      notify_participants: form.notify_participants,
    };

    if (editingTask) {
      const { error } = await supabase.from("tasks").update(payload).eq("id", editingTask.id);
      if (error) { toast.error("Erreur lors de la modification"); return; }
      toast.success("Tâche modifiée");
    } else {
      const { error } = await supabase.from("tasks").insert(payload);
      if (error) { toast.error("Erreur lors de la création"); return; }
      toast.success("Tâche créée");
    }

    setShowForm(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTaskId) return;
    const { error } = await supabase.from("tasks").delete().eq("id", deleteTaskId);
    if (error) { toast.error("Erreur lors de la suppression"); return; }
    toast.success("Tâche supprimée");
    setDeleteTaskId(null);
    fetchData();
  };

  const toggleStatus = async (task: Task) => {
    const next = task.status === "done" ? "pending" : task.status === "pending" ? "in_progress" : "done";
    await supabase.from("tasks").update({ status: next }).eq("id", task.id);
    fetchData();
  };

  const isOverdue = (task: Task) => task.status !== "done" && new Date(task.due_date) < new Date();

  const pendingTasks = tasks.filter(t => t.status !== "done" && t.status !== "cancelled");
  const completedTasks = tasks.filter(t => t.status === "done");
  const overdueTasks = tasks.filter(t => isOverdue(t));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tâches</h1>
            <p className="text-muted-foreground mt-1">Gérez vos tâches et rappels</p>
          </div>
          <Button onClick={openNewForm} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle tâche
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingTasks.length}</p>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{overdueTasks.length}</p>
                <p className="text-xs text-muted-foreground">En retard</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><CheckSquare className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{completedTasks.length}</p>
                <p className="text-xs text-muted-foreground">Terminées</p>
              </div>
            </div>
          </div>
        </div>

        {/* Overdue alert */}
        {overdueTasks.length > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-destructive">
                {overdueTasks.length} tâche{overdueTasks.length > 1 ? "s" : ""} en retard
              </p>
              <p className="text-sm text-destructive/80">
                {overdueTasks.map(t => t.subject).join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Task list */}
        {loading ? (
          <div className="bg-card rounded-xl p-8 border border-border/50 shadow-card text-center">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-card rounded-xl p-8 border border-border/50 shadow-card text-center">
            <CheckSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucune tâche pour le moment</p>
            <Button onClick={openNewForm} variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Créer une tâche
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const propLabel = properties.find(p => p.id === task.property_id)?.label;
              return (
                <div
                  key={task.id}
                  className={`bg-card rounded-xl p-4 border shadow-card flex items-start gap-4 group transition-colors ${
                    isOverdue(task) ? "border-destructive/50 bg-destructive/5" : "border-border/50"
                  }`}
                >
                  <button
                    onClick={() => toggleStatus(task)}
                    className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      task.status === "done"
                        ? "bg-green-500 border-green-500 text-white"
                        : task.status === "in_progress"
                        ? "border-blue-500 bg-blue-50"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {task.status === "done" && <CheckSquare className="h-3 w-3" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {task.subject}
                      </span>
                      <Badge variant="outline" className={priorityColors[task.priority]}>
                        {task.priority === "low" ? "Faible" : task.priority === "medium" ? "Moyen" : task.priority === "high" ? "Haute" : "Urgente"}
                      </Badge>
                      <Badge variant="outline" className={statusColors[task.status]}>
                        {task.status === "pending" ? "À faire" : task.status === "in_progress" ? "En cours" : task.status === "done" ? "Terminée" : "Annulée"}
                      </Badge>
                      {isOverdue(task) && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> En retard
                        </Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(task.due_date), "dd MMM yyyy", { locale: fr })}
                      </span>
                      {propLabel && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {propLabel}
                        </span>
                      )}
                      {task.recurrence !== "once" && (
                        <span>🔄 {task.recurrence === "weekly" ? "Hebdo" : task.recurrence === "monthly" ? "Mensuel" : task.recurrence === "yearly" ? "Annuel" : task.recurrence}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(task)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTaskId(task.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New / Edit Task Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Modifier la tâche" : "Nouvelle tâche"}</DialogTitle>
          </DialogHeader>

          {/* Validation alert */}
          {validationErrors.length > 0 && (
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <p className="font-semibold text-foreground">Veuillez remplir les champs requis</p>
              <div className="text-sm text-muted-foreground">
                {validationErrors.map(e => <span key={e} className="block">{e} *</span>)}
              </div>
              <Button variant="outline" size="sm" onClick={() => setValidationErrors([])}>OK</Button>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-4 bg-muted/30 rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informations générales</p>

              <div>
                <Label>Bien</Label>
                <Select value={form.property_id} onValueChange={v => setForm(f => ({ ...f, property_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un bien" /></SelectTrigger>
                  <SelectContent>
                    {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Échéance <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>

              <div>
                <Label>Récurrence</Label>
                <Select value={form.recurrence} onValueChange={v => setForm(f => ({ ...f, recurrence: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Une fois</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="yearly">Annuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Assignée à</Label>
                <Select value={form.tenant_id} onValueChange={v => setForm(f => ({ ...f, tenant_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un locataire" /></SelectTrigger>
                  <SelectContent>
                    {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priorité</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Faible</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 bg-muted/30 rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</p>
              <div>
                <Label>Sujet <span className="text-destructive">*</span></Label>
                <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Sujet de la tâche" />
              </div>
              <div>
                <Label>Description <span className="text-destructive">*</span></Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Détails de la tâche..." rows={3} />
              </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Notifications</p>
              <div className="flex items-center justify-between">
                <Label>Notifier les participants</Label>
                <Switch checked={form.notify_participants} onCheckedChange={v => setForm(f => ({ ...f, notify_participants: v }))} />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button className="flex-1" onClick={handleSubmit}>
                {editingTask ? "Enregistrer" : "Créer la tâche"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette tâche ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Tasks;
