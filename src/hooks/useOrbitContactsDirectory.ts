import { useCallback, useEffect, useMemo, useState } from "react";
import { listOrbitContacts } from "@/lib/orbit/orbit-contacts-service";

export function useOrbitContactsDirectory(ownerUserId?: string | null) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!ownerUserId) { setContacts([]); setLoading(false); return; }
    setLoading(true);
    const rows = await listOrbitContacts(ownerUserId);
    setContacts(rows);
    setLoading(false);
  }, [ownerUserId]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      [c.display_name, c.email, c.phone, c.peer_orbit_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [contacts, query]);

  return { contacts, filtered, loading, query, setQuery, reload: load };
}
