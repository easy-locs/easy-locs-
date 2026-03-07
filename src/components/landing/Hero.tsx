import { motion } from "framer-motion";
import { ArrowRight, Play, LogIn, Globe, Shield, Zap, Users, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const TypeWriter = ({ words }: { words: string[] }) => {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[idx];
    const timeout = deleting ? 40 : 80;
    
    if (!deleting && text === word) {
      setTimeout(() => setDeleting(true), 2000);
      return;
    }
    if (deleting && text === "") {
      setDeleting(false);
      setIdx((i) => (i + 1) % words.length);
      return;
    }

    const timer = setTimeout(() => {
      setText(deleting ? word.slice(0, text.length - 1) : word.slice(0, text.length + 1));
    }, timeout);
    return () => clearTimeout(timer);
  }, [text, deleting, idx, words]);

  return (
    <span className="text-gradient-gold">
      {text}
      <span className="animate-pulse">|</span>
    </span>
  );
};

const FloatingOrb = ({ className, delay = 0 }: { className: string; delay?: number }) => (
  <motion.div
    className={className}
    animate={{
      y: [0, -30, 0],
      scale: [1, 1.1, 1],
      opacity: [0.3, 0.6, 0.3],
    }}
    transition={{ duration: 6, repeat: Infinity, delay, ease: "easeInOut" }}
  />
);

const Hero = () => {
  const words = ["Tenants & Bookings", "Rents & Payments", "Leases & Documents", "Services & Concierge"];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-navy-deep">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0">
        {/* Cyber grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `
            linear-gradient(hsl(var(--accent) / 0.3) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--accent) / 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }} />
        
        {/* Radial glow center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(var(--accent) / 0.06) 0%, transparent 70%)' }}
        />
      </div>

      {/* Floating orbs */}
      <FloatingOrb className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full blur-[100px] bg-accent/10" delay={0} />
      <FloatingOrb className="absolute bottom-[20%] right-[8%] w-96 h-96 rounded-full blur-[120px] bg-info/8" delay={2} />
      <FloatingOrb className="absolute top-[60%] left-[60%] w-64 h-64 rounded-full blur-[80px] bg-success/6" delay={4} />

      {/* Scan line effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, hsl(var(--accent) / 0.02) 50%, transparent 100%)',
          backgroundSize: '100% 4px',
        }}
        animate={{ backgroundPosition: ['0% 0%', '0% 100%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />

      <div className="container relative z-10 py-28 sm:py-36">
        <div className="max-w-5xl mx-auto text-center">
          {/* Futuristic badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
            className="inline-flex items-center gap-2.5 rounded-full px-6 py-2.5 text-sm font-semibold mb-10 border border-accent/25"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--accent) / 0.12) 0%, hsl(var(--accent) / 0.04) 100%)',
              color: 'hsl(var(--gold-light))',
              boxShadow: '0 0 30px hsl(var(--accent) / 0.15), inset 0 1px 0 hsl(var(--accent) / 0.2)',
            }}
          >
            <Sparkles className="h-4 w-4" />
            AI-Powered Property Management — 110+ Countries
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          </motion.div>

          {/* Main headline with typewriter */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-8xl font-extrabold tracking-tight leading-[1.02] mb-4"
            style={{ color: 'hsl(var(--primary-foreground))' }}
          >
            Manage Properties,
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-4xl sm:text-6xl lg:text-8xl font-extrabold tracking-tight leading-[1.02] mb-8"
          >
            <TypeWriter words={words} />
          </motion.div>

          {/* Subtitle with glassmorphism card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-2xl mx-auto mb-14"
          >
            <p
              className="text-base sm:text-lg leading-relaxed px-6 py-4 rounded-2xl border border-primary-foreground/5"
              style={{
                color: 'hsl(var(--primary-foreground) / 0.6)',
                background: 'hsl(var(--primary-foreground) / 0.03)',
                backdropFilter: 'blur(12px)',
              }}
            >
              All-in-one platform for landlords and property managers: leases, rent collection, short-term rentals, concierge services, document generation and AI automation — in any country, language, and currency.
            </p>
          </motion.div>

          {/* CTA Buttons with glow */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20"
          >
            <Link
              to="/signup"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-gold text-accent-foreground font-bold px-10 py-4 rounded-2xl transition-all text-base min-w-[220px] relative overflow-hidden"
              style={{ boxShadow: '0 0 40px hsl(var(--accent) / 0.35), 0 4px 16px hsl(var(--accent) / 0.25)' }}
            >
              <span className="relative z-10 flex items-center gap-2.5">
                Start Free Trial
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 font-semibold px-10 py-4 rounded-2xl transition-all text-base min-w-[220px] border border-primary-foreground/10 hover:border-accent/30 hover:bg-accent/5"
              style={{
                color: 'hsl(var(--primary-foreground) / 0.8)',
                backdropFilter: 'blur(8px)',
                background: 'hsl(var(--primary-foreground) / 0.04)',
              }}
            >
              <LogIn className="h-5 w-5" />
              Login
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 font-semibold px-10 py-4 rounded-2xl transition-all text-base min-w-[220px] border border-primary-foreground/10 hover:border-info/30 hover:bg-info/5"
              style={{
                color: 'hsl(var(--primary-foreground) / 0.8)',
                backdropFilter: 'blur(8px)',
                background: 'hsl(var(--primary-foreground) / 0.04)',
              }}
            >
              <Play className="h-5 w-5" />
              See Demo
            </a>
          </motion.div>

          {/* Trust bar with glassmorphism */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap"
          >
            {[
              { icon: Globe, label: "110+ Countries", glow: "accent" },
              { icon: Shield, label: "GDPR Compliant", glow: "success" },
              { icon: Zap, label: "AI Powered", glow: "warning" },
              { icon: Users, label: "Tenant & Guest Portal", glow: "info" },
            ].map((item) => (
              <motion.div
                key={item.label}
                whileHover={{ scale: 1.05, y: -2 }}
                className="flex items-center gap-2.5 text-sm px-4 py-2 rounded-xl border border-primary-foreground/5"
                style={{
                  color: 'hsl(var(--primary-foreground) / 0.45)',
                  background: 'hsl(var(--primary-foreground) / 0.03)',
                }}
              >
                <item.icon className="h-4 w-4" style={{ color: `hsl(var(--${item.glow}))` }} />
                <span className="font-medium">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      
      {/* Side accent lines */}
      <div className="absolute top-0 left-0 w-px h-full" style={{ background: 'linear-gradient(180deg, transparent 0%, hsl(var(--accent) / 0.15) 50%, transparent 100%)' }} />
      <div className="absolute top-0 right-0 w-px h-full" style={{ background: 'linear-gradient(180deg, transparent 0%, hsl(var(--accent) / 0.15) 50%, transparent 100%)' }} />
    </section>
  );
};

export default Hero;
