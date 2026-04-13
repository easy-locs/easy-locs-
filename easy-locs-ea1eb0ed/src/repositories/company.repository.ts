/**
 * company.repository — DB operations for Company page.
 */
import { db } from "@/services/db";

export async function fetchUserCountry() {
  const { data: authData } = await db.auth.getUser();
  if (!authData?.user?.id) return null;
  const { data: p } = await db("profiles").select("country").eq("id", authData.user.id).single();
  return p?.country || null;
}

export async function createLegalNoticePayment(jalName: string) {
  const { data, error } = await db.functions.invoke("create-legal-notice-payment", {
    body: { jalName },
  });
  if (error) throw error;
  return data;
}
