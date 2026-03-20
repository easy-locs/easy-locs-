export default function SavedPaymentSummaryCard() {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
      <p className="text-sm font-bold text-foreground">Saved Payment Setup</p>
      <p className="text-xs text-muted-foreground">
        Wallet, cash, and card support can be managed from Payment Methods.
      </p>
      <div className="flex items-center gap-2">
        <Chip label="Wallet" active />
        <Chip label="Cash" active />
        <Chip label="Card" />
      </div>
    </div>
  );
}

function Chip({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${
      active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
    }`}>
      {label}
    </span>
  );
}
