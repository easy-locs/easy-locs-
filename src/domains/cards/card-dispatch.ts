/**
 * cardDispatch — Single entry point for all card intents.
 * No other module may bypass this for card mutations.
 */

export type CardCommand =
  | { type: "load_entity"; entityId: string; entityType: string }
  | { type: "load_batch"; entityIds: string[]; entityType: string }
  | { type: "refresh_entity"; entityId: string }
  | { type: "clear_cache" };

export interface CardCommandResult {
  ok: boolean;
  error?: string;
}

export async function cardDispatch(cmd: CardCommand): Promise<CardCommandResult> {
  try {
    switch (cmd.type) {
      case "load_entity": {
        const { cardBuildPipeline } = await import("./pipelines/card-build.pipeline");
        return cardBuildPipeline(cmd.entityId, cmd.entityType);
      }
      case "load_batch": {
        const { cardBatchPipeline } = await import("./pipelines/card-build.pipeline");
        return cardBatchPipeline(cmd.entityIds, cmd.entityType);
      }
      case "refresh_entity": {
        const { useCardStore } = await import("./card.store");
        useCardStore.getState().invalidate(cmd.entityId);
        const { cardBuildPipeline } = await import("./pipelines/card-build.pipeline");
        return cardBuildPipeline(cmd.entityId, "auto");
      }
      case "clear_cache": {
        const { useCardStore } = await import("./card.store");
        useCardStore.getState().clear();
        return { ok: true };
      }
      default:
        return { ok: false, error: "unknown_card_command" };
    }
  } catch (err: any) {
    console.error("[cardDispatch]", err);
    return { ok: false, error: err?.message || "card_dispatch_error" };
  }
}
