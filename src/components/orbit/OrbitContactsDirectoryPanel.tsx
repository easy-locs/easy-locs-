import { addOrbitContact, toggleFavoriteContact, blockContact } from "@/lib/orbit/orbit-contacts-service";

type Props = {
  ownerUserId?: string | null;
  items: any[];
  query: string;
  setQuery: (v: string) => void;
  onReload: () => void;
};

export function OrbitContactsDirectoryPanel({ ownerUserId, items, query, setQuery, onReload }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Contacts</h3>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts"
          className="mt-3 w-full rounded-xl border px-3 py-2 text-sm bg-background text-foreground"
        />
      </div>

      <div className="space-y-2">
        <button
          className="w-full rounded-xl border px-4 py-2 text-sm text-primary"
          onClick={async () => {
            if (!ownerUserId) return;
            await addOrbitContact({ ownerUserId, displayName: "New Contact", source: "manual" });
            onReload();
          }}
        >
          Add contact
        </button>

        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{item.display_name || "Unnamed contact"}</p>
                <p className="text-xs text-muted-foreground truncate">{item.email || item.phone || item.peer_orbit_id || ""}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  className="rounded-lg border px-2 py-1 text-[10px]"
                  onClick={async () => { await toggleFavoriteContact(item.id, !item.is_favorite); onReload(); }}
                >
                  {item.is_favorite ? "★" : "☆"}
                </button>
                <button
                  className="rounded-lg border px-2 py-1 text-[10px]"
                  onClick={async () => { await blockContact(item.id, !item.is_blocked); onReload(); }}
                >
                  {item.is_blocked ? "Unblock" : "Block"}
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No contacts</p>}
        </div>
      </div>
    </div>
  );
}
