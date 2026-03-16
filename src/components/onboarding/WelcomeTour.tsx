/**
 * WelcomeTour — First-visit overlay with quick tips for new dashboard users.
 * Shows once per user, then stores dismissal in localStorage.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Building, MessageSquare, FileText, Wallet, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface TourStep {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    icon: Building,
    title: "Gérez vos biens",
    description: "Ajoutez vos propriétés, suivez les loyers et générez des documents automatiquement.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: MessageSquare,
    title: "Communiquez facilement",
    description: "Orbit centralise tous vos échanges : messages, appels, notifications en temps réel.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: FileText,
    title: "Documents intelligents",
    description: "Baux, quittances, états des lieux — générés et signés électroniquement.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Wallet,
    title: "Wallet intégré",
    description: "Transférez des fonds, suivez vos finances et gérez les paiements en toute sécurité.",
    color: "from-emerald-500 to-green-500",
  },
];

const WelcomeTour = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    const key = `easylocs_welcome_tour_${user.id}`;
    if (!localStorage.getItem(key)) {
      // Delay appearance for smoother UX
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(`easylocs_welcome_tour_${user.id}`, "done");
    }
    setVisible(false);
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      handleDismiss();
    }
  };

  if (!visible) return null;

  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon;
  const isLast = currentStep === TOUR_STEPS.length - 1;

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
          {/* Hero area */}
          <div className={`bg-gradient-to-br ${step.color} p-8 text-center relative`}>
            <button onClick={handleDismiss} className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              <X className="h-4 w-4 text-white" />
            </button>
            <motion.div
              key={currentStep}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4"
            >
              <StepIcon className="h-8 w-8 text-white" />
            </motion.div>
            <motion.h2
              key={`t-${currentStep}`}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="text-xl font-bold text-white mb-1"
            >
              {step.title}
            </motion.h2>
          </div>

          {/* Content */}
          <div className="p-6">
            <motion.p
              key={`d-${currentStep}`}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground text-sm text-center mb-6"
            >
              {step.description}
            </motion.p>

            {/* Dots */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentStep ? "w-6 bg-accent" : "w-2 bg-muted"
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleDismiss}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Passer
              </button>
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
