import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";
import { serviceUseCases } from "@/domains/services/service";
import SubPageShell from "@/components/layout/SubPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Star, MapPin, Clock, CheckCircle2, ArrowLeft, Calendar, Loader2,
  Briefcase, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export default function ServiceProviderPage() {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookingService, setBookingService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [booking, setBooking] = useState(false);

  const { data: provider } = useQuery({
    queryKey: ["service-provider", providerId],
    queryFn: async () => {
      const { data } = await db
        .from("providers")
        .select("*")
        .eq("id", providerId!)
        .single();
      return data;
    },
    enabled: !!providerId,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["provider-services", providerId],
    queryFn: async () => {
      const { data } = await db
        .from("service_catalog")
        .select("*")
        .eq("provider_id", providerId!)
        .eq("is_active", true)
        .order("sort_order");
      return data ?? [];
    },
    enabled: !!providerId,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["provider-reviews", providerId],
    queryFn: async () => {
      const { data } = await db
        .from("reviews")
        .select("*")
        .eq("entity_id", providerId!)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!providerId,
  });

  const { data: availableSlots = [] } = useQuery({
    queryKey: ["available-slots", bookingService?.id, providerId, selectedDate],
    queryFn: async () => {
      if (!bookingService || !selectedDate) return [];
      const from = selectedDate;
      const to = selectedDate;
      return serviceUseCases.getAvailableSlots(bookingService.id, providerId!, { from, to });
    },
    enabled: !!bookingService && !!selectedDate,
  });

  const handleBook = async () => {
    if (!user) { toast.error("Please sign in"); return; }
    if (!selectedSlot) { toast.error("Please select a time slot"); return; }
    setBooking(true);
    try {
      const slot = availableSlots.find((s: any) => s.startTime === selectedSlot);
      await serviceUseCases.bookSlot({
        serviceId: bookingService.id,
        providerId: providerId!,
        clientId: user.id,
        date: selectedDate,
        startTime: selectedSlot,
        endTime: slot?.endTime || selectedSlot,
        clientNotes: clientNotes || undefined,
        address: clientAddress || undefined,
      });
      toast.success("Booking request sent!");
      setBookingService(null);
      setSelectedDate("");
      setSelectedSlot("");
      setClientNotes("");
      setClientAddress("");
    } catch (err: any) {
      toast.error(err.message || "Booking failed");
    } finally {
      setBooking(false);
    }
  };

  const avgRating = reviews.length > 0
    ? reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length
    : 5;

  const next14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  return (
    <SubPageShell noContentPad>
      <button
        onClick={() => navigate(-1)}
        className="absolute top-3 left-3 z-20 h-9 w-9 rounded-full bg-background/80 backdrop-blur-md flex items-center justify-center shadow-sm"
      >
        <ArrowLeft className="h-4.5 w-4.5" />
      </button>

      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-b from-primary/10 to-background px-4 pt-14 pb-6">
          <div className="flex items-center gap-4">
            {provider?.avatar_url ? (
              <img src={provider.avatar_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-7 w-7 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-bold">{provider?.display_name || "Provider"}</h1>
                {provider?.is_verified && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                  <Star className="h-3.5 w-3.5 fill-amber-500" /> {avgRating.toFixed(1)} ({reviews.length})
                </span>
                {provider?.city && (
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {provider.city}
                  </span>
                )}
              </div>
              {provider?.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{provider.bio}</p>}
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-6">
          <div>
            <h2 className="text-sm font-bold mb-3">Services</h2>
            <div className="space-y-2">
              {services.map((svc: any) => (
                <Card key={svc.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <h3 className="text-sm font-semibold">{svc.title}</h3>
                      {svc.description && <p className="text-[11px] text-muted-foreground line-clamp-2">{svc.description}</p>}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary">{svc.price} AED{svc.price_type === "hourly" ? "/hr" : ""}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-3 w-3" /> {svc.duration_minutes}min
                        </span>
                      </div>
                    </div>
                    <Button size="sm" className="shrink-0" onClick={() => setBookingService(svc)}>
                      <Calendar className="h-3 w-3 mr-1" /> Book
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {services.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No services listed yet</p>
              )}
            </div>
          </div>

          {reviews.length > 0 && (
            <div>
              <h2 className="text-sm font-bold mb-3">Reviews</h2>
              <div className="space-y-2">
                {reviews.slice(0, 5).map((review: any) => (
                  <Card key={review.id}>
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`h-3 w-3 ${s <= (review.rating || 0) ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`} />
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-2">{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                      {review.comment && <p className="text-xs">{review.comment}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!bookingService} onOpenChange={v => { if (!v) { setBookingService(null); setSelectedDate(""); setSelectedSlot(""); } }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book: {bookingService?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium mb-2">Select a date</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {next14Days.map(date => {
                  const d = new Date(date);
                  const dayName = d.toLocaleDateString("en", { weekday: "short" });
                  const dayNum = d.getDate();
                  return (
                    <button
                      key={date}
                      onClick={() => { setSelectedDate(date); setSelectedSlot(""); }}
                      className={`flex flex-col items-center px-3 py-2 rounded-xl shrink-0 text-xs ${
                        selectedDate === date ? "bg-primary text-primary-foreground" : "bg-muted/50"
                      }`}
                    >
                      <span className="font-medium">{dayName}</span>
                      <span className="text-lg font-bold">{dayNum}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDate && (
              <div>
                <p className="text-xs font-medium mb-2">Available slots</p>
                {availableSlots.filter((s: any) => s.available).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No slots available on this date</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableSlots.filter((s: any) => s.available).map((slot: any) => (
                      <button
                        key={slot.startTime}
                        onClick={() => setSelectedSlot(slot.startTime)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                          selectedSlot === slot.startTime
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {slot.startTime}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {bookingService?.at_home && (
              <Input
                placeholder="Your address (for home service)"
                value={clientAddress}
                onChange={e => setClientAddress(e.target.value)}
              />
            )}

            <Textarea
              placeholder="Notes for the provider (optional)"
              value={clientNotes}
              onChange={e => setClientNotes(e.target.value)}
              rows={2}
            />

            {selectedSlot && (
              <div className="bg-muted/30 rounded-xl p-3 space-y-1">
                <p className="text-xs font-semibold">Booking Summary</p>
                <p className="text-xs text-muted-foreground">{bookingService?.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(selectedDate).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })} at {selectedSlot}</p>
                <p className="text-xs text-muted-foreground">{bookingService?.duration_minutes} minutes</p>
                <p className="text-sm font-bold text-primary">{bookingService?.price} AED</p>
              </div>
            )}

            <Button
              className="w-full h-11"
              disabled={!selectedDate || !selectedSlot || booking}
              onClick={handleBook}
            >
              {booking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Booking"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SubPageShell>
  );
}
