type CheckoutFinalConversionBarProps = {
  total: number;
  loading?: boolean;
  onSubmit: () => void;
  label?: string;
};

export function CheckoutFinalConversionBar({
  total,
  loading = false,
  onSubmit,
  label = "Place Order",
}: CheckoutFinalConversionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <button
          onClick={onSubmit}
          disabled={loading}
          className="w-full rounded-[22px] bg-primary text-primary-foreground px-5 py-4 shadow-lg active:scale-[0.99] transition-transform disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <div className="text-sm font-bold">{loading ? "Processing..." : label}</div>
              <div className="text-[11px] opacity-80">Secure checkout</div>
            </div>
            <div className="text-sm font-bold">{total.toFixed(2)} AED</div>
          </div>
        </button>
      </div>
    </div>
  );
}
