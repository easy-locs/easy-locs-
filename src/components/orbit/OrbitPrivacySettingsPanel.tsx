type Props = {
  settings: any;
  onPatch: (partial: Record<string, unknown>) => Promise<void>;
};

export function OrbitPrivacySettingsPanel({ settings, onPatch }: Props) {
  if (!settings) return null;

  return (
    <div className="space-y-5 p-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Privacy &amp; Safety</h3>
      </div>

      <div className="space-y-3">
        {/* Read receipts */}
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Read receipts</p>
            <p className="text-xs text-muted-foreground">Show message read state</p>
          </div>
          <button
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent/8 transition-colors"
            onClick={() => onPatch({ read_receipts: !settings.read_receipts })}
          >
            {settings.read_receipts ? "On" : "Off"}
          </button>
        </div>

        {/* Typing indicators */}
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Typing indicators</p>
            <p className="text-xs text-muted-foreground">Show when typing</p>
          </div>
          <button
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent/8 transition-colors"
            onClick={() => onPatch({ typing_indicators: !settings.typing_indicators })}
          >
            {settings.typing_indicators ? "On" : "Off"}
          </button>
        </div>

        {/* Ghost mode */}
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Ghost mode</p>
            <p className="text-xs text-muted-foreground">Reduce visible metadata</p>
          </div>
          <button
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent/8 transition-colors"
            onClick={() => onPatch({ ghost_mode_enabled: !settings.ghost_mode_enabled })}
          >
            {settings.ghost_mode_enabled ? "On" : "Off"}
          </button>
        </div>

        {/* Calls */}
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Calls</p>
            <p className="text-xs text-muted-foreground">Allow voice and video calls</p>
          </div>
          <button
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent/8 transition-colors"
            onClick={() => onPatch({ calls_enabled: !settings.calls_enabled })}
          >
            {settings.calls_enabled ? "On" : "Off"}
          </button>
        </div>

        {/* Camera uploads */}
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Camera uploads</p>
            <p className="text-xs text-muted-foreground">Allow direct camera media sending</p>
          </div>
          <button
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent/8 transition-colors"
            onClick={() => onPatch({ camera_uploads_enabled: !settings.camera_uploads_enabled })}
          >
            {settings.camera_uploads_enabled ? "On" : "Off"}
          </button>
        </div>

        {/* Location sharing */}
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Location sharing</p>
            <p className="text-xs text-muted-foreground">Allow sending live or static location</p>
          </div>
          <button
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent/8 transition-colors"
            onClick={() => onPatch({ location_sharing_enabled: !settings.location_sharing_enabled })}
          >
            {settings.location_sharing_enabled ? "On" : "Off"}
          </button>
        </div>

        {/* Disappearing messages */}
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Default disappearing messages</p>
            <p className="text-xs text-muted-foreground">Default timer for new chats</p>
          </div>
          <select
            value={settings.disappear_default_seconds}
            onChange={(e) => onPatch({ disappear_default_seconds: Number(e.target.value) })}
            className="rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs"
          >
            <option value={0}>Off</option>
            <option value={3600}>1 hour</option>
            <option value={86400}>24 hours</option>
            <option value={604800}>7 days</option>
          </select>
        </div>

        {/* Last seen visibility */}
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Last seen visibility</p>
            <p className="text-xs text-muted-foreground">Control who can see your last seen</p>
          </div>
          <select
            value={settings.last_seen_visibility}
            onChange={(e) => onPatch({ last_seen_visibility: e.target.value })}
            className="rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs"
          >
            <option value="everyone">Everyone</option>
            <option value="contacts">Contacts</option>
            <option value="nobody">Nobody</option>
          </select>
        </div>

        {/* Profile photo visibility */}
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Profile photo visibility</p>
            <p className="text-xs text-muted-foreground">Control who can see your profile picture</p>
          </div>
          <select
            value={settings.profile_photo_visibility}
            onChange={(e) => onPatch({ profile_photo_visibility: e.target.value })}
            className="rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs"
          >
            <option value="everyone">Everyone</option>
            <option value="contacts">Contacts</option>
            <option value="nobody">Nobody</option>
          </select>
        </div>
      </div>
    </div>
  );
}
