import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type NoteRow = { id: string; title: string; note: string };

export default function AdminOperatorNotesPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<NoteRow[]>([
    { id: "1", title: "Morning shift", note: "Watch refund queue closely." },
  ]);

  const addNote = () => {
    if (!title.trim() || !note.trim()) { toast.error("Fill title and note"); return; }
    setRows((prev) => [{ id: crypto.randomUUID(), title: title.trim(), note: note.trim() }, ...prev]);
    setTitle(""); setNote("");
    toast.success("Operator note added");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Operator Notes</h1>
          <p className="text-xs text-muted-foreground">Internal ops notes</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" />
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Write note..." className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm mt-3 resize-none" />
        <button onClick={addNote} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold mt-4">Add Note</button>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold text-foreground">{row.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{row.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
