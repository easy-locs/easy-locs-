import { db } from "@/services/db";

export class EdgeCallError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "EdgeCallError";
  }
}

export async function callEdgeFunction<T = Record<string, unknown>>(
  functionName: string,
  body: Record<string, unknown>
): Promise<T> {
  const { data: { session } } = await db.auth.getSession();
  if (!session?.access_token) {
    throw new EdgeCallError("Authentication required", 401, "UNAUTHENTICATED");
  }

  const dbUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!dbUrl) {
    throw new EdgeCallError("Supabase URL not configured", 503, "NOT_CONFIGURED");
  }

  const response = await fetch(`${dbUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new EdgeCallError(
      errBody.error ?? `Edge function failed: ${response.status}`,
      response.status,
      errBody.code
    );
  }

  return response.json() as Promise<T>;
}

export async function callEdgeFunctionRaw(
  functionName: string,
  body: Record<string, unknown>
): Promise<Response> {
  const { data: { session } } = await db.auth.getSession();
  if (!session?.access_token) {
    throw new EdgeCallError("Authentication required", 401, "UNAUTHENTICATED");
  }

  const dbUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!dbUrl) {
    throw new EdgeCallError("Supabase URL not configured", 503, "NOT_CONFIGURED");
  }

  return fetch(`${dbUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
}
