/**
 * DriverOnboardingPortal — FFF. Driver Onboarding Flow
 * Step-by-step driver registration: identity, documents, training, activation.
 * PASS91-FFF
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Upload, FileCheck, GraduationCap, CheckCircle2, ChevronRight, Shield, Car, CreditCard, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OnboardingStep = "identity" | "documents" | "vehicle" | "training" | "review" | "activated";

interface StepConfig {
  id: OnboardingStep;
  label: string;
  icon: React.ElementType;
  description: string;
}

const STEPS: StepConfig[] = [
  { id: "identity", label: "Identité", icon: UserPlus, description: "Informations personnelles et vérification" },
  { id: "documents", label: "Documents", icon: FileCheck, description: "Pièce d'identité, permis, assurance" },
  { id: "vehicle", label: "Véhicule", icon: Car, description: "Informations et photos du véhicule" },
  { id: "training", label: "Formation", icon: GraduationCap, description: "Modules de formation obligatoires" },
  { id: "review", label: "Vérification", icon: Shield, description: "Validation de votre dossier" },
  { id: "activated", label: "Activation", icon: CheckCircle2, description: "Compte actif, prêt à livrer !" },
];

interface TrainingModule {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  score?: number;
}

const TRAINING_MODULES: TrainingModule[] = [
  { id: "t1", title: "Sécurité routière & conduite responsable", duration: "15 min", completed: true, score: 92 },
  { id: "t2", title: "Manipulation des colis fragiles", duration: "10 min", completed: true, score: 88 },
  { id: "t3", title: "Utilisation de l'application", duration: "8 min", completed: false },
  { id: "t4", title: "Service client & communication", duration: "12 min", completed: false },
  { id: "t5", title: "Protocole de livraison & preuve photo", duration: "7 min", completed: false },
];

export default function DriverOnboardingPortal({ onComplete }: { onComplete?: () => void }) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("identity");
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "", birthDate: "",
    idUploaded: false, licenseUploaded: false, insuranceUploaded: false,
    vehicleType: "car", vehiclePlate: "", vehicleBrand: "",
  });
  const [modules, setModules] = useState(TRAINING_MODULES);

  const currentIdx = STEPS.findIndex(s => s.id === currentStep);
  const progress = Math.round((currentIdx / (STEPS.length - 1)) * 100);

  const toggleModule = (id: string) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, completed: !m.completed, score: !m.completed ? Math.floor(Math.random() * 20 + 80) : undefined } : m));
  };

  const canProceed = () => {
    switch (currentStep) {
      case "identity": return formData.firstName && formData.lastName && formData.phone;
      case "documents": return formData.idUploaded && formData.licenseUploaded && formData.insuranceUploaded;
      case "vehicle": return formData.vehiclePlate && formData.vehicleBrand;
      case "training": return modules.every(m => m.completed);
      case "review": return true;
      default: return false;
    }
  };

  const nextStep = () => {
    const idx = STEPS.findIndex(s => s.id === currentStep);
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1].id);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4" style={{ color: "hsl(var(--success))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Inscription Chauffeur</h3>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-semibold" style={{ color: "hsl(var(--success))" }}>Progression</span>
          <span className="text-[9px] font-bold" style={{ color: "hsl(var(--success))" }}>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--hud-surface))" }}>
          <motion.div className="h-full rounded-full" animate={{ width: `${progress}%` }}
            style={{ background: "hsl(var(--success))" }} />
        </div>
        <div className="flex justify-between">
          {STEPS.map((s, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <div key={s.id} className="flex flex-col items-center gap-0.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                  style={{
                    background: done ? "hsl(var(--success))" : active ? "hsl(var(--success) / 0.15)" : "hsl(var(--hud-surface))",
                    color: done ? "#fff" : active ? "hsl(var(--success))" : "hsl(var(--hud-text-dim) / 0.3)",
                    border: `1px solid ${active ? "hsl(var(--success) / 0.3)" : "transparent"}`,
                  }}>
                  {done ? "✓" : i + 1}
                </div>
                <span className="text-[7px]" style={{ color: active ? "hsl(var(--success))" : "hsl(var(--hud-text-dim) / 0.3)" }}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          className="rounded-xl p-4 space-y-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>

          {currentStep === "identity" && (
            <>
              <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>👤 Informations personnelles</p>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Prénom *" value={formData.firstName} onChange={e => setFormData(p => ({ ...p, firstName: e.target.value }))}
                  className="h-8 text-[10px]" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
                <Input placeholder="Nom *" value={formData.lastName} onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))}
                  className="h-8 text-[10px]" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
              </div>
              <Input placeholder="Email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                className="h-8 text-[10px]" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
              <Input placeholder="Téléphone *" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                className="h-8 text-[10px]" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
              <Input type="date" value={formData.birthDate} onChange={e => setFormData(p => ({ ...p, birthDate: e.target.value }))}
                className="h-8 text-[10px]" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
            </>
          )}

          {currentStep === "documents" && (
            <>
              <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>📄 Documents requis</p>
              {[
                { key: "idUploaded" as const, label: "Pièce d'identité (CNI / Passeport)", icon: "🪪" },
                { key: "licenseUploaded" as const, label: "Permis de conduire", icon: "🚗" },
                { key: "insuranceUploaded" as const, label: "Attestation d'assurance", icon: "🛡️" },
              ].map(doc => (
                <button key={doc.key} onClick={() => setFormData(p => ({ ...p, [doc.key]: !p[doc.key] }))}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all"
                  style={{
                    background: formData[doc.key] ? "hsl(var(--success) / 0.06)" : "hsl(var(--hud-bg))",
                    border: `1px solid ${formData[doc.key] ? "hsl(var(--success) / 0.2)" : "hsl(var(--hud-border) / 0.1)"}`,
                  }}>
                  <span className="text-lg">{doc.icon}</span>
                  <div className="flex-1 text-left">
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{doc.label}</p>
                    <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                      {formData[doc.key] ? "✅ Document ajouté" : "Cliquez pour uploader"}
                    </p>
                  </div>
                  {formData[doc.key] ? (
                    <CheckCircle2 className="h-4 w-4" style={{ color: "hsl(var(--success))" }} />
                  ) : (
                    <Upload className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
                  )}
                </button>
              ))}
            </>
          )}

          {currentStep === "vehicle" && (
            <>
              <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>🚗 Véhicule</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { type: "bike", label: "🚲 Vélo", desc: "Urbain" },
                  { type: "scooter", label: "🛵 Scooter", desc: "Rapide" },
                  { type: "car", label: "🚗 Voiture", desc: "Standard" },
                ].map(v => (
                  <button key={v.type} onClick={() => setFormData(p => ({ ...p, vehicleType: v.type }))}
                    className="py-3 rounded-xl text-center transition-all"
                    style={{
                      background: formData.vehicleType === v.type ? "hsl(var(--success) / 0.1)" : "hsl(var(--hud-bg))",
                      border: `1px solid ${formData.vehicleType === v.type ? "hsl(var(--success) / 0.25)" : "hsl(var(--hud-border) / 0.08)"}`,
                    }}>
                    <p className="text-lg">{v.label.split(" ")[0]}</p>
                    <p className="text-[9px] font-semibold mt-1" style={{ color: formData.vehicleType === v.type ? "hsl(var(--success))" : "hsl(var(--hud-text))" }}>{v.label.split(" ")[1]}</p>
                  </button>
                ))}
              </div>
              <Input placeholder="Immatriculation *" value={formData.vehiclePlate} onChange={e => setFormData(p => ({ ...p, vehiclePlate: e.target.value }))}
                className="h-8 text-[10px]" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
              <Input placeholder="Marque / Modèle *" value={formData.vehicleBrand} onChange={e => setFormData(p => ({ ...p, vehicleBrand: e.target.value }))}
                className="h-8 text-[10px]" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
            </>
          )}

          {currentStep === "training" && (
            <>
              <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>🎓 Modules de formation</p>
              <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                Complétez tous les modules pour continuer ({modules.filter(m => m.completed).length}/{modules.length})
              </p>
              {modules.map(m => (
                <button key={m.id} onClick={() => toggleModule(m.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    background: m.completed ? "hsl(var(--success) / 0.06)" : "hsl(var(--hud-bg))",
                    border: `1px solid ${m.completed ? "hsl(var(--success) / 0.15)" : "hsl(var(--hud-border) / 0.08)"}`,
                  }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
                    style={{
                      background: m.completed ? "hsl(var(--success))" : "hsl(var(--hud-surface))",
                      color: m.completed ? "#fff" : "hsl(var(--hud-text-dim) / 0.4)",
                    }}>
                    {m.completed ? "✓" : "▶"}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{m.title}</p>
                    <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                      ⏱ {m.duration} {m.score ? `• Score: ${m.score}%` : ""}
                    </p>
                  </div>
                </button>
              ))}
            </>
          )}

          {currentStep === "review" && (
            <div className="text-center py-4 space-y-3">
              <Shield className="h-10 w-10 mx-auto" style={{ color: "hsl(var(--info))" }} />
              <p className="text-[11px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>Dossier en cours de vérification</p>
              <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                Notre équipe vérifie vos documents et informations. Délai estimé : 24-48h.
              </p>
              <div className="space-y-1.5">
                {["Identité vérifiée ✅", "Permis vérifié ✅", "Assurance vérifiée ✅", "Background check ⏳"].map(item => (
                  <p key={item} className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>{item}</p>
                ))}
              </div>
            </div>
          )}

          {currentStep === "activated" && (
            <div className="text-center py-6 space-y-3">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                <CheckCircle2 className="h-14 w-14 mx-auto" style={{ color: "hsl(var(--success))" }} />
              </motion.div>
              <p className="text-sm font-bold" style={{ color: "hsl(var(--success))" }}>Bienvenue dans l'équipe ! 🎉</p>
              <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                Votre compte chauffeur est activé. Vous pouvez maintenant recevoir des missions.
              </p>
              {onComplete && (
                <Button size="sm" className="text-xs h-9 mt-2" onClick={onComplete}
                  style={{ background: "hsl(var(--success))", color: "#fff" }}>
                  Commencer à livrer 🚀
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {currentStep !== "activated" && (
        <Button size="sm" className="w-full text-xs h-9" onClick={nextStep} disabled={!canProceed()}
          style={{
            background: canProceed() ? "hsl(var(--success))" : "hsl(var(--hud-surface))",
            color: canProceed() ? "#fff" : "hsl(var(--hud-text-dim) / 0.3)",
          }}>
          {currentStep === "review" ? "Activer mon compte" : "Continuer"} <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      )}
    </div>
  );
}
