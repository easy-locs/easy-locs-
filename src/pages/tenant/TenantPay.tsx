import { useState, useEffect } from "react";
import { CreditCard, Loader2, ExternalLink, Home } from "lucide-react";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TenantPay = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [unpaidCalls, setUnpaidCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, org_id, rent_amount, charges_amount, properties(label)")
        .eq("tenant_user_id", user.id)
        .limit(1)
        .single();
      if (!tenant) { setLoading(false); return; }
      setTenantInfo(tenant);
      const { data } = await supabase
        .from("rent_calls")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("paid", false)
        .order("month", { ascending: false });
      setUnpaidCalls(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handlePay = async (rentCallId: string) => {
    setPayingId(rentCallId);
    try {
      const { data, error } = await supabase.functions.invoke("create-rent-payment", {
        body: { rent_call_id: rentCallId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setPayingId(null);
    }
  };

  const fmt = (n: number) => n?.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }) ?? "—";

  return (
    <TenantLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Payer mon loyer</h1>
        <p className="text-muted-foreground mb-6">Réglez votre loyer en ligne par carte bancaire.</p>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !tenantInfo ? (
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <Home className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun logement lié à votre compte.</p>
          </div>
        ) : unpaidCalls.length === 0 ? (
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <CreditCard className="h-10 w-10 text-success/30 mx-auto mb-3" />
            <p className="text-foreground font-medium">Vous êtes à jour !</p>
            <p className="text-sm text-muted-foreground mt-1">Aucun loyer en attente de paiement.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {unpaidCalls.map((call) => (
              <div key={call.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                  <CreditCard className="h-6 w-6 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{call.month}</p>
                  <p className="text-sm text-muted-foreground">
                    Loyer {fmt(call.rent_amount)} + Charges {fmt(call.charges_amount)}
                  </p>
                  <p className="text-lg font-bold text-foreground mt-1">{fmt(call.total_amount)}</p>
                </div>
                <button
                  onClick={() => handlePay(call.id)}
                  disabled={payingId === call.id}
                  className="flex items-center gap-2 bg-gradient-gold text-accent-foreground font-semibold px-5 py-2.5 rounded-lg shadow-gold hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                >
                  {payingId === call.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  Payer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </TenantLayout>
  );
};

export default TenantPay;
