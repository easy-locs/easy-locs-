/**
 * story.create — Canonical story creation pipeline.
 */

export type StoryAudience = "public" | "contacts" | "close_friends" | "custom";

export interface StoryPayload {
  type: "text" | "media";
  body?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  audience: StoryAudience;
  duration?: number; // seconds per slide
  backgroundColor?: string;
  fontStyle?: string;
  geoContext?: { lat: number; lng: number; label?: string };
  expiresInHours?: number; // default 24
}

export const StoryCreate = {
  /** Build a canonical story payload */
  buildPayload(opts: Partial<StoryPayload> & { type: StoryPayload["type"] }): StoryPayload {
    return {
      type: opts.type,
      body: opts.body || "",
      mediaUrl: opts.mediaUrl,
      mediaType: opts.mediaType,
      audience: opts.audience || "contacts",
      duration: opts.duration || 5,
      backgroundColor: opts.backgroundColor || "#000000",
      fontStyle: opts.fontStyle || "default",
      geoContext: opts.geoContext,
      expiresInHours: opts.expiresInHours || 24,
    };
  },

  /** Validate story payload before publish */
  validate(payload: StoryPayload): { valid: boolean; error?: string } {
    if (payload.type === "text" && !payload.body?.trim()) {
      return { valid: false, error: "Story text cannot be empty" };
    }
    if (payload.type === "media" && !payload.mediaUrl) {
      return { valid: false, error: "Media URL is required" };
    }
    return { valid: true };
  },
};
