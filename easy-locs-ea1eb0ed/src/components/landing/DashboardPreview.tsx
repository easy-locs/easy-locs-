import { motion } from "framer-motion";
import {
  BarChart3, Home, Users, CreditCard, CalendarRange, Bell, Globe, ArrowUpRight,
  Car, UtensilsCrossed, Ship, Mountain, Sparkles, Camera, ShieldCheck,
  MessageCircle, Mail, Send, Share2, Smartphone, Wallet, Building2,
  TrendingUp, CheckCircle2, Clock, Star,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

/* ── Service category cards with emoji photos ── */
const SERVICE_CATEGORIES = [
  { icon: Car, label: "Car Rental", emoji: "🚗", price: "From €35/day", color: "accent", bookings: 48 },
  { icon: Ship, label: "Yacht & Boat", emoji: "⛵", price: "From €200/day", color: "info", bookings: 12 },
  { icon: Mountain, label: "Excursions", emoji: "🏔️", price: "From €25/pers", color: "success", bookings: 85 },
  { icon: UtensilsCrossed, label: "Private Chef", emoji: "👨‍🍳", price: "From €80/meal", color: "warning", bookings: 34 },
  { icon: Camera, label: "Photo Tours", emoji: "📸", price: "From €50/session", color: "accent", bookings: 22 },
  { icon: Sparkles, label: "VIP Services", emoji: "🌟", price: "From €150", color: "info", bookings: 18 },
];

const PAYMENT_METHODS = [
  { label: "Apple Pay", icon: "🍎", glow: "accent" },
  { label: "Google Pay", icon: "📱", glow: "info" },
  { label: "Stripe", icon: "💳", glow: "success" },
  { label: "PayPal", icon: "🅿️", glow: "warning" },
  { label: "Bank Transfer", icon: "🏦", glow: "accent" },
  { label: "SEPA", icon: "🏧", glow: "info" },
];

const SHARE_PLATFORMS = [
  { label: "WhatsApp", icon: MessageCircle, color: "#25D366" },
  { label: "Telegram", icon: Send, color: "#0088cc" },
  { label: "Email", icon: Mail, color: "hsl(var(--accent))" },
  { label: "SMS", icon: Smartphone, color: "hsl(var(--info))" },
];

const mockStats = [
  { label: "Properties", value: "24", change: "+3", icon: Home, color: "accent" },
  { label: "Tenants", value: "31", change: "+5", icon: Users, color: "info" },
  { label: "Revenue", value: "€18,420", change: "+12%", icon: TrendingUp, color: "success" },
  { label: "Bookings", value: "142", change: "+18", icon: CalendarRange, color: "warning" },
];

const mockActivities = [
  { text: "💰 Payment received — Jean D. — €950", time: "2 min", dot: "success" },
  { text: "🏖️ New booking — Villa Palma — Jun 14–21", time: "18 min", dot: "info" },
  { text: "🚗 Car rental booked — Marrakech — 3 days", time: "1h", dot: "warning" },
  { text: "📝 Lease signed — Apt. Roma 3B — Sophie M.", time: "3h", dot: "accent" },
];

const DashboardPreview = () => {
  const { t } = useI18n();

  return (
    <section id="demo" className="py-24 sm:py-32 relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full blur-[150px] opacity-15"
          style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.4) 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--accent) / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.5) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="container max-w-6xl relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 space-y-4"
        >
          <span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] px-5 py-2 rounded-full border"
            style={{
              color: "hsl(var(--gold-light))",
              borderColor: "hsl(var(--accent) / 0.3)",
              background: "hsl(var(--accent) / 0.08)",
            }}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            {t("landing.preview.badge") || "Live Dashboard"}
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight"
            style={{ color: "hsl(var(--primary-foreground))" }}
          >
            {t("landing.preview.title") || "Your Business,"}{" "}
            <span className="text-gradient-gold">{t("landing.preview.title_highlight") || "One Dashboard"}</span>
          </h2>
          <p
            className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ color: "hsl(var(--primary-foreground) / 0.5)" }}
          >
            {t("landing.preview.subtitle") || "Properties, services, bookings, payments — everything in one powerful interface."}
          </p>
        </motion.div>

        {/* ═══ Dashboard mockup ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="rounded-2xl border overflow-hidden"
          style={{
            borderColor: "hsl(var(--primary-foreground) / 0.08)",
            background: "hsl(var(--primary-foreground) / 0.03)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 0 60px hsl(var(--accent) / 0.06), 0 20px 60px hsl(0 0% 0% / 0.3)",
          }}
        >
          {/* Browser bar */}
          <div
            className="flex items-center gap-3 px-5 py-3 border-b"
            style={{ borderColor: "hsl(var(--primary-foreground) / 0.06)" }}
          >
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: "hsl(0 70% 50% / 0.6)" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "hsl(45 80% 50% / 0.6)" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "hsl(140 60% 45% / 0.6)" }} />
            </div>
            <div className="flex-1 flex justify-center">
              <div
                className="rounded-lg px-12 py-1.5 text-xs font-mono"
                style={{
                  background: "hsl(var(--primary-foreground) / 0.04)",
                  color: "hsl(var(--primary-foreground) / 0.35)",
                  border: "1px solid hsl(var(--primary-foreground) / 0.06)",
                }}
              >
                app.easy-locs.com/dashboard
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8 space-y-6">
            {/* KPI Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {mockStats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  className="rounded-xl p-3 sm:p-4 border transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: "hsl(var(--primary-foreground) / 0.05)",
                    borderColor: "hsl(var(--accent) / 0.12)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <s.icon className="h-4 w-4" style={{ color: `hsl(var(--${s.color}))` }} />
                      <span className="text-[10px] sm:text-xs font-semibold" style={{ color: "hsl(var(--primary-foreground) / 0.6)" }}>{s.label}</span>
                    </div>
                    <span className="text-[10px] font-bold flex items-center gap-0.5" style={{ color: "hsl(var(--success))" }}>
                      <ArrowUpRight className="h-3 w-3" />
                      {s.change}
                    </span>
                  </div>
                  <div className="text-lg sm:text-2xl font-extrabold tabular-nums whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "hsl(var(--primary-foreground))" }}>{s.value}</div>
                </motion.div>
              ))}
            </div>

            {/* Chart + Activity */}
            <div className="grid lg:grid-cols-2 gap-5">
              {/* Revenue Chart */}
              <div
                className="rounded-xl p-5 border"
                style={{
                  background: "hsl(var(--primary-foreground) / 0.02)",
                  borderColor: "hsl(var(--primary-foreground) / 0.06)",
                }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <BarChart3 className="h-4 w-4" style={{ color: "hsl(var(--accent))" }} />
                  <span className="text-sm font-bold" style={{ color: "hsl(var(--primary-foreground) / 0.85)" }}>Monthly Revenue</span>
                </div>
                <div className="flex items-end gap-1.5 h-32">
                  {[40, 65, 55, 80, 70, 95, 85, 100, 90, 78, 88, 92].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.03, duration: 0.5 }}
                      className="flex-1 rounded-t-md"
                      style={{ background: `linear-gradient(180deg, hsl(var(--accent)) 0%, hsl(var(--accent) / 0.2) 100%)` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-semibold" style={{ color: "hsl(var(--primary-foreground) / 0.3)" }}>
                  <span>Jan</span><span>Jun</span><span>Dec</span>
                </div>
              </div>

              {/* Activity Feed */}
              <div
                className="rounded-xl p-5 border"
                style={{
                  background: "hsl(var(--primary-foreground) / 0.02)",
                  borderColor: "hsl(var(--primary-foreground) / 0.06)",
                }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <Bell className="h-4 w-4" style={{ color: "hsl(var(--info))" }} />
                  <span className="text-sm font-bold" style={{ color: "hsl(var(--primary-foreground) / 0.85)" }}>Live Activity</span>
                </div>
                <div className="space-y-3.5">
                  {mockActivities.map((a, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: `hsl(var(--${a.dot}))` }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-snug line-clamp-2" style={{ color: "hsl(var(--primary-foreground) / 0.75)" }}>{a.text}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--primary-foreground) / 0.3)" }}>{a.time}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* ═══ SERVICE CATEGORIES ═══ */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4" style={{ color: "hsl(var(--accent))" }} />
                <span className="text-sm font-bold" style={{ color: "hsl(var(--primary-foreground) / 0.85)" }}>Service Categories</span>
                <span
                  className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    color: "hsl(var(--accent))",
                    background: "hsl(var(--accent) / 0.1)",
                    border: "1px solid hsl(var(--accent) / 0.2)",
                  }}
                >
                  {SERVICE_CATEGORIES.reduce((s, c) => s + c.bookings, 0)} bookings
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {SERVICE_CATEGORIES.map((cat, i) => (
                  <motion.div
                    key={cat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    whileHover={{ y: -4, scale: 1.03 }}
                    className="rounded-xl p-3 border cursor-pointer transition-all duration-300 group"
                    style={{
                      background: "hsl(var(--primary-foreground) / 0.03)",
                      borderColor: "hsl(var(--primary-foreground) / 0.06)",
                    }}
                  >
                    <div className="text-3xl text-center mb-2">{cat.emoji}</div>
                    <p className="text-[11px] font-bold text-center line-clamp-1" style={{ color: "hsl(var(--primary-foreground) / 0.85)" }}>{cat.label}</p>
                    <p className="text-[10px] text-center mt-0.5" style={{ color: `hsl(var(--${cat.color}))` }}>{cat.price}</p>
                    <div className="flex items-center justify-center gap-1 mt-1.5">
                      <Star className="h-2.5 w-2.5" style={{ color: "hsl(var(--accent))" }} />
                      <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--primary-foreground) / 0.4)" }}>{cat.bookings} booked</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* ═══ PAYMENT + SHARE ROW ═══ */}
            <div className="grid lg:grid-cols-2 gap-5">
              {/* Payments */}
              <div
                className="rounded-xl p-5 border"
                style={{
                  background: "hsl(var(--primary-foreground) / 0.02)",
                  borderColor: "hsl(var(--primary-foreground) / 0.06)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="h-4 w-4" style={{ color: "hsl(var(--success))" }} />
                  <span className="text-sm font-bold" style={{ color: "hsl(var(--primary-foreground) / 0.85)" }}>Accept Payments Globally</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((pm, i) => (
                    <motion.div
                      key={pm.label}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.04 }}
                      whileHover={{ scale: 1.05 }}
                      className="flex flex-col items-center gap-1.5 rounded-xl p-3 border cursor-pointer transition-all duration-300"
                      style={{
                        background: `hsl(var(--${pm.glow}) / 0.04)`,
                        borderColor: `hsl(var(--${pm.glow}) / 0.12)`,
                      }}
                    >
                      <span className="text-xl">{pm.icon}</span>
                      <span className="text-[10px] font-bold" style={{ color: "hsl(var(--primary-foreground) / 0.6)" }}>{pm.label}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3 px-1">
                  <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--success))" }} />
                  <span className="text-[10px] min-w-0 line-clamp-1" style={{ color: "hsl(var(--primary-foreground) / 0.4)" }}>0% client fees — Only 5% platform commission</span>
                </div>
              </div>

              {/* Share */}
              <div
                className="rounded-xl p-5 border"
                style={{
                  background: "hsl(var(--primary-foreground) / 0.02)",
                  borderColor: "hsl(var(--primary-foreground) / 0.06)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Share2 className="h-4 w-4" style={{ color: "hsl(var(--accent))" }} />
                  <span className="text-sm font-bold" style={{ color: "hsl(var(--primary-foreground) / 0.85)" }}>Share Anywhere</span>
                </div>
                {/* Share link mockup */}
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 mb-4 border"
                  style={{
                    background: "hsl(var(--primary-foreground) / 0.03)",
                    borderColor: "hsl(var(--primary-foreground) / 0.06)",
                  }}
                >
                  <Globe className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--accent) / 0.5)" }} />
                  <span className="text-[10px] font-mono flex-1 truncate" style={{ color: "hsl(var(--primary-foreground) / 0.4)" }}>
                    easy-locs.com/book/rent-car-marrakech
                  </span>
                  <div
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0"
                    style={{ background: "hsl(var(--accent) / 0.1)", color: "hsl(var(--accent))" }}
                  >
                    Copy
                  </div>
                </div>

                {/* Platform buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {SHARE_PLATFORMS.map((sp, i) => (
                    <motion.div
                      key={sp.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.06 }}
                      whileHover={{ scale: 1.08 }}
                      className="flex flex-col items-center gap-1.5 rounded-xl p-3 border cursor-pointer transition-all duration-300"
                      style={{
                        background: "hsl(var(--primary-foreground) / 0.03)",
                        borderColor: "hsl(var(--primary-foreground) / 0.06)",
                      }}
                    >
                      <sp.icon className="h-4 w-4" style={{ color: sp.color }} />
                      <span className="text-[10px] font-bold" style={{ color: "hsl(var(--primary-foreground) / 0.5)" }}>{sp.label}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-3 px-1">
                  <ShieldCheck className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--accent))" }} />
                  <span className="text-[10px] min-w-0 line-clamp-1" style={{ color: "hsl(var(--primary-foreground) / 0.4)" }}>Product photo in link preview — Stable links</span>
                </div>
              </div>
            </div>

            {/* Quick access bottom bar */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { icon: Home, label: "Properties", color: "accent" },
                { icon: Users, label: "Tenants", color: "info" },
                { icon: CalendarRange, label: "Seasonal", color: "success" },
                { icon: CreditCard, label: "Payments", color: "warning" },
                { icon: Building2, label: "Company", color: "accent" },
                { icon: Globe, label: "Countries", color: "info" },
              ].map((m, i) => (
                <motion.div
                  key={m.label}
                  whileHover={{ y: -2, scale: 1.03 }}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  className="flex flex-col items-center gap-2 rounded-xl p-3 border cursor-pointer transition-all duration-300"
                  style={{
                    background: "hsl(var(--primary-foreground) / 0.03)",
                    borderColor: "hsl(var(--primary-foreground) / 0.06)",
                  }}
                >
                  <m.icon className="h-4 w-4" style={{ color: `hsl(var(--${m.color}))` }} />
                  <span className="text-[10px] font-bold" style={{ color: "hsl(var(--primary-foreground) / 0.5)" }}>{m.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DashboardPreview;
