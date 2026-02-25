import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Shield, User, Home, Briefcase, Building2, ArrowRight, ArrowLeft, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type ProfileType = "individual" | "landlord" | "freelancer" | "business";

const profiles: { type: ProfileType; label: string; description: string; icon: typeof User }[] = [
  { type: "individual", label: "Particulier", description: "Gérez vos documents personnels", icon: User },
  { type: "landlord", label: "Bailleur", description: "Quittances, baux, gestion locative", icon: Home },
  { type: "freelancer", label: "Freelance", description: "Auto-entrepreneur ou indépendant", icon: Briefcase },
  { type: "business", label: "Entreprise", description: "PME, SAS, SARL…", icon: Building2 },
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
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFinish = async () => {
    if (!user || !country) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ country, locale: country === "FR" ? "fr" : "en" })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
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
              <p className="text-muted-foreground mb-8">Quel est votre profil ?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profiles.map((p) => (
                  <button
                    key={p.type} onClick={() => setProfile(p.type)}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${profile === p.type ? "border-gold bg-gold/5 shadow-gold/20" : "border-border hover:border-gold/40"}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${profile === p.type ? "bg-gradient-gold" : "bg-muted"}`}>
                      <p.icon className={`h-5 w-5 ${profile === p.type ? "text-accent-foreground" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">{p.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{p.description}</div>
                    </div>
                  </button>
                ))}
              </div>
              <button disabled={!profile} onClick={() => setStep(1)}
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
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Accéder au tableau de bord <ArrowRight className="h-4 w-4" /></>}
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
