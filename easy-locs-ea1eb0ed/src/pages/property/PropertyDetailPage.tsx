import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import SubPageShell from "@/components/layout/SubPageShell";
import { Button } from "@/components/ui/button";
import { usePropertyBooking } from "@/hooks/usePropertyBooking";
import { useUiEngine } from "@/hooks/useUiEngine";
import {
  Star, MapPin, BedDouble, Bath, Users, Shield, Clock,
  Home, Wifi, Car, Waves, MessageCircle, ChevronRight,
  Calendar, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { PropertyGallery } from "@/components/property/PropertyGallery";

const NAVY = "hsl(226 24% 14%)";
const GOLD = "hsl(var(--accent))";

const CANCELLATION_LABELS: Record<string, { label: string; desc: string }> = {
  flexible: { label: "Free cancellation", desc: "Cancel up to 24h before check-in for a full refund" },
  moderate: { label: "Moderate", desc: "Cancel up to 5 days before check-in for a full refund" },
  strict: { label: "Strict", desc: "50% refund if cancelled 7+ days before check-in" },
  non_refundable: { label: "Non-refundable", desc: "This booking is non-refundable" },
};

const AMENITY_ICONS: Record<string, typeof Wifi> = {
  wifi: Wifi,
  parking: Car,
  pool: Waves,
};

export default function PropertyDetailPage() {
  useUiEngine("property-detail");
  const navigate = useNavigate();
  const { selectedListing, pricing, searchParams, proceedToBooking, error } = usePropertyBooking();

  useEffect(() => {
    if (!selectedListing) navigate("/property/search", { replace: true });
  }, [selectedListing, navigate]);

  if (!selectedListing) {
    return (
      <SubPageShell noContentPad className="flex items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
    </SubPageShell>
    );
  }

  const listing = selectedListing;
  const isShort = listing.mode === "short_term";
  const cancel = CANCELLATION_LABELS[listing.cancellationPolicy] ?? CANCELLATION_LABELS.moderate;

  return (
    <SubPageShell noContentPad className="pb-[var(--page-bottom-pad)]">
      <MobilePageHeader title="Property Details" backTo="/property/results" />

      <div className="space-y-4">
        <PropertyGallery images={listing.photos} variant="hero" />

        <div className="px-4 space-y-4">
          <div>
            <h1 className="text-lg font-bold text-foreground">{listing.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Star className="h-3 w-3 fill-warning text-warning" />
              <span className="text-xs font-semibold tabular-nums">{listing.rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">· {listing.reviewCount} reviews</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {listing.location.address}, {listing.location.city}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { icon: BedDouble, label: `${listing.bedrooms} bed${listing.bedrooms > 1 ? "s" : ""}` },
              { icon: Bath, label: `${listing.bathrooms} bath${listing.bathrooms > 1 ? "s" : ""}` },
              { icon: Users, label: `${listing.maxGuests} guests` },
              { icon: Home, label: `${listing.area ?? "—"} ${listing.areaUnit ?? "sqm"}` },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-muted/20 border border-border/10">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-[0.625rem] font-medium text-foreground text-center">{label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl border border-border/15 bg-card/50">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${GOLD}20` }}>
              <span className="text-sm font-bold" style={{ color: GOLD }}>{listing.host.name[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-xs font-bold text-foreground">{listing.host.name}</p>
                {listing.host.superhost && (
                  <span className="px-1.5 py-0.5 rounded text-[0.625rem] font-bold" style={{ background: `${GOLD}20`, color: GOLD }}>Superhost</span>
                )}
              </div>
              <p className="text-[0.625rem] text-muted-foreground">{listing.host.responseRate}% response rate · {listing.host.responseTime}</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-[0.625rem] gap-1">
              <MessageCircle className="h-3 w-3" /> Chat
            </Button>
          </div>

          <div>
            <p className="text-xs text-muted-foreground leading-relaxed">{listing.description}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Self check-in", icon: Clock },
              { label: cancel.label, icon: Shield },
              { label: listing.petFriendly ? "Pet friendly" : "No pets", icon: CheckCircle2 },
            ].map(({ label, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-muted/20 border border-border/10 text-center">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-[0.625rem] font-medium text-foreground">{label}</span>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-sm font-bold text-foreground mb-2">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {listing.amenities.filter(a => a.available).map(a => {
                const Icon = AMENITY_ICONS[a.key];
                return (
                  <span key={a.key} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/30 border border-border/10 text-[0.625rem] font-medium text-foreground">
                    {Icon && <Icon className="h-3 w-3" />} {a.label}
                  </span>
                );
              })}
            </div>
          </div>

          {listing.highlights.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-2">Highlights</h2>
              <div className="space-y-1.5">
                {listing.highlights.map(h => (
                  <div key={h} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: GOLD }} />
                    {h}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-sm font-bold text-foreground mb-2">House Rules</h2>
            <div className="space-y-1">
              {listing.rules.map(r => (
                <p key={r} className="text-xs text-muted-foreground">• {r}</p>
              ))}
            </div>
            {listing.checkInTime && (
              <p className="text-xs text-muted-foreground mt-1.5">
                <Calendar className="inline h-3 w-3 mr-1" />
                Check-in: {listing.checkInTime} · Check-out: {listing.checkOutTime}
              </p>
            )}
          </div>

          <div>
            <h2 className="text-sm font-bold text-foreground mb-2">Cancellation Policy</h2>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/20 border border-border/10">
              <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">{cancel.label}</p>
                <p className="text-[0.625rem] text-muted-foreground mt-0.5">{cancel.desc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t border-border/20 px-4 py-3 safe-area-bottom">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            {pricing && (
              <>
                <span className="text-lg font-extrabold tabular-nums text-foreground">
                  €{pricing.totalPrice}
                </span>
                {isShort && pricing.nights && (
                  <span className="text-xs text-muted-foreground ml-1">
                    / {pricing.nights} night{pricing.nights > 1 ? "s" : ""}
                  </span>
                )}
                {!isShort && (
                  <span className="text-xs text-muted-foreground ml-1">/ month</span>
                )}
              </>
            )}
          </div>
          <Button
            onClick={proceedToBooking}
            className="h-11 px-8 rounded-xl font-bold text-sm"
            style={{ background: NAVY, color: GOLD }}
          >
            Reserve <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </SubPageShell>
  );
}

