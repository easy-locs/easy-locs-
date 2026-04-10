import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import {
  Globe, Rocket, CreditCard, CalendarCheck, Store,
  LayoutDashboard, Zap, ArrowRight, Check, Sparkles,
  Building2, Users, BarChart3, Shield, Wallet, Map,
  Clock, Star, TrendingUp, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ── Shared animation variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: "easeOut" as const },
  }),
};

const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

/* ── Glow orb component ── */
const GlowOrb = ({ className }: { className?: string }) => (
  <div className={`absolute rounded-full blur-[120px] opacity-20 pointer-events-none ${className}`} />
);

/* ── Section wrapper ── */
const Section = ({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) => (
  <section id={id} className={`relative py-24 md:py-32 overflow-hidden ${className}`}>
    <div className="relative z-10 max-w-[1120px] mx-auto px-4 sm:px-6">{children}</div>
  </section>
);

/* ── Badge ── */
const SectionBadge = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/5 text-accent text-xs font-semibold tracking-wide uppercase mb-6">
    <Icon className="h-3.5 w-3.5" />
    {text}
  </motion.div>
);

/* ── Feature card ── */
const FeatureCard = ({ icon: Icon, title, description, index }: { icon: React.ElementType; title: string; description: string; index: number }) => (
  <motion.div
    variants={fadeUp}
    custom={index}
    className="group relative p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-sm hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all duration-500"
  >
    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
      <Icon className="h-6 w-6 text-accent" />
    </div>
    <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
  </motion.div>
);

/* ── Stat pill ── */
const StatPill = ({ value, label, index }: { value: string; label: string; index: number }) => (
  <motion.div variants={fadeUp} custom={index} className="text-center px-6 py-4">
    <p className="text-3xl md:text-4xl font-extrabold text-accent">{value}</p>
    <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">{label}</p>
  </motion.div>
);

/* ══════════════════════════════════════════════════════
   PAGE COMPONENT
   ══════════════════════════════════════════════════════ */

const PlatformVision = () => (
  <>
    <SEOHead
      title="Platform Vision — Build Your Business Anywhere | EASY-LOCS®"
      description="Discover the future of independent business. Manage rentals, services & activities globally. Receive payments anywhere with Stripe, PayPal or bank transfer."
    />

    <div className="app-mobile-page bg-background text-foreground">

      {/* ═══════════ 1. HERO ═══════════ */}
      <Section className="min-h-[90vh] flex items-center pt-12 md:pt-0">
        <GlowOrb className="w-[600px] h-[600px] bg-accent/30 -top-40 -right-40" />
        <GlowOrb className="w-[400px] h-[400px] bg-primary/20 bottom-0 -left-40" />

        {/* Grid background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center max-w-4xl mx-auto">
          <SectionBadge icon={Rocket} text="The Future of Independent Business" />

          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[1.08] tracking-tight mb-6">
            Build Your Business{" "}
            <span className="bg-gradient-to-r from-accent via-gold-light to-accent bg-clip-text text-transparent">
              Anywhere in the World
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Create and manage rentals, services and activities globally.
            Receive payments directly. No middleman. Your business, your rules.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl px-8 text-base font-semibold h-12 gap-2">
              <Link to="/signup">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl px-8 text-base h-12 border-border/60">
              <Link to="/rentals">Explore Marketplace</Link>
            </Button>
          </motion.div>

          {/* Stats row */}
          <motion.div variants={stagger} className="mt-16 flex flex-wrap justify-center divide-x divide-border">
            <StatPill value="150+" label="Countries" index={4} />
            <StatPill value="30+" label="Currencies" index={5} />
            <StatPill value="0%" label="Commission" index={6} />
            <StatPill value="24/7" label="Availability" index={7} />
          </motion.div>
        </motion.div>
      </Section>

      {/* ═══════════ 2. FREEDOM ═══════════ */}
      <Section className="bg-primary/[0.02]">
        <GlowOrb className="w-[500px] h-[500px] bg-accent/15 top-0 right-0" />

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <SectionBadge icon={Zap} text="Total Freedom" />
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
              Operate{" "}
              <span className="text-accent">Independently</span>
              <br />Build Your Own Empire
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-lg leading-relaxed mb-8">
              No franchise fees. No platform commissions. You own every aspect of your business — from branding to customer relationships. Set your prices, define your terms, and grow at your own pace.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="space-y-3">
              {[
                "Full control over pricing & availability",
                "White-label booking links with your brand",
                "Direct customer communication",
                "Multi-country operations from one account",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 text-accent" />
                  </div>
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div variants={fadeUp} custom={4} className="relative">
            <div className="aspect-square max-w-md mx-auto relative">
              {/* Animated rings */}
              {[1, 2, 3].map((ring) => (
                <motion.div
                  key={ring}
                  className="absolute inset-0 rounded-full border border-accent/10"
                  style={{ scale: 0.5 + ring * 0.18 }}
                  animate={{ rotate: ring % 2 === 0 ? 360 : -360 }}
                  transition={{ duration: 20 + ring * 10, repeat: Infinity, ease: "linear" }}
                />
              ))}
              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-accent to-gold-dark flex items-center justify-center shadow-2xl shadow-accent/20">
                  <Globe className="h-14 w-14 text-accent-foreground" />
                </div>
              </div>
              {/* Floating icons */}
              {[
                { Icon: Building2, pos: "top-8 left-8" },
                { Icon: Users, pos: "top-8 right-12" },
                { Icon: Wallet, pos: "bottom-12 left-6" },
                { Icon: Star, pos: "bottom-8 right-8" },
              ].map(({ Icon, pos }, i) => (
                <motion.div
                  key={i}
                  className={`absolute ${pos} w-12 h-12 rounded-xl bg-card border border-border shadow-lg flex items-center justify-center`}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.6 }}
                >
                  <Icon className="h-5 w-5 text-accent" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </Section>

      {/* ═══════════ 3. GLOBAL PAYMENTS ═══════════ */}
      <Section>
        <GlowOrb className="w-[600px] h-[600px] bg-accent/10 -bottom-40 left-1/2 -translate-x-1/2" />

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="text-center mb-16">
          <SectionBadge icon={CreditCard} text="Global Payments" />
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-5xl font-extrabold mb-4">
            Receive Payments{" "}
            <span className="text-accent">Directly</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Accept payments from customers worldwide using the methods they prefer. Every payment goes directly to you — zero platform fees.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { icon: CreditCard, title: "Stripe", desc: "Accept cards, Apple Pay, Google Pay in 135+ currencies. Instant checkout with secure payment links.", gradient: "from-[hsl(250,80%,60%)] to-[hsl(280,80%,60%)]" },
            { icon: Wallet, title: "PayPal", desc: "Reach 400M+ PayPal users worldwide. Buyer protection included for customer confidence.", gradient: "from-[hsl(210,90%,50%)] to-[hsl(210,90%,65%)]" },
            { icon: Building2, title: "Bank Transfer", desc: "IBAN/SWIFT transfers for larger transactions. Perfect for long-term rentals and B2B services.", gradient: "from-[hsl(var(--accent))] to-[hsl(var(--gold-dark))]" },
          ].map((pm, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              custom={i}
              className="relative p-8 rounded-2xl border border-border bg-card/80 backdrop-blur-sm text-center group hover:border-accent/30 transition-all duration-500"
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${pm.gradient} flex items-center justify-center mx-auto mb-5 shadow-lg group-hover:scale-105 transition-transform`}>
                <pm.icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{pm.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{pm.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ═══════════ 4. SMART BOOKING ═══════════ */}
      <Section className="bg-primary/[0.02]">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Visual */}
          <motion.div variants={fadeUp} custom={0} className="order-2 lg:order-1">
            <div className="relative bg-card border border-border rounded-2xl p-6 shadow-xl max-w-md mx-auto">
              {/* Mini calendar mockup */}
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-foreground">March 2026</h4>
                <Badge text="Live" />
              </div>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <div key={i} className="text-[10px] text-muted-foreground text-center font-medium">{d}</div>
                ))}
                {Array.from({ length: 31 }, (_, i) => {
                  const booked = [8, 9, 10, 11, 12, 13, 14].includes(i + 1);
                  const partial = [15, 22].includes(i + 1);
                  return (
                    <div key={i} className={`h-7 rounded-md flex items-center justify-center text-[11px] font-medium transition-colors ${
                      booked ? "bg-destructive/15 text-destructive line-through" :
                      partial ? "bg-warning/15 text-warning" :
                      "bg-muted/30 text-foreground hover:bg-accent/10"
                    }`}>{i + 1}</div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-accent/30" /> Available</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-warning/30" /> Partial</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-destructive/30" /> Booked</span>
              </div>
              {/* Scan line effect */}
              <motion.div
                className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </motion.div>

          {/* Text */}
          <div className="order-1 lg:order-2">
            <SectionBadge icon={CalendarCheck} text="Smart Booking" />
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
              Dynamic Calendar &{" "}
              <span className="text-accent">Real-Time</span> Booking
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-lg leading-relaxed mb-8">
              Prevent double bookings with real-time availability synced across all channels. Support for time slots, date ranges, and multi-day rentals — all managed automatically.
            </motion.p>
            <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Clock, text: "Real-time sync" },
                { icon: Shield, text: "Anti-double booking" },
                { icon: Map, text: "Multi-channel iCal" },
                { icon: TrendingUp, text: "Dynamic pricing" },
              ].map(({ icon: Icon, text }, i) => (
                <motion.div key={i} variants={fadeUp} custom={i + 3} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                  <Icon className="h-5 w-5 text-accent shrink-0" />
                  <span className="text-sm font-medium text-foreground">{text}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </Section>

      {/* ═══════════ 5. MARKETPLACE VISION ═══════════ */}
      <Section>
        <GlowOrb className="w-[500px] h-[500px] bg-accent/15 top-20 -left-40" />

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="text-center mb-16">
          <SectionBadge icon={Store} text="Marketplace Vision" />
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-5xl font-extrabold mb-4">
            From Individual to{" "}
            <span className="text-accent">Global Marketplace</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start as an independent operator and scale to a full marketplace. Your listings can evolve from a single property to a worldwide network of services.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          {/* Evolution steps */}
          <div className="relative max-w-3xl mx-auto">
            {/* Connecting line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-accent/50 via-accent/20 to-transparent hidden md:block" />

            {[
              { step: "01", title: "Create Your Listing", desc: "Set up your first property, service or activity in minutes. Add photos, pricing and availability.", icon: Sparkles },
              { step: "02", title: "Share & Book", desc: "Generate shareable booking links with product photos for WhatsApp, Telegram, social media. Clients book and pay directly.", icon: Globe },
              { step: "03", title: "Build Your Storefront", desc: "Expand to a full provider profile with multiple services, reviews and a professional storefront page.", icon: Store },
              { step: "04", title: "Scale Globally", desc: "Operate across countries, currencies and categories. Your business grows without limits.", icon: Rocket },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} custom={i} className="flex gap-6 mb-10 last:mb-0">
                <div className="relative z-10 w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-gold-dark flex items-center justify-center shadow-lg shadow-accent/20 shrink-0">
                  <item.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="pt-1">
                  <p className="text-xs text-accent font-bold uppercase tracking-widest mb-1">Step {item.step}</p>
                  <h3 className="text-xl font-bold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Section>

      {/* ═══════════ 6. ALL-IN-ONE DASHBOARD ═══════════ */}
      <Section className="bg-primary/[0.02]">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="text-center mb-16">
          <SectionBadge icon={LayoutDashboard} text="All-in-One Dashboard" />
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-5xl font-extrabold mb-4">
            Everything You Need,{" "}
            <span className="text-accent">One Place</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Manage listings, bookings, customers, payments, documents and analytics from a single powerful dashboard.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Building2, title: "Property Management", desc: "Unlimited properties across countries. Track occupancy, maintenance and documents." },
            { icon: CalendarCheck, title: "Booking Engine", desc: "Automated reservations with calendar sync, confirmations and payment tracking." },
            { icon: Users, title: "Customer CRM", desc: "Manage tenants, guests and clients. Communication history and document sharing." },
            { icon: BarChart3, title: "Financial Analytics", desc: "Revenue dashboards, expense tracking, tax reports and fiscal summaries." },
            { icon: Layers, title: "Document Center", desc: "Generate leases, receipts, invoices and reports. Digital signatures included." },
            { icon: Shield, title: "Security & Compliance", desc: "Role-based access, audit trails, GDPR compliance and encrypted storage." },
          ].map((feature, i) => (
            <FeatureCard key={i} icon={feature.icon} title={feature.title} description={feature.desc} index={i} />
          ))}
        </motion.div>
      </Section>

      {/* ═══════════ 7. FUTURE PLATFORM ═══════════ */}
      <Section className="text-center">
        <GlowOrb className="w-[800px] h-[800px] bg-accent/15 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="max-w-3xl mx-auto">
          <SectionBadge icon={Sparkles} text="The Future is Here" />

          <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-6xl font-extrabold mb-6 leading-tight">
            The Future of{" "}
            <span className="bg-gradient-to-r from-accent via-gold-light to-accent bg-clip-text text-transparent">
              Independent Business
            </span>
          </motion.h2>

          <motion.p variants={fadeUp} custom={2} className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10">
            We're building the platform that empowers anyone to create, manage and scale their business globally.
            No barriers. No commissions. Just pure entrepreneurial freedom.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl px-10 text-base font-bold h-14 gap-2 shadow-xl shadow-accent/20">
              <Link to="/signup">
                Start Building Today <Rocket className="h-5 w-5" />
              </Link>
            </Button>
          </motion.div>

          {/* Trust badges */}
          <motion.div variants={fadeUp} custom={4} className="mt-16 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            {[
              "🔒 Enterprise Security",
              "🌍 150+ Countries",
              "💳 Multi-Payment",
              "📱 Mobile Ready",
              "🤖 AI-Powered",
            ].map((badge, i) => (
              <span key={i} className="px-4 py-2 rounded-full border border-border bg-card/50">{badge}</span>
            ))}
          </motion.div>
        </motion.div>
      </Section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-border py-8">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} EASY-LOCS® — All rights reserved</p>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xs text-muted-foreground hover:text-accent transition-colors">Home</Link>
            <Link to="/signup" className="text-xs text-muted-foreground hover:text-accent transition-colors">Get Started</Link>
            <Link to="/about" className="text-xs text-muted-foreground hover:text-accent transition-colors">About</Link>
          </div>
        </div>
      </footer>
    </div>
  </>
);

/* Small utility for the calendar mockup */
const Badge = ({ text }: { text: string }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-semibold">
    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
    {text}
  </span>
);

export default PlatformVision;
