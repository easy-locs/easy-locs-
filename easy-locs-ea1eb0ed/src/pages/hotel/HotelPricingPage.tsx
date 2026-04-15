/**
 * HotelPricingPage — Manage seasonal pricing periods per room type.
 */
import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Loader2, CalendarDays, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SubPageShell from "@/components/layout/SubPageShell";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { useAuth } from "@/contexts/AuthContext";
import { createHotelService } from "@/domains/hotel/service";
import type { HotelRoom, SeasonalPricing } from "@/domains/hotel/ports";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

export default function HotelPricingPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [pricing, setPricing] = useState<SeasonalPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    periodName: "",
    startDate: "",
    endDate: "",
    pricePerNight: 0,
    minStayNights: 1,
  });

  const [hotelId, setHotelId] = useState<string>("");

  const loadRooms = useCallback(async () => {
    if (!user?.id) return;
    const service = createHotelService({ userId: user.id });
    let hid = hotelId;
    if (!hid) {
      const owned = await service.getOwnedHotelId();
      if (!owned.ok) { setLoading(false); return; }
      hid = owned.data;
      setHotelId(hid);
    }
    const result = await service.getRooms(hid);
    if (result.ok) {
      setRooms(result.data);
      if (result.data.length > 0 && !selectedRoom) {
        setSelectedRoom(result.data[0].id);
      }
    }
    setLoading(false);
  }, [user?.id, hotelId]);

  const loadPricing = useCallback(async () => {
    if (!selectedRoom || !user?.id) return;
    const service = createHotelService({ userId: user.id });
    const result = await service.getSeasonalPricing(selectedRoom);
    if (result.ok) setPricing(result.data);
  }, [selectedRoom, user?.id]);

  useEffect(() => { loadRooms(); }, [loadRooms]);
  useEffect(() => { loadPricing(); }, [loadPricing]);

  const handleCreate = async () => {
    if (!user?.id || !selectedRoom || !form.periodName || !form.startDate || !form.endDate || form.pricePerNight <= 0) {
      toast.error("Please fill in all fields");
      return;
    }
    setSaving(true);
    const service = createHotelService({ userId: user.id });
    const result = await service.upsertSeasonalPricing({
      roomId: selectedRoom,
      periodName: form.periodName,
      startDate: form.startDate,
      endDate: form.endDate,
      pricePerNight: form.pricePerNight,
      minStayNights: form.minStayNights,
    });
    if (result.ok) { toast.success("Pricing period created"); loadPricing(); }
    else toast.error(result.error);
    setSaving(false);
    setFormOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!user?.id) return;
    const service = createHotelService({ userId: user.id });
    const result = await service.deleteSeasonalPricing(id);
    if (result.ok) { toast.success("Pricing period deleted"); loadPricing(); }
    else toast.error(result.error);
  };

  const currentRoom = rooms.find(r => r.id === selectedRoom);

  if (loading) {
    return (
      <SubPageShell noContentPad>
        <MobilePageHeader title="Seasonal Pricing" backTo="/hotel/dashboard" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </SubPageShell>
    );
  }

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader title="Seasonal Pricing" backTo="/hotel/dashboard" />
      <div className="p-4 space-y-4 pb-24">
        {rooms.length > 0 && (
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
            <SelectContent>
              {rooms.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name} — {r.basePricePerNight ?? 0} AED/night</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {currentRoom && (
          <Card className="bg-card/80 border-border/15">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Base price: <span className="font-bold text-foreground">{currentRoom.basePricePerNight} AED</span>/night</p>
              {currentRoom.weekendPricePerNight && (
                <p className="text-xs text-muted-foreground">Weekend: <span className="font-bold text-foreground">{currentRoom.weekendPricePerNight} AED</span>/night</p>
              )}
            </CardContent>
          </Card>
        )}

        <Button className="w-full" onClick={() => { setForm({ periodName: "", startDate: "", endDate: "", pricePerNight: 0, minStayNights: 1 }); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Seasonal Period
        </Button>

        {pricing.map(sp => (
          <Card key={sp.id} className="bg-card/80 border-border/15">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{sp.periodName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {sp.startDate} → {sp.endDate}
                </p>
                <p className="text-sm font-bold mt-0.5 tabular-nums">
                  {sp.pricePerNight.toLocaleString()} AED<span className="text-[10px] font-normal text-muted-foreground">/night</span>
                </p>
                {sp.minStayNights > 1 && (
                  <p className="text-[10px] text-muted-foreground">Min stay: {sp.minStayNights} nights</p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(sp.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}

        {pricing.length === 0 && selectedRoom && (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No seasonal pricing yet</p>
            <p className="text-xs mt-1">Base price applies to all dates</p>
          </div>
        )}

        {rooms.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Add room types first</p>
            <Button variant="link" className="mt-1 text-xs" onClick={() => window.location.href = "/hotel/rooms"}>
              Go to rooms
            </Button>
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Seasonal Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Period Name</Label>
              <Input value={form.periodName} onChange={e => setForm(f => ({ ...f, periodName: e.target.value }))} placeholder="e.g. High Season" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">End Date</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Price/Night (AED)</Label>
                <Input type="number" min={0} value={form.pricePerNight} onChange={e => setForm(f => ({ ...f, pricePerNight: +e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Min Stay (nights)</Label>
                <Input type="number" min={1} value={form.minStayNights} onChange={e => setForm(f => ({ ...f, minStayNights: +e.target.value }))} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SubPageShell>
  );
}
