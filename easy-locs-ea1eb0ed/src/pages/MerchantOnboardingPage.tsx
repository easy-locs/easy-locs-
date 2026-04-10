import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { adminOpsService } from "@/services";
import { activateMerchantProfile, type ActivationPayload } from "@/lib/onboarding/merchant-onboarding";
import { useAuth } from "@/contexts/AuthContext";
import {
  type OnboardingVertical,
  type MenuTemplate, type RoomTemplate, type ServiceTemplate,
  getMenuTemplates, getRoomTemplates, getHotelDefaults,
  getServiceTemplates, getServiceDefaults,
  VERTICAL_CONFIG,
} from "@/data/onboarding-templates";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Trash2, Plus, Edit2, Check, ArrowRight, ArrowLeft,
  Rocket, Store, Utensils, CreditCard, Zap, DollarSign,
  Building, BedDouble, CalendarDays, Wrench, Clock, Star,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";

const ICON_MAP: Record<string, any> = {
  rocket: Rocket, store: Store, utensils: Utensils,
  "credit-card": CreditCard, zap: Zap, building: Building,
  bed: BedDouble, calendar: CalendarDays, wrench: Wrench,
  clock: Clock,
};

interface MerchantData {
  id: string;
  merchant_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  area: string | null;
  cuisine_type: string | null;
  onboarding_status: string | null;
  vertical?: string | null;
  subcategory?: string | null;
}

export default function MerchantOnboardingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const profileId = searchParams.get("id");
  const rawVertical = searchParams.get("vertical") || "food";
  const verticalParam: OnboardingVertical = (["food", "hotel", "services"] as const).includes(rawVertical as any)
    ? (rawVertical as OnboardingVertical)
    : "food";
  const subcatParam = searchParams.get("subcategory") || searchParams.get("type") || "";

  const [vertical, setVertical] = useState<OnboardingVertical>(verticalParam);
  const [subcategory, setSubcategory] = useState(subcatParam);
  const [step, setStep] = useState(0);
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [loading, setLoading] = useState(!!profileId);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [starRating, setStarRating] = useState(4);

  const [menuItems, setMenuItems] = useState<(MenuTemplate & { id: string; is_available: boolean })[]>([]);
  const [rooms, setRooms] = useState<(RoomTemplate & { id: string; is_available: boolean })[]>([]);
  const [services, setServices] = useState<(ServiceTemplate & { id: string; is_available: boolean })[]>([]);

  const [hotelCheckIn, setHotelCheckIn] = useState("15:00");
  const [hotelCheckOut, setHotelCheckOut] = useState("11:00");
  const [amenities, setAmenities] = useState<string[]>([]);

  const [svcOpenHour, setSvcOpenHour] = useState(9);
  const [svcCloseHour, setSvcCloseHour] = useState(18);
  const [svcDays, setSvcDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const [paymentMethod, setPaymentMethod] = useState<"bank" | "wallet">("wallet");
  const [iban, setIban] = useState("");
  const [isLive, setIsLive] = useState(false);

  const config = useMemo(() => VERTICAL_CONFIG[vertical], [vertical]);
  const totalSteps = config.steps.length;

  useEffect(() => {
    if (!profileId) {
      initFromTemplate(vertical, subcatParam);
      setLoading(false);
      return;
    }
    (async () => {
      const m = await adminOpsService.fetchOnboardingProfile(profileId!) as any;
      if (m) {
        setMerchant(m);
        setName(m.merchant_name || "");
        setPhone(m.phone || "");
        setAddress(m.area ? `${m.area}, ${m.city || "Dubai"}` : m.city || "");
        setSpecialty(m.cuisine_type || "");
        const vert = (m.vertical as OnboardingVertical) || verticalParam;
        setVertical(vert);
        const sub = m.subcategory || subcatParam;
        setSubcategory(sub);
        initFromTemplate(vert, sub);

        if (m.onboarding_status === "info_confirmed") setStep(2);
        else if (m.onboarding_status === "menu_confirmed") setStep(3);
        else if (m.onboarding_status === "payment_configured") setStep(totalSteps - 2);
        else if (m.onboarding_status === "live") setStep(totalSteps - 1);
      }
      setLoading(false);
    })();
  }, [profileId]);

  function initFromTemplate(vert: OnboardingVertical, sub: string) {
    if (vert === "food") {
      const templates = getMenuTemplates(sub);
      setMenuItems(templates.map((t, i) => ({ ...t, id: `tpl-${i}`, is_available: true })));
    } else if (vert === "hotel") {
      const roomTpls = getRoomTemplates(sub);
      setRooms(roomTpls.map((t, i) => ({ ...t, id: `tpl-${i}`, is_available: true })));
      const defaults = getHotelDefaults(sub);
      setHotelCheckIn(defaults.check_in);
      setHotelCheckOut(defaults.check_out);
      setStarRating(defaults.star_rating);
      setAmenities(defaults.amenities);
    } else if (vert === "services") {
      const svcTpls = getServiceTemplates(sub);
      setServices(svcTpls.map((t, i) => ({ ...t, id: `tpl-${i}`, is_available: true })));
      const defaults = getServiceDefaults(sub);
      setSvcOpenHour(defaults.open_hour);
      setSvcCloseHour(defaults.close_hour);
      setSvcDays(defaults.available_days);
    }
  }

  const goLive = useCallback(async () => {
    setSaving(true);
    try {
      const payload: ActivationPayload = {
        profileId: profileId || "self",
        vertical,
        name: name || t("mob.your_business" as any),
        phone,
        address,
        subcategory,
        currency: "AED",
        paymentMethod,
        iban: paymentMethod === "bank" ? iban : undefined,
      };

      if (vertical === "food") {
        payload.menuItems = menuItems.filter(i => i.is_available).map(i => ({
          name: i.name, price: i.price, category: i.category,
          description: i.description, calories: i.calories,
        }));
      } else if (vertical === "hotel") {
        payload.rooms = rooms.filter(r => r.is_available).map(r => ({
          name: r.name, type: r.type, price_per_night: r.price_per_night,
          max_guests: r.max_guests, beds: r.beds, description: r.description,
        }));
        payload.hotelSettings = {
          check_in: hotelCheckIn, check_out: hotelCheckOut,
          star_rating: starRating, amenities,
        };
      } else if (vertical === "services") {
        payload.services = services.filter(s => s.is_available).map(s => ({
          name: s.name, price: s.price, duration_minutes: s.duration_minutes,
          category: s.category, description: s.description,
        }));
        payload.serviceSettings = {
          slot_interval: 60, open_hour: svcOpenHour, close_hour: svcCloseHour,
          available_days: svcDays, booking_mode: "hourly",
          min_notice_hours: 4, max_advance_days: 30,
        };
      }

      const result = await activateMerchantProfile(payload);
      if (result.success) {
        setIsLive(true);
        const key = `mob.go_live_success_${vertical}` as const;
        toast.success(t(key as any));
      } else {
        toast.error(t("mob.go_live_error" as any));
      }
    } catch {
      toast.error(t("mob.go_live_error" as any));
    }
    setSaving(false);
  }, [profileId, vertical, name, phone, address, subcategory, menuItems, rooms, services, paymentMethod, iban, hotelCheckIn, hotelCheckOut, starRating, amenities, svcOpenHour, svcCloseHour, svcDays]);

  const next = async () => {
    if (step === totalSteps - 1) { await goLive(); return; }
    setStep(s => Math.min(s + 1, totalSteps - 1));
  };
  const prev = () => setStep(s => Math.max(s - 1, 0));

  if (loading) {
    return (
      <div className="app-mobile-page bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t("mob.loading" as any)}</div>
      </div>
    );
  }

  if (!profileId && !user) {
    const benefits = [
      { icon: "🏪", text: t("mob.benefit_shop" as any) },
      { icon: "📊", text: t("mob.benefit_dashboard" as any) },
      { icon: "💳", text: t("mob.benefit_payment" as any) },
      { icon: "📦", text: t("mob.benefit_orders" as any) },
    ];
    return (
      <div className="app-mobile-page bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full overflow-hidden" style={{ border: "1px solid hsl(var(--border) / 0.15)" }}>
          <div className="py-6 px-4 text-center" style={{
            background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 100%)",
          }}>
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ background: "hsla(0,0%,100%,0.15)" }}>
              <Rocket className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-black text-white">{t("mob.become_seller" as any)}</h2>
            <p className="text-sm text-white/80 mt-1">
              {t("mob.join_sellers" as any)}
            </p>
          </div>
          <CardContent className="pt-5 pb-6 space-y-4">
            <div className="space-y-3">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-lg shrink-0 mt-0.5">{b.icon}</span>
                  <p className="text-sm text-muted-foreground leading-snug">{b.text}</p>
                </div>
              ))}
            </div>
            <div className="pt-2 space-y-2">
              <Button onClick={() => navigate("/login")} className="w-full rounded-xl font-bold">
                <Store className="h-4 w-4 mr-2" />
                {t("mob.login_to_start" as any)}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                {t("mob.free_signup" as any)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPct = ((step + 1) / totalSteps) * 100;

  const renderStepContent = () => {
    const stepConfig = config.steps[step];
    if (!stepConfig) return null;

    if (step === 0) {
      return (
        <StepWelcome
          vertical={vertical}
          name={name || merchant?.merchant_name || t("mob.your_business" as any)}
          config={config}
          onChangeVertical={(v) => {
            setVertical(v);
            initFromTemplate(v, subcategory);
          }}
          subcategory={subcategory}
          onChangeSubcategory={(s) => {
            setSubcategory(s);
            initFromTemplate(vertical, s);
          }}
          selfMode={!profileId}
          nameValue={name}
          onNameChange={setName}
        />
      );
    }

    if (step === 1) {
      return (
        <StepInfo
          vertical={vertical}
          config={config}
          name={name} setName={setName}
          phone={phone} setPhone={setPhone}
          address={address} setAddress={setAddress}
          specialty={specialty} setSpecialty={setSpecialty}
          starRating={starRating} setStarRating={setStarRating}
        />
      );
    }

    if (vertical === "food" && step === 2) {
      return <StepFoodMenu items={menuItems} setItems={setMenuItems} />;
    }
    if (vertical === "hotel" && step === 2) {
      return <StepHotelRooms rooms={rooms} setRooms={setRooms} />;
    }
    if (vertical === "hotel" && step === 3) {
      return (
        <StepHotelCalendar
          checkIn={hotelCheckIn} setCheckIn={setHotelCheckIn}
          checkOut={hotelCheckOut} setCheckOut={setHotelCheckOut}
          amenities={amenities} setAmenities={setAmenities}
          starRating={starRating}
        />
      );
    }
    if (vertical === "services" && step === 2) {
      return <StepServiceCatalog services={services} setServices={setServices} />;
    }
    if (vertical === "services" && step === 3) {
      return (
        <StepServiceSchedule
          openHour={svcOpenHour} setOpenHour={setSvcOpenHour}
          closeHour={svcCloseHour} setCloseHour={setSvcCloseHour}
          days={svcDays} setDays={setSvcDays}
        />
      );
    }

    const paymentStepIdx = totalSteps - 2;
    if (step === paymentStepIdx) {
      return (
        <StepPayment
          method={paymentMethod} setMethod={setPaymentMethod}
          iban={iban} setIban={setIban}
        />
      );
    }

    if (step === totalSteps - 1) {
      return <StepGoLive isLive={isLive} name={name || merchant?.merchant_name || ""} vertical={vertical} config={config} />;
    }

    return null;
  };

  const getNextLabel = () => {
    if (step === 0) return t("mob.next" as any);
    if (step === totalSteps - 1) return saving ? "…" : t("mob.finish" as any);
    return t("mob.next" as any);
  };

  return (
    <div className="app-mobile-page bg-background flex flex-col">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 pt-3 pb-2">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              {step + 1} / {totalSteps}
            </span>
            <button
              onClick={() => toast.info(t("mob.progress_saved" as any))}
              className="text-xs text-primary hover:underline"
            >
              {t("mob.continue_later" as any)}
            </button>
          </div>
          <Progress value={progressPct} className="h-1.5" />
          <div className="flex justify-between mt-2">
            {config.steps.map((s, i) => {
              const Icon = ICON_MAP[s.icon] || Zap;
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center gap-0.5 ${
                    i <= step ? "text-primary" : "text-muted-foreground/40"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium hidden sm:block">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-6 overflow-auto">
        <div className="w-full max-w-lg pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex gap-3">
          {step > 0 && !isLive && (
            <Button variant="outline" onClick={prev} className="flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {!isLive && (
            <Button onClick={next} className="flex-1 h-12 text-base font-semibold" disabled={saving}>
              {getNextLabel()}
              {step < totalSteps - 1 && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          )}
          {isLive && (
            <Button onClick={() => navigate("/dashboard/seller")} className="flex-1 h-12 text-base font-semibold">
              {t("mob.go_to_dashboard" as any)}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepWelcome({ vertical, name, config, onChangeVertical, subcategory, onChangeSubcategory, selfMode, nameValue, onNameChange }: {
  vertical: OnboardingVertical; name: string; config: any;
  onChangeVertical: (v: OnboardingVertical) => void;
  subcategory: string; onChangeSubcategory: (s: string) => void;
  selfMode: boolean; nameValue: string; onNameChange: (v: string) => void;
}) {
  const { t } = useI18n();
  const verticals: { key: OnboardingVertical; icon: string; label: string; desc: string }[] = [
    { key: "food", icon: "🍽️", label: t("mob.vert_food" as any), desc: t("mob.vert_food_desc" as any) },
    { key: "hotel", icon: "🏨", label: t("mob.vert_hotel" as any), desc: t("mob.vert_hotel_desc" as any) },
    { key: "services", icon: "🔧", label: t("mob.vert_services" as any), desc: t("mob.vert_services_desc" as any) },
  ];

  const subcategories: Record<OnboardingVertical, { value: string; label: string }[]> = {
    food: [
      { value: "shawarma", label: "Shawarma / Grills" },
      { value: "pizza", label: "Pizza / Italian" },
      { value: "burger", label: "Burger" },
      { value: "sushi", label: "Sushi / Japanese" },
      { value: "cafe", label: "Café / Brunch" },
      { value: "default", label: "Other" },
    ],
    hotel: [
      { value: "hotel", label: "Hotel" },
      { value: "resort", label: "Resort" },
      { value: "riad", label: "Riad / B&B" },
      { value: "default", label: "Other" },
    ],
    services: [
      { value: "plumber", label: "Plumber" },
      { value: "electrician", label: "Electrician" },
      { value: "cleaning", label: "Cleaning" },
      { value: "beauty", label: "Beauty / Hair" },
      { value: "fitness", label: "Coach / Fitness" },
      { value: "default", label: "Other" },
    ],
  };

  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <div className="text-5xl mb-3">{config.welcome_emoji}</div>
        <h1 className="text-2xl font-bold text-foreground">
          {selfMode ? t("mob.activate_shop" as any) : config.welcome_title(name)}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {selfMode
            ? t("mob.activate_shop_sub" as any)
            : config.welcome_subtitle(name)}
        </p>
      </div>

      {selfMode && (
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">{t("mob.activity_name" as any)}</label>
          <Input value={nameValue} onChange={e => onNameChange(e.target.value)} placeholder="Ex: Chez Ali, Royal Palace, ProClean" className="h-11" />
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-2">{t("mob.activity_type" as any)}</label>
        <div className="grid grid-cols-3 gap-2">
          {verticals.map(v => (
            <button
              key={v.key}
              onClick={() => { onChangeVertical(v.key); onChangeSubcategory(""); }}
              className={`rounded-xl border-2 p-3 text-center transition-all ${
                vertical === v.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              }`}
            >
              <div className="text-2xl mb-1">{v.icon}</div>
              <div className="text-xs font-semibold text-foreground">{v.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{v.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-2">{t("mob.specialty_label" as any)}</label>
        <div className="flex flex-wrap gap-2">
          {subcategories[vertical].map(s => (
            <button
              key={s.value}
              onClick={() => onChangeSubcategory(s.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                subcategory === s.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/50 text-foreground hover:border-primary/50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ValueCard icon="💰" title="0 AED" subtitle={t("mob.free_to_join" as any)} />
        <ValueCard icon="📊" title={config.commission} subtitle={t("mob.commission" as any)} />
        <ValueCard icon="⚡" title="2 min" subtitle={t("mob.activation" as any)} />
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-muted-foreground">
        <DollarSign className="h-5 w-5 text-primary inline mr-1" />
        {t("mob.estimated_revenue" as any)}: <span className="text-foreground font-bold">{config.revenue_estimate}</span>
      </div>
    </div>
  );
}

function ValueCard({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-sm font-bold text-foreground">{title}</div>
      <div className="text-[10px] text-muted-foreground">{subtitle}</div>
    </div>
  );
}

function StepInfo({ vertical, config, name, setName, phone, setPhone, address, setAddress, specialty, setSpecialty, starRating, setStarRating }: {
  vertical: OnboardingVertical; config: any;
  name: string; setName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  address: string; setAddress: (v: string) => void;
  specialty: string; setSpecialty: (v: string) => void;
  starRating: number; setStarRating: (v: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">{config.info_title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("mob.verify_info" as any)}</p>
      </div>
      <div className="space-y-3">
        <FieldRow label={t("mob.business_name" as any)}>
          <Input value={name} onChange={e => setName(e.target.value)} className="h-11" />
        </FieldRow>
        <FieldRow label={t("mob.phone" as any)}>
          <Input value={phone} onChange={e => setPhone(e.target.value)} type="tel" className="h-11" placeholder="+971 50 000 0000" />
        </FieldRow>
        <FieldRow label={t("mob.address" as any)}>
          <Input value={address} onChange={e => setAddress(e.target.value)} className="h-11" />
        </FieldRow>
        {vertical === "hotel" ? (
          <FieldRow label={t("mob.category" as any)}>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setStarRating(s)} className="p-1">
                  <Star className={`h-6 w-6 ${s <= starRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
          </FieldRow>
        ) : (
          <FieldRow label={t("mob.specialty_label" as any)}>
            <Input value={specialty} onChange={e => setSpecialty(e.target.value)} className="h-11" />
          </FieldRow>
        )}
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      {children}
    </div>
  );
}

function StepFoodMenu({ items, setItems }: {
  items: (MenuTemplate & { id: string; is_available: boolean })[];
  setItems: React.Dispatch<React.SetStateAction<(MenuTemplate & { id: string; is_available: boolean })[]>>;
}) {
  const { t } = useI18n();
  const [editId, setEditId] = useState<string | null>(null);
  const categories = [...new Set(items.map(i => i.category))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("mob.your_menu" as any)}</h2>
          <p className="text-sm text-muted-foreground">{items.length} {t("mob.items_prefilled" as any)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          setItems(prev => [...prev, { id: `new-${Date.now()}`, name: t("mob.new_item" as any), price: 20, category: "Menu", description: "", is_available: true }]);
        }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("mob.add" as any)}
        </Button>
      </div>

      <div className="space-y-4 max-h-[55vh] overflow-auto pr-1">
        {categories.map(cat => (
          <div key={cat}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</h3>
            <div className="space-y-2">
              {items.filter(i => i.category === cat).map(item => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-14 h-14 rounded-lg object-cover shrink-0" onError={(e) => { const t = e.target as HTMLImageElement; t.src = ""; t.className = "hidden"; }} />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <span className="text-lg">🍽️</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {editId === item.id ? (
                      <div className="space-y-2">
                        <Input value={item.name} onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, name: e.target.value } : i))} className="h-8 text-sm" />
                        <div className="flex gap-2">
                          <Input type="number" value={item.price} onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, price: Number(e.target.value) } : i))} className="h-8 text-sm w-24" placeholder="Prix" />
                          <Input value={item.description} onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, description: e.target.value } : i))} className="h-8 text-sm flex-1" placeholder="Description" />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-sm font-medium text-foreground">{item.name}</span>
                        <span className="text-xs text-primary font-semibold ml-2">{item.price} AED</span>
                        {item.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>}
                      </div>
                    )}
                  </div>
                  <Switch checked={item.is_available} onCheckedChange={v => setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: v } : i))} />
                  <button onClick={() => setEditId(editId === item.id ? null : item.id)} className="text-muted-foreground hover:text-foreground">
                    {editId === item.id ? <Check className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                  </button>
                  <button onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground">
        💡 {t("mob.menu_hint" as any)}
      </div>
    </div>
  );
}

function StepHotelRooms({ rooms, setRooms }: {
  rooms: (RoomTemplate & { id: string; is_available: boolean })[];
  setRooms: React.Dispatch<React.SetStateAction<(RoomTemplate & { id: string; is_available: boolean })[]>>;
}) {
  const { t } = useI18n();
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("mob.your_rooms" as any)}</h2>
          <p className="text-sm text-muted-foreground">{rooms.length} {t("mob.room_types" as any)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          setRooms(prev => [...prev, { id: `new-${Date.now()}`, name: t("mob.new_room" as any), type: "standard", price_per_night: 200, max_guests: 2, beds: "1 Queen", description: "", is_available: true }]);
        }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("mob.add" as any)}
        </Button>
      </div>

      <div className="space-y-3 max-h-[55vh] overflow-auto pr-1">
        {rooms.map(room => (
          <div key={room.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              {room.image ? (
                <img src={room.image} alt={room.name} className="w-16 h-16 rounded-lg object-cover shrink-0" onError={(e) => { const t = e.target as HTMLImageElement; t.src = ""; t.className = "hidden"; }} />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <span className="text-lg">🏨</span>
                </div>
              )}
              <div className="flex-1">
                {editId === room.id ? (
                  <div className="space-y-2">
                    <Input value={room.name} onChange={e => setRooms(prev => prev.map(r => r.id === room.id ? { ...r, name: e.target.value } : r))} className="h-8 text-sm" />
                    <div className="grid grid-cols-3 gap-2">
                      <Input type="number" value={room.price_per_night} onChange={e => setRooms(prev => prev.map(r => r.id === room.id ? { ...r, price_per_night: Number(e.target.value) } : r))} className="h-8 text-sm" placeholder="Prix/nuit" />
                      <Input type="number" value={room.max_guests} onChange={e => setRooms(prev => prev.map(r => r.id === room.id ? { ...r, max_guests: Number(e.target.value) } : r))} className="h-8 text-sm" placeholder="Max guests" />
                      <Input value={room.beds} onChange={e => setRooms(prev => prev.map(r => r.id === room.id ? { ...r, beds: e.target.value } : r))} className="h-8 text-sm" placeholder="Lits" />
                    </div>
                    <Input value={room.description} onChange={e => setRooms(prev => prev.map(r => r.id === room.id ? { ...r, description: e.target.value } : r))} className="h-8 text-sm" placeholder="Description" />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{room.name}</span>
                      <Badge variant="outline" className="text-[10px]">{room.beds}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-primary font-bold text-sm">{room.price_per_night} AED{t("mob.per_night" as any)}</span>
                      <span className="text-xs text-muted-foreground">{room.max_guests} {t("mob.guests_max" as any)}</span>
                    </div>
                    {room.description && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{room.description}</p>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 ml-2">
                <Switch checked={room.is_available} onCheckedChange={v => setRooms(prev => prev.map(r => r.id === room.id ? { ...r, is_available: v } : r))} />
                <button onClick={() => setEditId(editId === room.id ? null : room.id)} className="text-muted-foreground hover:text-foreground">
                  {editId === room.id ? <Check className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                </button>
                <button onClick={() => setRooms(prev => prev.filter(r => r.id !== room.id))} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground">
        💡 {t("mob.rooms_hint" as any)}
      </div>
    </div>
  );
}

function StepHotelCalendar({ checkIn, setCheckIn, checkOut, setCheckOut, amenities, setAmenities, starRating }: {
  checkIn: string; setCheckIn: (v: string) => void;
  checkOut: string; setCheckOut: (v: string) => void;
  amenities: string[]; setAmenities: (v: string[]) => void;
  starRating: number;
}) {
  const { t } = useI18n();
  const [newAmenity, setNewAmenity] = useState("");

  const ALL_AMENITIES = [
    "WiFi", "Pool", "Gym", "Spa", "Restaurant", "Room Service", "Parking",
    "Concierge", "Bar", "Laundry", "Airport Transfer", "Kids Club",
    "Private Beach", "Tennis", "Business Center", "Rooftop Terrace",
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t("mob.calendar_amenities" as any)}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("mob.calendar_amenities_sub" as any)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FieldRow label="Check-in">
          <Input type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="h-11" />
        </FieldRow>
        <FieldRow label="Check-out">
          <Input type="time" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="h-11" />
        </FieldRow>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-2">{t("mob.amenities_label" as any)}</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {ALL_AMENITIES.map(a => (
            <button
              key={a}
              onClick={() => {
                if (amenities.includes(a)) setAmenities(amenities.filter(x => x !== a));
                else setAmenities([...amenities, a]);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                amenities.includes(a)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newAmenity} onChange={e => setNewAmenity(e.target.value)} placeholder={t("mob.add_amenity" as any)} className="h-9 text-sm" />
          <Button variant="outline" size="sm" onClick={() => {
            if (newAmenity.trim()) {
              setAmenities([...amenities, newAmenity.trim()]);
              setNewAmenity("");
            }
          }}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm">
        <div className="flex items-center gap-2 mb-2">
          {Array.from({ length: starRating }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          Check-in: <strong className="text-foreground">{checkIn}</strong> · Check-out: <strong className="text-foreground">{checkOut}</strong> · {amenities.length} {t("mob.amenities_count" as any)}
        </p>
      </div>
    </div>
  );
}

function StepServiceCatalog({ services, setServices }: {
  services: (ServiceTemplate & { id: string; is_available: boolean })[];
  setServices: React.Dispatch<React.SetStateAction<(ServiceTemplate & { id: string; is_available: boolean })[]>>;
}) {
  const { t } = useI18n();
  const [editId, setEditId] = useState<string | null>(null);
  const categories = [...new Set(services.map(s => s.category))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("mob.your_services" as any)}</h2>
          <p className="text-sm text-muted-foreground">{services.length} {t("mob.services_prefilled" as any)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          setServices(prev => [...prev, { id: `new-${Date.now()}`, name: t("mob.new_service" as any), price: 100, duration_minutes: 60, category: "Services", description: "", is_available: true }]);
        }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("mob.add" as any)}
        </Button>
      </div>

      <div className="space-y-4 max-h-[55vh] overflow-auto pr-1">
        {categories.map(cat => (
          <div key={cat}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</h3>
            <div className="space-y-2">
              {services.filter(s => s.category === cat).map(svc => (
                <div key={svc.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  {svc.image ? (
                    <img src={svc.image} alt={svc.name} className="w-14 h-14 rounded-lg object-cover shrink-0" onError={(e) => { const t = e.target as HTMLImageElement; t.src = ""; t.className = "hidden"; }} />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <span className="text-lg">🔧</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {editId === svc.id ? (
                      <div className="space-y-2">
                        <Input value={svc.name} onChange={e => setServices(prev => prev.map(s => s.id === svc.id ? { ...s, name: e.target.value } : s))} className="h-8 text-sm" />
                        <div className="flex gap-2">
                          <Input type="number" value={svc.price} onChange={e => setServices(prev => prev.map(s => s.id === svc.id ? { ...s, price: Number(e.target.value) } : s))} className="h-8 text-sm w-24" placeholder="Prix" />
                          <Input type="number" value={svc.duration_minutes} onChange={e => setServices(prev => prev.map(s => s.id === svc.id ? { ...s, duration_minutes: Number(e.target.value) } : s))} className="h-8 text-sm w-20" placeholder="Min" />
                          <Input value={svc.description} onChange={e => setServices(prev => prev.map(s => s.id === svc.id ? { ...s, description: e.target.value } : s))} className="h-8 text-sm flex-1" placeholder="Description" />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{svc.name}</span>
                          <Badge variant="outline" className="text-[10px]">{svc.duration_minutes} min</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-primary font-semibold">{svc.price === 0 ? t("mob.free_price" as any) : `${svc.price} AED`}</span>
                          {svc.description && <span className="text-[11px] text-muted-foreground line-clamp-1">{svc.description}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                  <Switch checked={svc.is_available} onCheckedChange={v => setServices(prev => prev.map(s => s.id === svc.id ? { ...s, is_available: v } : s))} />
                  <button onClick={() => setEditId(editId === svc.id ? null : svc.id)} className="text-muted-foreground hover:text-foreground">
                    {editId === svc.id ? <Check className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                  </button>
                  <button onClick={() => setServices(prev => prev.filter(s => s.id !== svc.id))} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground">
        💡 {t("mob.services_hint" as any)}
      </div>
    </div>
  );
}

function StepServiceSchedule({ openHour, setOpenHour, closeHour, setCloseHour, days, setDays }: {
  openHour: number; setOpenHour: (v: number) => void;
  closeHour: number; setCloseHour: (v: number) => void;
  days: number[]; setDays: (v: number[]) => void;
}) {
  const { t } = useI18n();
  const dayNames = [
    { value: 0, label: t("mob.day_sun" as any) },
    { value: 1, label: t("mob.day_mon" as any) },
    { value: 2, label: t("mob.day_tue" as any) },
    { value: 3, label: t("mob.day_wed" as any) },
    { value: 4, label: t("mob.day_thu" as any) },
    { value: 5, label: t("mob.day_fri" as any) },
    { value: 6, label: t("mob.day_sat" as any) },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t("mob.your_schedule" as any)}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("mob.schedule_sub" as any)}</p>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-2">{t("mob.work_days" as any)}</label>
        <div className="flex gap-2">
          {dayNames.map(d => (
            <button
              key={d.value}
              onClick={() => {
                if (days.includes(d.value)) setDays(days.filter(x => x !== d.value));
                else setDays([...days, d.value].sort());
              }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                days.includes(d.value)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FieldRow label={t("mob.opening" as any)}>
          <select
            value={openHour}
            onChange={e => setOpenHour(Number(e.target.value))}
            className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label={t("mob.closing" as any)}>
          <select
            value={closeHour}
            onChange={e => setCloseHour(Number(e.target.value))}
            className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
            ))}
          </select>
        </FieldRow>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-muted-foreground">
        <Clock className="h-5 w-5 text-primary inline mr-1" />
        {days.length} {t("mob.days_week" as any)} · {openHour}h00 — {closeHour}h00 · {t("mob.hourly_slots" as any)}
      </div>

      <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground">
        💡 {t("mob.schedule_hint" as any)}
      </div>
    </div>
  );
}

function StepPayment({ method, setMethod, iban, setIban }: {
  method: "bank" | "wallet"; setMethod: (v: "bank" | "wallet") => void;
  iban: string; setIban: (v: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t("mob.how_receive_payments" as any)}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("mob.choose_method" as any)}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {([
          { key: "wallet" as const, icon: "💳", label: t("mob.wallet_label" as any), desc: t("mob.wallet_desc" as any) },
          { key: "bank" as const, icon: "🏦", label: t("mob.bank_label" as any), desc: t("mob.bank_desc" as any) },
        ]).map(opt => (
          <button
            key={opt.key}
            onClick={() => setMethod(opt.key)}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              method === opt.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
            }`}
          >
            <div className="text-2xl mb-2">{opt.icon}</div>
            <div className="text-sm font-semibold text-foreground">{opt.label}</div>
            <div className="text-[11px] text-muted-foreground">{opt.desc}</div>
          </button>
        ))}
      </div>
      {method === "bank" && (
        <FieldRow label="IBAN">
          <Input value={iban} onChange={e => setIban(e.target.value)} placeholder="AE07 0331 0000 0000 0012 345" className="h-11" />
        </FieldRow>
      )}
      <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground">
        💡 {t("mob.payment_hint" as any)}
      </div>
    </div>
  );
}

function StepGoLive({ isLive, name, vertical, config }: { isLive: boolean; name: string; vertical: OnboardingVertical; config: any }) {
  const { t } = useI18n();

  if (isLive) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="text-6xl">{config.welcome_emoji}</div>
        <h1 className="text-2xl font-bold text-foreground">{name} {t("mob.is_live" as any)}</h1>
        <p className="text-muted-foreground">
          {vertical === "food" && t("mob.live_food_msg" as any)}
          {vertical === "hotel" && t("mob.live_hotel_msg" as any)}
          {vertical === "services" && t("mob.live_services_msg" as any)}
        </p>
        <div className="grid grid-cols-3 gap-3">
          <ValueCard icon="💰" title="0 AED" subtitle={t("mob.entry_cost" as any)} />
          <ValueCard icon="📊" title={config.commission} subtitle={t("mob.commission" as any)} />
          <ValueCard
            icon={vertical === "food" ? "🛵" : vertical === "hotel" ? "📅" : "⏰"}
            title={vertical === "food" ? t("mob.delivery" as any) : vertical === "hotel" ? t("mob.calendar" as any) : t("mob.booking" as any)}
            subtitle={t("mob.included" as any)}
          />
        </div>
        <p className="text-sm text-primary font-medium">
          {vertical === "food" && t("mob.first_order" as any)}
          {vertical === "hotel" && t("mob.first_booking" as any)}
          {vertical === "services" && t("mob.first_appointment" as any)}
        </p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6 py-8">
      <div className="text-5xl">⚡</div>
      <h1 className="text-2xl font-bold text-foreground">
        {vertical === "food" && t("mob.ready_orders" as any)}
        {vertical === "hotel" && t("mob.ready_bookings" as any)}
        {vertical === "services" && t("mob.ready_appointments" as any)}
      </h1>
      <p className="text-muted-foreground">
        {t("mob.once_activated" as any)}
      </p>
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="text-sm font-medium text-foreground">
          {vertical === "food" && t("mob.goal_order" as any)}
          {vertical === "hotel" && t("mob.goal_booking" as any)}
          {vertical === "services" && t("mob.goal_appointment" as any)}
        </div>
      </div>
    </div>
  );
}
