/**
 * NotificationPreferencesPage — /settings/notifications
 * Category-based notification preferences with push/email/sms per category.
 * i18n-ready, uses semantic design tokens.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Mail, Smartphone, ArrowLeft, Save, Loader2,
  ShoppingBag, Wallet, Car, MessageCircle, Tag, ShieldCheck,
  Utensils, Home, Heart, Moon, Clock, Volume2,
} from "lucide-react";

/* ── Category definitions ── */
const NOTIFICATION_CATEGORIES = [
  { key: "orders", icon: ShoppingBag, emoji: "🛒", labelKey: "notif.cat_orders", descKey: "notif.cat_orders_desc" },
  { key: "wallet", icon: Wallet, emoji: "💳", labelKey: "notif.cat_wallet", descKey: "notif.cat_wallet_desc" },
  { key: "rides", icon: Car, emoji: "🚗", labelKey: "notif.cat_rides", descKey: "notif.cat_rides_desc" },
  { key: "messages", icon: MessageCircle, emoji: "💬", labelKey: "notif.cat_messages", descKey: "notif.cat_messages_desc" },
  { key: "food", icon: Utensils, emoji: "🍽️", labelKey: "notif.cat_food", descKey: "notif.cat_food_desc" },
  { key: "promo", icon: Tag, emoji: "🎁", labelKey: "notif.cat_promo", descKey: "notif.cat_promo_desc" },
  { key: "property", icon: Home, emoji: "🏠", labelKey: "notif.cat_property", descKey: "notif.cat_property_desc" },
  { key: "health", icon: Heart, emoji: "❤️", labelKey: "notif.cat_health", descKey: "notif.cat_health_desc" },
  { key: "system", icon: ShieldCheck, emoji: "🔒", labelKey: "notif.cat_system", descKey: "notif.cat_system_desc" },
] as const;

type CategoryKey = typeof NOTIFICATION_CATEGORIES[number]["key"];
type ChannelKey = "push" | "email" | "sms";

interface CategoryPref {
  push: boolean;
  email: boolean;
  sms: boolean;
}

type AllPrefs = Record<CategoryKey, CategoryPref>;

const DEFAULT_PREF: CategoryPref = { push: true, email: true, sms: false };
const DEFAULT_ALL: AllPrefs = Object.fromEntries(
  NOTIFICATION_CATEGORIES.map(c => [c.key, { ...DEFAULT_PREF }])
) as AllPrefs;

/* ── i18n fallbacks ── */
const FALLBACKS: Record<string, Record<string, string>> = {
  fr: {
    "notif.cat_orders": "Commandes", "notif.cat_orders_desc": "Statut de commande, livraison, confirmations",
    "notif.cat_wallet": "Portefeuille", "notif.cat_wallet_desc": "Paiements, recharges, transactions",
    "notif.cat_rides": "Trajets", "notif.cat_rides_desc": "Courses taxi, suivi en temps réel",
    "notif.cat_messages": "Messages", "notif.cat_messages_desc": "Orbit, chat, appels manqués",
    "notif.cat_food": "Restauration", "notif.cat_food_desc": "Restaurants, menus, préparation",
    "notif.cat_promo": "Promotions", "notif.cat_promo_desc": "Offres spéciales, coupons, deals",
    "notif.cat_property": "Immobilier", "notif.cat_property_desc": "Annonces, visites, baux",
    "notif.cat_health": "Santé", "notif.cat_health_desc": "Pharmacie, rendez-vous, rappels",
    "notif.cat_system": "Système", "notif.cat_system_desc": "Sécurité, mises à jour, alertes critiques",
    "notif.pref_title": "Préférences de notification",
    "notif.pref_subtitle": "Contrôlez vos alertes par catégorie",
    "notif.channels": "Canaux",
    "notif.quiet_hours": "Heures calmes",
    "notif.quiet_desc": "Désactiver les notifications sonores pendant le repos",
    "notif.save": "Enregistrer",
    "notif.saving": "Enregistrement…",
    "notif.saved": "Préférences enregistrées",
    "notif.master_push": "Push global",
    "notif.master_email": "Email global",
    "notif.master_sms": "SMS global",
  },
  en: {
    "notif.cat_orders": "Orders", "notif.cat_orders_desc": "Order status, delivery, confirmations",
    "notif.cat_wallet": "Wallet", "notif.cat_wallet_desc": "Payments, top-ups, transactions",
    "notif.cat_rides": "Rides", "notif.cat_rides_desc": "Taxi rides, live tracking",
    "notif.cat_messages": "Messages", "notif.cat_messages_desc": "Orbit, chat, missed calls",
    "notif.cat_food": "Food", "notif.cat_food_desc": "Restaurants, menus, preparation",
    "notif.cat_promo": "Promotions", "notif.cat_promo_desc": "Special offers, coupons, deals",
    "notif.cat_property": "Property", "notif.cat_property_desc": "Listings, visits, leases",
    "notif.cat_health": "Health", "notif.cat_health_desc": "Pharmacy, appointments, reminders",
    "notif.cat_system": "System", "notif.cat_system_desc": "Security, updates, critical alerts",
    "notif.pref_title": "Notification Preferences",
    "notif.pref_subtitle": "Control your alerts by category",
    "notif.channels": "Channels",
    "notif.quiet_hours": "Quiet Hours",
    "notif.quiet_desc": "Mute notifications during rest hours",
    "notif.save": "Save",
    "notif.saving": "Saving…",
    "notif.saved": "Preferences saved",
    "notif.master_push": "Push (all)",
    "notif.master_email": "Email (all)",
    "notif.master_sms": "SMS (all)",
  },
  ar: {
    "notif.cat_orders": "الطلبات", "notif.cat_orders_desc": "حالة الطلب، التوصيل، التأكيدات",
    "notif.cat_wallet": "المحفظة", "notif.cat_wallet_desc": "المدفوعات، الشحن، المعاملات",
    "notif.cat_rides": "الرحلات", "notif.cat_rides_desc": "سيارات الأجرة، التتبع المباشر",
    "notif.cat_messages": "الرسائل", "notif.cat_messages_desc": "الدردشة، المكالمات الفائتة",
    "notif.cat_food": "المطاعم", "notif.cat_food_desc": "المطاعم، القوائم، التحضير",
    "notif.cat_promo": "العروض", "notif.cat_promo_desc": "عروض خاصة، كوبونات",
    "notif.cat_property": "العقارات", "notif.cat_property_desc": "الإعلانات، الزيارات، العقود",
    "notif.cat_health": "الصحة", "notif.cat_health_desc": "الصيدلية، المواعيد، التذكيرات",
    "notif.cat_system": "النظام", "notif.cat_system_desc": "الأمان، التحديثات، التنبيهات",
    "notif.pref_title": "تفضيلات الإشعارات",
    "notif.pref_subtitle": "تحكم في تنبيهاتك حسب الفئة",
    "notif.channels": "القنوات",
    "notif.quiet_hours": "ساعات الهدوء",
    "notif.quiet_desc": "إيقاف الإشعارات الصوتية أثناء الراحة",
    "notif.save": "حفظ",
    "notif.saving": "جارٍ الحفظ…",
    "notif.saved": "تم حفظ التفضيلات",
    "notif.master_push": "إشعارات (الكل)",
    "notif.master_email": "بريد (الكل)",
    "notif.master_sms": "رسائل (الكل)",
  },
};

const CHANNELS: { key: ChannelKey; icon: typeof Bell; labelKey: string }[] = [
  { key: "push", icon: Bell, labelKey: "notif.master_push" },
  { key: "email", icon: Mail, labelKey: "notif.master_email" },
  { key: "sms", icon: Smartphone, labelKey: "notif.master_sms" },
];

export default function NotificationPreferencesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [prefs, setPrefs] = useState<AllPrefs>(DEFAULT_ALL);
  const [quietHours, setQuietHours] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const tl = (key: string) => {
    const v = t(key);
    if (v && v !== key) return v;
    const lang = locale?.startsWith("ar") ? "ar" : locale?.startsWith("fr") ? "fr" : "en";
    return FALLBACKS[lang]?.[key] ?? FALLBACKS.en[key] ?? key;
  };

  // Load from DB
  useEffect(() => {
    if (!user?.id) return;
    let live = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("user_notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!live) return;
      if (data?.category_prefs) {
        try {
          const parsed = typeof data.category_prefs === "string"
            ? JSON.parse(data.category_prefs)
            : data.category_prefs;
          setPrefs(prev => ({ ...prev, ...parsed }));
        } catch {}
      }
      if (data) {
        setQuietHours(!!data.quiet_hours_enabled);
      }
      setLoaded(true);
    })();
    return () => { live = false; };
  }, [user?.id]);

  // Save
  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("user_notification_preferences")
        .upsert({
          user_id: user.id,
          category_prefs: prefs,
          quiet_hours_enabled: quietHours,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      if (error) throw error;
      toast.success(tl("notif.saved"));
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setSaving(false);
    }
  };

  // Toggle single category+channel
  const toggle = (cat: CategoryKey, ch: ChannelKey) => {
    setPrefs(prev => ({
      ...prev,
      [cat]: { ...prev[cat], [ch]: !prev[cat][ch] },
    }));
  };

  // Master toggle per channel
  const toggleMaster = (ch: ChannelKey) => {
    const allOn = NOTIFICATION_CATEGORIES.every(c => prefs[c.key][ch]);
    setPrefs(prev => {
      const next = { ...prev };
      for (const c of NOTIFICATION_CATEGORIES) {
        next[c.key] = { ...next[c.key], [ch]: !allOn };
      }
      return next;
    });
  };

  const isMasterOn = (ch: ChannelKey) => NOTIFICATION_CATEGORIES.every(c => prefs[c.key][ch]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="app-mobile-page bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-foreground">{tl("notif.pref_title")}</h1>
          <p className="text-xs text-muted-foreground">{tl("notif.pref_subtitle")}</p>
        </div>
      </div>

      <div className="px-4 pb-32 app-mobile-content space-y-4">
        {/* Master channel toggles */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/30 bg-card p-4"
        >
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            {tl("notif.channels")}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {CHANNELS.map(({ key, icon: Icon, labelKey }) => {
              const on = isMasterOn(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleMaster(key)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all active:scale-95 ${
                    on
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/30 bg-muted/10"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${on ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-[10px] font-semibold ${on ? "text-primary" : "text-muted-foreground"}`}>
                    {tl(labelKey)}
                  </span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                    on ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {on ? "ON" : "OFF"}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Per-category preferences */}
        <AnimatePresence>
          {NOTIFICATION_CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon;
            const pref = prefs[cat.key];
            const anyOn = pref.push || pref.email || pref.sms;

            return (
              <motion.div
                key={cat.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`rounded-2xl border bg-card p-4 transition-colors ${
                  anyOn ? "border-border/30" : "border-border/10 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    anyOn ? "bg-primary/10" : "bg-muted/30"
                  }`}>
                    <Icon className={`w-4 h-4 ${anyOn ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">{tl(cat.labelKey)}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{tl(cat.descKey)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {CHANNELS.map(({ key: ch, icon: ChIcon }) => (
                    <div key={ch} className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <ChIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-[10px] text-muted-foreground capitalize">{ch}</span>
                      </div>
                      <Switch
                        checked={pref[ch]}
                        onCheckedChange={() => toggle(cat.key, ch)}
                        className="scale-75"
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Quiet Hours */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border/30 bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center">
                <Moon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{tl("notif.quiet_hours")}</p>
                <p className="text-[11px] text-muted-foreground">{tl("notif.quiet_desc")}</p>
              </div>
            </div>
            <Switch checked={quietHours} onCheckedChange={setQuietHours} />
          </div>
        </motion.div>
      </div>

      {/* Fixed save button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-sm border-t border-border/20">
        <button
          onClick={save}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold active:scale-[0.97] transition-transform disabled:opacity-50"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {tl("notif.saving")}</>
          ) : (
            <><Save className="w-4 h-4" /> {tl("notif.save")}</>
          )}
        </button>
      </div>
    </div>
  );
}
