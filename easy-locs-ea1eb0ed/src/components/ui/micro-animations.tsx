import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, Heart, Send, Star } from "lucide-react";
import { useState, useEffect } from "react";

interface SuccessAnimationProps {
  show: boolean;
  onComplete?: () => void;
  className?: string;
  icon?: "check" | "heart" | "send" | "star";
  label?: string;
}

const ICON_MAP = {
  check: Check,
  heart: Heart,
  send: Send,
  star: Star,
};

const SuccessAnimation = ({ show, onComplete, className, icon = "check", label }: SuccessAnimationProps) => {
  const Icon = ICON_MAP[icon];

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8, y: -10 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={cn("flex flex-col items-center gap-2", className)}
        >
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 15 }}
            className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center"
          >
            <motion.div
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <Icon className="h-7 w-7 text-success" />
            </motion.div>
          </motion.div>
          {label && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm font-medium text-foreground"
            >
              {label}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface PulseButtonProps {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
  onClick?: () => void;
}

const PulseButton = ({ children, active, className, onClick }: PulseButtonProps) => (
  <motion.button
    onClick={onClick}
    whileTap={{ scale: 0.92 }}
    whileHover={{ scale: 1.02 }}
    className={cn("relative", className)}
  >
    {active && (
      <motion.span
        className="absolute inset-0 rounded-[inherit] bg-accent/20"
        initial={{ scale: 1, opacity: 0.5 }}
        animate={{ scale: 1.15, opacity: 0 }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
    )}
    {children}
  </motion.button>
);

interface FavoriteAnimationProps {
  isFavorite: boolean;
  onToggle: () => void;
  className?: string;
}

const FavoriteAnimation = ({ isFavorite, onToggle, className }: FavoriteAnimationProps) => {
  const [popping, setPopping] = useState(false);

  const handleClick = () => {
    if (!isFavorite) setPopping(true);
    onToggle();
  };

  useEffect(() => {
    if (popping) {
      const t = setTimeout(() => setPopping(false), 400);
      return () => clearTimeout(t);
    }
  }, [popping]);

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.8 }}
      className={cn("relative p-2", className)}
      aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <motion.div
        animate={popping ? { scale: [1, 1.4, 1] } : { scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Heart
          className={cn(
            "h-5 w-5 transition-colors duration-200",
            isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground",
          )}
        />
      </motion.div>
      <AnimatePresence>
        {popping && (
          <>
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <motion.span
                key={deg}
                className="absolute w-1 h-1 rounded-full bg-red-400"
                style={{ top: "50%", left: "50%" }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos((deg * Math.PI) / 180) * 16,
                  y: Math.sin((deg * Math.PI) / 180) * 16,
                  opacity: 0,
                  scale: 0,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

const PageTransition = ({ children, className }: PageTransitionProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.25, ease: "easeOut" }}
    className={className}
  >
    {children}
  </motion.div>
);

export { SuccessAnimation, PulseButton, FavoriteAnimation, PageTransition };
