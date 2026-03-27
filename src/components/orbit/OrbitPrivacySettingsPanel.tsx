type Props = {
  settings: any;
  onPatch: (partial: Record<string, unknown>) => Promise<void>;
};

export function OrbitPrivacySettingsPanel({ settings, onPatch }: Props) {
  if (!settings) return null;

  const toggleRow = (label: string, desc: string, key: string, value: boolean) => (
    <div className="flex items-center justify-between rounded-xl border p-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        className={`rounded-lg px-3 py-1 text-xs ${value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
        onClick={() => onPatch({ [key]: !value })}
      >
        {value ? "On" : "Off"}
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Privacy & Safety</h3>
      <div className="space-y-2">
        {toggleRow("Read receipts", "Show message read state", "read_receipts", settings.read_receipts)}
        {toggleRow("Typing indicators", "Show when typing", "typing_indicators", settings.typing_indicators)}
        {toggleRow("Ghost mode", "Hide more metadata", "ghost_mode_enabled", settings.ghost_mode_enabled)}

        <div className="flex items-center justify-between rounded-xl border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Disappearing messages</p>
            <p className="text-xs text-muted-foreground">Default timer for new chats</p>
          </div>
          <select
            value={settings.disappear_default_seconds}
            onChange={(e) => onPatch({ disappear_default_seconds: Number(e.target.value) })}
            className="rounded-lg border px-3 py-2 text-xs bg-background text-foreground"
          >
            <option value={0}>Off</option>
            <option value={3600}>1 hour</option>
            <option value={86400}>24 hours</option>
            <option value={604800}>7 days</option>
          </select>
        </div>
      </div>
    </div>
  );
}
