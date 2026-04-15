import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUiEngine } from "@/hooks/useUiEngine";
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

const STEPS = [
  { key: "category", label: "Service Category", icon: Wrench },
  { key: "profile", label: "Professional Profile", icon: User },
  { key: "services", label: "Services Offered", icon: Briefcase },
  { key: "availability", label: "Availability", icon: Calendar },
  { key: "payment", label: "Payment", icon: CreditCard },
];

const SERVICE_CATEGORIES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "cleaning", label: "Cleaning" },
  { value: "hairdressing", label: "Hairdressing" },
  { value: "massage", label: "Massage & Wellness" },
  { value: "fitness", label: "Fitness Coaching" },
  { value: "tutoring", label: "Tutoring" },
  { value: "gardening", label: "Gardening" },
  { value: "moving", label: "Moving" },
  { value: "photography", label: "Photography" },
  { value: "painting", label: "Painting" },
  { value: "carpentry", label: "Carpentry" },
  { value: "ac_repair", label: "AC Repair" },
  { value: "pet_care", label: "Pet Care" },
  { value: "cooking", label: "Personal Chef" },
  { value: "other", label: "Other" },
];

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_SLOTS = Array.from({ length: 32 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6;
  const min = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${min}`;
});

const LANGUAGES = ["Arabic", "English", "French", "Hindi", "Urdu", "Tagalog", "Chinese", "Spanish"];
const LOCATION_TYPES = ["At Client's Home", "At My Location", "Remote/Online"];

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
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

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
    locationType: "At Client's Home",
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
      toast.error("Please fill service title and price");
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
      locationType: "At Client's Home",
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
      toast.success("Service provider registration complete!");
      navigate("/pro/dashboard");
    } catch (err: any) {
      toast.error("Registration failed: " + (err.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <SubPageShell noContentPad className="bg-background">
      <div className="px-4 pt-6 pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <Wrench className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-foreground">Service Provider Registration</h1>
            <p className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length} — {STEPS[step].label}</p>
          </div>
        </div>
        <Progress value={progress} className="h-1.5" />
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
              <p className="text-sm text-muted-foreground">Select your main service category</p>
              <div className="grid grid-cols-2 gap-2">
                {SERVICE_CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
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
                  <label className="text-sm font-medium text-foreground block mb-1.5">Sub-category (optional)</label>
                  <Input value={subCategory} onChange={(e) => setSubCategory(e.target.value)} placeholder="e.g. Emergency plumbing" />
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Professional Bio *</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className="w-full rounded-xl bg-muted p-3 text-sm text-foreground min-h-[100px] resize-none border-0"
                  placeholder="Tell potential clients about your experience and expertise..."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Years of Experience</label>
                <Input
                  type="number"
                  value={profile.yearsExperience || ""}
                  onChange={(e) => setProfile({ ...profile, yearsExperience: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Languages Spoken</label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => toggleLanguage(lang)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                        profile.languages.includes(lang)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/20 text-muted-foreground"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Portfolio Photos (max 10)</label>
                <div className="grid grid-cols-4 gap-2">
                  {portfolioPhotos.map((url, i) => (
                    <div key={i} className="relative h-16 rounded-lg overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setPortfolioPhotos(portfolioPhotos.filter((_, j) => j !== i))}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center"
                      >
                        <Trash2 className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                  {portfolioPhotos.length < 10 && (
                    <button onClick={handlePhotoUpload} className="h-16 rounded-lg border-2 border-dashed border-border/30 flex items-center justify-center">
                      <Camera className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Certifications & Diplomas</label>
                <p className="text-xs text-muted-foreground mb-2">Upload relevant professional certificates (PDF or images)</p>
                <div className="space-y-2">
                  {certificationUrls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/30 p-2">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs text-foreground truncate flex-1">Certificate {i + 1}</span>
                      <button onClick={() => setCertificationUrls(certificationUrls.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-500">
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
                    <Upload className="w-3.5 h-3.5" /> Upload Certificate
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Add at least 1 service you offer</p>
              {services.map((s) => (
                <div key={s.id} className="rounded-xl bg-muted/30 p-3 flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.durationMinutes}min · {s.price} AED ({s.priceType}) · {s.locationType}
                    </p>
                  </div>
                  <button onClick={() => removeService(s.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              <div className="rounded-xl border border-border/20 p-4 space-y-3">
                <Input value={newService.title} onChange={(e) => setNewService({ ...newService, title: e.target.value })} placeholder="Service title *" />
                <textarea
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  className="w-full rounded-xl bg-muted p-3 text-sm text-foreground min-h-[60px] resize-none border-0"
                  placeholder="Service description..."
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Duration (min)</label>
                    <Input type="number" value={newService.durationMinutes} onChange={(e) => setNewService({ ...newService, durationMinutes: parseInt(e.target.value) || 60 })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Price (AED) *</label>
                    <Input type="number" value={newService.price || ""} onChange={(e) => setNewService({ ...newService, price: parseFloat(e.target.value) || 0 })} className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Price Type</label>
                    <select
                      value={newService.priceType}
                      onChange={(e) => setNewService({ ...newService, priceType: e.target.value as "fixed" | "hourly" })}
                      className="w-full rounded-lg bg-muted text-sm px-3 py-2 text-foreground border-0 mt-1"
                    >
                      <option value="fixed">Fixed Price</option>
                      <option value="hourly">Per Hour</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Location</label>
                    <select
                      value={newService.locationType}
                      onChange={(e) => setNewService({ ...newService, locationType: e.target.value })}
                      className="w-full rounded-lg bg-muted text-sm px-3 py-2 text-foreground border-0 mt-1"
                    >
                      {LOCATION_TYPES.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <Button onClick={addService} variant="outline" size="sm" className="w-full">
                  <Plus className="w-4 h-4 mr-1" /> Add Service
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Set your weekly availability</p>
              <div className="space-y-3">
                {DAYS.map((day, di) => {
                  const slots = availability[day] || [];
                  return (
                    <div key={day} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{DAY_LABELS[di]}</span>
                        <span className="text-xs text-muted-foreground">{slots.length} slots</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {TIME_SLOTS.filter((_, i) => i % 2 === 0).map((slot) => (
                          <button
                            key={slot}
                            onClick={() => toggleSlot(day, slot)}
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
                <label className="text-sm font-medium text-foreground block mb-1.5">Intervention Radius (km)</label>
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
                <label className="text-sm font-medium text-foreground block mb-1.5">IBAN *</label>
                <Input value={payment.iban} onChange={(e) => setPayment({ ...payment, iban: e.target.value })} placeholder="AE000000000000000000000" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Account Holder Name *</label>
                <Input value={payment.accountHolder} onChange={(e) => setPayment({ ...payment, accountHolder: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Bank Name</label>
                <Input value={payment.bankName} onChange={(e) => setPayment({ ...payment, bankName: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">SWIFT Code</label>
                <Input value={payment.swift} onChange={(e) => setPayment({ ...payment, swift: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Minimum Travel Fee (AED)</label>
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
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="flex-1">
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting || !canNext()} className="flex-1">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Complete Registration
            </Button>
          )}
        </div>
      </div>
    </SubPageShell>
  );
}
