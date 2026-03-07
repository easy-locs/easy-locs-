import { motion } from "framer-motion";
import { ArrowRight, Building2, KeyRound, UserPlus, Globe, Shield, Zap, Users } from "lucide-react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden" style={{ background: 'hsl(var(--navy-deep))' }}>
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-accent/8 blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-info/6 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/4 blur-[200px]" />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--primary-foreground)) 1px, transparent 0)',
        backgroundSize: '48px 48px',
      }} />

      <div className="container relative z-10 py-24 sm:py-32">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-5 py-2 text-sm font-medium mb-8"
            style={{ color: 'hsl(var(--gold-light))' }}
          >
            <Globe className="h-4 w-4" />
            Global Property Management Platform
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6"
            style={{ color: 'hsl(var(--primary-foreground))' }}
          >
            The Global Platform for{" "}
            <span className="text-gradient-gold">Property Management</span>{" "}
            and Rentals
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
            style={{ color: 'hsl(var(--primary-foreground) / 0.55)' }}
          >
            Manage properties, tenants, bookings and concierge services worldwide from one platform.
          </motion.p>

          {/* Three CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-gold text-accent-foreground font-bold px-8 py-4 rounded-xl shadow-gold hover:opacity-90 transition-all text-base min-w-[220px]"
            >
              <Building2 className="h-5 w-5" />
              Owner / Landlord Login
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/tenant-signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 border-2 border-primary-foreground/15 font-semibold px-8 py-4 rounded-xl hover:bg-primary-foreground/5 transition-all text-base min-w-[220px]"
              style={{ color: 'hsl(var(--primary-foreground) / 0.8)' }}
            >
              <KeyRound className="h-5 w-5" />
              Tenant Login
            </Link>
            <Link
              to="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-primary-foreground/10 border border-primary-foreground/10 font-semibold px-8 py-4 rounded-xl hover:bg-primary-foreground/15 transition-all text-base min-w-[220px]"
              style={{ color: 'hsl(var(--primary-foreground) / 0.9)' }}
            >
              <UserPlus className="h-5 w-5" />
              Create Account
            </Link>
          </motion.div>

          {/* Trust bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center justify-center gap-8 sm:gap-12 flex-wrap"
          >
            {[
              { icon: Globe, label: "110+ Countries" },
              { icon: Shield, label: "GDPR Compliant" },
              { icon: Zap, label: "AI Powered" },
              { icon: Users, label: "Tenant Portal" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm" style={{ color: 'hsl(var(--primary-foreground) / 0.35)' }}>
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
