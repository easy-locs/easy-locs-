/**
 * ShopCreator — Smart pro onboarding with photo/logo upload, AI category, futuristic UX.
 * Enforces duplicate detection + auto zone assignment on creation.
 * World-ready: full taxonomy depth, capabilities, geo-defaults prefill.
 */
import { useState, useRef, useCallback } from "react";
import { validateShop } from "@/lib/validation/marketplace-validators";
import { useNavigate } from "react-router-dom";
import * as storefrontRepo from "@/repositories/storefront.repository";
import { useAuth } from "@/contexts/AuthContext";
import { useEnsureOrg } from "@/hooks/useEnsureOrg";
import { checkStorefrontDuplicate } from "@/lib/geo/duplicateGuard";
import { assignZoneToStorefront } from "@/lib/zones/autoAssignZone";
import { applyGeoDefaults } from "@/lib/geo/geo-defaults";
import { normalizeVertical, normalizeSubcategory } from "@/lib/taxonomy/world-class-taxonomy";
import { canonicalTaxonomyPayload } from "@/lib/taxonomy/taxonomy-guard";
import TaxonomySelector from "@/components/storefront/TaxonomySelector";
import CapabilityToggles, { type CapabilityFlags } from "@/components/storefront/CapabilityToggles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Loader2, Sparkles, Camera, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const CURRENCY_OPTIONS = [
  { value: "AED", label: "AED" }, { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" }, { value: "GBP", label: "GBP" },
  { value: "SAR", label: "SAR" }, { value: "MAD", label: "MAD" },
  { value: "XOF", label: "XOF" }, { value: "EGP", label: "EGP" },
  { value: "INR", label: "INR" }, { value: "TRY", label: "TRY" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" }, { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" }, { value: "es", label: "Español" },
  { value: "pt", label: "Português" }, { value: "tr", label: "Türkçe" },
  { value: "hi", label: "हिन्दी" },
];

export default function ShopCreator() {
  const { user } = useAuth();
  const { ensureOrg, creating: orgCreating } = useEnsureOrg();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [vertical, setVertical] = useState("food");
  const [cluster, setCluster] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [district, setDistrict] = useState("");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("");
  const [timezone, setTimezone] = useState("");
  const [caps, setCaps] = useState<CapabilityFlags>({ capDelivery: true, capChat: true });
  const [logoUrl, setLogoUrl] = useState("");

  // Auto-prefill on country change
  const handleCountryChange = useCallback((val: string) => {
    setCountry(val);
    const defaults = applyGeoDefaults(val, { currency, defaultLanguage, timezone });
    if (!currency) setCurrency(defaults.currency);
    if (!defaultLanguage) setDefaultLanguage(defaults.defaultLanguage);
    if (!timezone) setTimezone(defaults.timezone);
  }, [currency, defaultLanguage, timezone]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/logo-${Date.now()}.${ext}`;
      const publicUrl = await storefrontRepo.uploadCatalogPhoto(path, file);
      setLogoUrl(publicUrl);
      toast.success("Logo uploaded!");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleCreate = async () => {
    const validation = validateShop({ name, logo_url: logoUrl || null });
    if (!validation.valid) { validation.errors.forEach(e => toast.error(e)); return; }
    if (!user) { toast.error("Please sign in first"); return; }
    setLoading(true);
    try {
      const dupCheck = await checkStorefrontDuplicate(name.trim(), null, null, phone.trim() || null);
      if (dupCheck.blocked) {
        toast.error(`Duplicate detected: "${dupCheck.existingMatch?.name ?? "unknown"}". ${dupCheck.result?.reasons?.join(", ") ?? ""}`);
        return;
      }

      const orgId = await ensureOrg();
      if (!orgId) { toast.error("Failed to set up organization"); return; }
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      const finalDefaults = applyGeoDefaults(country, { currency, defaultLanguage, timezone });

      const insertPayload: Record<string, any> = {
        org_id: orgId,
        user_id: user.id,
        slug,
        name: name.trim(),
        description: description.trim() || null,
        logo_url: logoUrl.trim() || null,
        city: city.trim() || "",
        country: country.trim() || "",
        contact_email: user.email || "",
        contact_phone: phone.trim() || null,
        vertical: normalizeVertical(vertical) || "other",
        shop_visibility: "private",
        active: false,
        onboarding_completed: false,
        currency: finalDefaults.currency,
        default_language: finalDefaults.defaultLanguage,
      };

      // Taxonomy depth — enforced canonical
      const tax = canonicalTaxonomyPayload(vertical, cluster, subcategory);
      insertPayload.vertical = tax.vertical;
      if (tax.cluster) insertPayload.cluster = tax.cluster;
      if (tax.subcategory) insertPayload.subcategory = tax.subcategory;

      // Geography
      if (district.trim()) insertPayload.area = district.trim();
      if (finalDefaults.timezone) insertPayload.timezone = finalDefaults.timezone;

      // Capability flags
      if (caps.capWallet != null) insertPayload.cap_wallet = caps.capWallet;
      if (caps.capQr != null) insertPayload.cap_qr = caps.capQr;
      if (caps.capChat != null) insertPayload.cap_chat = caps.capChat;
      if (caps.capCall != null) insertPayload.cap_call = caps.capCall;
      if (caps.capBooking != null) insertPayload.cap_booking = caps.capBooking;
      if (caps.capDelivery != null) insertPayload.cap_delivery = caps.capDelivery;

      // Source tracking + readiness
      insertPayload.source_type = "onboarding";
      insertPayload.source_confidence = 100;
      insertPayload.readiness_status = "draft";
      insertPayload.is_auto_generated = false;
      insertPayload.has_photo = !!logoUrl.trim();
      insertPayload.has_menu = false;
      insertPayload.products_count = 0;

      const { data: created, error } = await (supabase as any)
        .from("storefront_pages")
        .insert(insertPayload)
        .select("id, latitude, longitude")
        .single();

      if (error) {
        if (error.code === "23505") toast.error("This shop name is already taken");
        else toast.error(error.message);
        return;
      }

      if (created?.latitude && created?.longitude) {
        await assignZoneToStorefront(created.id, created.latitude, created.longitude);
      }

      toast.success("Shop created! Complete your setup. 🎉");
      navigate("/dashboard/my-shop");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = step === 0 ? name.trim().length >= 2 && vertical : true;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-2 px-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 flex items-center gap-1.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              i < step ? "bg-primary text-primary-foreground" :
              i === step ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
              "bg-muted text-muted-foreground"
            }`}>
              {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            {i < 2 && <div className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${i < step ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <Card className="border-border/40 shadow-lg">
        <CardContent className="p-5 space-y-5">
          {/* Step 0: Name + Taxonomy */}
          {step === 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center pb-2">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Store className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-base font-bold text-foreground">Name your business</h2>
                <p className="text-xs text-muted-foreground mt-1">Choose a name and classify your business</p>
              </div>

              <div>
                <Label className="text-xs font-medium">Business Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pizza Roma, Studio Belle..." className="mt-1.5 h-11" autoFocus />
              </div>

              <TaxonomySelector
                vertical={vertical}
                cluster={cluster}
                subcategory={subcategory}
                onVerticalChange={setVertical}
                onClusterChange={setCluster}
                onSubcategoryChange={setSubcategory}
              />

              <div>
                <Label className="text-xs font-medium">Short Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What makes your business special?" className="mt-1.5" rows={2} />
              </div>
            </div>
          )}

          {/* Step 1: Logo + Photo */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center pb-2">
                <h2 className="text-base font-bold text-foreground">Add your logo</h2>
                <p className="text-xs text-muted-foreground mt-1">Upload your business photo or logo</p>
              </div>

              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />

              <button
                onClick={() => fileRef.current?.click()}
                className="w-full aspect-square max-w-[200px] mx-auto rounded-3xl border-2 border-dashed border-border hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-3 overflow-hidden active:scale-[0.97]"
                disabled={uploading}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : uploading ? (
                  <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                      <Camera className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Tap to upload</p>
                      <p className="text-[10px] text-muted-foreground">JPG, PNG • Max 5MB</p>
                    </div>
                  </>
                )}
              </button>

              {logoUrl && (
                <div className="flex justify-center">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setLogoUrl("")}>Change photo</Button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Location + Contact + World-ready + Capabilities */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center pb-2">
                <h2 className="text-base font-bold text-foreground">Location & Settings</h2>
                <p className="text-xs text-muted-foreground mt-1">Help customers find you</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs font-medium">City</Label><Input value={city} onChange={e => setCity(e.target.value)} placeholder="Dubai" className="mt-1.5 h-11" /></div>
                <div><Label className="text-xs font-medium">Country</Label><Input value={country} onChange={e => handleCountryChange(e.target.value)} placeholder="UAE" className="mt-1.5 h-11" /></div>
              </div>

              <div>
                <Label className="text-xs font-medium">District / Neighborhood</Label>
                <Input value={district} onChange={e => setDistrict(e.target.value)} placeholder="e.g. Marina, Downtown..." className="mt-1.5 h-11" />
              </div>

              <div>
                <Label className="text-xs font-medium">Phone Number</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+971 50 123 4567" className="mt-1.5 h-11" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-medium">Currency</Label>
                  <Select value={currency || "AED"} onValueChange={setCurrency}>
                    <SelectTrigger className="mt-1.5 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">Language</Label>
                  <Select value={defaultLanguage || "en"} onValueChange={setDefaultLanguage}>
                    <SelectTrigger className="mt-1.5 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">Timezone</Label>
                  <Input value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="Asia/Dubai" className="mt-1.5 h-11" />
                </div>
              </div>

              <CapabilityToggles flags={caps} onChange={(k, v) => setCaps(p => ({ ...p, [k]: v }))} />
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 pt-2">
            {step > 0 && (
              <Button variant="outline" className="flex-1 h-11" onClick={() => setStep(s => s - 1)}>Back</Button>
            )}

            {step < 2 ? (
              <Button className="flex-1 h-11 font-semibold gap-2" onClick={() => setStep(s => s + 1)} disabled={!canProceed}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button className="flex-1 h-11 font-semibold gap-2" onClick={handleCreate} disabled={loading || orgCreating || !name.trim()}>
                {loading || orgCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Create Shop
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
