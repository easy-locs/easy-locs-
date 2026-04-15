import { APP_BASE_URL } from "@/lib/app-domain";

export function buildAppLink(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${APP_BASE_URL}${cleanPath}`;
}
