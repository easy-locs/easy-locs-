/**
 * HotelRoomsPage — CRUD for hotel room types.
 * List, create, edit, delete room types with full details.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  BedDouble, Plus, Pencil, Trash2, Users, Maximize2, Loader2,
  Eye, EyeOff, ChevronRight, ImagePlus, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SubPageShell from "@/components/layout/SubPageShell";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { useAuth } from "@/contexts/AuthContext";
import { createHotelService } from "@/domains/hotel/service";
import type { HotelRoom } from "@/domains/hotel/ports";
import { db } from "@/services/db";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const BED_TYPES = ["single", "double", "twin", "king", "queen", "bunk"] as const;
const AMENITY_OPTIONS = [
  "balcony", "sea_view", "minibar", "safe", "air_conditioning",
  "tv", "desk", "bathtub", "shower", "hairdryer", "iron", "coffee_machine",
];

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 8;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

interface RoomFormData {
  roomTypeName: string;
  description: string;
  maxAdults: number;
  maxChildren: number;
  bedType: string;
  totalUnits: number;
  basePricePerNight: number;
  weekendPricePerNight: number;
  amenities: string[];
  images: string[];
  floorAreaSqm: number;
  hasBalcony: boolean;
  hasSeaView: boolean;
  hasMinibar: boolean;
  isActive: boolean;
}

const emptyForm: RoomFormData = {
  roomTypeName: "", description: "", maxAdults: 2, maxChildren: 0,
  bedType: "double", totalUnits: 1, basePricePerNight: 0, weekendPricePerNight: 0,
  amenities: [], images: [], floorAreaSqm: 0, hasBalcony: false, hasSeaView: false, hasMinibar: false,
  isActive: true,
};

export default function HotelRoomsPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoomFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

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
    if (result.ok) setRooms(result.data);
    setLoading(false);
  }, [user?.id, hotelId]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (room: HotelRoom) => {
    setForm({
      roomTypeName: room.name,
      description: room.description ?? "",
      maxAdults: room.adults,
      maxChildren: room.children,
      bedType: room.bedType,
      totalUnits: room.totalUnits,
      basePricePerNight: room.basePricePerNight ?? 0,
      weekendPricePerNight: room.weekendPricePerNight ?? 0,
      amenities: room.amenitiesJson,
      images: room.imagesJson,
      floorAreaSqm: room.roomSizeSqm ?? 0,
      hasBalcony: room.hasBalcony,
      hasSeaView: room.hasSeaView,
      hasMinibar: room.hasMinibar,
      isActive: room.active,
    });
    setEditingId(room.id);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!user?.id || !form.roomTypeName || form.basePricePerNight <= 0) {
      toast.error("Please fill in room name and price");
      return;
    }
    if (!editingId && form.images.length < MIN_PHOTOS) {
      toast.error(`Please add at least ${MIN_PHOTOS} photos`);
      return;
    }
    setSaving(true);
    const service = createHotelService({ userId: user.id });

    if (editingId) {
      const result = await service.updateRoom(editingId, {
        name: form.roomTypeName,
        description: form.description || null,
        adults: form.maxAdults,
        children: form.maxChildren,
        bedType: form.bedType,
        totalUnits: form.totalUnits,
        basePricePerNight: form.basePricePerNight,
        weekendPricePerNight: form.weekendPricePerNight || null,
        amenitiesJson: form.amenities,
        imagesJson: form.images,
        roomSizeSqm: form.floorAreaSqm || null,
        hasBalcony: form.hasBalcony,
        hasSeaView: form.hasSeaView,
        hasMinibar: form.hasMinibar,
        active: form.isActive,
      });
      if (result.ok) { toast.success("Room updated"); }
      else toast.error(result.error);
    } else {
      const result = await service.createRoom({
        hotelId: hotelId,
        name: form.roomTypeName,
        description: form.description || null,
        capacity: form.maxAdults + form.maxChildren,
        adults: form.maxAdults,
        children: form.maxChildren,
        bedType: form.bedType,
        totalUnits: form.totalUnits,
        basePricePerNight: form.basePricePerNight,
        weekendPricePerNight: form.weekendPricePerNight || null,
        currency: "AED",
        amenitiesJson: form.amenities,
        imagesJson: form.images,
        roomSizeSqm: form.floorAreaSqm || null,
        hasBalcony: form.hasBalcony,
        hasSeaView: form.hasSeaView,
        hasMinibar: form.hasMinibar,
        active: form.isActive,
        sortOrder: rooms.length,
      });
      if (result.ok) { toast.success("Room created"); }
      else toast.error(result.error);
    }
    setSaving(false);
    setFormOpen(false);
    loadRooms();
  };

  const handleDelete = async (roomId: string) => {
    if (!user?.id) return;
    if (!confirm("Delete this room type? This cannot be undone.")) return;
    const service = createHotelService({ userId: user.id });
    const result = await service.deleteRoom(roomId);
    if (result.ok) { toast.success("Room deleted"); loadRooms(); }
    else toast.error(result.error);
  };

  const toggleAmenity = (amenity: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user?.id) return;
    const remaining = MAX_PHOTOS - form.images.length;
    if (remaining <= 0) { toast.error(`Maximum ${MAX_PHOTOS} photos`); return; }

    const toUpload = Array.from(files).slice(0, remaining);
    const oversized = toUpload.filter(f => f.size > MAX_IMAGE_SIZE);
    if (oversized.length) { toast.error("Each image must be under 5 MB"); return; }

    setUploadingImage(true);
    const uploaded: string[] = [];
    for (const file of toUpload) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/hotel-rooms/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await db.storage.from("products").upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) { toast.error("Upload failed: " + error.message); continue; }
      const { data } = db.storage.from("products").getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    if (uploaded.length) {
      setForm(prev => ({ ...prev, images: [...prev.images, ...uploaded] }));
    }
    setUploadingImage(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  if (loading) {
    return (
      <SubPageShell noContentPad>
        <MobilePageHeader title="Room Types" backTo="/hotel/dashboard" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </SubPageShell>
    );
  }

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader title="Room Types" backTo="/hotel/dashboard" />
      <div className="p-4 space-y-3 pb-24">
        <Button className="w-full" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Room Type
        </Button>

        {rooms.map(room => (
          <Card key={room.id} className="bg-card/80 border-border/15">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold truncate">{room.name}</h3>
                    <Badge variant={room.active ? "default" : "secondary"} className="text-[10px]">
                      {room.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Users className="h-3 w-3" /> {room.adults}+{room.children}</span>
                    <span className="flex items-center gap-0.5"><BedDouble className="h-3 w-3" /> {room.bedType}</span>
                    {room.roomSizeSqm && <span className="flex items-center gap-0.5"><Maximize2 className="h-3 w-3" /> {room.roomSizeSqm}m²</span>}
                    <span>{room.totalUnits} unit{room.totalUnits > 1 ? "s" : ""}</span>
                  </div>
                  <p className="text-sm font-bold mt-1.5 tabular-nums">
                    {(room.basePricePerNight ?? 0).toLocaleString()} {room.currency}<span className="text-[10px] font-normal text-muted-foreground">/night</span>
                    {room.weekendPricePerNight && (
                      <span className="text-xs font-normal text-muted-foreground ml-2">
                        (weekend: {room.weekendPricePerNight.toLocaleString()})
                      </span>
                    )}
                  </p>
                  {room.amenitiesJson.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {room.amenitiesJson.slice(0, 4).map(a => (
                        <Badge key={a} variant="outline" className="text-[9px]">{a}</Badge>
                      ))}
                      {room.amenitiesJson.length > 4 && <Badge variant="outline" className="text-[9px]">+{room.amenitiesJson.length - 4}</Badge>}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(room)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(room.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {rooms.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BedDouble className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No room types yet</p>
            <p className="text-xs mt-1">Add your first room type to get started</p>
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">{editingId ? "Edit Room Type" : "Add Room Type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Room Type Name</Label>
              <Input value={form.roomTypeName} onChange={e => setForm(f => ({ ...f, roomTypeName: e.target.value }))} placeholder="e.g. Suite Deluxe" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Photos ({form.images.length}/{MAX_PHOTOS}, min {MIN_PHOTOS})</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {form.images.map((url, i) => (
                  <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border/20">
                    <img src={url} alt={`Room photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
                {form.images.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-border/30 flex items-center justify-center text-muted-foreground hover:border-primary/50 transition-colors"
                  >
                    {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  </button>
                )}
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
              {form.images.length < MIN_PHOTOS && !editingId && (
                <p className="text-[10px] text-destructive mt-1">At least {MIN_PHOTOS} photos required</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Max Adults</Label>
                <Input type="number" min={1} value={form.maxAdults} onChange={e => setForm(f => ({ ...f, maxAdults: +e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Max Children</Label>
                <Input type="number" min={0} value={form.maxChildren} onChange={e => setForm(f => ({ ...f, maxChildren: +e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Bed Type</Label>
                <Select value={form.bedType} onValueChange={v => setForm(f => ({ ...f, bedType: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BED_TYPES.map(bt => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Number of Units</Label>
                <Input type="number" min={1} value={form.totalUnits} onChange={e => setForm(f => ({ ...f, totalUnits: +e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Base Price/Night (AED)</Label>
                <Input type="number" min={0} value={form.basePricePerNight} onChange={e => setForm(f => ({ ...f, basePricePerNight: +e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Weekend Price/Night</Label>
                <Input type="number" min={0} value={form.weekendPricePerNight} onChange={e => setForm(f => ({ ...f, weekendPricePerNight: +e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Floor Area (m²)</Label>
              <Input type="number" min={0} value={form.floorAreaSqm} onChange={e => setForm(f => ({ ...f, floorAreaSqm: +e.target.value }))} className="mt-1" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Features</Label>
              <div className="flex items-center justify-between">
                <span className="text-xs">Balcony</span>
                <Switch checked={form.hasBalcony} onCheckedChange={v => setForm(f => ({ ...f, hasBalcony: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Sea View</span>
                <Switch checked={form.hasSeaView} onCheckedChange={v => setForm(f => ({ ...f, hasSeaView: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Minibar</span>
                <Switch checked={form.hasMinibar} onCheckedChange={v => setForm(f => ({ ...f, hasMinibar: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Active</span>
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Amenities</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {AMENITY_OPTIONS.map(a => (
                  <button
                    key={a}
                    onClick={() => toggleAmenity(a)}
                    className={cn(
                      "text-[10px] px-2 py-1 rounded-full border transition-colors",
                      form.amenities.includes(a) ? "bg-primary text-primary-foreground border-primary" : "border-border/30 text-muted-foreground",
                    )}
                  >
                    {a.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SubPageShell>
  );
}
