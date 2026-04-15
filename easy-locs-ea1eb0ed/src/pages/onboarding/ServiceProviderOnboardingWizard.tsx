import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUiEngine } from "@/hooks/useUiEngine";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import SubPageShell from "@/components/layout/SubPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Wrench, User, Briefcase, Calendar, CreditCard,
  ArrowRight, ArrowLeft, Loader2, CheckCircle2, Plus, Trash2,
  Camera, Globe, Clock, FileText, Upload,
} from "lucide-react";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const TIME_SLOTS = Array.from({ length: 32 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6;
  const min = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${min}`;
});

const LANGUAGE_IDS = ["arabic", "english", "french", "hindi", "urdu", "tagalog", "chinese", "spanish"] as const;

interface ServiceOffering {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  priceType: "fixed" | "hourly";
  price: number;
  locationType: string;
}

export default function ServiceProviderOnboardingWizard() {
  useUiEngine("onboarding-service-provider");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const dir = (locale === "ar" || locale === "he" || locale === "ur" || locale === "fa") ? "rtl" : "ltr";
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const STEPS = [
    { key: "category", label: t("sp.step_category" as any), icon: Wrench },
    { key: "profile", label: t("sp.step_profile" as any), icon: User },
    { key: "services", label: t("sp.step_services" as any), icon: Briefcase },
    { key: "availability", label: t("sp.step_availability" as any), icon: Calendar },
    { key: "payment", label: t("sp.step_payment" as any), icon: CreditCard },
  ];

  const SERVICE_CATEGORIES = [
    { value: "plumbing", label: t("sp.cat_plumbing" as any) },
    { value: "electrical", label: t("sp.cat_electrical" as any) },
    { value: "cleaning", label: t("sp.cat_cleaning" as any) },
    { value: "hairdressing", label: t("sp.cat_hairdressing" as any) },
    { value: "massage", label: t("sp.cat_massage" as any) },
    { value: "fitness", label: t("sp.cat_fitness" as any) },
    { value: "tutoring", label: t("sp.cat_tutoring" as any) },
    { value: "gardening", label: t("sp.cat_gardening" as any) },
    { value: "moving", label: t("sp.cat_moving" as any) },
    { value: "photography", label: t("sp.cat_photography" as any) },
    { value: "painting", label: t("sp.cat_painting" as any) },
    { value: "carpentry", label: t("sp.cat_carpentry" as any) },
    { value: "ac_repair", label: t("sp.cat_ac_repair" as any) },
    { value: "pet_care", label: t("sp.cat_pet_care" as any) },
    { value: "cooking", label: t("sp.cat_cooking" as any) },
    { value: "other", label: t("sp.cat_other" as any) },
  ];

  const DAY_LABELS_KEYS = [
    "mob.day_mon", "mob.day_tue", "mob.day_wed", "mob.day_thu",
    "mob.day_fri", "mob.day_sat", "mob.day_sun",
  ] as const;

  const LOCATION_TYPES_KEYS = [
    { value: "at_client", label: t("sp.at_client" as any) },
    { value: "at_my_location", label: t("sp.at_my_location" as any) },
    { value: "remote", label: t("sp.remote" as any) },
  ];

  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");

  const [profile, setProfile] = useState({
    bio: "",
    yearsExperience: 0,
    languages: [] as string[],
  });
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>([]);
  const [certificationUrls, setCertificationUrls] = useState<string[]>([]);

  const [services, setServices] = useState<ServiceOffering[]>([]);
  const [newService, setNewService] = useState<ServiceOffering>({
    id: "",
    title: "",
    description: "",
    durationMinutes: 60,
    priceType: "fixed",
    price: 0,
    locationType: "at_client",
  });

  const [availability, setAvailability] = useState<Record<string, string[]>>(
    Object.fromEntries(DAYS.map((d) => [d, []]))
  );
  const [coverageRadiusKm, setCoverageRadiusKm] = useState(15);

  const [payment, setPayment] = useState({
    iban: "",
    accountHolder: "",
    bankName: "",
    swift: "",
    minTravelFee: 0,
  });

  const canNext = useCallback(() => {
    if (step === 0) return !!category;
    if (step === 1) return profile.bio.length > 10;
    if (step === 2) return services.length >= 1;
    if (step === 3) return true;
    if (step === 4) return payment.iban && payment.accountHolder;
    return true;
  }, [step, category, profile, services, payment]);

  const addService = () => {
    if (!newService.title || newService.price <= 0) {
      toast.error(t("sp.fill_service_title_price" as any));
      return;
    }
    setServices([...services, { ...newService, id: crypto.randomUUID() }]);
    setNewService({
      id: "",
      title: "",
      description: "",
      durationMinutes: 60,
      priceType: "fixed",
      price: 0,
      locationType: "at_client",
    });
  };

  const removeService = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
  };

  const toggleLanguage = (lang: string) => {
    setProfile((prev) => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang],
    }));
  };

  const toggleSlot = (day: string, slot: string) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: prev[day].includes(slot)
        ? prev[day].filter((s) => s !== slot)
        : [...prev[day], slot].sort(),
    }));
  };

  const handlePhotoUpload = async () => {
    if (!user?.id) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/portfolio-${Date.now()}.${ext}`;
      await supabase.storage.from("onboarding-media").upload(path, file, { upsert: true });
      const { data } = supabase.storage.from("onboarding-media").getPublicUrl(path);
      if (data?.publicUrl) setPortfolioPhotos((p) => [...p, data.publicUrl]);
    };
    input.click();
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("providers").upsert({
        user_id: user.id,
        provider_type: "service_provider",
        display_name: user.email?.split("@")[0] || "Service Provider",
        city: "Dubai",
        country: "AE",
        coverage_radius_km: coverageRadiusKm,
        gallery_urls: portfolioPhotos,
        description: profile.bio,
        bank_iban: payment.iban,
        bank_account_holder: payment.accountHolder,
        bank_name: payment.bankName,
        bank_swift: payment.swift,
        operating_hours: availability,
        onboarding_status: "completed",
        onboarding_completed_at: new Date().toISOString(),
        kyc_status: "not_started",
        is_active: false,
        tags: [category, subCategory].filter(Boolean),
        metadata: {
          category,
          sub_category: subCategory,
          years_experience: profile.yearsExperience,
          languages: profile.languages,
          services: services.map((s) => ({
            title: s.title,
            description: s.description,
            duration_minutes: s.durationMinutes,
            price_type: s.priceType,
            price: s.price,
            location_type: s.locationType,
          })),
          certifications: certificationUrls,
          min_travel_fee: payment.minTravelFee,
        },
      }, { onConflict: "user_id" });

      if (error) throw error;
      toast.success(t("sp.registration_complete" as any));
      navigate("/pro/dashboard");
    } catch (err: any) {
      toast.error(t("sp.registration_failed" as any) + ": " + (err.message || t("ob.unknown_error" as any)));
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <SubPageShell noContentPad className="bg-background">
      <div dir={dir} className="px-4 pt-6 pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <Wrench className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-foreground">{t("sp.registration_title" as any)}</h1>
            <p className="text-xs text-muted-foreground">
              {(t("sp.step_of" as any) as string).replace("{current}", String(step + 1)).replace("{total}", String(STEPS.length))} — {STEPS[step].label}
            </p>
          </div>
        </div>
        <Progress value={progress} className="h-1.5" aria-label={`Registration progress: step ${step + 1} of ${STEPS.length}`} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="px-4 pb-32 space-y-4"
        >
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("sp.select_category" as any)}</p>
              <div className="grid grid-cols-2 gap-2">
                {SERVICE_CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    aria-pressed={category === c.value}
                    className={`p-3 rounded-xl text-sm font-medium border text-left ${
                      category === c.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/20 text-muted-foreground"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              {category && (
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">{t("sp.sub_category" as any)}</label>
                  <Input value={subCategory} onChange={(e) => setSubCategory(e.target.value)} placeholder={t("sp.ph_subcategory" as any)} />
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("sp.professional_bio" as any)} *</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className="w-full rounded-xl bg-muted p-3 text-sm text-foreground min-h-[100px] resize-none border-0"
                  placeholder={t("sp.bio_placeholder" as any)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("sp.years_experience" as any)}</label>
                <Input
                  type="number"
                  value={profile.yearsExperience || ""}
                  onChange={(e) => setProfile({ ...profile, yearsExperience: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">{t("sp.languages_spoken" as any)}</label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_IDS.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => toggleLanguage(lang)}
                      aria-pressed={profile.languages.includes(lang)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                        profile.languages.includes(lang)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/20 text-muted-foreground"
                      }`}
                    >
                      {t(`sp.lang_${lang}` as any)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("sp.portfolio_photos" as any)}</label>
                <div className="grid grid-cols-4 gap-2">
                  {portfolioPhotos.map((url, i) => (
                    <div key={i} className="relative h-16 rounded-lg overflow-hidden">
                      <img loading="lazy" src={url} alt={`Portfolio photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setPortfolioPhotos(portfolioPhotos.filter((_, j) => j !== i))}
                        aria-label={`Remove portfolio photo ${i + 1}`}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center"
                      >
                        <Trash2 className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                  {portfolioPhotos.length < 10 && (
                    <button onClick={handlePhotoUpload} aria-label="Upload portfolio photo" className="h-16 rounded-lg border-2 border-dashed border-border/30 flex items-center justify-center">
                      <Camera className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("sp.certifications" as any)}</label>
                <p className="text-xs text-muted-foreground mb-2">{t("sp.cert_hint" as any)}</p>
                <div className="space-y-2">
                  {certificationUrls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/30 p-2">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs text-foreground truncate flex-1">Certificate {i + 1}</span>
                      <button onClick={() => setCertificationUrls(certificationUrls.filter((_, j) => j !== i))} aria-label={`Remove certificate ${i + 1}`} className="text-muted-foreground hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={async () => {
                      if (!user?.id) return;
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*,.pdf";
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        const ext = file.name.split(".").pop() || "pdf";
                        const path = `${user.id}/cert-${Date.now()}.${ext}`;
                        await supabase.storage.from("onboarding-media").upload(path, file, { upsert: true });
                        const { data } = supabase.storage.from("onboarding-media").getPublicUrl(path);
                        if (data?.publicUrl) setCertificationUrls((p) => [...p, data.publicUrl]);
                      };
                      input.click();
                    }}
                    className="w-full h-10 rounded-lg border-2 border-dashed border-border/30 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:bg-muted/30"
                  >
                    <Upload className="w-3.5 h-3.5" /> {t("sp.upload_certificate" as any)}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("sp.add_service" as any)}</p>
              {services.map((s) => (
                <div key={s.id} className="rounded-xl bg-muted/30 p-3 flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.durationMinutes}min · {s.price} AED ({s.priceType === "fixed" ? t("sp.fixed_price" as any) : t("sp.per_hour" as any)}) · {t(`sp.${s.locationType}` as any)}
                    </p>
                  </div>
                  <button onClick={() => removeService(s.id)} aria-label={`Remove ${s.title} service`} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              <div className="rounded-xl border border-border/20 p-4 space-y-3">
                <Input value={newService.title} onChange={(e) => setNewService({ ...newService, title: e.target.value })} placeholder={t("sp.service_title" as any) + " *"} />
                <textarea
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  className="w-full rounded-xl bg-muted p-3 text-sm text-foreground min-h-[60px] resize-none border-0"
                  placeholder={t("sp.service_description" as any) + "..."}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">{t("sp.duration" as any)}</label>
                    <Input type="number" value={newService.durationMinutes} onChange={(e) => setNewService({ ...newService, durationMinutes: parseInt(e.target.value) || 60 })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t("sp.price_aed" as any)} *</label>
                    <Input type="number" value={newService.price || ""} onChange={(e) => setNewService({ ...newService, price: parseFloat(e.target.value) || 0 })} className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">{t("sp.price_type" as any)}</label>
                    <select
                      value={newService.priceType}
                      onChange={(e) => setNewService({ ...newService, priceType: e.target.value as "fixed" | "hourly" })}
                      className="w-full rounded-lg bg-muted text-sm px-3 py-2 text-foreground border-0 mt-1"
                    >
                      <option value="fixed">{t("sp.fixed_price" as any)}</option>
                      <option value="hourly">{t("sp.per_hour" as any)}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t("sp.location" as any)}</label>
                    <select
                      value={newService.locationType}
                      onChange={(e) => setNewService({ ...newService, locationType: e.target.value })}
                      className="w-full rounded-lg bg-muted text-sm px-3 py-2 text-foreground border-0 mt-1"
                    >
                      {LOCATION_TYPES_KEYS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                </div>
                <Button onClick={addService} variant="outline" size="sm" className="w-full">
                  <Plus className="w-4 h-4 mr-1" /> {t("sp.add_service_btn" as any)}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("sp.weekly_availability" as any)}</p>
              <div className="space-y-3">
                {DAYS.map((day, di) => {
                  const slots = availability[day] || [];
                  return (
                    <div key={day} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{t(DAY_LABELS_KEYS[di] as any)}</span>
                        <span className="text-xs text-muted-foreground">{slots.length} {t("sp.slots" as any)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {TIME_SLOTS.filter((_, i) => i % 2 === 0).map((slot) => (
                          <button
                            key={slot}
                            onClick={() => toggleSlot(day, slot)}
                            aria-pressed={slots.includes(slot)}
                            aria-label={`${day} ${slot}`}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                              slots.includes(slot)
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/50 text-muted-foreground"
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("sp.intervention_radius" as any)}</label>
                <Input
                  type="number"
                  value={coverageRadiusKm}
                  onChange={(e) => setCoverageRadiusKm(parseInt(e.target.value) || 15)}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("sp.iban" as any)} *</label>
                <Input value={payment.iban} onChange={(e) => setPayment({ ...payment, iban: e.target.value })} placeholder={t("sp.ph_iban" as any)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("sp.account_holder" as any)} *</label>
                <Input value={payment.accountHolder} onChange={(e) => setPayment({ ...payment, accountHolder: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("sp.bank_name" as any)}</label>
                <Input value={payment.bankName} onChange={(e) => setPayment({ ...payment, bankName: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("sp.swift_code" as any)}</label>
                <Input value={payment.swift} onChange={(e) => setPayment({ ...payment, swift: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">{t("sp.min_travel_fee" as any)}</label>
                <Input type="number" value={payment.minTravelFee || ""} onChange={(e) => setPayment({ ...payment, minTravelFee: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur border-t border-border/10">
        <div className="flex gap-3 max-w-lg mx-auto">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-1" /> {t("sp.back" as any)}
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="flex-1">
              {t("sp.next" as any)} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting || !canNext()} className="flex-1">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              {t("sp.complete_registration" as any)}
            </Button>
          )}
        </div>
      </div>
    </SubPageShell>
  );
}
