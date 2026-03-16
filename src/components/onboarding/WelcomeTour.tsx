/**
 * WelcomeTour — First-visit overlay with quick tips for new dashboard users.
 * Shows once per user, then stores dismissal in localStorage.
 * Enhanced with swipe gestures, keyboard nav, and blur-to-sharp animation.
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { X, Building, MessageSquare, FileText, Wallet, ArrowRight, Sparkles, ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface TourStep {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  tip: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    icon: Building,
    title: "Gérez vos biens",
    description: "Ajoutez vos propriétés, suivez les loyers et générez des documents automatiquement.",
    color: "from-blue-500 to-cyan-500",
    tip: "💡 Commencez par ajouter votre premier bien",
  },
  {
    icon: MessageSquare,
    title: "Communiquez facilement",
    description: "Orbit centralise tous vos échanges : messages, appels, notifications en temps réel.",
    color: "from-violet-500 to-purple-500",
    tip: "💡 Messages chiffrés de bout en bout",
  },
  {
    icon: FileText,
    title: "Documents intelligents",
    description: "Baux, quittances, états des lieux — générés et signés électroniquement.",
    color: "from-amber-500 to-orange-500",
    tip: "💡 Conforme aux réglementations locales",
  },
  {
    icon: Wallet,
    title: "Wallet intégré",
    description: "Transférez des fonds, suivez vos finances et gérez les paiements en toute sécurité.",
    color: "from-emerald-500 to-green-500",
    tip: "💡 Compatible Stripe, SEPA & virement",
  },
];

const SWIPE_THRESHOLD = 50;

const WelcomeTour = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const dragX = useMotionValue(0);
  const dragOpacity = useTransform(dragX, [-100, 0, 100], [0.5, 1, 0.5]);

  useEffect(() => {
    if (!user) return;
    const key = `easylocs_welcome_tour_${user.id}`;
    if (!localStorage.getItem(key)) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, currentStep]);

  const handleDismiss = useCallback(() => {
    if (user) localStorage.setItem(`easylocs_welcome_tour_${user.id}`, "done");
    setVisible(false);
  }, [user]);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setDirection(1);
      setCurrentStep(s => s + 1);
    } else {
      handleDismiss();
    }
  }, [currentStep, handleDismiss]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(s => s - 1);
    }
  }, [currentStep]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) handleNext();
    else if (info.offset.x > SWIPE_THRESHOLD) handlePrev();
  };

  if (!visible) return null;

  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon;
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const isFirst = currentStep === 0;

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0, filter: "blur(4px)" }),
    center: { x: 0, opacity: 1, filter: "blur(0px)" },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0, filter: "blur(4px)" }),
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-card rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Hero area with drag */}
          <motion.div
            className={`bg-gradient-to-br ${step.color} p-8 text-center relative cursor-grab active:cursor-grabbing`}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            style={{ x: dragX, opacity: dragOpacity }}
            onDragEnd={handleDragEnd}
            dragElastic={0.2}
          >
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              aria-label="Fermer le tour"
            >
              <X className="h-4 w-4 text-white" />
            </button>

            {/* Step counter */}
            <span className="absolute top-3.5 left-4 text-xs font-medium text-white/70">
              {currentStep + 1}/{TOUR_STEPS.length}
            </span>

            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
                  <StepIcon className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">{step.title}</h2>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={`content-${currentStep}`}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-muted-foreground text-sm text-center mb-3">
                  {step.description}
                </p>
                <p className="text-xs text-center text-accent font-medium mb-5">
                  {step.tip}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {TOUR_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setDirection(i > currentStep ? 1 : -1); setCurrentStep(i); }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentStep ? "w-6 bg-accent" : "w-2 bg-muted hover:bg-muted-foreground/30"
                  }`}
                  aria-label={`Étape ${i + 1}`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {!isFirst ? (
                <button
                  onClick={handlePrev}
                  className="flex items-center justify-center gap-1 flex-1 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Précédent
                </button>
              ) : (
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Passer
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-gold text-accent-foreground text-sm font-semibold shadow-gold hover:opacity-90 transition-opacity"
              >
                {isLast ? (
                  <>
                    <Sparkles className="h-4 w-4" /> C'est parti !
                  </>
                ) : (
                  <>
                    Suivant <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WelcomeTour;
