/**
 * DINO Job Queue — Enqueue durable sync jobs for async processing.
 */

import { supabase } from "@/integrations/supabase/client";
import type { DinoJobType, DinoEntityType } from "./jobTypes";
import type { Json } from "@/integrations/supabase/types";

export async function enqueueDinoJob(input: {
  jobType: DinoJobType;
  entityType: DinoEntityType;
  entityId: string;
  payload?: Record<string, unknown>;
  priority?: number;
  scheduledAt?: string;
}) {
  const { data, error } = await supabase
    .from("dino_sync_jobs")
    .insert([{
      job_type: input.jobType,
      entity_type: input.entityType,
      entity_id: input.entityId,
      payload_json: (input.payload ?? {}) as Json,
      priority: input.priority ?? 100,
      scheduled_at: input.scheduledAt ?? new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function enqueueRouteAudit(route: string) {
  return enqueueDinoJob({
    jobType: "audit_route",
    entityType: "route",
    entityId: route,
    payload: { route },
    priority: 30,
  });
}

export async function enqueueMediaNormalization(entityType: DinoEntityType, entityId: string) {
  return enqueueDinoJob({
    jobType: "normalize_media",
    entityType,
    entityId,
    priority: 20,
  });
}

export async function enqueueProReminder(proId: string, payload: Record<string, unknown> = {}) {
  return enqueueDinoJob({
    jobType: "send_pro_reminder",
    entityType: "pro",
    entityId: proId,
    payload,
    priority: 50,
  });
}
