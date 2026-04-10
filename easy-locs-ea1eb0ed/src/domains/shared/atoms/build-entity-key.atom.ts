/**
 * ATOM: buildEntityKey — Pure key builder for entity references.
 */
export function buildEntityKey(type: string, id: string): string {
  return `${type}:${id}`;
}

export function parseEntityKey(key: string): { type: string; id: string } | null {
  const idx = key.indexOf(":");
  if (idx < 1) return null;
  return { type: key.slice(0, idx), id: key.slice(idx + 1) };
}
