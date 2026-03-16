/**
 * DriverOnboardingRegistration — JJJ. Driver Onboarding Flow.
 * Full registration: identity verification, document upload, training quiz, admin validation.
 * PASS99-JJJ
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCheck, Upload, FileCheck, GraduationCap, Shield,
  CheckCircle2, Clock, AlertTriangle, ChevronRight, Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

type Step = "identity" | "documents" | "quiz" | "validation";

interface DriverForm {
  fullName: string;
  phone: string;
  email: string;
  vehicleType: string;
  licensePlate: string;
  idUploaded: boolean;
  licenseUploaded: boolean;
  insuranceUploaded: boolean;
  vehiclePhotoUploaded: boolean;
  quizScore: number | null;
  status: "pending" | "approved" | "rejected";
}

const QUIZ_QUESTIONS = [
  { q: "Que faire si le client est absent à la livraison ?", options: ["Laisser le colis devant la porte", "Contacter le client et attendre 5min", "Retourner le colis immédiatement", "Livrer au voisin"], correct: 1 },
  { q: "Quel est le délai maximum pour une livraison express ?", options: ["1 heure", "2 heures", "30 minutes", "4 heures"], correct: 1 },
  { q: "En cas d'accident, que faire en premier ?", options: ["Continuer la livraison", "Appeler le support + signaler", "Prendre une photo et partir", "Ignorer si pas de dégâts"], correct: 1 },
  { q: "Comment vérifier l'identité du destinataire ?", options: ["Demander le nom", "Code de confirmation + pièce d'identité", "Pas besoin", "Photo du client"], correct: 1 },
];

export default function DriverOnboardingRegistration({ onComplete, className }: { onComplete?: () => void; className?: string }) {
  const [step, setStep] = useState<Step>("identity");
  const [form, setForm] = useState<DriverForm>({
    fullName: "", phone: "", email: "", vehicleType: "moto", licensePlate: "",
    idUploaded: false, licenseUploaded: false, insuranceUploaded: false, vehiclePhotoUploaded: false,
    quizScore: null, status: "pending",
  });
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>(new Array(QUIZ_QUESTIONS.length).fill(null));
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const steps: { key: Step; label: string; icon: typeof UserCheck }[] = [
    { key: "identity", label: "Identité", icon: UserCheck },
    { key: "documents", label: "Documents", icon: FileCheck },
    { key: "quiz", label: "Formation", icon: GraduationCap },
    { key: "validation", label: "Validation", icon: Shield },
  ];

  const stepIndex = steps.findIndex(s => s.key === step);

  const simulateUpload = (field: keyof DriverForm) => {
    haptic("medium");
    toast.loading("Upload en cours...");
    setTimeout(() => {
      setForm(p => ({ ...p, [field]: true }));
      toast.dismiss();
      toast.success("✅ Document uploadé");
    }, 1200);
  };

  const submitQuiz = () => {
    haptic("medium");
    const score = quizAnswers.reduce((s, a, i) => s + (a === QUIZ_QUESTIONS[i].correct ? 1 : 0), 0);
    const pct = Math.round((score / QUIZ_QUESTIONS.length) * 100);
    setForm(p => ({ ...p, quizScore: pct }));
    setQuizSubmitted(true);
    if (pct >= 75) {
      toast.success(`✅ Quiz réussi : ${pct}%`);
    } else {
      toast.error(`❌ Score insuffisant : ${pct}% (minimum 75%)`);
    }
  };

  const submitApplication = () => {
    haptic("success");
    setForm(p => ({ ...p, status: "pending" }));
    toast.success("🚀 Candidature soumise ! En attente de validation admin.");
    onComplete?.();
  };

  const canProceedIdentity = form.fullName && form.phone && form.vehicleType;
  const canProceedDocs = form.idUploaded && form.licenseUploaded;
  const canProceedQuiz = form.quizScore !== null && form.quizScore >= 75;

  return (
    <div className={`space-y-3 ${className || ""}`}>
      {/* Header */}
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
        <UserCheck className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
        Inscription livreur
      </h3>

      {/* Progress */}
      <div className="flex items-center gap-1">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === stepIndex;
          const isDone = i < stepIndex;
          return (
            <div key={s.key} className="flex items-center flex-1">
              <div className="flex items-center gap-1.5 flex-1">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: isDone ? "hsl(var(--success) / 0.15)" : isActive ? "hsl(var(--primary) / 0.15)" : "hsl(var(--muted) / 0.3)",
                  }}>
                  {isDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "hsl(var(--success))" }} />
                  ) : (
                    <Icon className="h-3.5 w-3.5" style={{ color: isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
                  )}
                </div>
                <span className="text-[8px] font-semibold hidden sm:block"
                  style={{ color: isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="h-0.5 flex-1 mx-1 rounded-full"
                  style={{ background: isDone ? "hsl(var(--success) / 0.3)" : "hsl(var(--muted) / 0.3)" }} />
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Identity */}
        {step === "identity" && (
          <motion.div key="identity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="rounded-xl p-4 space-y-3" style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.15)" }}>
            <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>Informations personnelles</p>
            <Input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
              placeholder="Nom complet" className="h-9 text-xs"
              style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)", color: "hsl(var(--foreground))" }} />
            <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="Téléphone (+221...)" className="h-9 text-xs"
              style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)", color: "hsl(var(--foreground))" }} />
            <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="Email (optionnel)" className="h-9 text-xs"
              style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)", color: "hsl(var(--foreground))" }} />
            <div className="flex gap-2">
              {["moto", "vélo", "voiture", "camionnette"].map(v => (
                <button key={v} onClick={() => setForm(p => ({ ...p, vehicleType: v }))}
                  className="flex-1 py-2 rounded-lg text-[9px] font-semibold"
                  style={{
                    background: form.vehicleType === v ? "hsl(var(--primary) / 0.1)" : "hsl(var(--muted) / 0.3)",
                    color: form.vehicleType === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                    border: `1px solid ${form.vehicleType === v ? "hsl(var(--primary) / 0.2)" : "transparent"}`,
                  }}>
                  {v === "moto" ? "🏍️" : v === "vélo" ? "🚲" : v === "voiture" ? "🚗" : "🚐"} {v}
                </button>
              ))}
            </div>
            <Input value={form.licensePlate} onChange={e => setForm(p => ({ ...p, licensePlate: e.target.value }))}
              placeholder="Plaque d'immatriculation" className="h-9 text-xs"
              style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.15)", color: "hsl(var(--foreground))" }} />
            <Button className="w-full text-xs h-9" disabled={!canProceedIdentity}
              onClick={() => { setStep("documents"); haptic("light"); }}
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
              Continuer <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Step 2: Documents */}
        {step === "documents" && (
          <motion.div key="documents" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="rounded-xl p-4 space-y-3" style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.15)" }}>
            <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>Documents requis</p>
            {[
              { key: "idUploaded" as const, label: "Pièce d'identité (CNI/Passeport)", required: true },
              { key: "licenseUploaded" as const, label: "Permis de conduire", required: true },
              { key: "insuranceUploaded" as const, label: "Assurance véhicule", required: false },
              { key: "vehiclePhotoUploaded" as const, label: "Photo du véhicule", required: false },
            ].map(doc => (
              <div key={doc.key} className="flex items-center gap-3 p-2.5 rounded-lg"
                style={{ background: "hsl(var(--muted) / 0.15)", border: "1px solid hsl(var(--border) / 0.08)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: form[doc.key] ? "hsl(var(--success) / 0.1)" : "hsl(var(--muted) / 0.3)" }}>
                  {form[doc.key] ? (
                    <CheckCircle2 className="h-4 w-4" style={{ color: "hsl(var(--success))" }} />
                  ) : (
                    <Upload className="h-4 w-4" style={{ color: "hsl(var(--muted-foreground))" }} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                    {doc.label} {doc.required && <span style={{ color: "hsl(var(--destructive))" }}>*</span>}
                  </p>
                  <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {form[doc.key] ? "✅ Uploadé" : "En attente"}
                  </p>
                </div>
                {!form[doc.key] && (
                  <Button size="sm" className="text-[9px] h-7" onClick={() => simulateUpload(doc.key)}
                    style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
                    <Camera className="h-3 w-3 mr-1" /> Upload
                  </Button>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs h-9" onClick={() => setStep("identity")}
                style={{ borderColor: "hsl(var(--border) / 0.2)", color: "hsl(var(--muted-foreground))" }}>
                Retour
              </Button>
              <Button className="flex-1 text-xs h-9" disabled={!canProceedDocs}
                onClick={() => { setStep("quiz"); haptic("light"); }}
                style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                Continuer <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Quiz */}
        {step === "quiz" && (
          <motion.div key="quiz" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="rounded-xl p-4 space-y-3" style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.15)" }}>
            <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>Quiz de formation (min. 75%)</p>
            {QUIZ_QUESTIONS.map((q, qi) => (
              <div key={qi} className="space-y-1.5">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{qi + 1}. {q.q}</p>
                <div className="grid grid-cols-2 gap-1">
                  {q.options.map((opt, oi) => (
                    <button key={oi} onClick={() => { if (!quizSubmitted) { const a = [...quizAnswers]; a[qi] = oi; setQuizAnswers(a); } }}
                      className="py-1.5 px-2 rounded-lg text-[9px] text-left"
                      style={{
                        background: quizAnswers[qi] === oi
                          ? (quizSubmitted ? (oi === q.correct ? "hsl(var(--success) / 0.15)" : "hsl(var(--destructive) / 0.15)") : "hsl(var(--primary) / 0.1)")
                          : "hsl(var(--muted) / 0.3)",
                        color: quizAnswers[qi] === oi
                          ? (quizSubmitted ? (oi === q.correct ? "hsl(var(--success))" : "hsl(var(--destructive))") : "hsl(var(--primary))")
                          : "hsl(var(--muted-foreground))",
                        border: `1px solid ${quizAnswers[qi] === oi ? "hsl(var(--primary) / 0.2)" : "transparent"}`,
                      }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {form.quizScore !== null && (
              <div className="text-center py-2">
                <p className="text-sm font-bold" style={{ color: form.quizScore >= 75 ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
                  Score : {form.quizScore}%
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs h-9" onClick={() => setStep("documents")}
                style={{ borderColor: "hsl(var(--border) / 0.2)", color: "hsl(var(--muted-foreground))" }}>
                Retour
              </Button>
              {!quizSubmitted ? (
                <Button className="flex-1 text-xs h-9" onClick={submitQuiz}
                  disabled={quizAnswers.some(a => a === null)}
                  style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                  Valider le quiz
                </Button>
              ) : canProceedQuiz ? (
                <Button className="flex-1 text-xs h-9" onClick={() => { setStep("validation"); haptic("light"); }}
                  style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                  Continuer <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              ) : (
                <Button className="flex-1 text-xs h-9" onClick={() => { setQuizSubmitted(false); setQuizAnswers(new Array(QUIZ_QUESTIONS.length).fill(null)); setForm(p => ({ ...p, quizScore: null })); }}
                  style={{ background: "hsl(var(--warning))", color: "hsl(var(--warning-foreground))" }}>
                  Recommencer
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 4: Validation */}
        {step === "validation" && (
          <motion.div key="validation" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="rounded-xl p-4 space-y-4 text-center" style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.15)" }}>
            <Shield className="h-10 w-10 mx-auto" style={{ color: "hsl(var(--primary))" }} />
            <div>
              <p className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>Récapitulatif</p>
              <p className="text-[10px] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Vérifiez vos informations avant soumission</p>
            </div>
            <div className="space-y-2 text-left">
              {[
                { label: "Nom", value: form.fullName },
                { label: "Téléphone", value: form.phone },
                { label: "Véhicule", value: form.vehicleType },
                { label: "Plaque", value: form.licensePlate || "—" },
                { label: "Documents", value: `${[form.idUploaded, form.licenseUploaded, form.insuranceUploaded, form.vehiclePhotoUploaded].filter(Boolean).length}/4` },
                { label: "Quiz", value: `${form.quizScore}%` },
              ].map(item => (
                <div key={item.label} className="flex justify-between py-1.5 border-b"
                  style={{ borderColor: "hsl(var(--border) / 0.08)" }}>
                  <span className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>{item.label}</span>
                  <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{item.value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs h-9" onClick={() => setStep("quiz")}
                style={{ borderColor: "hsl(var(--border) / 0.2)", color: "hsl(var(--muted-foreground))" }}>
                Retour
              </Button>
              <Button className="flex-1 text-xs h-9" onClick={submitApplication}
                style={{ background: "hsl(var(--success))", color: "#fff" }}>
                🚀 Soumettre ma candidature
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
