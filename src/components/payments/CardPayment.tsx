import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface CardPaymentProps {
  amount: number;
  currency?: string;
  orderId?: string;
  onSuccess: () => void;
}

export default function CardPayment({ amount, currency = "AED", orderId, onSuccess }: CardPaymentProps) {
  const [loading, setLoading] = useState(false);

  const pay = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-stripe-intent", {
        body: { amount, currency: currency.toLowerCase(), orderId },
      });

      if (error) throw error;

      const { clientSecret } = data;
      if (!clientSecret) throw new Error("No client secret returned");

      // TODO: Mount Stripe Elements for card collection
      // For now, log the intent and simulate success
      console.log("[Stripe] Payment Intent created:", clientSecret);
      toast.success("Payment intent created — Stripe Elements integration pending");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={pay}
      disabled={loading}
      className="w-full rounded-xl"
      variant="default"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <CreditCard className="h-4 w-4 mr-2" />
      )}
      Pay {amount} {currency}
    </Button>
  );
}
