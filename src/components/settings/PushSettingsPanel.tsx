import { useEffect } from "react";
import { usePushTokenStore } from "@/stores/pushTokenStore";
import { registerPushNotifications } from "@/lib/push/registerPush";

export function PushSettingsPanel() {
  const items = usePushTokenStore((s) => s.items);
  const hydrate = usePushTokenStore((s) => s.hydrate);
  const saveToken = usePushTokenStore((s) => s.saveToken);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="text-lg font-semibold text-foreground mb-3">Push Notifications</h3>

      <button
        className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground hover:bg-accent/80 transition-colors mb-3"
        onClick={async () => {
          const result = await registerPushNotifications();
          if (!result.token) return;
          await saveToken(result.token, result.platform);
        }}
      >
        Register Push
      </button>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded border border-border p-2 space-y-1">
            <p className="text-xs font-medium text-foreground">{item.platform ?? "unknown"}</p>
            <p className="text-xs text-muted-foreground break-all leading-snug">{item.token}</p>
            <p className={`text-xs font-medium ${item.active ? "text-emerald-600" : "text-muted-foreground"}`}>
              {item.active ? "Active" : "Inactive"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
