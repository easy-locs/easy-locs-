/**
 * SettingsAddresses — Manage saved delivery & billing addresses.
 * Route: /settings/addresses
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Plus, Home, Briefcase, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

interface SavedAddress {
  id: string;
  label: string;
  icon: "home" | "work" | "other";
  line1: string;
  line2?: string;
  city: string;
  isDefault: boolean;
}

const INITIAL_ADDRESSES: SavedAddress[] = [
  { id: "1", label: "Home", icon: "home", line1: "", line2: "", city: "", isDefault: true },
  { id: "2", label: "Work", icon: "work", line1: "", line2: "", city: "", isDefault: false },
];

const ICON_MAP = { home: Home, work: Briefcase, other: MapPin };

export default function SettingsAddresses() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [addresses, setAddresses] = useState<SavedAddress[]>(INITIAL_ADDRESSES);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ line1: "", city: "" });

  const startEdit = (addr: SavedAddress) => {
    setEditing(addr.id);
    setEditForm({ line1: addr.line1, city: addr.city });
  };

  const saveEdit = (id: string) => {
    setAddresses(prev => prev.map(a => a.id === id ? { ...a, line1: editForm.line1, city: editForm.city } : a));
    setEditing(null);
    toast.success("Address saved");
  };

  const addNew = () => {
    const newAddr: SavedAddress = {
      id: Date.now().toString(),
      label: "Other",
      icon: "other",
      line1: "",
      city: "",
      isDefault: false,
    };
    setAddresses(prev => [...prev, newAddr]);
    startEdit(newAddr);
  };

  const removeAddr = (id: string) => {
    setAddresses(prev => prev.filter(a => a.id !== id));
    toast.success("Address removed");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/settings")}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: "hsl(var(--muted))" }}
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">{t("page.settings.address") || "Addresses"}</h1>
        </div>
        <button
          onClick={addNew}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "hsl(var(--primary) / 0.08)" }}
        >
          <Plus className="w-4.5 h-4.5" style={{ color: "hsl(var(--primary))" }} />
        </button>
      </header>

      <div className="flex-1 px-4 pb-24 mt-2">
        <p className="text-xs text-muted-foreground mb-3">
          Manage your saved delivery and billing addresses
        </p>

        <div className="space-y-2">
          {addresses.map((addr) => {
            const Icon = ICON_MAP[addr.icon];
            const isEmpty = !addr.line1;

            if (editing === addr.id) {
              return (
                <div
                  key={addr.id}
                  className="rounded-2xl p-4 space-y-3"
                  style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--primary) / 0.3)" }}
                >
                  <p className="text-sm font-bold text-foreground">{addr.label}</p>
                  <input
                    type="text"
                    placeholder="Street address"
                    value={editForm.line1}
                    onChange={e => setEditForm(f => ({ ...f, line1: e.target.value }))}
                    className="w-full rounded-xl px-3 py-2.5 text-sm bg-background border"
                    style={{ borderColor: "hsl(var(--border) / 0.3)" }}
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={editForm.city}
                    onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full rounded-xl px-3 py-2.5 text-sm bg-background border"
                    style={{ borderColor: "hsl(var(--border) / 0.3)" }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(addr.id)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                      style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                      style={{ background: "hsl(var(--muted))" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={addr.id}
                className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.12)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "hsl(var(--primary) / 0.08)" }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ color: "hsl(var(--primary))" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{addr.label}</p>
                    {addr.isDefault && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {isEmpty ? "No address saved yet" : `${addr.line1}${addr.city ? `, ${addr.city}` : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(addr)} className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-transform">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  {!addr.isDefault && (
                    <button onClick={() => removeAddr(addr.id)} className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-transform">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
