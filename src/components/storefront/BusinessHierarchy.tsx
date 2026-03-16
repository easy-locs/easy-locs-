/**
 * BusinessHierarchy — Module 1 UI: Manage Company → Brand → Branch hierarchy.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Tag, MapPin, Plus, ChevronRight, Loader2, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props { onBranchShopLink?: (branchId: string, shopId: string) => void; }

export default function BusinessHierarchy({ onBranchShopLink }: Props) {
  const { user, orgId } = useAuth();
  const qc = useQueryClient();
  const [addDialog, setAddDialog] = useState<"company" | "brand" | "branch" | null>(null);
  const [parentId, setParentId] = useState<string>("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies", orgId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("companies").select("*").eq("org_id", orgId).order("created_at");
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands", orgId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("brands").select("*").eq("org_id", orgId).order("created_at");
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", orgId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("branches").select("*").eq("org_id", orgId).order("created_at");
      return data || [];
    },
    enabled: !!orgId,
  });

  const handleAdd = async () => {
    if (!name.trim() || !user || !orgId) return;
    setSaving(true);
    try {
      if (addDialog === "company") {
        await (supabase as any).from("companies").insert({ org_id: orgId, user_id: user.id, name: name.trim() });
        qc.invalidateQueries({ queryKey: ["companies", orgId] });
      } else if (addDialog === "brand" && parentId) {
        await (supabase as any).from("brands").insert({ company_id: parentId, org_id: orgId, user_id: user.id, name: name.trim() });
        qc.invalidateQueries({ queryKey: ["brands", orgId] });
      } else if (addDialog === "branch" && parentId) {
        await (supabase as any).from("branches").insert({ brand_id: parentId, org_id: orgId, user_id: user.id, name: name.trim() });
        qc.invalidateQueries({ queryKey: ["branches", orgId] });
      }
      toast.success(`${addDialog} added`);
      setAddDialog(null);
      setName("");
      setParentId("");
    } finally { setSaving(false); }
  };

  const handleDelete = async (table: string, id: string) => {
    await (supabase as any).from(table).delete().eq("id", id);
    qc.invalidateQueries({ queryKey: [table === "companies" ? "companies" : table === "brands" ? "brands" : "branches", orgId] });
    toast.success("Removed");
  };

  if (isLoading) return <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" /> Business Structure
        </h3>
        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { setAddDialog("company"); setParentId(""); setName(""); }}>
          <Plus className="h-3 w-3" /> Company
        </Button>
      </div>

      {companies.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
          Create your first company to organize brands and branches.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {companies.map((company: any) => {
            const companyBrands = brands.filter((b: any) => b.company_id === company.id);
            return (
              <Card key={company.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">{company.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="text-[10px] gap-1 h-6" onClick={() => { setAddDialog("brand"); setParentId(company.id); setName(""); }}>
                        <Plus className="h-2.5 w-2.5" /> Brand
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDelete("companies", company.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {companyBrands.length > 0 && (
                    <div className="pl-4 border-l-2 border-border space-y-2">
                      {companyBrands.map((brand: any) => {
                        const brandBranches = branches.filter((br: any) => br.brand_id === brand.id);
                        return (
                          <div key={brand.id} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Tag className="h-3 w-3 text-accent-foreground" />
                                <span className="text-xs font-medium">{brand.name}</span>
                                {brand.shop_id && <Badge variant="secondary" className="text-[8px]">Shop linked</Badge>}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" className="text-[9px] gap-1 h-5" onClick={() => { setAddDialog("branch"); setParentId(brand.id); setName(""); }}>
                                  <Plus className="h-2 w-2" /> Branch
                                </Button>
                                <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" onClick={() => handleDelete("brands", brand.id)}>
                                  <Trash2 className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            </div>

                            {brandBranches.length > 0 && (
                              <div className="pl-4 border-l border-border/50 space-y-1">
                                {brandBranches.map((branch: any) => (
                                  <div key={branch.id} className="flex items-center justify-between text-[11px]">
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                                      <span>{branch.name}</span>
                                      {branch.city && <span className="text-muted-foreground">• {branch.city}</span>}
                                      {branch.shop_id && <Store className="h-2.5 w-2.5 text-success" />}
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" onClick={() => handleDelete("branches", branch.id)}>
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={!!addDialog} onOpenChange={(v) => { if (!v) setAddDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Add {addDialog}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" placeholder={`${addDialog} name`} />
            </div>
            <Button className="w-full" onClick={handleAdd} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
