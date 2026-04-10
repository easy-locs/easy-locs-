/**
 * seoDispatch — Single entry for all SEO intents.
 */

export type SeoCommand =
  | { type: "render_page"; route: string; entity?: any; locale?: string }
  | { type: "set_noindex"; noindex: boolean }
  | { type: "clear" };

export interface SeoCommandResult {
  ok: boolean;
  error?: string;
}

export async function seoDispatch(cmd: SeoCommand): Promise<SeoCommandResult> {
  try {
    switch (cmd.type) {
      case "render_page": {
        const { seoMetaPipeline } = await import("./pipelines/seo-meta.pipeline");
        return seoMetaPipeline(cmd.route, cmd.entity, cmd.locale);
      }
      case "set_noindex": {
        const { useSeoStore } = await import("./seo.store");
        useSeoStore.getState().setNoindex(cmd.noindex);
        return { ok: true };
      }
      case "clear": {
        const { useSeoStore } = await import("./seo.store");
        useSeoStore.getState().clear();
        return { ok: true };
      }
      default:
        return { ok: false, error: "unknown_seo_command" };
    }
  } catch (err: any) {
    console.error("[seoDispatch]", err);
    return { ok: false, error: err?.message || "seo_dispatch_error" };
  }
}
