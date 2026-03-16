/**
 * DriverOnboardingComplete — UUU. Full driver onboarding flow with document verification,
 * training steps, validation, and account activation.
 * PASS95-UUU
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCheck, Upload, FileText, ShieldCheck, CheckCircle2, Clock,
  ChevronRight, AlertTriangle, Camera, Car, CreditCard, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Props {
  onComplete?: () => void;
  className?: string;
}

interface OnboardingData {
  fullName: string;
  phone: string;
  email: string;
  vehicleType: "bicycle" | "scooter" | "car" | "van";
  licensePlate: string;
  idDocUploaded: boolean;
  licenseUploaded: boolean;
  insuranceUploaded: boolean;
  vehiclePhotoUploaded: boolean;
  trainingCompleted: boolean[];
  termsAccepted: boolean;
}

const STEPS = [
  { id: "info", label: "Infos personnelles", icon: UserCheck },
  { id: "docs", label: "Documents", icon: FileText },
  { id: "vehicle", label: "Véhicule", icon: Car },
  { id: "training", label: "Formation", icon: ShieldCheck },
  { id: "activation", label: "Activation", icon: CheckCircle2 },
] as const;

const TRAINING_MODULES = [
  { title: "Règles de sécurité routière", duration: "5 min", description: "Conduite sécurisée et respect du code de la route." },
  { title: "Gestion des colis", duration: "3 min", description: "Manipulation, emballage et protection des marchandises." },
  { title: "Service client", duration: "4 min", description: "Communication professionnelle avec les clients." },
  { title: "Utilisation de l'app", duration: "6 min", description: "Navigation, statuts de mission et preuve de livraison." },
];

export default function DriverOnboardingComplete({ onComplete, className }: Props) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    fullName: "", phone: "", email: "", vehicleType: "car", licensePlate: "",
    idDocUploaded: false, licenseUploaded: false, insuranceUploaded: false,
    vehiclePhotoUploaded: false, trainingCompleted: TRAINING_MODULES.map(() => false),
    termsAccepted: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const canNext = () => {
    if (step === 0) return data.fullName.length > 2 && data.phone.length > 5 && data.email.includes("@");
    if (step === 1) return data.idDocUploaded && data.licenseUploaded && data.insuranceUploaded;
    if (step === 2) return data.vehicleType && data.vehiclePhotoUploaded;
    if (step === 3) return data.trainingCompleted.every(Boolean);
    if (step === 4) return data.termsAccepted;
    return false;
  };

  const simulateUpload = (field: keyof OnboardingData) => {
    haptic("light");
    toast.success("Document téléchargé !");
    setData(p => ({ ...p, [field]: true }));
  };

  const completeTraining = (idx: number) => {
    haptic("light");
    setData(p => {
      const tc = [...p.trainingCompleted];
      tc[idx] = true;
      return { ...p, trainingCompleted: tc };
    });
    toast.success("Module complété !");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    haptic("success");
    await new Promise(r => setTimeout(r, 1500));
    toast.success("🎉 Inscription validée ! Votre compte est en cours de vérification.");
    setSubmitting(false);
    onComplete?.();
  };

  const UploadButton = ({ uploaded, label, field }: { uploaded: boolean; label: string; field: keyof OnboardingData }) => (
    <button
      onClick={() => !uploaded && simulateUpload(field)}
      className="flex items-center gap-3 w-full p-3 rounded-xl transition-all"
      style={{
        background: uploaded ? "hsl(var(--success) / 0.06)" : "hsl(var(--hud-surface))",
        border: `1px solid ${uploaded ? "hsl(var(--success) / 0.2)" : "hsl(var(--hud-border) / 0.1)"}`,
      }}
    >
      {uploaded ? (
        <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "hsl(var(--success))" }} />
      ) : (
        <Upload className="h-5 w-5 shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
      )}
      <span className="text-xs font-medium flex-1 text-left" style={{ color: uploaded ? "hsl(var(--success))" : "hsl(var(--hud-text))" }}>
        {label}
      </span>
      {uploaded && <span className="text-[9px]" style={{ color: "hsl(var(--success) / 0.6)" }}>✓ Envoyé</span>}
    </button>
  );

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Progress */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: done ? "hsl(var(--success) / 0.15)" : active ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-border) / 0.06)",
                    border: `2px solid ${done ? "hsl(var(--success))" : active ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-border) / 0.1)"}`,
                  }}>
                  <Icon className="h-3 w-3" style={{ color: done ? "hsl(var(--success))" : active ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.3)" }} />
                </div>
                <span className="text-[7px] mt-1 font-medium" style={{ color: active ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.3)" }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="h-0.5 w-4 shrink-0 -mt-3" style={{ background: done ? "hsl(var(--success) / 0.4)" : "hsl(var(--hud-border) / 0.08)" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          className="rounded-xl p-4 space-y-3"
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>

          {step === 0 && (
            <>
              <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>👤 Informations personnelles</h3>
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Nom complet *</Label>
                  <Input value={data.fullName} onChange={e => setData(p => ({ ...p, fullName: e.target.value }))}
                    placeholder="Jean Dupont" className="h-9 text-xs mt-1"
                    style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
                </div>
                <div>
                  <Label className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Téléphone *</Label>
                  <Input value={data.phone} onChange={e => setData(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+33 6 12 34 56 78" className="h-9 text-xs mt-1"
                    style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
                </div>
                <div>
                  <Label className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Email *</Label>
                  <Input value={data.email} onChange={e => setData(p => ({ ...p, email: e.target.value }))}
                    type="email" placeholder="jean@email.com" className="h-9 text-xs mt-1"
                    style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>📄 Documents obligatoires</h3>
              <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                Envoyez vos documents pour vérification. Formats acceptés : JPG, PNG, PDF.
              </p>
              <div className="space-y-2">
                <UploadButton uploaded={data.idDocUploaded} label="Pièce d'identité (CNI / Passeport)" field="idDocUploaded" />
                <UploadButton uploaded={data.licenseUploaded} label="Permis de conduire" field="licenseUploaded" />
                <UploadButton uploaded={data.insuranceUploaded} label="Attestation d'assurance" field="insuranceUploaded" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>🚗 Véhicule</h3>
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Type de véhicule</Label>
                  <div className="grid grid-cols-4 gap-1.5 mt-1">
                    {(["bicycle", "scooter", "car", "van"] as const).map(v => (
                      <button key={v} onClick={() => setData(p => ({ ...p, vehicleType: v }))}
                        className="py-2 rounded-lg text-[10px] font-medium transition-all"
                        style={{
                          background: data.vehicleType === v ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-bg))",
                          border: `1px solid ${data.vehicleType === v ? "hsl(var(--hud-cyan) / 0.3)" : "hsl(var(--hud-border) / 0.1)"}`,
                          color: data.vehicleType === v ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
                        }}>
                        {v === "bicycle" ? "🚲 Vélo" : v === "scooter" ? "🛵 Scooter" : v === "car" ? "🚗 Voiture" : "🚐 Van"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Plaque d'immatriculation</Label>
                  <Input value={data.licensePlate} onChange={e => setData(p => ({ ...p, licensePlate: e.target.value }))}
                    placeholder="AB-123-CD" className="h-9 text-xs mt-1"
                    style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
                </div>
                <UploadButton uploaded={data.vehiclePhotoUploaded} label="Photo du véhicule" field="vehiclePhotoUploaded" />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>🎓 Formation obligatoire</h3>
              <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                Complétez tous les modules pour activer votre compte.
              </p>
              <div className="space-y-2">
                {TRAINING_MODULES.map((mod, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: data.trainingCompleted[i] ? "hsl(var(--success) / 0.06)" : "hsl(var(--hud-bg))",
                      border: `1px solid ${data.trainingCompleted[i] ? "hsl(var(--success) / 0.2)" : "hsl(var(--hud-border) / 0.08)"}`,
                    }}>
                    <div className="flex-1">
                      <p className="text-xs font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{mod.title}</p>
                      <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{mod.description}</p>
                      <span className="text-[8px] flex items-center gap-1 mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                        <Clock className="h-2.5 w-2.5" /> {mod.duration}
                      </span>
                    </div>
                    {data.trainingCompleted[i] ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "hsl(var(--success))" }} />
                    ) : (
                      <Button size="sm" className="text-[10px] h-7 px-3" onClick={() => completeTraining(i)}
                        style={{ background: "hsl(var(--hud-cyan) / 0.15)", color: "hsl(var(--hud-cyan))" }}>
                        Commencer
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>✅ Activation du compte</h3>
              <div className="rounded-xl p-4 text-center" style={{ background: "hsl(var(--success) / 0.04)", border: "1px solid hsl(var(--success) / 0.1)" }}>
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2" style={{ color: "hsl(var(--success))" }} />
                <p className="text-xs font-semibold" style={{ color: "hsl(var(--hud-text))" }}>Prêt pour activation !</p>
                <p className="text-[10px] mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                  Vos documents seront vérifiés sous 24-48h. Vous recevrez une notification dès l'activation.
                </p>
              </div>
              <label className="flex items-start gap-2 mt-3 cursor-pointer">
                <input type="checkbox" checked={data.termsAccepted} onChange={e => setData(p => ({ ...p, termsAccepted: e.target.checked }))}
                  className="mt-0.5 accent-[hsl(var(--hud-cyan))]" />
                <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
                  J'accepte les conditions générales d'utilisation et la politique de confidentialité.
                </span>
              </label>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-2">
        {step > 0 && (
          <Button size="sm" variant="outline" className="text-xs h-9" onClick={() => { setStep(s => s - 1); haptic("light"); }}
            style={{ borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text-dim))" }}>
            Retour
          </Button>
        )}
        <Button size="sm" className="flex-1 text-xs h-9" disabled={!canNext() || submitting}
          onClick={() => {
            haptic("medium");
            if (step < STEPS.length - 1) setStep(s => s + 1);
            else handleSubmit();
          }}
          style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
            step === STEPS.length - 1 ? "Soumettre ma candidature" : <>Suivant <ChevronRight className="h-3 w-3 ml-1" /></>}
        </Button>
      </div>
    </div>
  );
}
