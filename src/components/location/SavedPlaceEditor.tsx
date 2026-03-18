/**
 * SavedPlaceEditor — Edit/rename Home, Work, and Favorites.
 * Used inside SmartLocationPicker or as standalone modal.
 */
import { useState } from "react";
import { Home, Briefcase, Star, Trash2, Pencil, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AddressAutocomplete from "@/components/ui/AddressAutocomplete";
import type { SavedPlace } from "@/hooks/useSmartLocation";

interface Props {
  places: SavedPlace[];
  onSave: (place: Omit<SavedPlace, "id"> & { id?: string }) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

const TYPE_ICONS = { home: Home, work: Briefcase, favorite: Star } as const;

export default function SavedPlaceEditor({ places, onSave, onRemove, onClose }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const editable = places.filter(p => p.type !== "recent");

  const startEdit = (place: SavedPlace) => {
    setEditingId(place.id);
    setEditLabel(place.label);
    setEditAddress(place.address);
  };

  const saveEdit = (place: SavedPlace) => {
    onSave({ ...place, label: editLabel, address: editAddress || place.address });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="rounded-2xl border border-border/20 bg-card p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-foreground">Edit Saved Places</p>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted/40 flex items-center justify-center">
          <X className="h-3.5 w-3.5 text-foreground" />
        </button>
      </div>

      <div className="space-y-1.5">
        {editable.map(place => {
          const Icon = TYPE_ICONS[place.type as keyof typeof TYPE_ICONS] || Star;
          const isEditing = editingId === place.id;

          return (
            <div key={place.id} className="rounded-xl border border-border/10 bg-muted/20 p-2.5">
              {isEditing ? (
                <div className="space-y-2">
                  {/* Rename label */}
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Label (e.g. Gym, Mom's)"
                      className="h-8 text-xs rounded-lg bg-background"
                    />
                  </div>
                  {/* Edit address */}
                  <AddressAutocomplete
                    value={editAddress}
                    onChange={setEditAddress}
                    onSelect={(result) => setEditAddress(result.label)}
                    placeholder="Search address…"
                  />
                  <div className="flex gap-1.5 justify-end">
                    <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-7 text-[10px]">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => saveEdit(place)} className="h-7 text-[10px]">
                      <Check className="h-3 w-3 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-foreground/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{place.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {place.address || "Not set"}
                    </p>
                  </div>
                  <button
                    onClick={() => startEdit(place)}
                    className="w-7 h-7 rounded-lg bg-muted/30 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </button>
                  {place.type === "favorite" && (
                    <button
                      onClick={() => onRemove(place.id)}
                      className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add favorite */}
      <button
        onClick={() => {
          const id = `fav-${Date.now()}`;
          onSave({ id, label: "New Place", type: "favorite", address: "", icon: "⭐" });
          setEditingId(id);
          setEditLabel("New Place");
          setEditAddress("");
        }}
        className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-dashed border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
      >
        <Star className="h-3.5 w-3.5" />
        <span className="text-[10px] font-medium">Add a favorite place</span>
      </button>
    </motion.div>
  );
}
