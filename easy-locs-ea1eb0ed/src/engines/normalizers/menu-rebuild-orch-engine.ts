import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class MenuRebuildOrchEngine extends BaseEngine {
  constructor() {
    super({
      id: "menu-rebuild",
      name: "Menu Rebuild Engine",
      category: "normalizer",
      domain: "onboarding",
      intervalMs: 600_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const { runMenuRebuildEngine } = await import("@/lib/engines/menu-rebuild-engine");
    const result = await runMenuRebuildEngine(100);
    const actions: string[] = [];
    if (result.rebuilt > 0) actions.push(`${result.rebuilt} menus need rebuild`);

    return {
      level: result.rebuilt > 0 ? "detect" : "observe",
      findings: result.results.length,
      actions,
      duration: 0,
    };
  }
}
