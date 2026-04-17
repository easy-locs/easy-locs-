/**
 * newsletter.repository — Newsletter subscription.
 */
import { db } from "@/services/db";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export async function subscribe(email: string) {
  const { error } = await cFrom("newsletter_subscribers").insert({ email } as any);
  if (error && error.code === "23505") return "already_subscribed";
  if (error) throw error;
  return "ok";
}
