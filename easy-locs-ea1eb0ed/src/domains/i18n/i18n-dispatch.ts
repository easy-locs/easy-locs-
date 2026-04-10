/**
 * i18nDispatch — Single entry for all locale/translation intents.
 */

export type I18nCommand =
  | { type: "change_locale"; locale: string }
  | { type: "load_dictionary"; locale: string }
  | { type: "translate_key"; key: string; params?: Record<string, string> };

export interface I18nCommandResult {
  ok: boolean;
  value?: string;
  error?: string;
}

export async function i18nDispatch(cmd: I18nCommand): Promise<I18nCommandResult> {
  try {
    switch (cmd.type) {
      case "change_locale": {
        const { localeSwitchPipeline } = await import("./pipelines/locale-switch.pipeline");
        return localeSwitchPipeline(cmd.locale);
      }
      case "load_dictionary": {
        const { loadDictionaryPipeline } = await import("./pipelines/locale-switch.pipeline");
        return loadDictionaryPipeline(cmd.locale);
      }
      case "translate_key": {
        const { selectTranslation } = await import("./selectors");
        const value = selectTranslation(cmd.key, cmd.params);
        return { ok: true, value };
      }
      default:
        return { ok: false, error: "unknown_i18n_command" };
    }
  } catch (err: any) {
    console.error("[i18nDispatch]", err);
    return { ok: false, error: err?.message || "i18n_dispatch_error" };
  }
}
