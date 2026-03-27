import { useCallback, useEffect, useMemo, useState } from "react";
import { listOrbitContacts } from "@/lib/orbit/orbit-contacts-service";

export function useOrbitContactsDirectory(ownerUserId?: string | null) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!ownerUserId) {
      setContacts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const rows = await listOrbitContacts(ownerUserId);
    setContacts(rows);
    setLoading(false);
  }, [ownerUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;

    return contacts.filter((c) =>
      [c.display_name, c.email, c.phone, c.peer_orbit_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [contacts, query]);

  const favorites = useMemo(
    () => filtered.filter((x) => x.is_favorite && !x.is_blocked),
    [filtered]
  );

  const blocked = useMemo(
    () => filtered.filter((x) => x.is_blocked),
    [filtered]
  );

  const active = useMemo(
    () => filtered.filter((x) => !x.is_blocked),
    [filtered]
  );

  return {
    contacts,
    filtered,
    active,
    favorites,
    blocked,
    loading,
    query,
    setQuery,
    reload: load,
  };
}
