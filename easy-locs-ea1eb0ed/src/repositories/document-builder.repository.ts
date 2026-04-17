/**
 * document-builder.repository — DB operations for DocumentBuilder.
 */
import { db } from "@/services/db";
import type { Json } from "@/integrations/supabase/types";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export async function fetchProfileForDoc(userId: string) {
  const { data } = await cFrom("profiles").select("signature_url, name, email").eq("id", userId).single();
  return data;
}

export async function fetchOwnerProfileForDoc(orgId: string) {
  const { data } = await cFrom("owner_profiles").select("*").eq("org_id", orgId).limit(1).single();
  return data;
}

export async function fetchOrgForDoc(orgId: string) {
  const { data } = await cFrom("orgs")
    .select("name, address, postal_code, city, siret, phone, email, stamp_url")
    .eq("id", orgId).single();
  return data;
}

export async function fetchTenantProfile(tenantUserId: string) {
  const { data } = await cFrom("profiles").select("signature_url, id_number").eq("id", tenantUserId).single();
  return data;
}

export async function insertDocument(doc: Record<string, any>) {
  const { error } = await cFrom("documents").insert(doc as any);
  if (error) throw error;
}

export async function sendDocEmail(body: Record<string, any>) {
  db.functions.invoke("send-email", { body }).catch(() => {});
}

export async function insertDocAuditLog(orgId: string, userId: string, metadata: Record<string, any>) {
  await cFrom("audit_logs").insert({
    org_id: orgId,
    user_id: userId,
    action: "document.created",
    metadata_json: metadata as unknown as Json,
  });
}
