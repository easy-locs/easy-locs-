import { motion } from "framer-motion";
import { ArrowRight, Building2, KeyRound, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import AppLogo from "@/components/AppLogo";
import { getPostLoginRoute, waitForAuthenticatedUser } from "@/lib/auth-redirect";

/* ── Animated background orbs ── */
const BackgroundEffects = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Primary gradient glow */}
    <div
      className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20"
      style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.3) 0%, transparent 70%)" }}
    />
    {/* Secondary orb */}
    <motion.div
      className="absolute top-[20%] right-[15%] w-64 h-64 rounded-full blur-[120px] opacity-15"
      style={{ background: "hsl(var(--info))" }}
      animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute bottom-[25%] left-[10%] w-48 h-48 rounded-full blur-[100px] opacity-10"
      style={{ background: "hsl(var(--success))" }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.15, 0.08] }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
    />
    {/* Subtle grid */}
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `linear-gradient(hsl(var(--accent) / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.4) 1px, transparent 1px)`,
        backgroundSize: "80px 80px",
      }}
    />
  </div>
);

/* ── Stats bar ── */
const TrustBar = () => {
  const { t } = useI18n();
  const stats = [
    { value: "110+", label: t("landing.hero.trust_countries") || "Countries" },
    { value: "GDPR", label: t("landing.hero.trust_gdpr") || "Compliant" },
    { value: "AI", label: t("landing.hero.trust_ai") || "Powered" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.6 }}
      className="flex items-center justify-center gap-8 sm:gap-12"
    >
      {stats.map((s) => (
        <div key={s.value} className="text-center">
          <div className="text-xl sm:text-2xl font-extrabold" style={{ color: "hsl(var(--accent))" }}>
            {s.value}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "hsl(var(--primary-foreground) / 0.45)" }}>
            {s.label}
          </div>
        </div>
      ))}
    </motion.div>
  );
};

/* ── Quick login card ── */
const QuickLoginCard = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <div
        className="rounded-2xl p-6 sm:p-8 border"
        style={{
          background: "hsl(var(--primary-foreground) / 0.04)",
          borderColor: "hsl(var(--primary-foreground) / 0.08)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 8px 32px hsl(0 0% 0% / 0.2), inset 0 1px 0 hsl(var(--primary-foreground) / 0.06)",
        }}
      >
        {/* Tabs: Landlord / Tenant */}
        <div className="flex gap-2 mb-6">
          <Link
            to="/signup"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "hsl(var(--accent) / 0.1)",
              color: "hsl(var(--accent))",
              border: "1px solid hsl(var(--accent) / 0.2)",
            }}
          >
            <Building2 className="h-4 w-4" />
            {t("landing.nav.pro_signup") || "Landlord"}
          </Link>
          <Link
            to="/tenant-signup"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-primary-foreground/5"
            style={{
              color: "hsl(var(--primary-foreground) / 0.5)",
              border: "1px solid hsl(var(--primary-foreground) / 0.08)",
            }}
          >
            <KeyRound className="h-4 w-4" />
            {t("landing.nav.tenant_access") || "Tenant"}
          </Link>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--primary-foreground) / 0.3)" }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.email_placeholder") || "Email"}
              className="w-full h-12 pl-11 pr-4 rounded-xl text-sm font-medium outline-none transition-all"
              style={{
                background: "hsl(var(--primary-foreground) / 0.05)",
                border: "1px solid hsl(var(--primary-foreground) / 0.1)",
                color: "hsl(var(--primary-foreground))",
              }}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(var(--primary-foreground) / 0.3)" }} />
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.password_placeholder") || "Password"}
              className="w-full h-12 pl-11 pr-11 rounded-xl text-sm font-medium outline-none transition-all"
              style={{
                background: "hsl(var(--primary-foreground) / 0.05)",
                border: "1px solid hsl(var(--primary-foreground) / 0.1)",
                color: "hsl(var(--primary-foreground))",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2"
              style={{ color: "hsl(var(--primary-foreground) / 0.3)" }}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl text-sm font-bold transition-all relative overflow-hidden group disabled:opacity-50"
            style={{
              background: "var(--gradient-gold)",
              color: "hsl(var(--accent-foreground))",
              boxShadow: "0 0 24px hsl(var(--accent) / 0.25)",
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? t("common.loading") || "Loading..." : t("landing.nav.login") || "Sign In"}
              {!loading && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>

          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-xs transition-colors hover:underline"
              style={{ color: "hsl(var(--primary-foreground) / 0.4)" }}
            >
              {t("auth.forgot_password") || "Forgot password?"}
            </Link>
          </div>
        </form>

        {/* SSO */}
        <SocialLoginButtons />
      </div>
    </motion.div>
  );
};

/* ═══════════ HERO ═══════════ */
const Hero = () => {
  const { t } = useI18n();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      <BackgroundEffects />

      {/* Scan line */}
      <motion.div
        className="absolute left-0 right-0 h-px pointer-events-none"
        style={{ background: "hsl(var(--accent) / 0.08)" }}
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      <div className="container relative z-10 py-24 sm:py-32">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center max-w-6xl mx-auto">
          {/* Left — Copy */}
          <div className="text-center lg:text-left space-y-8">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center lg:justify-start"
            >
              <AppLogo variant="landing" showLabel linkTo="/" />
            </motion.div>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex justify-center lg:justify-start"
            >
              <span
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold border"
                style={{
                  background: "hsl(var(--accent) / 0.08)",
                  borderColor: "hsl(var(--accent) / 0.2)",
                  color: "hsl(var(--gold-light))",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                {t("landing.hero.badge") || "AI-Powered Property Management"}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-3"
            >
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08]"
                style={{ color: "hsl(var(--primary-foreground))" }}
              >
                {t("landing.hero.title") || "Manage Properties,"}
                <br />
                <span className="text-gradient-gold">
                  {t("landing.hero.tw_tenants") || "Worldwide."}
                </span>
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="text-base sm:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0"
              style={{ color: "hsl(var(--primary-foreground) / 0.55)" }}
            >
              {t("landing.hero.subtitle") || "All-in-one platform for landlords, tenants and concierge professionals. Leases, payments, bookings — 110+ countries."}
            </motion.p>

            {/* Trust stats */}
            <TrustBar />
          </div>

          {/* Right — Auth card */}
          <QuickLoginCard />
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
