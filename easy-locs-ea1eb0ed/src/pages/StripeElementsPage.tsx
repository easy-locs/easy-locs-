import { BackCard } from "@/components/ui/back-card";
import { CreditCard } from "lucide-react";

export default function StripeElementsPage() {
  return (
    <div className="app-mobile-page bg-background p-4 space-y-4 max-w-lg mx-auto">
      <BackCard />
      <div>
        <h1 className="text-xl font-bold text-foreground">Stripe Elements</h1>
        <p className="text-sm text-muted-foreground">Mount real CardElement / PaymentElement here</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CreditCard className="h-5 w-5" />
          <span className="text-sm font-medium">Payment Integration Shell</span>
        </div>
        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
          <li>Fetch clientSecret from create-stripe-intent</li>
          <li>Initialize Stripe Elements provider</li>
          <li>Mount PaymentElement</li>
          <li>Confirm payment on submit</li>
          <li>Mark payment intent as paid</li>
        </ol>
      </div>
    </div>
  );
}
