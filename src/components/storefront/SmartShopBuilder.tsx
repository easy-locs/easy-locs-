/**
 * SmartShopBuilder — AI-powered shop creation.
 * World-ready: full taxonomy depth, capabilities, geo-defaults prefill.
 */
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEnsureOrg } from "@/hooks/useEnsureOrg";
import { applyGeoDefaults } from "@/lib/geo/geo-defaults";
import { normalizeVertical, normalizeSubcategory } from "@/lib/taxonomy/world-class-taxonomy";
import { canonicalTaxonomyPayload } from "@/lib/taxonomy/taxonomy-guard";
import TaxonomySelector from "@/components/storefront/TaxonomySelector";
import CapabilityToggles, { type CapabilityFlags } from "@/components/storefront/CapabilityToggles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Loader2, Sparkles, Zap, Check, Tag } from "lucide-react";
import { toast } from "sonner";

interface AISuggestion {
  vertical: string;
  category: string;
  subcategory?: string;
  tags: string[];
  tagline: string;
  seo_description: string;
}

const CURRENCY_OPTIONS = [
  { value: "AED", label: "AED — Dirham" },
  { value: "USD", label: "USD — Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — Pound" },
  { value: "SAR", label: "SAR — Riyal" },
  { value: "MAD", label: "MAD — Dirham" },
  { value: "XOF", label: "XOF — CFA" },
  { value: "EGP", label: "EGP — Pound" },
  { value: "INR", label: "INR — Rupee" },
  { value: "TRY", label: "TRY — Lira" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
  { value: "tr", label: "Türkçe" },
  { value: "hi", label: "हिन्दी" },
];

export default function SmartShopBuilder() {
  const { user } = useAuth();
  const { ensureOrg, creating: orgCreating } = useEnsureOrg();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [district, setDistrict] = useState("");
  const [currency, setCurrency] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("");
  const [timezone, setTimezone] = useState("");
  const [vertical, setVertical] = useState("food");
  const [cluster, setCluster] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [caps, setCaps] = useState<CapabilityFlags>({ capDelivery: true, capChat: true });
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);

  // Auto-prefill currency/language/timezone when country changes
  const handleCountryChange = useCallback((val: string) => {
    setCountry(val);
    const defaults = applyGeoDefaults(val, { currency, defaultLanguage, timezone });
    if (!currency) setCurrency(defaults.currency);
    if (!defaultLanguage) setDefaultLanguage(defaults.defaultLanguage);
    if (!timezone) setTimezone(defaults.timezone);
  }, [currency, defaultLanguage, timezone]);

  const handleAISuggest = async () => {
    if (!name.trim()) { toast.error("Enter a shop name first"); return; }
    setAiLoading(true);
    try {
      const data = await storefrontRepo.invokeAIProxy({
        model: "google/gemini-2.5-flash-lite",
        messages: [{
          role: "user",
          content: `Classify this business for an e-commerce platform. Return ONLY valid JSON.
Business: "${name}" — ${description || "no description"}
City: ${city || "unknown"}, Country: ${country || "unknown"}

Return: {"vertical":"food|grocery|shops|services|property|healthcare|mobility|experiences","category":"cluster_value","subcategory":"specific_subcategory","tags":["tag1","tag2","tag3"],"tagline":"catchy tagline under 60 chars","seo_description":"SEO meta description under 155 chars"}`
        }],
      });
      const text = data?.choices?.[0]?.message?.content || data?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Normalize AI output to canonical taxonomy
        const normVertical = normalizeVertical(parsed.vertical) || "shops";
        const normSubcategory = parsed.subcategory ? (normalizeSubcategory(parsed.subcategory) || parsed.subcategory) : "";
        const normTags = (parsed.tags || []).map((t: string) => t.toLowerCase().trim()).filter(Boolean);

        setSuggestion({ ...parsed, vertical: normVertical, subcategory: normSubcategory, tags: normTags });
        setVertical(normVertical);
        if (parsed.category) setCluster(parsed.category);
        if (normSubcategory) setSubcategory(normSubcategory);
        if (!description && parsed.tagline) setDescription(parsed.tagline);
        toast.success("AI suggestions ready!");
      }
    } catch {
      toast.error("AI suggestion failed — you can continue manually");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Shop name is required"); return; }
    if (!user) { toast.error("Please sign in first"); return; }
    setLoading(true);
    try {
      const orgId = await ensureOrg();
      if (!orgId) { toast.error("Failed to set up organization"); return; }

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      // Resolve final defaults for any still-empty fields
      const finalDefaults = applyGeoDefaults(country, { currency, defaultLanguage, timezone });

      const insertPayload: Record<string, any> = {
        org_id: orgId,
        user_id: user.id,
        slug,
        name: name.trim(),
        tagline: suggestion?.tagline || "",
        description: description.trim() || suggestion?.seo_description || "",
        city: city.trim() || "",
        country: country.trim() || "",
        contact_email: user.email || "",
        shop_visibility: "public",
        vertical: normalizeVertical(vertical) || "shops",
        tags: suggestion?.tags || [],
        seo_description: suggestion?.seo_description || "",
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
      insertPayload.source_type = suggestion ? "import_ai" : "manual";
      insertPayload.source_confidence = suggestion ? 80 : 100;
      insertPayload.readiness_status = "draft";
      insertPayload.is_auto_generated = false;
      insertPayload.has_photo = false;
      insertPayload.has_menu = false;
      insertPayload.products_count = 0;

      const { error } = await (supabase as any)
        .from("storefront_pages")
        .insert(insertPayload)
        .select("slug")
        .single();

      if (error) {
        if (error.code === "23505") toast.error("This shop name is already taken");
        else toast.error(error.message);
        return;
      }

      toast.success("Shop created! 🎉");
      navigate(`/dashboard/my-shop`);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Store className="h-5 w-5 text-primary" />
          Smart Shop Builder
        </CardTitle>
        <p className="text-xs text-muted-foreground">AI-powered shop creation in under 2 minutes</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs">Shop Name *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pizza House, Beauty Studio..." className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell customers about your business..." className="mt-1" rows={3} />
        </div>

        {/* Taxonomy depth */}
        <TaxonomySelector
          vertical={vertical}
          cluster={cluster}
          subcategory={subcategory}
          onVerticalChange={setVertical}
          onClusterChange={setCluster}
          onSubcategoryChange={setSubcategory}
          compact
        />

        {/* Location */}
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">City</Label><Input value={city} onChange={e => setCity(e.target.value)} placeholder="Dubai" className="mt-1" /></div>
          <div><Label className="text-xs">Country</Label><Input value={country} onChange={e => handleCountryChange(e.target.value)} placeholder="UAE" className="mt-1" /></div>
        </div>
        <div>
          <Label className="text-xs">District / Neighborhood</Label>
          <Input value={district} onChange={e => setDistrict(e.target.value)} placeholder="e.g. Marina, Downtown, Médina..." className="mt-1" />
        </div>

        {/* World-readiness (auto-prefilled by country) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Currency</Label>
            <Select value={currency || "AED"} onValueChange={setCurrency}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Language</Label>
            <Select value={defaultLanguage || "en"} onValueChange={setDefaultLanguage}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Capabilities */}
        <CapabilityToggles flags={caps} onChange={(k, v) => setCaps(p => ({ ...p, [k]: v }))} />

        {/* AI Suggest Button */}
        <Button variant="outline" className="w-full h-9 text-xs gap-2" onClick={handleAISuggest} disabled={aiLoading || !name.trim()}>
          {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
          {aiLoading ? "Analyzing..." : "Auto-classify with AI"}
        </Button>

        {/* AI Suggestions */}
        {suggestion && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Zap className="h-3 w-3" /> AI Suggestions
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-[10px]">{suggestion.vertical}</Badge>
                <Badge variant="outline" className="text-[10px]">{suggestion.category}</Badge>
                {suggestion.subcategory && <Badge variant="outline" className="text-[10px]">{suggestion.subcategory}</Badge>}
                {suggestion.tags.map(t => (
                  <Badge key={t} variant="outline" className="text-[10px] gap-0.5">
                    <Tag className="h-2 w-2" /> {t}
                  </Badge>
                ))}
              </div>
              {suggestion.tagline && <p className="text-[11px] text-muted-foreground italic">"{suggestion.tagline}"</p>}
              <div className="flex items-center gap-1 text-[10px] text-success">
                <Check className="h-2.5 w-2.5" /> Will be applied on creation
              </div>
            </CardContent>
          </Card>
        )}

        <Button className="w-full h-11 font-semibold gap-2" onClick={handleCreate} disabled={loading || orgCreating || !name.trim()}>
          {loading || orgCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Create Shop
        </Button>
      </CardContent>
    </Card>
  );
}
