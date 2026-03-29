import {
  toggleFavoriteContact,
  toggleBlockedContact,
  deleteOrbitContact,
  upsertOrbitContact,
} from "@/lib/orbit/orbit-contacts-service";

type Props = {
  ownerUserId?: string | null;
  items: any[];
  query: string;
  setQuery: (value: string) => void;
  onReload: () => void;
};

export function OrbitContactsDirectoryPanel({
  ownerUserId,
  items,
  query,
  setQuery,
  onReload,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Contacts Directory</h3>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts"
          className="mt-3 w-full rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="space-y-2">
        <button
          className="w-full rounded-xl border border-border px-4 py-2 text-sm text-primary hover:bg-accent/8 transition-colors"
          onClick={async () => {
            if (!ownerUserId) return;
            await upsertOrbitContact({
              ownerUserId,
              displayName: "New Contact",
              source: "manual",
            });
            onReload();
          }}
        >
          Add contact
        </button>

        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground break-words line-clamp-2">
                  {item.display_name || "Unnamed contact"}
                </p>
                <p className="text-xs text-muted-foreground break-words line-clamp-1">
                  {item.email || item.phone || item.peer_orbit_id || ""}
                </p>
              </div>

              <div className="flex gap-1 shrink-0">
                <button
                  className="rounded-lg border border-border px-2 py-1 text-[10px] text-foreground hover:bg-accent/8 transition-colors"
                  onClick={async () => {
                    await toggleFavoriteContact(item.id, !item.is_favorite);
                    onReload();
                  }}
                >
                  {item.is_favorite ? "★" : "☆"}
                </button>

                <button
                  className="rounded-lg border border-border px-2 py-1 text-[10px] text-foreground hover:bg-accent/8 transition-colors"
                  onClick={async () => {
                    await toggleBlockedContact(item.id, !item.is_blocked);
                    onReload();
                  }}
                >
                  {item.is_blocked ? "Unblock" : "Block"}
                </button>

                <button
                  className="rounded-lg border border-destructive/30 px-2 py-1 text-[10px] text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={async () => {
                    await deleteOrbitContact(item.id);
                    onReload();
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">No contacts yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
