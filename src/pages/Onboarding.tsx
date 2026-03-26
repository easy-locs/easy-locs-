import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Home, Users, ArrowRight, ArrowLeft, MapPin, Loader2,
  User, Building, Link2, ClipboardList, FileText, CheckCircle2, Briefcase
} from "lucide-react";
import AppLogo from "@/components/AppLogo";
import CountrySelect from "@/components/ui/CountrySelect";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n, type Locale } from "@/lib/i18n";
import { getCountryEntry } from "@/lib/global-country-registry";
import { Progress } from "@/components/ui/progress";
import AddressAutocomplete, { type AddressResult } from "@/components/ui/AddressAutocomplete";
import { useGeoDetect } from "@/hooks/useGeoDetect";

type UserType = "landlord" | "tenant";
type RentalMode = "long_term" | "short_term" | "mixed";

const STEPS = [
  { key: "plan", icon: MapPin, requiredFor: "all" },
  { key: "owner", icon: User, requiredFor: "landlord" },
  { key: "property", icon: Building, requiredFor: "landlord" },
  { key: "ota", icon: Link2, requiredFor: "short_term" },
  { key: "tenant", icon: Users, requiredFor: "long_term" },
  { key: "inventory", icon: ClipboardList, requiredFor: "long_term" },
  { key: "documents", icon: FileText, requiredFor: "long_term" },
  { key: "activation", icon: CheckCircle2, requiredFor: "all" },
];

// Countries are now sourced from CountrySelect (global-country-registry)

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rentalMode, setRentalMode] = useState<RentalMode | null>(null);
  const [savedPropertyId, setSavedPropertyId] = useState<string | null>(null);
  const [icalUrls, setIcalUrls] = useState<Record<string, string>>({ airbnb: "", booking: "" });
  const [icalSyncing, setIcalSyncing] = useState<string | null>(null);
  const [icalResults, setIcalResults] = useState<Record<string, number>>({});

  // Owner profile
  const [ownerForm, setOwnerForm] = useState({
    person_type: "individual" as "individual" | "company",
    full_name: "", company_name: "", address: "", postal_code: "",
    city: "", phone: "", email: "", tax_id: "", bank_iban: "", bank_bic: "",
  });

  // Property
  const [propertyForm, setPropertyForm] = useState({
    label: "", address: "", postal_code: "", city: "",
    property_type: "apartment", surface: 0, rooms: 0,
    furnished: false, monthly_rent: 0, monthly_charges: 0, deposit_amount: 0,
  });

  // Tenant
  const [tenantForm, setTenantForm] = useState({
    name: "", email: "", phone: "", lease_type: "empty",
    rent_amount: 0, charges_amount: 0, deposit_amount: 0,
    lease_start: new Date().toISOString().slice(0, 10),
  });

  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { t, setLocale } = useI18n();
  const { detection: geo } = useGeoDetect();

  // Auto-detect country from geolocation + pre-fill email
  useEffect(() => {
    if (!country && geo?.country && geo.country !== "US") {
      setCountry(geo.country);
    }
    if (user?.email && !ownerForm.email) {
      setOwnerForm(f => ({ ...f, email: user.email || "" }));
    }
  }, [geo?.country, user?.email]);

  // Load saved progress
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("onboarding_step, country, user_type").eq("id", user.id).single()
      .then(({ data }) => {
        if (data?.onboarding_step) setStep(data.onboarding_step);
        if (data?.country) setCountry(data.country);
        if (data?.user_type) setSelectedType(data.user_type as UserType);
      });
  }, [user]);

  // Auto-save step
  const saveStep = useCallback(async (s: number) => {
    if (!user) return;
    await supabase.from("profiles").update({ onboarding_step: s }).eq("id", user.id);
  }, [user]);

  const totalSteps = STEPS.length;
  const progress = Math.round(((step + 1) / totalSteps) * 100);

  const handleStep0Next = async () => {
    if (!user || !country || !selectedType) return;
    setSaving(true);

    const countryEntry = getCountryEntry(country) || { defaultLanguage: "en", currency: "EUR" };
    const autoLocale = (countryEntry.defaultLanguage || "en") as Locale;
    const autoCurrency = countryEntry.currency || "EUR";

    await supabase.from("profiles").update({
      country, locale: autoLocale, currency: autoCurrency, user_type: selectedType,
    }).eq("id", user.id);
    setLocale(autoLocale as Locale);

    if (selectedType === "tenant") {
      await supabase.from("profiles").update({ onboarding_completed: true, onboarding_step: 7 }).eq("id", user.id);
      setSaving(false);
      navigate("/tenant");
      return;
    }

    // For landlord type: ensure org exists (client accounts don't have one yet)
    const { data: existingOrg } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).maybeSingle();
    if (!existingOrg) {
      const newOrgId = crypto.randomUUID();
      await supabase.from("orgs").insert({ id: newOrgId, owner_user_id: user.id, name: "Mon organisation" });
      await supabase.from("org_members").insert({ org_id: newOrgId, user_id: user.id, role: "owner" });
      // Create trial subscription
      await supabase.from("subscriptions").insert({ user_id: user.id, plan: "trial", status: "trialing", trial_ends_at: new Date(Date.now() + 3 * 86400000).toISOString() });
    }

    setSaving(false);
    setStep(1);
    saveStep(1);
  };

  const handleOwnerSave = async () => {
    if (!user || !ownerForm.full_name) return;
    setSaving(true);
    const { data: orgData } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
    if (!orgData) { setSaving(false); return; }
    const { error } = await supabase.from("owner_profiles").insert({
      user_id: user.id, org_id: orgData.org_id, ...ownerForm, country: country || "FR",
      email: ownerForm.email || user.email || "",
    });
    setSaving(false);
    if (error) { toast({ title: t("common.error"), description: error.message, variant: "destructive" }); return; }
    setStep(2); saveStep(2);
  };

  const handlePropertySave = async () => {
    if (!user || !propertyForm.label) return;
    setSaving(true);
    const { data: orgData } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
    if (!orgData) { setSaving(false); return; }
    const { data: propData, error } = await supabase.from("properties").insert({
      org_id: orgData.org_id,
      user_id: user.id,
      country: country || "FR",
      ...propertyForm,
      rental_mode: rentalMode || "long_term",
    }).select("id").single();
    setSaving(false);
    if (error) { toast({ title: t("common.error"), description: error.message, variant: "destructive" }); return; }

    // Save property ID and auto-fill tenant financial fields
    if (propData) {
      setSavedPropertyId(propData.id);
      setTenantForm(f => ({
        ...f,
        rent_amount: propertyForm.monthly_rent,
        charges_amount: propertyForm.monthly_charges,
        deposit_amount: propertyForm.deposit_amount,
      }));
    }

    const nextStep = rentalMode === "short_term" ? 3 : rentalMode === "mixed" ? 3 : 4;
    setStep(nextStep); saveStep(nextStep);
  };

  const handleTenantSave = async () => {
    if (!user || !tenantForm.name) return;
    setSaving(true);
    const { data: orgData } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
    if (!orgData) { setSaving(false); return; }

    const propertyId = savedPropertyId || null;

    const { error } = await supabase.from("tenants").insert({
      org_id: orgData.org_id, user_id: user.id, property_id: propertyId,
      name: tenantForm.name, email: tenantForm.email, phone: tenantForm.phone,
      lease_type: tenantForm.lease_type, rent_amount: tenantForm.rent_amount,
      charges_amount: tenantForm.charges_amount, deposit_amount: tenantForm.deposit_amount,
      lease_start: tenantForm.lease_start,
    });
    setSaving(false);
    if (error) { toast({ title: t("common.error"), description: error.message, variant: "destructive" }); return; }
    setStep(5); saveStep(5);
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ onboarding_completed: true, onboarding_step: 7 }).eq("id", user.id);
    await refreshProfile();
    setSaving(false);
    toast({ title: "🎉 " + t("ob.finish_title"), description: t("ob.finish_desc") });
    navigate("/dashboard");
  };

  /* Address autocomplete handler for owner */
  const handleOwnerAddressSelect = (result: AddressResult) => {
    setOwnerForm(f => ({
      ...f,
      address: result.street ? `${result.housenumber || ""} ${result.street}`.trim() : result.label,
      postal_code: result.postcode || f.postal_code,
      city: result.city || f.city,
    }));
  };

  /* Address autocomplete handler for property */
  const handlePropertyAddressSelect = (result: AddressResult) => {
    setPropertyForm(f => ({
      ...f,
      address: result.street ? `${result.housenumber || ""} ${result.street}`.trim() : result.label,
      postal_code: result.postcode || f.postal_code,
      city: result.city || f.city,
    }));
  };

  /* iCal sync handler */
  const handleIcalSync = async (provider: string) => {
    const url = icalUrls[provider];
    if (!url || !user || !savedPropertyId) return;
    setIcalSyncing(provider);
    try {
      const { data: orgData } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
      if (!orgData) throw new Error("No org");

      // Save OTA connection
      await supabase.from("ota_connections").upsert({
        org_id: orgData.org_id,
        user_id: user.id,
        provider,
        status: "active",
        linked_properties: [savedPropertyId],
      }, { onConflict: "id" });

      const { data, error } = await supabase.functions.invoke("sync-ical", {
        body: { ical_url: url, property_id: savedPropertyId, provider, org_id: orgData.org_id },
      });
      if (error) throw error;
      setIcalResults(prev => ({ ...prev, [provider]: data.inserted || 0 }));
      toast({ title: "✅ " + (data.inserted || 0) + " " + t("ob.ical_success") });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    }
    setIcalSyncing(null);
  };

  const renderInput = (label: string, value: string | number, onChange: (v: string) => void, type = "text", required = false) => (
    <div className="min-w-0">
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}{required && " *"}</label>
      <input type={type} value={value === 0 && type === "number" ? "" : value} onChange={e => onChange(e.target.value)}
        placeholder={type === "number" ? "0" : ""}
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none" />
    </div>
  );

  return (
    <div className="app-mobile-page bg-hero flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute top-6 left-6">
        <AppLogo variant="auth" linkTo="/" />
      </div>

      <motion.div className="bg-card rounded-2xl shadow-card-hover p-5 sm:p-10 max-w-2xl w-full my-16"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>

        {/* Progress + Step indicators */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">{t("onboarding.title")}</span>
            <span className="text-xs font-bold text-accent">{t("ob.step") || "Step"} {step + 1}/{totalSteps}</span>
          </div>
          <Progress value={progress} className="h-2" />
          {/* Visual step dots with icons */}
          <div className="flex items-center justify-between mt-4 px-1">
            {STEPS.map((s, i) => {
              const StepIcon = s.icon;
              const isDone = i < step;
              const isCurrent = i === step;
              return (
                <div key={s.key} className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone ? "bg-success text-success-foreground" :
                    isCurrent ? "bg-gradient-gold text-accent-foreground shadow-gold" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : <StepIcon className="h-3.5 w-3.5" />}
                  </div>
                  <span className={`text-[9px] font-medium hidden sm:block ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                    {t(`ob.step_${s.key}`) || s.key}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Type + Country */}
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t("ob.welcome")}</h2>
              <p className="text-muted-foreground mb-6">{t("ob.select_profile_country")}</p>

              <p className="text-sm font-semibold text-foreground mb-3">{t("ob.you_are")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {([
                  { type: "landlord" as UserType, labelKey: "ob.landlord", descKey: "ob.landlord_desc", icon: Home },
                  { type: "tenant" as UserType, labelKey: "ob.tenant", descKey: "ob.tenant_desc", icon: Users },
                ]).map(p => (
                  <button key={p.type} onClick={() => setSelectedType(p.type)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${selectedType === p.type ? "border-gold bg-gold/5" : "border-border hover:border-gold/40"}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${selectedType === p.type ? "bg-gradient-gold" : "bg-muted"}`}>
                      <p.icon className={`h-5 w-5 ${selectedType === p.type ? "text-accent-foreground" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">{t(p.labelKey)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t(p.descKey)}</div>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-sm font-semibold text-foreground mb-3">{t("ob.your_country")}</p>
              <CountrySelect value={country || ""} onChange={(code) => setCountry(code || null)} placeholder={t("ob.your_country")} />

              <button disabled={!selectedType || !country || saving} onClick={handleStep0Next}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("common.continue")} <ArrowRight className="h-4 w-4" /></>}
              </button>
            </motion.div>
          )}

          {/* Step 1: Owner Profile */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t("onboarding.step1")}</h2>
              <p className="text-muted-foreground mb-6">{t("ob.owner_info")}</p>

              <div className="flex gap-3 mb-4">
                {(["individual", "company"] as const).map(pt => (
                  <button key={pt} onClick={() => setOwnerForm(f => ({ ...f, person_type: pt }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${ownerForm.person_type === pt ? "border-gold bg-gold/5 text-foreground" : "border-border text-muted-foreground"}`}>
                    {pt === "individual" ? t("ob.individual") : t("ob.company")}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderInput(t("ob.full_name"), ownerForm.full_name, v => setOwnerForm(f => ({ ...f, full_name: v })), "text", true)}
                {ownerForm.person_type === "company" && renderInput(t("ob.company_name"), ownerForm.company_name || "", v => setOwnerForm(f => ({ ...f, company_name: v })))}
                <div className="sm:col-span-2">
                  <AddressAutocomplete
                    label={t("ob.address")}
                    value={ownerForm.address}
                    onChange={v => setOwnerForm(f => ({ ...f, address: v }))}
                    onSelect={handleOwnerAddressSelect}
                    placeholder={t("ob.address_placeholder")}
                    countryCode={country || undefined}
                  />
                </div>
                {renderInput(t("ob.postal_code"), ownerForm.postal_code, v => setOwnerForm(f => ({ ...f, postal_code: v })))}
                {renderInput(t("ob.city"), ownerForm.city, v => setOwnerForm(f => ({ ...f, city: v })))}
                {renderInput(t("ob.phone"), ownerForm.phone, v => setOwnerForm(f => ({ ...f, phone: v })), "tel")}
                {renderInput(t("ob.email"), ownerForm.email, v => setOwnerForm(f => ({ ...f, email: v })), "email")}
                {renderInput(t("ob.tax_id"), ownerForm.tax_id, v => setOwnerForm(f => ({ ...f, tax_id: v })))}
                {renderInput("IBAN", ownerForm.bank_iban, v => setOwnerForm(f => ({ ...f, bank_iban: v })))}
                {renderInput("BIC", ownerForm.bank_bic, v => setOwnerForm(f => ({ ...f, bank_bic: v })))}
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setStep(0); saveStep(0); }} className="flex items-center gap-2 px-5 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors">
                  <ArrowLeft className="h-4 w-4" /> {t("common.back")}
                </button>
                <button disabled={!ownerForm.full_name || saving} onClick={handleOwnerSave}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("common.continue")} <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Property + Rental Mode */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t("onboarding.step2")}</h2>
              <p className="text-muted-foreground mb-4">{t("ob.describe_property")}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {renderInput(t("ob.property_name") + " *", propertyForm.label, v => setPropertyForm(f => ({ ...f, label: v })), "text", true)}
                <div className="sm:col-span-2">
                  <AddressAutocomplete
                    label={t("ob.address")}
                    value={propertyForm.address}
                    onChange={v => setPropertyForm(f => ({ ...f, address: v }))}
                    onSelect={handlePropertyAddressSelect}
                    placeholder={t("ob.address_placeholder")}
                    countryCode={country || undefined}
                  />
                </div>
                {renderInput(t("ob.postal_code"), propertyForm.postal_code, v => setPropertyForm(f => ({ ...f, postal_code: v })))}
                {renderInput(t("ob.city"), propertyForm.city, v => setPropertyForm(f => ({ ...f, city: v })))}
                {renderInput(t("ob.surface"), propertyForm.surface, v => setPropertyForm(f => ({ ...f, surface: Number(v) || 0 })), "number")}
                {renderInput(t("ob.rooms"), propertyForm.rooms === 0 ? "" : propertyForm.rooms, v => setPropertyForm(f => ({ ...f, rooms: v === "" ? 0 : Number(v) })), "number")}
                {renderInput(t("ob.monthly_rent"), propertyForm.monthly_rent, v => setPropertyForm(f => ({ ...f, monthly_rent: Number(v) || 0 })), "number")}
                {renderInput(t("ob.charges"), propertyForm.monthly_charges, v => setPropertyForm(f => ({ ...f, monthly_charges: Number(v) || 0 })), "number")}
                {renderInput(t("ob.deposit"), propertyForm.deposit_amount, v => setPropertyForm(f => ({ ...f, deposit_amount: Number(v) || 0 })), "number")}
              </div>

              <div className="flex items-center gap-3 mb-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={propertyForm.furnished} onChange={e => setPropertyForm(f => ({ ...f, furnished: e.target.checked }))} className="rounded" />
                  {t("ob.furnished")}
                </label>
              </div>

              <p className="text-sm font-semibold text-foreground mb-3">{t("ob.rental_mode")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                {([
                  { mode: "long_term" as RentalMode, labelKey: "ob.long_term", descKey: "ob.long_term_desc", icon: Home },
                  { mode: "short_term" as RentalMode, labelKey: "ob.short_term", descKey: "ob.short_term_desc", icon: Building },
                  { mode: "mixed" as RentalMode, labelKey: "ob.mixed", descKey: "ob.mixed_desc", icon: Briefcase },
                ]).map(rm => (
                  <button key={rm.mode} onClick={() => setRentalMode(rm.mode)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${rentalMode === rm.mode ? "border-gold bg-gold/5" : "border-border hover:border-gold/40"}`}>
                    <div className="font-semibold text-sm text-foreground">{t(rm.labelKey)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t(rm.descKey)}</div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={() => { setStep(1); saveStep(1); }} className="flex items-center gap-2 px-5 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors">
                  <ArrowLeft className="h-4 w-4" /> {t("common.back")}
                </button>
                <button disabled={!propertyForm.label || !rentalMode || saving} onClick={handlePropertySave}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("common.continue")} <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: OTA Connection */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t("onboarding.step3")}</h2>
              <p className="text-muted-foreground mb-6">{t("ob.connect_ota")}</p>

              <div className="space-y-4">
                {[
                  { key: "airbnb", name: "Airbnb", color: "bg-[hsl(350,80%,55%)]", descKey: "ob.airbnb_desc" },
                  { key: "booking", name: "Booking.com", color: "bg-[hsl(220,80%,45%)]", descKey: "ob.booking_desc" },
                ].map(ota => (
                  <div key={ota.key} className="p-4 rounded-xl border border-border space-y-3">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg ${ota.color} flex items-center justify-center text-white font-bold text-sm`}>
                        {ota.name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-foreground text-sm">{ota.name}</div>
                        <div className="text-xs text-muted-foreground">{t(ota.descKey)}</div>
                      </div>
                      {icalResults[ota.key] != null && (
                        <span className="text-xs font-medium text-accent">✅ {icalResults[ota.key]} {t("ob.ical_success")}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder={t("ob.ical_placeholder")}
                        value={icalUrls[ota.key]}
                        onChange={e => setIcalUrls(prev => ({ ...prev, [ota.key]: e.target.value }))}
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                      />
                      <button
                        disabled={!icalUrls[ota.key] || icalSyncing === ota.key || !savedPropertyId}
                        onClick={() => handleIcalSync(ota.key)}
                        className="px-4 py-2 rounded-lg bg-gradient-gold text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {icalSyncing === ota.key ? <Loader2 className="h-4 w-4 animate-spin" /> : t("ob.sync_ical")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground mt-4 text-center">
                {t("ob.ical_info")}
              </p>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setStep(2); saveStep(2); }} className="flex items-center gap-2 px-5 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors">
                  <ArrowLeft className="h-4 w-4" /> {t("common.back")}
                </button>
                <button onClick={() => { setStep(rentalMode === "short_term" ? 7 : 4); saveStep(rentalMode === "short_term" ? 7 : 4); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
                  {rentalMode === "short_term" ? t("common.skip") : t("common.continue")} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Tenant */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t("onboarding.step4")}</h2>
              <p className="text-muted-foreground mb-6">{t("ob.add_first_tenant")}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderInput(t("ob.full_name") + " *", tenantForm.name, v => setTenantForm(f => ({ ...f, name: v })), "text", true)}
                {renderInput(t("ob.email"), tenantForm.email, v => setTenantForm(f => ({ ...f, email: v })), "email")}
                {renderInput(t("ob.phone"), tenantForm.phone, v => setTenantForm(f => ({ ...f, phone: v })), "tel")}
                {renderInput(t("ob.lease_start"), tenantForm.lease_start, v => setTenantForm(f => ({ ...f, lease_start: v })), "date")}
                {renderInput(t("ob.monthly_rent"), tenantForm.rent_amount, v => setTenantForm(f => ({ ...f, rent_amount: Number(v) || 0 })), "number")}
                {renderInput(t("ob.charges"), tenantForm.charges_amount, v => setTenantForm(f => ({ ...f, charges_amount: Number(v) || 0 })), "number")}
                {renderInput(t("ob.deposit"), tenantForm.deposit_amount, v => setTenantForm(f => ({ ...f, deposit_amount: Number(v) || 0 })), "number")}
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { const prev = rentalMode === "mixed" ? 3 : 2; setStep(prev); saveStep(prev); }}
                  className="flex items-center gap-2 px-5 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors">
                  <ArrowLeft className="h-4 w-4" /> {t("common.back")}
                </button>
                <button disabled={!tenantForm.name || saving} onClick={handleTenantSave}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("common.continue")} <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Inventory */}
          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t("onboarding.step5")}</h2>
              <p className="text-muted-foreground mb-6">{t("ob.inventory_desc")}</p>

              <div className="bg-muted/50 rounded-xl p-6 text-center">
                <ClipboardList className="h-12 w-12 text-accent mx-auto mb-4" />
                <p className="text-foreground font-medium mb-2">{t("ob.inventory_available")}</p>
                <p className="text-sm text-muted-foreground">{t("ob.inventory_details")}</p>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setStep(4); saveStep(4); }} className="flex items-center gap-2 px-5 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors">
                  <ArrowLeft className="h-4 w-4" /> {t("common.back")}
                </button>
                <button onClick={() => { setStep(6); saveStep(6); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
                  {t("common.continue")} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 6: Documents */}
          {step === 6 && (
            <motion.div key="s6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t("onboarding.step6")}</h2>
              <p className="text-muted-foreground mb-6">{t("ob.docs_auto")}</p>

              <div className="space-y-3">
                {["ob.doc_lease", "ob.doc_annexes", "ob.doc_inventory", "ob.doc_receipts"].map(key => (
                  <div key={key} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                    <span className="text-sm text-foreground">{t(key)}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setStep(5); saveStep(5); }} className="flex items-center gap-2 px-5 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors">
                  <ArrowLeft className="h-4 w-4" /> {t("common.back")}
                </button>
                <button onClick={() => { setStep(7); saveStep(7); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity">
                  {t("common.continue")} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 7: Activation */}
          {step === 7 && (
            <motion.div key="s7" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t("onboarding.step7")}</h2>
              <p className="text-muted-foreground mb-6">{t("ob.activation_desc")}</p>

              <div className="space-y-3 mb-6">
                {["ob.act_receipts", "ob.act_alerts", "ob.act_reminders", "ob.act_email", "ob.act_esign"].map(key => (
                  <div key={key} className="flex items-center gap-2 p-2 text-sm text-foreground">✅ {t(key)}</div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setStep(6); saveStep(6); }} className="flex items-center gap-2 px-5 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors">
                  <ArrowLeft className="h-4 w-4" /> {t("common.back")}
                </button>
                <button disabled={saving} onClick={handleFinish}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>🚀 {t("common.finish")}</>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Onboarding;
