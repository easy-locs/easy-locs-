import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Shield, Home, Users, ArrowRight, ArrowLeft, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type UserType = "landlord" | "tenant";

const userTypes: { type: UserType; label: string; description: string; icon: typeof Home }[] = [
  { type: "landlord", label: "Bailleur", description: "Gérez vos biens, locataires, finances et documents", icon: Home },
  { type: "tenant", label: "Locataire", description: "Accédez à vos quittances, documents et payez votre loyer", icon: Users },
];

const countries = [
  { code: "FR", name: "France", flag: "🇫🇷", available: true },
  { code: "BE", name: "Belgique", flag: "🇧🇪", available: false },
  { code: "ES", name: "Espagne", flag: "🇪🇸", available: false },
  { code: "IT", name: "Italie", flag: "🇮🇹", available: false },
  { code: "DE", name: "Allemagne", flag: "🇩🇪", available: false },
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFinish = async () => {
    if (!user || !country || !selectedType) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ country, locale: country === "FR" ? "fr" : "en", user_type: selectedType })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      navigate(selectedType === "tenant" ? "/tenant" : "/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-4">
      <div className="absolute top-6 left-6">
        <div className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-gold" />
          <span className="text-xl font-bold text-primary-foreground">Adminia</span>
        </div>
      </div>

      <motion.div
        className="bg-card rounded-2xl shadow-card-hover p-8 sm:p-12 max-w-xl w-full"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex gap-2 mb-8">
          {[0, 1].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-gradient-gold" : "bg-border"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step-0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <h2 className="text-2xl font-bold text-foreground mb-2">Bienvenue sur Adminia</h2>
              <p className="text-muted-foreground mb-8">Vous êtes…</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {userTypes.map((p) => (
                  <button
                    key={p.type} onClick={() => setSelectedType(p.type)}
                    className={`flex items-start gap-4 p-5 rounded-xl border-2 transition-all text-left ${selectedType === p.type ? "border-gold bg-gold/5 shadow-gold/20" : "border-border hover:border-gold/40"}`}
                  >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${selectedType === p.type ? "bg-gradient-gold" : "bg-muted"}`}>
                      <p.icon className={`h-6 w-6 ${selectedType === p.type ? "text-accent-foreground" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{p.label}</div>
                      <div className="text-sm text-muted-foreground mt-1">{p.description}</div>
                    </div>
                  </button>
                ))}
              </div>
              <button disabled={!selectedType} onClick={() => setStep(1)}
                className="mt-8 w-full flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                Continuer <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step-1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <h2 className="text-2xl font-bold text-foreground mb-2">Votre pays</h2>
              <p className="text-muted-foreground mb-8">Sélectionnez votre pays de résidence</p>
              <div className="space-y-3">
                {countries.map((c) => (
                  <button key={c.code} onClick={() => c.available && setCountry(c.code)} disabled={!c.available}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${country === c.code ? "border-gold bg-gold/5" : c.available ? "border-border hover:border-gold/40" : "border-border/50 opacity-50 cursor-not-allowed"}`}>
                    <span className="text-2xl">{c.flag}</span>
                    <div className="flex-1"><span className="font-medium text-foreground">{c.name}</span></div>
                    {!c.available && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Bientôt</span>}
                    {c.available && <MapPin className="h-4 w-4 text-muted-foreground" />}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setStep(0)} className="flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </button>
                <button disabled={!country || saving} onClick={handleFinish}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-gold text-accent-foreground font-semibold py-3 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Commencer <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Onboarding;
