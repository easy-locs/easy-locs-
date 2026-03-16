/**
 * AddressBookManager — PPP. Address Book Manager
 * Multi-address management with favorites, delivery instructions, auto-geolocation.
 * PASS94-PPP
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Star, Plus, Edit3, Trash2, Navigation, Home, Briefcase, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Address {
  id: string;
  label: string;
  type: "home" | "work" | "other";
  street: string;
  city: string;
  postalCode: string;
  country: string;
  instructions: string;
  isFavorite: boolean;
  lat?: number;
  lng?: number;
  lastUsed?: string;
}

const MOCK_ADDRESSES: Address[] = [
  { id: "a1", label: "Maison", type: "home", street: "45 Rue de la Paix", city: "Paris", postalCode: "75002", country: "France", instructions: "Code porte: 4521. 3ème étage gauche.", isFavorite: true, lat: 48.869, lng: 2.331, lastUsed: "2026-03-16" },
  { id: "a2", label: "Bureau", type: "work", street: "120 Av. des Champs-Élysées", city: "Paris", postalCode: "75008", country: "France", instructions: "Accueil au RDC, demander Sophie.", isFavorite: true, lat: 48.870, lng: 2.307, lastUsed: "2026-03-15" },
  { id: "a3", label: "Entrepôt", type: "other", street: "8 Rue du Port", city: "Gennevilliers", postalCode: "92230", country: "France", instructions: "Quai B, sonner 2 fois.", isFavorite: false, lat: 48.934, lng: 2.292, lastUsed: "2026-03-10" },
  { id: "a4", label: "Parents", type: "home", street: "22 Chemin des Vignes", city: "Lyon", postalCode: "69003", country: "France", instructions: "Maison au fond de l'allée.", isFavorite: false, lat: 45.760, lng: 4.857 },
];

export default function AddressBookManager({ orgId }: { orgId: string }) {
  const [addresses, setAddresses] = useState(MOCK_ADDRESSES);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const typeIcon: Record<string, { icon: typeof Home; color: string }> = {
    home: { icon: Home, color: "hsl(var(--success))" },
    work: { icon: Briefcase, color: "hsl(var(--info))" },
    other: { icon: Building2, color: "hsl(var(--warning))" },
  };

  const filtered = addresses.filter(a =>
    !search || a.label.toLowerCase().includes(search.toLowerCase()) || a.street.toLowerCase().includes(search.toLowerCase()) || a.city.toLowerCase().includes(search.toLowerCase())
  );

  const toggleFavorite = (id: string) => {
    setAddresses(prev => prev.map(a => a.id === id ? { ...a, isFavorite: !a.isFavorite } : a));
  };

  const deleteAddress = (id: string) => {
    setAddresses(prev => prev.filter(a => a.id !== id));
  };

  const favorites = filtered.filter(a => a.isFavorite);
  const others = filtered.filter(a => !a.isFavorite);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4" style={{ color: "hsl(var(--info))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Carnet d'Adresses</h3>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: "hsl(var(--info) / 0.1)", color: "hsl(var(--info))" }}>
          {addresses.length} adresses
        </span>
      </div>

      {/* Search + Add */}
      <div className="flex gap-2">
        <Input placeholder="Rechercher une adresse…" value={search} onChange={e => setSearch(e.target.value)}
          className="h-8 text-xs flex-1" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
        <Button size="sm" className="h-8 px-3 text-xs" onClick={() => setShowAdd(!showAdd)}
          style={{ background: "hsl(var(--info) / 0.12)", color: "hsl(var(--info))" }}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="rounded-xl p-3 space-y-2 overflow-hidden"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--info) / 0.12)" }}>
            <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>Nouvelle adresse</p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Libellé" className="h-8 text-xs" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
              <select className="h-8 text-xs rounded-md px-2" style={{ background: "hsl(var(--hud-bg))", border: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }}>
                <option value="home">🏠 Maison</option>
                <option value="work">💼 Bureau</option>
                <option value="other">🏢 Autre</option>
              </select>
            </div>
            <Input placeholder="Adresse" className="h-8 text-xs" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Ville" className="h-8 text-xs" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
              <Input placeholder="Code postal" className="h-8 text-xs" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
              <Input placeholder="Pays" defaultValue="France" className="h-8 text-xs" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
            </div>
            <Textarea placeholder="Instructions de livraison…" rows={2} className="text-xs"
              style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 text-xs h-8" style={{ background: "hsl(var(--info))", color: "#fff" }}>
                <Navigation className="h-3 w-3 mr-1" /> Géolocaliser & Sauvegarder
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => setShowAdd(false)}
                style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Annuler</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[9px] font-bold px-1" style={{ color: "hsl(var(--warning))" }}>⭐ Favoris</p>
          {favorites.map(a => {
            const t = typeIcon[a.type];
            const Icon = t.icon;
            return (
              <div key={a.id} className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--warning) / 0.1)" }}>
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: t.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{a.label}</p>
                    <p className="text-[8px] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{a.street}, {a.postalCode} {a.city}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => toggleFavorite(a.id)} className="p-1 rounded-md transition-colors hover:bg-[hsl(var(--warning)/0.1)]">
                      <Star className="h-3 w-3" style={{ color: "hsl(var(--warning))", fill: "hsl(var(--warning))" }} />
                    </button>
                    <button onClick={() => deleteAddress(a.id)} className="p-1 rounded-md transition-colors hover:bg-[hsl(var(--destructive)/0.1)]">
                      <Trash2 className="h-3 w-3" style={{ color: "hsl(var(--destructive) / 0.5)" }} />
                    </button>
                  </div>
                </div>
                {a.instructions && (
                  <p className="text-[8px] mt-1.5 px-5" style={{ color: "hsl(var(--info) / 0.7)" }}>📝 {a.instructions}</p>
                )}
                {a.lastUsed && (
                  <p className="text-[7px] mt-1 px-5" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Dernière utilisation: {a.lastUsed}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Others */}
      {others.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[9px] font-bold px-1" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Autres adresses</p>
          {others.map(a => {
            const t = typeIcon[a.type];
            const Icon = t.icon;
            return (
              <div key={a.id} className="rounded-lg px-3 py-2 flex items-center gap-2"
                style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
                <Icon className="h-3 w-3 shrink-0" style={{ color: t.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{a.label}</p>
                  <p className="text-[8px] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{a.street}, {a.city}</p>
                </div>
                <button onClick={() => toggleFavorite(a.id)} className="p-1">
                  <Star className="h-3 w-3" style={{ color: "hsl(var(--hud-text-dim) / 0.2)" }} />
                </button>
                <button onClick={() => deleteAddress(a.id)} className="p-1">
                  <Trash2 className="h-3 w-3" style={{ color: "hsl(var(--destructive) / 0.4)" }} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
