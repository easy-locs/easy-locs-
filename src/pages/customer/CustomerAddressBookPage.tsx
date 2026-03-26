import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type AddressRow = {
  id: string;
  label: string;
  line1: string;
  city: string;
  isDefault: boolean;
};

const INITIAL_ROWS: AddressRow[] = [
  { id: "home", label: "Home", line1: "Al Barsha 1", city: "Dubai", isDefault: true },
  { id: "work", label: "Work", line1: "Business Bay", city: "Dubai", isDefault: false },
];

export default function CustomerAddressBookPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(INITIAL_ROWS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", line1: "", city: "" });

  const startEdit = (row: AddressRow) => {
    setEditingId(row.id);
    setForm({ label: row.label, line1: row.line1, city: row.city });
  };

  const saveEdit = () => {
    if (!editingId) return;
    setRows((prev) =>
      prev.map((row) =>
        row.id === editingId
          ? { ...row, label: form.label, line1: form.line1, city: form.city }
          : row
      )
    );
    setEditingId(null);
    toast.success("Address saved");
  };

  const addAddress = () => {
    const id = `addr_${Date.now()}`;
    const row: AddressRow = { id, label: "Other", line1: "", city: "Dubai", isDefault: false };
    setRows((prev) => [...prev, row]);
    startEdit(row);
  };

  const removeAddress = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
    toast.success("Address removed");
  };

  const makeDefault = (id: string) => {
    setRows((prev) => prev.map((row) => ({ ...row, isDefault: row.id === id })));
    toast.success("Default address updated");
  };

  return (
    <div className="app-mobile-page app-mobile-content bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Address Book</h1>
          <p className="text-xs text-muted-foreground">Manage saved delivery places</p>
        </div>
      </div>

      <button
        onClick={addAddress}
        className="mx-4 mb-4 w-[calc(100%-2rem)] rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold"
      >
        Add New Address
      </button>

      <div className="px-4 space-y-3">
        {rows.map((row) =>
          editingId === row.id ? (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
              <input
                value={form.label}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                placeholder="Label"
                className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
              />
              <input
                value={form.line1}
                onChange={(e) => setForm((p) => ({ ...p, line1: e.target.value }))}
                placeholder="Address line"
                className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
              />
              <input
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                placeholder="City"
                className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  className="rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded-xl bg-muted px-4 py-2.5 text-sm font-bold text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{row.label}</p>
                    {row.isDefault && (
                      <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{row.line1}</p>
                  <p className="text-[11px] text-muted-foreground/70">{row.city}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(row)} className="rounded-xl bg-muted px-3 py-2 text-xs font-bold text-foreground">Edit</button>
                <button onClick={() => makeDefault(row.id)} className="rounded-xl bg-muted px-3 py-2 text-xs font-bold text-foreground">Default</button>
                <button onClick={() => removeAddress(row.id)} className="rounded-xl bg-destructive/10 text-destructive px-3 py-2 text-xs font-bold">Remove</button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
