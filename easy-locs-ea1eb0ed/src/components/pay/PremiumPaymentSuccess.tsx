import "@/styles/premium-payment-success.css";

type PremiumPaymentSuccessProps = {
  open: boolean;
  logoUrl: string;
  title?: string;
  subtitle?: string;
  amount?: string;
};

export function PremiumPaymentSuccess({
  open,
  logoUrl,
  title = "Payment Confirmed",
  subtitle = "Transaction validated successfully",
  amount,
}: PremiumPaymentSuccessProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[6px]">
      <div className="relative flex w-[320px] flex-col items-center rounded-[28px] border border-white/10 bg-white/95 dark:bg-card/95 px-6 py-8 shadow-2xl">
        {/* outer glow rings */}
        <div className="absolute h-40 w-40 rounded-full bg-emerald-400/20 blur-2xl premium-success-pulse" />
        <div className="absolute h-56 w-56 rounded-full border border-emerald-400/20 premium-success-ring" />

        {/* logo circle */}
        <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full bg-white dark:bg-card shadow-[0_10px_40px_rgba(16,185,129,0.35)]">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-400/30 premium-success-ring" />
          <img
            src={logoUrl}
            alt="Brand logo"
            className="h-16 w-16 rounded-full object-contain"
          />
        </div>

        {/* premium check */}
        <div className="relative z-10 -mt-3 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white dark:border-card bg-emerald-500 shadow-lg premium-success-check">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <div className="relative z-10 mt-4 text-center">
          <div className="text-lg font-semibold text-foreground">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
          {amount ? (
            <div className="mt-3 text-xl font-bold text-emerald-600">{amount}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
