/**
 * safe-lazy — Wrapper around React.lazy with error recovery UI.
 * Single responsibility: chunk loading with fallback.
 */
import { lazy, type ComponentType } from "react";

export function safeLazy(
  factory: () => Promise<{ default: ComponentType<any> }>,
  name: string
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      if (!mod?.default) {
        throw new Error(`[lazy] Missing default export for ${name}`);
      }
      return mod;
    } catch (err) {
      console.error(`[lazy] Failed to load chunk: ${name}`, err);
      return {
        default: () => (
          <div className="p-8 text-center text-destructive">
            Failed to load {name}.{" "}
            <button onClick={() => window.location.reload()} className="underline ml-2">
              Reload
            </button>
          </div>
        ),
      } as { default: ComponentType<any> };
    }
  });
}
