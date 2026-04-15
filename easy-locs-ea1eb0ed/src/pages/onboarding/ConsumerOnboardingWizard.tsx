import { memo, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed, Home, ShoppingBag, Car, Briefcase,
  MapPin, DollarSign, Bell, ChevronRight, ChevronLeft, Check, Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useConsumerDraftStore } from "@/stores/onboarding-draft.store";
import { useGeoStore } from "@/lib/geo/geo-store";
import { useI18n } from "@/lib/i18n";

const VERTICALS = [
  { id: "food", label: "Food & Dining", icon: UtensilsCrossed, color: "hsl(25 95% 53%)" },
  { id: "real_estate", label: "Real Estate", icon: Home, color: "hsl(210 80% 55%)" },
  { id: "shopping", label: "Shopping", icon: ShoppingBag, color: "hsl(340 82% 52%)" },
  { id: "mobility", label: "Mobility", icon: Car, color: "hsl(160 84% 39%)" },
  { id: "services", label: "Services", icon: Briefcase, color: "hsl(270 70% 55%)" },
];

const CURRENCIES = ["EUR", "USD", "GBP", "AED", "MAD", "SAR", "EGP", "NGN", "TRY", "PKR"];

const STEPS = ["Interests", "Location", "Currency", "Notifications"];

function ConsumerOnboardingWizardInner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const geo = useGeoStore();
  const { draft, saveDraft, clearDraft } = useConsumerDraftStore();

  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<string[]>(draft?.interests ?? []);
  const [city, setCity] = useState(draft?.city ?? geo.city ?? "");
  const [country, setCountry] = useState(draft?.country ?? geo.country ?? "");
  const [currency, setCurrency] = useState(draft?.currency ?? "EUR");
  const [notifPrefs, setNotifPrefs] = useState(
    draft?.notificationPrefs ?? {
      deals: true, orders: true, messages: true, news: true, prayer: false,
    },
  );

  useEffect(() => {
    saveDraft({ interests, city, country, currency, notificationPrefs: notifPrefs });
  }, [interests, city, country, currency, notifPrefs, saveDraft]);

  const toggleInterest = useCallback((id: string) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }, []);

  const toggleNotif = useCallback((key: keyof typeof notifPrefs) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const canProceed = step === 0 ? interests.length > 0 : true;

  const handleFinish = useCallback(async () => {
    saveDraft({ completed: true });
    clearDraft();
    navigate("/dashboard");
  }, [saveDraft, clearDraft, navigate]);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/10 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-foreground">Welcome to Easy-Locs</h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-xs text-foreground/40 hover:text-foreground/60"
          >
            Skip
          </button>
        </div>
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-[hsl(var(--brand-primary))]" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-foreground/40 mt-1">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
      </div>

      <div className="flex-1 px-4 py-6">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="interests"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-xl font-bold text-foreground mb-2">What are you interested in?</h2>
              <p className="text-sm text-foreground/50 mb-6">Select one or more to personalize your experience.</p>
              <div className="grid grid-cols-2 gap-3">
                {VERTICALS.map((v) => {
                  const active = interests.includes(v.id);
                  const Icon = v.icon;
                  return (
                    <motion.button
                      key={v.id}
                      onClick={() => toggleInterest(v.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-colors ${
                        active
                          ? "border-[hsl(var(--brand-primary))] bg-[hsl(var(--brand-primary)/0.08)]"
                          : "border-border/20 bg-card hover:border-border/40"
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Icon className="h-8 w-8" style={{ color: v.color }} />
                      <span className="text-sm font-semibold text-foreground">{v.label}</span>
                      {active && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[hsl(var(--brand-primary))] flex items-center justify-center"
                        >
                          <Check className="h-3 w-3 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="location"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-xl font-bold text-foreground mb-2">Where are you based?</h2>
              <p className="text-sm text-foreground/50 mb-6">
                {geo.city ? `We detected ${geo.city}, ${geo.country}` : "Enter your city for better results."}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground/70 mb-1 block">City</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Enter your city"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/20 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-primary)/0.3)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground/70 mb-1 block">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Country"
                    className="w-full px-4 py-2.5 rounded-xl border border-border/20 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-primary)/0.3)]"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="currency"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-xl font-bold text-foreground mb-2">Preferred currency</h2>
              <p className="text-sm text-foreground/50 mb-6">Used for prices and wallet display.</p>
              <div className="grid grid-cols-3 gap-2">
                {CURRENCIES.map((c) => (
                  <motion.button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`py-3 rounded-xl text-sm font-bold border-2 transition-colors ${
                      currency === c
                        ? "border-[hsl(var(--brand-primary))] bg-[hsl(var(--brand-primary)/0.08)] text-[hsl(var(--brand-primary))]"
                        : "border-border/20 bg-card text-foreground/70 hover:border-border/40"
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    {c}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-xl font-bold text-foreground mb-2">Notifications</h2>
              <p className="text-sm text-foreground/50 mb-6">Choose what you want to be notified about.</p>
              <div className="space-y-3">
                {([
                  { key: "deals" as const, label: "Deals & Promotions", desc: "Discounts near you" },
                  { key: "orders" as const, label: "Orders & Bookings", desc: "Status updates" },
                  { key: "messages" as const, label: "Messages", desc: "New messages from contacts" },
                  { key: "news" as const, label: "News", desc: "Local and trending news" },
                  { key: "prayer" as const, label: "Prayer Times", desc: "Adhan reminders" },
                ]).map(({ key, label, desc }) => (
                  <button
                    key={key}
                    onClick={() => toggleNotif(key)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-colors text-left ${
                      notifPrefs[key]
                        ? "border-[hsl(var(--brand-primary)/0.4)] bg-[hsl(var(--brand-primary)/0.05)]"
                        : "border-border/20 bg-card"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-foreground/40">{desc}</p>
                    </div>
                    <div
                      className={`h-5 w-9 rounded-full transition-colors flex items-center px-0.5 ${
                        notifPrefs[key] ? "bg-[hsl(var(--brand-primary))]" : "bg-muted"
                      }`}
                    >
                      <motion.div
                        className="h-4 w-4 rounded-full bg-white shadow-sm"
                        animate={{ x: notifPrefs[key] ? 16 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/10 px-4 py-3 flex gap-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
        {step > 0 && (
          <button
            onClick={prev}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-border/20 text-sm font-semibold text-foreground/70 hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        )}
        <button
          onClick={step === STEPS.length - 1 ? handleFinish : next}
          disabled={!canProceed}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[hsl(var(--brand-primary))] text-white text-sm font-bold disabled:opacity-40 active:scale-[0.97] transition-transform"
        >
          {step === STEPS.length - 1 ? (
            <>
              <Sparkles className="h-4 w-4" />
              Get Started
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

const ConsumerOnboardingWizard = memo(ConsumerOnboardingWizardInner);
export default ConsumerOnboardingWizard;
