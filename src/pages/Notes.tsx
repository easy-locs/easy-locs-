import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { StickyNote, Plus, Trash2, Edit, X, Save } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  color: string;
}

const COLORS = ["bg-yellow-100/80 dark:bg-yellow-900/30", "bg-blue-100/80 dark:bg-blue-900/30", "bg-green-100/80 dark:bg-green-900/30", "bg-pink-100/80 dark:bg-pink-900/30", "bg-purple-100/80 dark:bg-purple-900/30"];

const Notes = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", color: COLORS[0] });

  // Persist in localStorage per user
  const storageKey = `easylocs-notes-${user?.id || "anon"}`;

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) setNotes(JSON.parse(stored));
  }, [storageKey]);

  const persist = (updated: Note[]) => {
    setNotes(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      toast({ title: "Titre requis", variant: "destructive" });
      return;
    }
    if (editingId) {
      persist(notes.map(n => n.id === editingId ? { ...n, title: form.title, content: form.content, color: form.color } : n));
      toast({ title: "Note modifiée" });
    } else {
      const newNote: Note = {
        id: crypto.randomUUID(),
        title: form.title,
        content: form.content,
        color: form.color,
        created_at: new Date().toISOString(),
      };
      persist([newNote, ...notes]);
      toast({ title: "Note ajoutée" });
    }
    setForm({ title: "", content: "", color: COLORS[0] });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (note: Note) => {
    setEditingId(note.id);
    setForm({ title: note.title, content: note.content, color: note.color });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    persist(notes.filter(n => n.id !== id));
    toast({ title: "Note supprimée" });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("page.notes.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("page.notes.subtitle")}</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ title: "", content: "", color: COLORS[0] }); }}
            className="flex items-center gap-2 bg-gradient-gold text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-gold hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            {t("page.notes.new")}
          </button>
        </div>

        {showForm && (
          <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{editingId ? "Modifier la note" : "Nouvelle note"}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Titre…"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Contenu de la note…"
              rows={4}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Couleur :</span>
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`h-6 w-6 rounded-full border-2 ${c} ${form.color === c ? "border-accent" : "border-transparent"}`} />
              ))}
            </div>
            <button onClick={handleSave} className="flex items-center gap-2 bg-gradient-gold text-accent-foreground px-5 py-2 rounded-lg text-sm font-semibold shadow-gold hover:opacity-90">
              <Save className="h-4 w-4" /> {editingId ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
        )}

        {notes.length === 0 && !showForm ? (
          <div className="bg-card rounded-xl p-8 border border-border/50 shadow-card text-center">
            <StickyNote className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{t("page.notes.empty")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map(note => (
              <div key={note.id} className={`rounded-xl p-5 shadow-card border border-border/30 ${note.color} group relative`}>
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(note)} className="p-1 rounded hover:bg-background/50"><Edit className="h-3.5 w-3.5 text-foreground" /></button>
                  <button onClick={() => handleDelete(note.id)} className="p-1 rounded hover:bg-background/50"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1 pr-12">{note.title}</h3>
                {note.content && <p className="text-xs text-foreground/70 whitespace-pre-wrap line-clamp-6">{note.content}</p>}
                <p className="text-[10px] text-muted-foreground mt-3">
                  {format(new Date(note.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Notes;
