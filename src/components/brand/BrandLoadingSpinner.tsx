/**
 * Brand-aware loading spinner using EL icon with orbit animation.
 */
import { motion } from "framer-motion";
import { EasyLocsIcon } from "./EasyLocsLogo";

interface Props {
  size?: number;
  label?: string;
}

export default function BrandLoadingSpinner({ size = 32, label }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
      >
        <EasyLocsIcon size={size} />
      </motion.div>
      {label && (
        <span className="text-xs text-muted-foreground animate-pulse">{label}</span>
      )}
    </div>
  );
}
