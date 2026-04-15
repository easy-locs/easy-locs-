import { motion } from "framer-motion";
import { RadarSvg } from "./EasyLocsLogo";

interface PageLoaderProps {
  dark?: boolean;
}

export default function PageLoader({ dark }: PageLoaderProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 ${
        dark ? "bg-[hsl(var(--brand-navy-deep))]" : "bg-background"
      }`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <RadarSvg
          size={36}
          animate
          gradientColors={["hsl(var(--brand-primary))", "hsl(var(--brand-primary-dark))"]}
        />
      </motion.div>
    </div>
  );
}
