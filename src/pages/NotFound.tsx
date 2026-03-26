import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Search } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="app-mobile-page flex items-center justify-center p-4 relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      <SEOHead title="Page Not Found — Easy-Locs" description="The page you're looking for doesn't exist." noindex />

      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, hsl(var(--accent)) 0%, transparent 65%)" }}
        />
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `linear-gradient(hsl(var(--accent) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.3) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 180 }}
        className="text-center relative z-10 max-w-md"
      >
        {/* 404 number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="mb-6"
        >
          <span
            className="text-8xl sm:text-9xl font-black tracking-tighter"
            style={{
              background: "var(--gradient-gold)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            404
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3 mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "hsl(var(--primary-foreground))" }}>
            Page not found
          </h1>
          <p className="text-sm sm:text-base leading-relaxed" style={{ color: "hsl(var(--primary-foreground) / 0.6)" }}>
            The page you're looking for doesn't exist or has been moved.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              to="/"
              className="group inline-flex items-center justify-center gap-2 h-12 px-8 rounded-xl text-sm font-bold transition-all relative overflow-hidden"
              style={{
                background: "var(--gradient-gold)",
                color: "hsl(var(--accent-foreground))",
                boxShadow: "0 0 20px hsl(var(--accent) / 0.25)",
              }}
            >
              <Home className="h-4 w-4" />
              Back to Home
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </Link>
          </motion.div>

          <Link
            to="/radar"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl text-sm font-semibold border transition-colors"
            style={{
              borderColor: "hsl(var(--primary-foreground) / 0.12)",
              color: "hsl(var(--primary-foreground) / 0.7)",
            }}
          >
            <Search className="h-4 w-4" />
            Radar
          </Link>
        </motion.div>

        {/* Attempted path */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-xs font-mono px-3 py-1.5 rounded-lg inline-block"
          style={{
            color: "hsl(var(--primary-foreground) / 0.35)",
            background: "hsl(var(--primary-foreground) / 0.04)",
          }}
        >
          {location.pathname}
        </motion.p>
      </motion.div>
    </div>
  );
};

export default NotFound;
