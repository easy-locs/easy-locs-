/**
 * ShopCreator — Smart pro onboarding with photo/logo upload, AI category, futuristic UX.
 * Enforces duplicate detection + auto zone assignment on creation.
 */
import { useState, useRef } from "react";
import { validateShop } from "@/lib/validation/marketplace-validators";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEnsureOrg } from "@/hooks/useEnsureOrg";
import { checkStorefrontDuplicate } from "@/lib/geo/duplicateGuard";
import { assignZoneToStorefront } from "@/lib/zones/autoAssignZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Loader2, Sparkles, Camera, Upload, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "food", label: "🍕 Restaurant / Food" },
  { value: "cafe", label: "☕ Café / Coffee" },
  { value: "beauty", label: "💇 Beauty / Salon" },
  { value: "fashion", label: "👗 Fashion / Clothing" },
  { value: "tech", label: "📱 Tech / Electronics" },
  { value: "health", label: "🏥 Health / Pharmacy" },
  { value: "home", label: "🏠 Home / Décor" },
  { value: "sports", label: "⚽ Sports / Fitness" },
  { value: "education", label: "📚 Education / Tutoring" },
  { value: "automotive", label: "🚗 Automotive" },
  { value: "grocery", label: "🛒 Grocery / Market" },
  { value: "services", label: "🔧 Services / Freelance" },
  { value: "other", label: "📦 Other" },
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
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("catalog-photos").upload(path, file);
      if (error) { toast.error("Upload failed"); return; }
      const { data } = supabase.storage.from("catalog-photos").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
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
      const orgId = await ensureOrg();
      if (!orgId) { toast.error("Failed to set up organization"); return; }
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      const { error } = await (supabase as any)
        .from("storefront_pages")
        .insert({
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
          vertical: category || "other",
          shop_visibility: "private",
          active: false,
          onboarding_completed: false,
        })
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") toast.error("This shop name is already taken");
        else toast.error(error.message);
        return;
      }

      toast.success("Shop created! Complete your setup. 🎉");
      navigate("/dashboard/my-shop");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = step === 0
    ? name.trim().length >= 2 && category
    : step === 1
    ? true
    : true;

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
          {/* Step 0: Name + Category */}
          {step === 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center pb-2">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Store className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-base font-bold text-foreground">Name your business</h2>
                <p className="text-xs text-muted-foreground mt-1">Choose a name and category to get started</p>
              </div>

              <div>
                <Label className="text-xs font-medium">Business Name *</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Pizza Roma, Studio Belle..."
                  className="mt-1.5 h-11"
                  autoFocus
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1.5 h-11">
                    <SelectValue placeholder="Select your business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium">Short Description</Label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What makes your business special?"
                  className="mt-1.5"
                  rows={2}
                />
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

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />

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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => { setLogoUrl(""); }}
                  >
                    Change photo
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Location + Contact */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center pb-2">
                <h2 className="text-base font-bold text-foreground">Location & Contact</h2>
                <p className="text-xs text-muted-foreground mt-1">Help customers find you</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">City</Label>
                  <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Dubai" className="mt-1.5 h-11" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Country</Label>
                  <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="UAE" className="mt-1.5 h-11" />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium">Phone Number</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+971 50 123 4567" className="mt-1.5 h-11" />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 pt-2">
            {step > 0 && (
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => setStep(s => s - 1)}
              >
                Back
              </Button>
            )}

            {step < 2 ? (
              <Button
                className="flex-1 h-11 font-semibold gap-2"
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed}
              >
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                className="flex-1 h-11 font-semibold gap-2"
                onClick={handleCreate}
                disabled={loading || orgCreating || !name.trim()}
              >
                {loading || orgCreating
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Sparkles className="h-4 w-4" />
                }
                Create Shop
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
