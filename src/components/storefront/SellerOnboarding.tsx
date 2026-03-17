/**
 * SellerOnboarding — PASS127: Guided onboarding flow for new sellers.
 * Auto-detects progress, zero-friction checklist with inline actions.
 * Shows only until onboarding_completed is true.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Rocket, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  onDismiss?: () => void;
}

interface Step {
  key: string;
  label: string;
  hint: string;
  check: (shop: any, counts: any) => boolean;
}

const STEPS: Step[] = [
  { key: "name", label: "Name your shop", hint: "Done ✓", check: (s) => !!s.name },
  { key: "description", label: "Add a description", hint: "Tell buyers what you sell", check: (s) => !!s.description },
  { key: "contact", label: "Add contact info", hint: "Email or phone for buyers", check: (s) => !!s.contact_email || !!s.contact_phone },
  { key: "location", label: "Set your location", hint: "City & country for shipping", check: (s) => !!s.city && !!s.country },
  { key: "catalog", label: "Add your first product", hint: "At least 1 item in catalog", check: (_s, c) => c.items > 0 },
  { key: "visibility", label: "Go live", hint: "Set visibility to public", check: (s) => s.shop_visibility === "public" },
];

export default function SellerOnboarding({ shopId, onDismiss }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["seller-onboarding", shopId],
    queryFn: async () => {
      const [shopRes, itemsRes] = await Promise.all([
        (supabase as any).from("storefront_pages").select("*").eq("id", shopId).single(),
        (supabase as any).from("catalog_items").select("id", { count: "exact", head: true }).eq("shop_id", shopId),
      ]);
      return {
        shop: shopRes.data,
        counts: { items: itemsRes.count || 0 },
      };
    },
  });

  if (isLoading || !data?.shop) return null;
  if (data.shop.onboarding_completed) return null;

  const completedSteps = STEPS.filter(s => s.check(data.shop, data.counts));
  const progress = Math.round((completedSteps.length / STEPS.length) * 100);
  const allDone = completedSteps.length === STEPS.length;

  const dismiss = async () => {
    await (supabase as any).from("storefront_pages")
      .update({ onboarding_completed: true })
      .eq("id", shopId);
    qc.invalidateQueries({ queryKey: ["seller-onboarding", shopId] });
    qc.invalidateQueries({ queryKey: ["my-storefront"] });
    toast.success("🚀 Onboarding complete!");
    onDismiss?.();
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" /> Setup Guide
          </h3>
          {allDone ? (
            <Button size="sm" className="h-7 text-xs gap-1" onClick={dismiss}>
              Complete <CheckCircle2 className="h-3 w-3" />
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={dismiss}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{completedSteps.length}/{STEPS.length} completed</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <div className="space-y-1">
          {STEPS.map(step => {
            const done = step.check(data.shop, data.counts);
            return (
              <div key={step.key} className="flex items-center gap-2 py-1">
                {done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span className={`text-xs ${done ? "text-muted-foreground line-through" : "font-medium"}`}>
                  {step.label}
                </span>
                {!done && <span className="text-[9px] text-muted-foreground ml-auto">{step.hint}</span>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
