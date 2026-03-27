export function mergeDuplicateContacts(rows: any[]) {
  const map = new Map<string, any>();

  for (const row of rows) {
    const key = [
      row.owner_user_id || "",
      row.peer_user_id || "",
      (row.email || "").toLowerCase(),
      row.phone || "",
    ].join("::");

    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      continue;
    }

    map.set(key, {
      ...existing,
      display_name: existing.display_name || row.display_name,
      peer_orbit_id: existing.peer_orbit_id || row.peer_orbit_id,
      avatar_url: existing.avatar_url || row.avatar_url,
      is_favorite: !!existing.is_favorite || !!row.is_favorite,
      is_blocked: !!existing.is_blocked || !!row.is_blocked,
      metadata: {
        ...(existing.metadata || {}),
        ...(row.metadata || {}),
      },
      updated_at:
        new Date(existing.updated_at).getTime() > new Date(row.updated_at).getTime()
          ? existing.updated_at
          : row.updated_at,
    });
  }

  return Array.from(map.values());
}
