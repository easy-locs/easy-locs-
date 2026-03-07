import { motion } from "framer-motion";

interface LandingGlobeProps {
  onError?: () => void;
}

const LandingGlobe = ({ onError }: LandingGlobeProps) => {
  try {
    return (
      <div className="relative w-full h-full">
        <div className="absolute inset-0 rounded-full bg-accent/10 blur-3xl" aria-hidden />

        <motion.div
          className="relative w-full h-full rounded-full border border-primary-foreground/15 overflow-hidden shadow-2xl"
          style={{
            backgroundImage: "url('/textures/earth-map.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, hsl(var(--primary-foreground) / 0.24), transparent 45%), radial-gradient(circle at 70% 70%, hsl(var(--accent) / 0.12), transparent 50%)",
            }}
            aria-hidden
          />
          <div
            className="absolute inset-y-0 w-1/3"
            style={{
              left: "-33%",
              background:
                "linear-gradient(90deg, transparent 0%, hsl(var(--primary-foreground) / 0.16) 50%, transparent 100%)",
              animation: "globeScan 8s linear infinite",
            }}
            aria-hidden
          />
        </motion.div>

        <div
          className="absolute inset-2 rounded-full border border-primary-foreground/10 pointer-events-none"
          aria-hidden
        />

        <style>{`
          @keyframes globeScan {
            0% { transform: translateX(0); }
            100% { transform: translateX(400%); }
          }
        `}</style>
      </div>
    );
  } catch (error) {
    onError?.();
    return null;
  }
};

export default LandingGlobe;

