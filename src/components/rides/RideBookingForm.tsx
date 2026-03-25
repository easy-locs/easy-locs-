import React, { useState } from "react";
import { createRide } from "@/lib/rides/service";
import type { BookingMode, RideType } from "@/lib/rides/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function RideBookingForm() {
  const [rideType, setRideType] = useState<RideType>("taxi");
  const [bookingMode, setBookingMode] = useState<BookingMode>("now");
  const [pickupLabel, setPickupLabel] = useState("");
  const [dropoffLabel, setDropoffLabel] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("25");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupLabel || !dropoffLabel) { toast.error("Pickup & dropoff required"); return; }
    setLoading(true);
    try {
      const ride = await createRide({
        rideType,
        bookingMode,
        pickupLabel,
        dropoffLabel,
        scheduledFor: bookingMode === "scheduled" ? scheduledFor : null,
        estimatedPrice: Number(estimatedPrice) || 0,
        notes: notes || null,
        currency: "AED",
      });
      toast.success(`Ride created! ${ride.id.slice(0, 8)}`);
      setPickupLabel(""); setDropoffLabel(""); setNotes("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create ride");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Request a Ride</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={rideType} onValueChange={(v) => setRideType(v as RideType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="taxi">Taxi</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="courier">Courier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>When</Label>
              <Select value={bookingMode} onValueChange={(v) => setBookingMode(v as BookingMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="now">Now</SelectItem>
                  <SelectItem value="scheduled">Later</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {bookingMode === "scheduled" && (
            <div>
              <Label>When</Label>
              <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
            </div>
          )}

          <div><Label>Pickup</Label><Input placeholder="Pickup location" value={pickupLabel} onChange={(e) => setPickupLabel(e.target.value)} /></div>
          <div><Label>Dropoff</Label><Input placeholder="Dropoff location" value={dropoffLabel} onChange={(e) => setDropoffLabel(e.target.value)} /></div>
          <div><Label>Est. price (AED)</Label><Input type="number" value={estimatedPrice} onChange={(e) => setEstimatedPrice(e.target.value)} /></div>
          <div><Label>Notes</Label><Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : bookingMode === "scheduled" ? "Reserve ride" : "Request now"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
