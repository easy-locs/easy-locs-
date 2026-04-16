import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";
import { serviceUseCases } from "@/domains/services/service";
import SubPageShell from "@/components/layout/SubPageShell";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { AppCard, CardContent } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Loader2, Briefcase, Clock, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function ProviderServicesCrudPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("");
  const [priceType, setPriceType] = useState<"fixed" | "hourly">("fixed");
  const [category, setCategory] = useState("");
  const [atHome, setAtHome] = useState(false);
  const [inOffice, setInOffice] = useState(true);
  const [remote, setRemote] = useState(false);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["provider-my-services", user?.id],
    queryFn: async () => {
      const { data } = await db.from("service_catalog").select("*").eq("provider_id", user!.id).order("sort_order");
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const resetForm = () => {
    setTitle(""); setDescription(""); setDuration("60"); setPrice(""); setPriceType("fixed");
    setCategory(""); setAtHome(false); setInOffice(true); setRemote(false); setEditingId(null);
  };

  const openEdit = (svc: any) => {
    setEditingId(svc.id);
    setTitle(svc.title);
    setDescription(svc.description || "");
    setDuration(String(svc.duration_minutes));
    setPrice(String(svc.price));
    setPriceType(svc.price_type);
    setCategory(svc.category || "");
    setAtHome(svc.at_home);
    setInOffice(svc.in_office);
    setRemote(svc.remote);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    setSaving(true);
    try {
      if (editingId) {
        await serviceUseCases.updateService(editingId, {
          title: title.trim(),
          description: description.trim(),
          durationMinutes: parseInt(duration),
          price: parseFloat(price) || 0,
          priceType,
          category,
          atHome,
          inOffice,
          remote,
        });
        toast.success("Service updated");
      } else {
        await serviceUseCases.createService({
          providerId: user!.id,
          title: title.trim(),
          description: description.trim(),
          durationMinutes: parseInt(duration),
          price: parseFloat(price) || 0,
          priceType,
          category,
          atHome,
          inOffice,
          remote,
        });
        toast.success("Service created");
      }
      qc.invalidateQueries({ queryKey: ["provider-my-services"] });
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await serviceUseCases.deleteService(id);
    qc.invalidateQueries({ queryKey: ["provider-my-services"] });
    toast.success("Service removed");
  };

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader title="My Services" icon={<Briefcase className="h-5 w-5 text-primary" />} backTo="/provider/dashboard" />
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="flex justify-end">
          <Button size="sm" className="gap-1.5" onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-3 w-3" /> Add Service
          </Button>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : services.length === 0 ? (
          <div className="py-16 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No services yet. Add your first service!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {services.map((svc: any) => (
              <AppCard key={svc.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold">{svc.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary flex items-center gap-0.5">
                        <DollarSign className="h-3 w-3" /> {svc.price} AED{svc.price_type === "hourly" ? "/hr" : ""}
                      </span>
                      <span className="text-[0.625rem] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-3 w-3" /> {svc.duration_minutes}min
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {svc.at_home && <Badge variant="outline" className="text-[0.5625rem] h-4 px-1">Home</Badge>}
                      {svc.in_office && <Badge variant="outline" className="text-[0.5625rem] h-4 px-1">Office</Badge>}
                      {svc.remote && <Badge variant="outline" className="text-[0.5625rem] h-4 px-1">Remote</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(svc)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(svc.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </AppCard>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Duration (min)</Label>
                <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Price (AED)</Label>
                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Price Type</Label>
                <Select value={priceType} onValueChange={v => setPriceType(v as any)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Input value={category} onChange={e => setCategory(e.target.value)} className="mt-1" placeholder="e.g. Cleaning" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Location</Label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5"><Switch checked={atHome} onCheckedChange={setAtHome} /><span className="text-xs">Home</span></div>
                <div className="flex items-center gap-1.5"><Switch checked={inOffice} onCheckedChange={setInOffice} /><span className="text-xs">Office</span></div>
                <div className="flex items-center gap-1.5"><Switch checked={remote} onCheckedChange={setRemote} /><span className="text-xs">Remote</span></div>
              </div>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SubPageShell>
  );
}
