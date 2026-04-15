/**
 * Universal link builder — always hash-router for Lovable preview.
 */
import { APP_BASE_URL } from "@/lib/app-domain";

export function buildAppLink(path: string): string {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${APP_BASE_URL}/#/${cleanPath}`;
}
