/**
 * DINO Pro Rules — Handle incomplete professional profiles.
 * Enqueues remediation jobs and notification queues.
 */

import { queueNotification } from "./notify";
import { enqueueDinoJob } from "./jobQueue";

export async function handleProfessionalIncompleteProfile(input: {
  proId: string;
  email?: string | null;
  missingPhotos: boolean;
  missingCategories: boolean;
}) {
  if (input.missingPhotos) {
    await enqueueDinoJob({
      jobType: "normalize_media",
      entityType: "pro",
      entityId: input.proId,
      priority: 15,
    });

    await queueNotification({
      actorType: "pro",
      actorId: input.proId,
      channel: "email",
      templateKey: "missing_photos_reminder",
      payload: { email: input.email },
    });
  }

  if (input.missingCategories) {
    await enqueueDinoJob({
      jobType: "cleanup_categories",
      entityType: "pro",
      entityId: input.proId,
      priority: 15,
    });

    await queueNotification({
      actorType: "pro",
      actorId: input.proId,
      channel: "email",
      templateKey: "missing_categories_reminder",
      payload: { email: input.email },
    });
  }
}
