import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { activateMerchantProfile } from "@/lib/onboarding/merchant-onboarding";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Edit2, Check, ArrowRight, ArrowLeft, Rocket, Store, Utensils, CreditCard, Zap, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───
interface MerchantData {
  id: string;
  merchant_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  area: string | null;
  cuisine_type: string | null;
  onboarding_status: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  is_available: boolean;
  isNew?: boolean;
}

const STEPS = [
  { label: "Bienvenue", icon: Rocket },
  { label: "Infos", icon: Store },
  { label: "Menu", icon: Utensils },
  { label: "Paiement", icon: CreditCard },
  { label: "Go Live", icon: Zap },
];

export default function MerchantOnboardingPage() {
  const [searchParams] = useSearchParams();
  const profileId = searchParams.get("id");

  const [step, setStep] = useState(0);
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state step 2
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [cuisine, setCuisine] = useState("");

  // Payment step 4
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "wallet">("wallet");
  const [iban, setIban] = useState("");

  // Step 5
  const [isLive, setIsLive] = useState(false);

  // Load merchant + menu
  useEffect(() => {
    if (!profileId) { setLoading(false); return; }
    (async () => {
      const { data: m } = await (supabase as any)
        .from("merchant_onboarding_profiles")
        .select("*")
        .eq("id", profileId)
        .maybeSingle();
      if (m) {
        setMerchant(m);
        setName(m.merchant_name || "");
        setPhone(m.phone || "");
        setAddress(m.area ? `${m.area}, ${m.city || "Dubai"}` : m.city || "");
        setCuisine(m.cuisine_type || "");
        // Resume from saved step
        if (m.onboarding_status === "info_confirmed") setStep(2);
        else if (m.onboarding_status === "menu_confirmed") setStep(3);
        else if (m.onboarding_status === "payment_configured") setStep(4);
        else if (m.onboarding_status === "live") setStep(4);
      }

      const { data: items } = await (supabase as any)
        .from("menu_items")
        .select("id, name, price, is_available")
        .eq("merchant_profile_id", profileId)
        .order("sort_order");
      if (items) setMenuItems(items.map((i: any) => ({ ...i, category: "Menu" })));

      setLoading(false);
    })();
  }, [profileId]);

  // Auto-save merchant info
  const saveInfo = useCallback(async () => {
    if (!profileId) return;
    setSaving(true);
    await (supabase as any)
      .from("merchant_onboarding_profiles")
      .update({
        merchant_name: name,
        phone,
        area: address,
        cuisine_type: cuisine,
        onboarding_status: "info_confirmed",
      })
      .eq("id", profileId);
    setSaving(false);
  }, [profileId, name, phone, address, cuisine]);

  const saveMenuConfirmed = useCallback(async () => {
    if (!profileId) return;
    await (supabase as any)
      .from("merchant_onboarding_profiles")
      .update({ onboarding_status: "menu_confirmed" })
      .eq("id", profileId);
  }, [profileId]);

  const savePayment = useCallback(async () => {
    if (!profileId) return;
    await (supabase as any)
      .from("merchant_onboarding_profiles")
      .update({
        onboarding_status: "payment_configured",
        metadata: { payment_method: paymentMethod, iban: paymentMethod === "bank" ? iban : null },
      })
      .eq("id", profileId);
  }, [profileId, paymentMethod, iban]);

  const goLive = useCallback(async () => {
    if (!profileId) return;
    setSaving(true);
    try {
      await activateMerchantProfile(profileId);
      setIsLive(true);
      toast.success("Votre restaurant est maintenant en ligne ! 🎉");
    } catch {
      toast.error("Erreur lors de l'activation");
    }
    setSaving(false);
  }, [profileId]);

  const next = async () => {
    if (step === 1) await saveInfo();
    if (step === 2) await saveMenuConfirmed();
    if (step === 3) await savePayment();
    if (step === 4) { await goLive(); return; }
    setStep((s) => Math.min(s + 1, 4));
  };

  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const addMenuItem = () => {
    setMenuItems((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, name: "New Item", price: 20, category: "Menu", is_available: true, isNew: true },
    ]);
  };

  const removeMenuItem = (id: string) => {
    setMenuItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateMenuItem = (id: string, field: string, value: any) => {
    setMenuItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  if (!profileId || !merchant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <Store className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-bold">Aucun restaurant sélectionné</h2>
            <p className="text-sm text-muted-foreground">
              Accédez à cette page via le lien d'activation envoyé par Easy-Locs.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPct = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 pt-3 pb-2">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Étape {step + 1} / {STEPS.length}
            </span>
            <button
              onClick={() => toast.info("Progrès sauvegardé. Revenez quand vous voulez.")}
              className="text-xs text-primary hover:underline"
            >
              Continuer plus tard
            </button>
          </div>
          <Progress value={progressPct} className="h-1.5" />
          <div className="flex justify-between mt-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center gap-0.5 ${
                    i <= step ? "text-primary" : "text-muted-foreground/40"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[9px] font-medium hidden sm:block">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && <StepWelcome name={merchant.merchant_name} />}
              {step === 1 && (
                <StepInfo
                  name={name} setName={setName}
                  phone={phone} setPhone={setPhone}
                  address={address} setAddress={setAddress}
                  cuisine={cuisine} setCuisine={setCuisine}
                />
              )}
              {step === 2 && (
                <StepMenu
                  items={menuItems}
                  onAdd={addMenuItem}
                  onRemove={removeMenuItem}
                  onUpdate={updateMenuItem}
                />
              )}
              {step === 3 && (
                <StepPayment
                  method={paymentMethod} setMethod={setPaymentMethod}
                  iban={iban} setIban={setIban}
                />
              )}
              {step === 4 && <StepGoLive isLive={isLive} name={merchant.merchant_name} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex gap-3">
          {step > 0 && !isLive && (
            <Button variant="outline" onClick={prev} className="flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {!isLive && (
            <Button onClick={next} className="flex-1 h-12 text-base font-semibold" disabled={saving}>
              {step === 0 && "Activer mon restaurant"}
              {step === 1 && "Continuer"}
              {step === 2 && "Ça me va ✓"}
              {step === 3 && "Continuer"}
              {step === 4 && (saving ? "Activation…" : "Passer en ligne 🚀")}
              {step < 4 && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step Components ───

function StepWelcome({ name }: { name: string }) {
  return (
    <div className="text-center space-y-6 py-8">
      <div className="text-5xl">🚀</div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Votre restaurant est déjà en ligne !
        </h1>
        <p className="text-muted-foreground mt-2">
          <span className="font-semibold text-foreground">{name}</span> est prêt.
          Confirmez vos détails et commencez à recevoir des commandes.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-4">
        <ValueCard icon="💰" title="0 AED" subtitle="pour rejoindre" />
        <ValueCard icon="📊" title="5%" subtitle="commission" />
        <ValueCard icon="⚡" title="2 min" subtitle="activation" />
      </div>
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-muted-foreground">
        <DollarSign className="h-5 w-5 text-primary inline mr-1" />
        Revenus estimés : <span className="text-foreground font-bold">8 000 — 25 000 AED/mois</span>
      </div>
    </div>
  );
}

function ValueCard({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-sm font-bold text-foreground">{title}</div>
      <div className="text-[10px] text-muted-foreground">{subtitle}</div>
    </div>
  );
}

function StepInfo({
  name, setName, phone, setPhone, address, setAddress, cuisine, setCuisine,
}: {
  name: string; setName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  address: string; setAddress: (v: string) => void;
  cuisine: string; setCuisine: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Informations du restaurant</h2>
        <p className="text-sm text-muted-foreground mt-1">Vérifiez et corrigez si nécessaire</p>
      </div>
      <div className="space-y-3">
        <FieldRow label="Nom du restaurant">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
        </FieldRow>
        <FieldRow label="Téléphone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="h-11" />
        </FieldRow>
        <FieldRow label="Adresse / Quartier">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} className="h-11" />
        </FieldRow>
        <FieldRow label="Type de cuisine">
          <Input value={cuisine} onChange={(e) => setCuisine(e.target.value)} className="h-11" />
        </FieldRow>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      {children}
    </div>
  );
}

function StepMenu({
  items, onAdd, onRemove, onUpdate,
}: {
  items: MenuItem[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: string, value: any) => void;
}) {
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Votre menu</h2>
          <p className="text-sm text-muted-foreground">{items.length} articles • modifiez si besoin</p>
        </div>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
        </Button>
      </div>
      <div className="space-y-2 max-h-[50vh] overflow-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="flex-1 min-w-0">
              {editId === item.id ? (
                <div className="space-y-2">
                  <Input
                    value={item.name}
                    onChange={(e) => onUpdate(item.id, "name", e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    value={item.price}
                    onChange={(e) => onUpdate(item.id, "price", Number(e.target.value))}
                    className="h-8 text-sm w-24"
                  />
                </div>
              ) : (
                <div>
                  <span className="text-sm font-medium text-foreground">{item.name}</span>
                  <span className="text-xs text-primary font-semibold ml-2">{item.price} AED</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setEditId(editId === item.id ? null : item.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              {editId === item.id ? <Check className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
            </button>
            <button onClick={() => onRemove(item.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepPayment({
  method, setMethod, iban, setIban,
}: {
  method: "bank" | "wallet";
  setMethod: (v: "bank" | "wallet") => void;
  iban: string;
  setIban: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Comment recevoir vos paiements ?</h2>
        <p className="text-sm text-muted-foreground mt-1">Choisissez votre méthode préférée</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: "wallet" as const, icon: "💳", label: "Portefeuille", desc: "Retrait instantané" },
          { key: "bank" as const, icon: "🏦", label: "Virement", desc: "Sous 2-3 jours" },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setMethod(opt.key)}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              method === opt.key
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30"
            }`}
          >
            <div className="text-2xl mb-2">{opt.icon}</div>
            <div className="text-sm font-semibold text-foreground">{opt.label}</div>
            <div className="text-[11px] text-muted-foreground">{opt.desc}</div>
          </button>
        ))}
      </div>
      {method === "bank" && (
        <FieldRow label="IBAN">
          <Input
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            placeholder="AE07 0331 0000 0000 0012 345"
            className="h-11"
          />
        </FieldRow>
      )}
      <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground">
        💡 Vous pourrez modifier votre méthode de paiement à tout moment.
      </div>
    </div>
  );
}

function StepGoLive({ isLive, name }: { isLive: boolean; name: string }) {
  if (isLive) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="text-6xl">🎉</div>
        <h1 className="text-2xl font-bold text-foreground">
          {name} est en ligne !
        </h1>
        <p className="text-muted-foreground">
          Vous recevez maintenant des commandes. Bienvenue sur Easy-Locs.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <ValueCard icon="💰" title="0 AED" subtitle="coût d'entrée" />
          <ValueCard icon="📊" title="5%" subtitle="commission" />
          <ValueCard icon="🛵" title="Livraison" subtitle="incluse" />
        </div>
        <p className="text-sm text-primary font-medium">
          Recevez votre première commande aujourd'hui ⚡
        </p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6 py-8">
      <div className="text-5xl">⚡</div>
      <h1 className="text-2xl font-bold text-foreground">Prêt à recevoir des commandes ?</h1>
      <p className="text-muted-foreground">
        Une fois activé, votre restaurant apparaîtra sur le marketplace et pourra recevoir des commandes immédiatement.
      </p>
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="text-sm font-medium text-foreground">
          🎯 Objectif : première commande dans les 24h
        </div>
      </div>
    </div>
  );
}
