/**
 * MerchantMenuCategoryManagerPage — Real DB-backed category manager.
 * CRUD on storefront_catalog_categories for a given merchant/shop.
 */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { merchantService } from "@/services/merchant.service";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Plus, Loader2, GripVertical, Trash2, Edit2, Check, X, FolderOpen } from "lucide-react";
import { toast } from "sonner";

export default function MerchantMenuCategoryManagerPage() {
  const navigate = useNavigate();
  const { merchantId } = useParams<{ merchantId: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["menu-categories", merchantId],
    queryFn: async () => {
      return merchantService.fetchCategories(merchantId!);
    },
    enabled: !!merchantId,
  });

  const handleAdd = async () => {
    if (!newName.trim() || !merchantId || !user) return;
    setAdding(true);
    try {
      const maxSort = categories.length > 0
        ? Math.max(...categories.map((c: any) => c.sort_order ?? 0)) + 1
        : 0;

      await merchantService.insertCategory(merchantId, newName.trim(), maxSort);
      setNewName("");
      qc.invalidateQueries({ queryKey: ["menu-categories", merchantId] });
      toast.success("Category added");
    } catch (err: any) {
      toast.error(err.message || "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await merchantService.renameCategory(id, editName.trim());
      qc.invalidateQueries({ queryKey: ["menu-categories", merchantId] });
      setEditingId(null);
      toast.success("Renamed");
    } catch {
      toast.error("Rename failed");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    try {
      await merchantService.deleteCategory(id);
      qc.invalidateQueries({ queryKey: ["menu-categories", merchantId] });
      toast.success("Category deleted");
    } catch {
      toast.error("Cannot delete — items may still reference this category");
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await merchantService.toggleCategory(id, active);
    qc.invalidateQueries({ queryKey: ["menu-categories", merchantId] });
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-5">
      <MobilePageHeader title="Menu Categories" backTo={`/my-shop/${merchantId}`} />

      {/* Add new category */}
      <Card className="border-border/40">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Pizzas, Drinks, Desserts..."
              className="h-11 flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="h-11 px-5 gap-1.5"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category list */}
      {isLoading ? (
        <div className="py-12 text-center">
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <FolderOpen className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No categories yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add categories to organize your menu</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat: any, idx: number) => (
            <Card key={cat.id} className="border-border/30 overflow-hidden">
              <CardContent className="p-3 flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab" />

                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{idx + 1}</span>
                </div>

                {editingId === cat.id ? (
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-9 flex-1"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleRename(cat.id)}
                    />
                    <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => handleRename(cat.id)}>
                      <Check className="w-4 h-4 text-primary" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${!cat.active ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {cat.name}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(cat.id, cat.name)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
