import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Shield, Home, Users, ArrowRight, ArrowLeft, MapPin, Loader2,
  User, Building, Link2, ClipboardList, FileText, CheckCircle2, Briefcase
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n, COUNTRY_LOCALE_MAP, COUNTRY_CURRENCY_MAP, type Locale } from "@/lib/i18n";
import { Progress } from "@/components/ui/progress";

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

const countries = [
  { code: "FR", name: "France", flag: "🇫🇷", available: true },
  { code: "BE", name: "Belgique", flag: "🇧🇪", available: true },
  { code: "ES", name: "España", flag: "🇪🇸", available: true },
  { code: "IT", name: "Italia", flag: "🇮🇹", available: true },
  { code: "DE", name: "Deutschland", flag: "🇩🇪", available: true },
  { code: "PT", name: "Portugal", flag: "🇵🇹", available: true },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", available: true },
  { code: "US", name: "United States", flag: "🇺🇸", available: true },
  { code: "CH", name: "Suisse", flag: "🇨🇭", available: true },
  { code: "BR", name: "Brasil", flag: "🇧🇷", available: false },
  { code: "MX", name: "México", flag: "🇲🇽", available: false },
];

const userTypes: { type: UserType; labelKey: string; descKey: string; icon: typeof Home }[] = [
  { type: "landlord", labelKey: "Bailleur / Propriétaire", descKey: "Gérez vos biens, locataires et documents", icon: Home },
  { type: "tenant", labelKey: "Locataire", descKey: "Accédez à vos quittances et payez votre loyer", icon: Users },
];

const rentalModes: { mode: RentalMode; label: string; desc: string; icon: typeof Home }[] = [
  { mode: "long_term", label: "Longue durée", desc: "Baux classiques avec locataires", icon: Home },
  { mode: "short_term", label: "Courte durée", desc: "Airbnb, Booking, locations saisonnières", icon: Building },
  { mode: "mixed", label: "Mixte", desc: "Les deux modes combinés", icon: Briefcase },
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rentalMode, setRentalMode] = useState<RentalMode | null>(null);

  // Owner profile
  const [ownerForm, setOwnerForm] = useState({
    person_type: "individual" as "individual" | "company",
    full_name: "", company_name: "", address: "", postal_code: "",
    city: "", phone: "", email: "", tax_id: "", bank_iban: "", bank_bic: "",
  });

  // Property
  const [propertyForm, setPropertyForm] = useState({
    label: "", address: "", postal_code: "", city: "",
    property_type: "apartment", surface: 0, rooms: 1,
    furnished: false, monthly_rent: 0, monthly_charges: 0, deposit_amount: 0,
  });

  // Tenant
  const [tenantForm, setTenantForm] = useState({
    name: "", email: "", phone: "", lease_type: "empty",
    rent_amount: 0, charges_amount: 0, deposit_amount: 0,
    lease_start: new Date().toISOString().slice(0, 10),
  });

  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, setLocale } = useI18n();

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
    const autoLocale = COUNTRY_LOCALE_MAP[country] || "en";
    const autoCurrency = COUNTRY_CURRENCY_MAP[country] || "EUR";
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
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setStep(2); saveStep(2);
  };

  const handlePropertySave = async () => {
    if (!user || !propertyForm.label) return;
    setSaving(true);
    const { data: orgData } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
    if (!orgData) { setSaving(false); return; }
    const { error } = await supabase.from("properties").insert({
      org_id: orgData.org_id, user_id: user.id, ...propertyForm,
      rental_mode: rentalMode || "long_term",
    });
    setSaving(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }

    const nextStep = rentalMode === "short_term" ? 3 : rentalMode === "mixed" ? 3 : 4;
    setStep(nextStep); saveStep(nextStep);
  };

  const handleTenantSave = async () => {
    if (!user || !tenantForm.name) return;
    setSaving(true);
    const { data: orgData } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
    if (!orgData) { setSaving(false); return; }

    // Get first property
    const { data: props } = await supabase.from("properties").select("id").eq("org_id", orgData.org_id).limit(1);
    const propertyId = props?.[0]?.id || null;

    const { error } = await supabase.from("tenants").insert({
      org_id: orgData.org_id, user_id: user.id, property_id: propertyId,
      name: tenantForm.name, email: tenantForm.email, phone: tenantForm.phone,
      lease_type: tenantForm.lease_type, rent_amount: tenantForm.rent_amount,
      charges_amount: tenantForm.charges_amount, deposit_amount: tenantForm.deposit_amount,
      lease_start: tenantForm.lease_start,
    });
    setSaving(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setStep(5); saveStep(5);
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ onboarding_completed: true, onboarding_step: 7 }).eq("id", user.id);
    setSaving(false);
    toast({ title: "🎉 Configuration terminée !", description: "Votre espace est prêt." });
    navigate("/dashboard");
  };

  const renderInput = (label: string, value: string | number, onChange: (v: string) => void, type = "text", required = false) => (
    <div>
      <label className="text-sm font-medium text-foreground">{label}{required && " *"}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none" />
    </div>
  );

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-4">
      <div className="absolute top-6 left-6 flex items-center gap-2">
        <Shield className="h-7 w-7 text-gold" />
        <span className="text-xl font-bold text-primary-foreground">Easyloc</span>
      </div>

      <motion.div className="bg-card rounded-2xl shadow-card-hover p-6 sm:p-10 max-w-2xl w-full"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">{t("onboarding.title")}</span>
            <span className="text-xs font-bold text-accent">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex gap-1 mt-3">
            {STEPS.map((s, i) => (
              <div key={s.key} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-gradient-gold" : "bg-border"}`} />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Type + Country */}
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl font-bold text-foreground mb-2">Bienvenue sur Easyloc</h2>
              <p className="text-muted-foreground mb-6">Sélectionnez votre profil et votre pays</p>

              <p className="text-sm font-semibold text-foreground mb-3">Vous êtes…</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {userTypes.map(p => (
                  <button key={p.type} onClick={() => setSelectedType(p.type)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${selectedType === p.type ? "border-gold bg-gold/5" : "border-border hover:border-gold/40"}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${selectedType === p.type ? "bg-gradient-gold" : "bg-muted"}`}>
                      <p.icon className={`h-5 w-5 ${selectedType === p.type ? "text-accent-foreground" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">{p.labelKey}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{p.descKey}</div>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-sm font-semibold text-foreground mb-3">Votre pays</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {countries.map(c => (
                  <button key={c.code} onClick={() => c.available && setCountry(c.code)} disabled={!c.available}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-left text-sm ${country === c.code ? "border-gold bg-gold/5" : c.available ? "border-border hover:border-gold/40" : "border-border/50 opacity-40 cursor-not-allowed"}`}>
                    <span className="text-lg">{c.flag}</span>
                    <span className="font-medium text-foreground truncate">{c.name}</span>
                    {!c.available && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full ml-auto">Soon</span>}
                  </button>
                ))}
              </div>

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
              <p className="text-muted-foreground mb-6">Vos informations de propriétaire / bailleur</p>

              <div className="flex gap-3 mb-4">
                {(["individual", "company"] as const).map(pt => (
                  <button key={pt} onClick={() => setOwnerForm(f => ({ ...f, person_type: pt }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${ownerForm.person_type === pt ? "border-gold bg-gold/5 text-foreground" : "border-border text-muted-foreground"}`}>
                    {pt === "individual" ? "Personne physique" : "Société"}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {renderInput("Nom complet", ownerForm.full_name, v => setOwnerForm(f => ({ ...f, full_name: v })), "text", true)}
                {ownerForm.person_type === "company" && renderInput("Raison sociale", ownerForm.company_name || "", v => setOwnerForm(f => ({ ...f, company_name: v })))}
                {renderInput("Adresse", ownerForm.address, v => setOwnerForm(f => ({ ...f, address: v })))}
                {renderInput("Code postal", ownerForm.postal_code, v => setOwnerForm(f => ({ ...f, postal_code: v })))}
                {renderInput("Ville", ownerForm.city, v => setOwnerForm(f => ({ ...f, city: v })))}
                {renderInput("Téléphone", ownerForm.phone, v => setOwnerForm(f => ({ ...f, phone: v })), "tel")}
                {renderInput("Email", ownerForm.email, v => setOwnerForm(f => ({ ...f, email: v })), "email")}
                {renderInput("N° fiscal (SIRET, NIF…)", ownerForm.tax_id, v => setOwnerForm(f => ({ ...f, tax_id: v })))}
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
              <p className="text-muted-foreground mb-4">Décrivez votre premier bien</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {renderInput("Nom du bien *", propertyForm.label, v => setPropertyForm(f => ({ ...f, label: v })), "text", true)}
                {renderInput("Adresse", propertyForm.address, v => setPropertyForm(f => ({ ...f, address: v })))}
                {renderInput("Code postal", propertyForm.postal_code, v => setPropertyForm(f => ({ ...f, postal_code: v })))}
                {renderInput("Ville", propertyForm.city, v => setPropertyForm(f => ({ ...f, city: v })))}
                {renderInput("Surface (m²)", propertyForm.surface, v => setPropertyForm(f => ({ ...f, surface: Number(v) || 0 })), "number")}
                {renderInput("Pièces", propertyForm.rooms, v => setPropertyForm(f => ({ ...f, rooms: Number(v) || 1 })), "number")}
                {renderInput("Loyer mensuel", propertyForm.monthly_rent, v => setPropertyForm(f => ({ ...f, monthly_rent: Number(v) || 0 })), "number")}
                {renderInput("Charges", propertyForm.monthly_charges, v => setPropertyForm(f => ({ ...f, monthly_charges: Number(v) || 0 })), "number")}
                {renderInput("Dépôt de garantie", propertyForm.deposit_amount, v => setPropertyForm(f => ({ ...f, deposit_amount: Number(v) || 0 })), "number")}
              </div>

              <div className="flex items-center gap-3 mb-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={propertyForm.furnished} onChange={e => setPropertyForm(f => ({ ...f, furnished: e.target.checked }))} className="rounded" />
                  Meublé
                </label>
              </div>

              <p className="text-sm font-semibold text-foreground mb-3">Mode de location</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                {rentalModes.map(rm => (
                  <button key={rm.mode} onClick={() => setRentalMode(rm.mode)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${rentalMode === rm.mode ? "border-gold bg-gold/5" : "border-border hover:border-gold/40"}`}>
                    <div className="font-semibold text-sm text-foreground">{rm.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{rm.desc}</div>
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
              <p className="text-muted-foreground mb-6">Connectez vos comptes Airbnb et Booking</p>

              <div className="space-y-3">
                {[
                  { name: "Airbnb", color: "bg-[hsl(350,80%,55%)]", desc: "Synchronisez vos annonces et réservations" },
                  { name: "Booking.com", color: "bg-[hsl(220,80%,45%)]", desc: "Importez vos réservations automatiquement" },
                ].map(ota => (
                  <div key={ota.name} className="flex items-center gap-4 p-4 rounded-xl border border-border">
                    <div className={`w-10 h-10 rounded-lg ${ota.color} flex items-center justify-center text-white font-bold text-sm`}>
                      {ota.name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground text-sm">{ota.name}</div>
                      <div className="text-xs text-muted-foreground">{ota.desc}</div>
                    </div>
                    <button className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                      Connecter
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground mt-4 text-center">
                L'intégration OAuth complète sera disponible prochainement. Vous pouvez passer cette étape.
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
              <p className="text-muted-foreground mb-6">Ajoutez votre premier locataire</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {renderInput("Nom complet *", tenantForm.name, v => setTenantForm(f => ({ ...f, name: v })), "text", true)}
                {renderInput("Email", tenantForm.email, v => setTenantForm(f => ({ ...f, email: v })), "email")}
                {renderInput("Téléphone", tenantForm.phone, v => setTenantForm(f => ({ ...f, phone: v })), "tel")}
                {renderInput("Date début bail", tenantForm.lease_start, v => setTenantForm(f => ({ ...f, lease_start: v })), "date")}
                {renderInput("Loyer mensuel", tenantForm.rent_amount, v => setTenantForm(f => ({ ...f, rent_amount: Number(v) || 0 })), "number")}
                {renderInput("Charges", tenantForm.charges_amount, v => setTenantForm(f => ({ ...f, charges_amount: Number(v) || 0 })), "number")}
                {renderInput("Dépôt de garantie", tenantForm.deposit_amount, v => setTenantForm(f => ({ ...f, deposit_amount: Number(v) || 0 })), "number")}
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

          {/* Step 5: Inventory (placeholder - redirect to full inventory builder) */}
          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t("onboarding.step5")}</h2>
              <p className="text-muted-foreground mb-6">Réalisez l'état des lieux d'entrée</p>

              <div className="bg-muted/50 rounded-xl p-6 text-center">
                <ClipboardList className="h-12 w-12 text-accent mx-auto mb-4" />
                <p className="text-foreground font-medium mb-2">L'état des lieux sera disponible dans votre espace</p>
                <p className="text-sm text-muted-foreground">Vous pourrez le réaliser pièce par pièce avec photos, relevés de compteurs et signatures.</p>
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
              <p className="text-muted-foreground mb-6">Vos documents seront générés automatiquement</p>

              <div className="space-y-3">
                {["Bail conforme au pays sélectionné", "Annexes légales obligatoires", "État des lieux", "Quittances mensuelles"].map(doc => (
                  <div key={doc} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                    <span className="text-sm text-foreground">{doc}</span>
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
              <p className="text-muted-foreground mb-6">Votre espace est prêt ! Voici ce qui sera activé :</p>

              <div className="space-y-3 mb-6">
                {[
                  "✅ Génération automatique des quittances mensuelles",
                  "✅ Alertes de loyer impayé",
                  "✅ Rappels d'assurance et documents",
                  "✅ Envoi automatique par email",
                  "✅ Signature électronique",
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 p-2 text-sm text-foreground">{item}</div>
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
