import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { validateListing } from "@/lib/validation/marketplace-validators";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import CountrySelect from "@/components/ui/CountrySelect";
import {
  ArrowLeft, Plus, ChevronDown, ShieldCheck, MessageSquare,
  CreditCard, Camera, MapPin, Tag, DollarSign, CalendarDays, Package, Radar
} from "lucide-react";
import PresenceMobilitySelector, { type PresenceMode, type EntityType, type CoverageMode, type PresenceConfig } from "@/components/marketplace/PresenceMobilitySelector";

/* ─── Constants ─── */
const MAX_LISTINGS_FREE = 5;
const MIN_PHOTOS = 2;
const MAX_PHOTOS = 10;

const LISTING_CATEGORIES = [
  { value: "real_estate", label: "Real Estate", icon: "🏠" },
  { value: "vehicles", label: "Vehicles", icon: "🚗" },
  { value: "services", label: "Services", icon: "🔧" },
  { value: "tourism", label: "Tourism Activities", icon: "🗺️" },
  { value: "products", label: "Products", icon: "📦" },
  { value: "freelance", label: "Freelance Services", icon: "💻" },
  { value: "events", label: "Events", icon: "🎫" },
];

const LISTING_TYPES = [
  { value: "sale", label: "Sale (30 days)", icon: "💰" },
  { value: "rental", label: "Rental", icon: "🔑" },
  { value: "service", label: "Service", icon: "⚡" },
  { value: "shop", label: "Shop / Business", icon: "🏪" },
];

const PRICE_PERIODS = [
  { value: "fixed", label: "Fixed price" },
  { value: "per_hour", label: "Per hour" },
  { value: "per_day", label: "Per day" },
  { value: "per_week", label: "Per week" },
  { value: "per_month", label: "Per month" },
];

const CURRENCIES = [
  "EUR", "USD", "GBP", "CHF", "CAD", "AUD", "JPY", "AED", "MAD", "XOF", "BRL", "MXN", "THB", "INR", "ZAR",
];

const VERIFICATION_OPTIONS = [
  { value: "passport", label: "Passport", icon: "🛂" },
  { value: "id_card", label: "ID Card", icon: "🪪" },
  { value: "driver_license", label: "Driver License", icon: "🚗" },
];

const PAYMENT_OPTIONS = [
  { value: "stripe", label: "Stripe (Card)", icon: "💳" },
  { value: "paypal", label: "PayPal", icon: "🅿️" },
  { value: "bank_transfer", label: "Bank Transfer", icon: "🏦" },
  { value: "on_site", label: "On-site Payment", icon: "💵" },
];

const COMMUNICATION_OPTIONS = [
  { value: "internal", label: "Internal Messaging", icon: "💬" },
  { value: "email", label: "Email", icon: "📧" },
  { value: "whatsapp", label: "WhatsApp", icon: "📱" },
  { value: "telegram", label: "Telegram", icon: "✈️" },
];

/* ─── Types ─── */
interface ListingForm {
  title: string;
  category: string;
  listing_type: string;
  country: string;
  city: string;
  location: string;
  description: string;
  price: number;
  currency: string;
  price_type: string;
  deposit_amount: number;
  quantity: number;
  contact_email: string;
  contact_whatsapp: string;
  contact_telegram: string;
  verification_types: string[];
  payment_methods: string[];
  communication_channels: string[];
  // Real estate specific
  surface_sqm: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  year_built: number | undefined;
  features: string[];
  // Vehicle / Product specific
  brand: string;
  model: string;
  condition: string;
  // Duration
  duration_minutes: number;
  max_capacity: number;
  // Presence & Coverage
  presence_mode: PresenceMode;
  entity_type: EntityType;
  coverage_mode: CoverageMode;
  coverage_radius_m: number | null;
}

const defaultForm: ListingForm = {
  title: "", category: "services", listing_type: "service",
  country: "FR", city: "", location: "", description: "",
  price: 0, currency: "EUR", price_type: "fixed",
  deposit_amount: 0, quantity: 1,
  contact_email: "", contact_whatsapp: "", contact_telegram: "",
  verification_types: [], payment_methods: ["on_site"],
  communication_channels: ["internal", "email", "whatsapp", "telegram"],
  surface_sqm: 0, rooms: 0, bedrooms: 0, bathrooms: 0,
  year_built: undefined, features: [],
  brand: "", model: "", condition: "good",
  duration_minutes: 0, max_capacity: 1,
  presence_mode: "off", entity_type: "fixed_store", coverage_mode: "point", coverage_radius_m: null,
};

/* ─── Component ─── */
const CreateListing = () => {
  const { user, orgId, userCountry } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [form, setForm] = useState<ListingForm>({ ...defaultForm, country: userCountry || "FR" });
  const [saving, setSaving] = useState(false);
  const [geoLat, setGeoLat] = useState<number | null>(null);
  const [geoLng, setGeoLng] = useState<number | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basics: true, pricing: true, details: false, communication: false,
    security: false, payment: false,
  });

  // Auto-capture geolocation for Nearby discovery
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setGeoLat(pos.coords.latitude); setGeoLng(pos.coords.longitude); },
        () => {},
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    }
  }, []);

  const set = (patch: Partial<ListingForm>) => setForm(prev => ({ ...prev, ...patch }));
  const toggleSection = (k: string) => setOpenSections(prev => ({ ...prev, [k]: !prev[k] }));

  const toggleArrayItem = (field: keyof ListingForm, value: string) => {
    setForm(prev => {
      const arr = prev[field] as string[];
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const showRealEstate = form.category === "real_estate";
  const showVehicleProduct = form.category === "vehicles" || form.category === "products";
  const showRental = form.listing_type === "rental";
  const showService = form.listing_type === "service" || form.category === "services" || form.category === "freelance" || form.category === "tourism";

  const handleSave = async () => {
    // V4 Quality Gate: Validate listing before publish — BLOCKING
    const validation = validateListing({
      title: form.title,
      description: form.description,
      photo_urls: [], // Photos added post-creation — skip image check here
      price: form.price,
    });
    // Block on title, description, price errors (images validated post-upload)
    const blockingErrors = validation.errors.filter(e => !e.includes("image"));
    if (blockingErrors.length > 0) {
      toast({ title: "Quality check failed", description: blockingErrors.join(". "), variant: "destructive" });
      return;
    }
    if (!form.city.trim()) {
      toast({ title: "Error", description: "City is required", variant: "destructive" });
      return;
    }
    if (!orgId || !user) {
      toast({ title: "Error", description: "Please complete onboarding first", variant: "destructive" });
      return;
    }

    // Check max listings for free accounts
    const { count } = await supabase
      .from("marketplace_services")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("active", true);

    if ((count ?? 0) >= MAX_LISTINGS_FREE) {
      toast({ title: "Limit reached", description: `Free accounts can publish up to ${MAX_LISTINGS_FREE} active listings. Upgrade to publish more.`, variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // First ensure provider exists
      let { data: provider } = await supabase
        .from("marketplace_providers")
        .select("id")
        .eq("org_id", orgId)
        .maybeSingle();

      if (!provider) {
        const { data: newProvider, error: provErr } = await supabase
          .from("marketplace_providers")
          .insert({
            org_id: orgId, user_id: user.id,
            display_name: user.email?.split("@")[0] || "Provider",
            slug: `provider-${orgId.slice(0, 8)}`,
            city: form.city, country: form.country,
            categories: [form.category],
          })
          .select("id")
          .single();
        if (provErr) throw provErr;
        provider = newProvider;
      }

      const isSale = form.listing_type === "sale";
      const autoExpire = isSale;
      const expiresAt = isSale ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

      const { error } = await supabase.from("marketplace_services").insert({
        org_id: orgId, user_id: user.id, provider_id: provider!.id,
        title: form.title.trim(), category: form.category,
        listing_type: form.listing_type,
        country: form.country, city: form.city,
        location: form.location, description: form.description,
        price: form.price, currency: form.currency, price_type: form.price_type,
        deposit_amount: form.deposit_amount, quantity: form.quantity,
        contact_whatsapp: form.contact_whatsapp,
        source_contact_email: form.contact_email,
        verification_types: form.verification_types,
        booking_slug: slug,
        max_capacity: form.max_capacity,
        duration_minutes: form.duration_minutes || null,
        listing_expires_at: expiresAt.toISOString(),
        surface_sqm: form.surface_sqm || null,
        rooms: form.rooms || null,
        bedrooms: form.bedrooms || null,
        bathrooms: form.bathrooms || null,
        year_built: form.year_built ?? null,
        features: form.features,
        brand: form.brand, model: form.model,
        condition: form.condition,
        requires_id_document: form.verification_types.length > 0,
        active: true,
        status: 'published',
        lat: geoLat,
        lng: geoLng,
        presence_mode: form.presence_mode,
        entity_type: form.entity_type,
        coverage_mode: form.coverage_mode,
        coverage_radius_m: form.coverage_radius_m,
        anchor_lat: geoLat,
        anchor_lng: geoLng,
      } as any);

      if (error) throw error;
      toast({ title: "✅ Listing published!", description: "Your listing is now live for 30 days." });
      navigate("/dashboard/my-shop");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const Section = ({ id, icon, title, children, badge }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode; badge?: string }) => (
    <Collapsible open={openSections[id] ?? false} onOpenChange={() => toggleSection(id)}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-3 border-b border-border/30 group">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {badge && <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">{badge}</span>}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections[id] ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 space-y-4">{children}</CollapsibleContent>
    </Collapsible>
  );

  const ChipSelector = ({ options, selected, onToggle, multi = false }: {
    options: { value: string; label: string; icon: string }[];
    selected: string | string[];
    onToggle: (v: string) => void;
    multi?: boolean;
  }) => (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const isSelected = multi ? (selected as string[]).includes(opt.value) : selected === opt.value;
        return (
          <button key={opt.value} type="button" onClick={() => onToggle(opt.value)}
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-1.5 ${
              isSelected ? "border-accent bg-accent/10 text-accent shadow-sm" : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}>
            <span>{opt.icon}</span> {opt.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto pb-12">
        <button onClick={() => navigate("/dashboard/my-shop")} className="text-sm text-accent hover:underline mb-4 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> My Shop
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center shrink-0">
            <Plus className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Publier une annonce</h1>
            <p className="text-sm text-muted-foreground">Publiez gratuitement dans le monde entier • Max {MAX_LISTINGS_FREE} annonces actives • Durée 30 jours</p>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-4">

          {/* ── Basics (always open) ── */}
          <Section id="basics" icon={<Tag className="h-4 w-4 text-muted-foreground" />} title="Informations essentielles" badge="Required">
            <div>
              <Label className="text-xs font-semibold">Category *</Label>
              <ChipSelector options={LISTING_CATEGORIES} selected={form.category} onToggle={v => set({ category: v })} />
            </div>

            <div>
              <Label className="text-xs font-semibold">Listing type *</Label>
              <ChipSelector options={LISTING_TYPES} selected={form.listing_type} onToggle={v => set({ listing_type: v })} />
            </div>

            <div>
              <Label className="text-xs">Title *</Label>
              <Input value={form.title} onChange={e => set({ title: e.target.value })} placeholder="Ex: iPhone 15 Pro Max, 3-bedroom apartment..." maxLength={120} />
            </div>

            <div>
              <Label className="text-xs">Description *</Label>
              <Textarea value={form.description} onChange={e => set({ description: e.target.value })} rows={4} placeholder="Describe your listing in detail..." maxLength={2000} />
              <p className="text-xs text-muted-foreground mt-1">{form.description.length}/2000</p>
            </div>

            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
              <Label className="text-xs font-semibold text-accent">Country *</Label>
              <CountrySelect value={form.country} onChange={code => set({ country: code })} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label className="text-xs">City *</Label><Input value={form.city} onChange={e => set({ city: e.target.value })} placeholder="Paris, Dubai, NYC..." /></div>
              <div><Label className="text-xs">Location / Address</Label><Input value={form.location} onChange={e => set({ location: e.target.value })} placeholder="Street, neighborhood..." /></div>
            </div>
          </Section>

          {/* ── Presence & Coverage ── */}
          <Section id="presence" icon={<Radar className="h-4 w-4 text-muted-foreground" />} title="Map Presence & Coverage" badge="New">
            <PresenceMobilitySelector
              config={{
                presence_mode: form.presence_mode,
                entity_type: form.entity_type,
                coverage_mode: form.coverage_mode,
                coverage_radius_m: form.coverage_radius_m,
              }}
              onChange={(cfg) => set(cfg)}
            />
          </Section>

          {/* ── Photos note ── */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
            <Camera className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              📸 Min {MIN_PHOTOS} photos required, max {MAX_PHOTOS}. Add photos after publishing from the listing manager.
            </p>
          </div>

          {/* ── Pricing ── */}
          <Section id="pricing" icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} title="Price & Availability" badge="Required">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div><Label className="text-xs">Price *</Label><Input type="number" value={form.price || ""} onChange={e => set({ price: +e.target.value })} placeholder="0" /></div>
              <div><Label className="text-xs">Currency</Label>
                <select value={form.currency} onChange={e => set({ currency: e.target.value })}
                  className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground">
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><Label className="text-xs">Price type</Label>
                <select value={form.price_type} onChange={e => set({ price_type: e.target.value })}
                  className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground">
                  {PRICE_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            {showRental && (
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">Deposit amount</Label><Input type="number" value={form.deposit_amount || ""} onChange={e => set({ deposit_amount: +e.target.value })} /></div>
                <div><Label className="text-xs">Quantity available</Label><Input type="number" value={form.quantity || ""} onChange={e => set({ quantity: +e.target.value })} min={1} /></div>
              </div>
            )}

            {showService && (
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">Duration (minutes)</Label><Input type="number" value={form.duration_minutes || ""} onChange={e => set({ duration_minutes: +e.target.value })} placeholder="60" /></div>
                <div><Label className="text-xs">Max capacity</Label><Input type="number" value={form.max_capacity || ""} onChange={e => set({ max_capacity: +e.target.value })} min={1} /></div>
              </div>
            )}
          </Section>

          {/* ── Category-specific details (toggleable) ── */}
          <Section id="details" icon={<Package className="h-4 w-4 text-muted-foreground" />} title="Additional Details" badge="Optional">
            {showRealEstate && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div><Label className="text-xs">Surface (m²)</Label><Input type="number" value={form.surface_sqm || ""} onChange={e => set({ surface_sqm: +e.target.value })} /></div>
                  <div><Label className="text-xs">Rooms</Label><Input type="number" value={form.rooms || ""} onChange={e => set({ rooms: +e.target.value })} /></div>
                  <div><Label className="text-xs">Bedrooms</Label><Input type="number" value={form.bedrooms || ""} onChange={e => set({ bedrooms: +e.target.value })} /></div>
                  <div><Label className="text-xs">Bathrooms</Label><Input type="number" value={form.bathrooms || ""} onChange={e => set({ bathrooms: +e.target.value })} /></div>
                  <div><Label className="text-xs">Year built</Label><Input type="number" value={form.year_built ?? ""} onChange={e => set({ year_built: e.target.value ? +e.target.value : undefined })} placeholder="2005" /></div>
                </div>
              </div>
            )}

            {showVehicleProduct && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div><Label className="text-xs">Brand</Label><Input value={form.brand} onChange={e => set({ brand: e.target.value })} placeholder="Apple, Toyota..." /></div>
                <div><Label className="text-xs">Model</Label><Input value={form.model} onChange={e => set({ model: e.target.value })} placeholder="iPhone 15, Corolla..." /></div>
                <div><Label className="text-xs">Condition</Label>
                  <select value={form.condition} onChange={e => set({ condition: e.target.value })}
                    className="w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground">
                    <option value="new">New</option>
                    <option value="like_new">Like New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
              </div>
            )}

            {!showRealEstate && !showVehicleProduct && (
              <p className="text-sm text-muted-foreground">No additional details needed for this category. You can add more info in the description.</p>
            )}
          </Section>

          {/* ── Communication ── */}
          <Section id="communication" icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />} title="Communication" badge="Optional">
            <div>
              <Label className="text-xs font-semibold mb-2 block">Communication channels</Label>
              <ChipSelector options={COMMUNICATION_OPTIONS} selected={form.communication_channels} onToggle={v => toggleArrayItem("communication_channels", v)} multi />
            </div>
            {form.communication_channels.includes("email") && (
              <div><Label className="text-xs">Contact email</Label><Input type="email" value={form.contact_email} onChange={e => set({ contact_email: e.target.value })} placeholder="you@email.com" /></div>
            )}
            {form.communication_channels.includes("whatsapp") && (
              <div><Label className="text-xs">WhatsApp number</Label><Input value={form.contact_whatsapp} onChange={e => set({ contact_whatsapp: e.target.value })} placeholder="+33 6 12 34 56 78" /></div>
            )}
            {form.communication_channels.includes("telegram") && (
              <div><Label className="text-xs">Telegram username</Label><Input value={form.contact_telegram} onChange={e => set({ contact_telegram: e.target.value })} placeholder="@username" /></div>
            )}
          </Section>

          {/* ── Payment ── */}
          <Section id="payment" icon={<CreditCard className="h-4 w-4 text-muted-foreground" />} title="Payment Methods" badge="Optional">
            <ChipSelector options={PAYMENT_OPTIONS} selected={form.payment_methods} onToggle={v => toggleArrayItem("payment_methods", v)} multi />
          </Section>

          {/* ── Security ── */}
          <Section id="security" icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />} title="Identity Verification" badge="Optional">
            <p className="text-xs text-muted-foreground mb-2">Require buyers/renters to verify their identity before booking.</p>
            <ChipSelector options={VERIFICATION_OPTIONS} selected={form.verification_types} onToggle={v => toggleArrayItem("verification_types", v)} multi />
          </Section>

          {/* ── Submit ── */}
          <button onClick={handleSave} disabled={saving}
            className="bg-gradient-gold text-accent-foreground text-sm font-semibold px-8 py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50 w-full sm:w-auto mt-4">
            {saving ? "Publishing..." : "🚀 Publish Listing"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreateListing;
