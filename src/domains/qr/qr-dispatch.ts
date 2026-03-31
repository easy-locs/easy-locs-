/**
 * qrDispatch — Single entry point for ALL QR intents.
 *
 * RULE: The camera component scans and hands the raw string here.
 *       No business logic lives in the scanner UI.
 *
 * FLOW: scan → parse → validate → resolve → execute action → update store → render result
 */
import { useQrStore } from "./qr.store";
import { parseQrPayload, validateQrPayload } from "./qr.pipeline";

export type QrCommand =
  | { type: "scan_start" }
  | { type: "scan_result"; raw: string }
  | { type: "execute" }
  | { type: "reset" };

export interface QrCommandResult {
  ok: boolean;
  error?: string;
  actionType?: string;
  targetId?: string | null;
}

export async function qrDispatch(cmd: QrCommand): Promise<QrCommandResult> {
  const store = useQrStore.getState();

  try {
    switch (cmd.type) {
      case "scan_start": {
        store.startScan();
        return { ok: true };
      }

      case "scan_result": {
        // Parse
        const payload = parseQrPayload(cmd.raw);

        // Validate
        const validationError = validateQrPayload(payload);
        if (validationError) {
          store.markInvalid(validationError);
          return { ok: false, error: validationError };
        }

        // Resolve
        store.resolve(payload);

        if (import.meta.env.DEV) {
          console.debug("[qrDispatch] QR resolved", {
            actionType: payload.actionType,
            targetId: payload.targetId,
            raw: payload.raw.slice(0, 80),
          });
        }

        return { ok: true, actionType: payload.actionType, targetId: payload.targetId };
      }

      case "execute": {
        const current = useQrStore.getState();
        if (!current.payload || current.status !== "resolved") {
          return { ok: false, error: "nothing_to_execute" };
        }

        store.startExecute();

        try {
          await executeQrAction(current.payload.actionType, current.payload.targetId, current.payload.metadata);
          store.complete();
          return { ok: true, actionType: current.payload.actionType };
        } catch (err: any) {
          store.fail(err?.message || "execution_failed");
          return { ok: false, error: err?.message || "execution_failed" };
        }
      }

      case "reset": {
        store.reset();
        return { ok: true };
      }

      default:
        return { ok: false, error: "unknown_qr_command" };
    }
  } catch (err: any) {
    console.error("[qrDispatch]", err);
    return { ok: false, error: err?.message || "qr_dispatch_error" };
  }
}

/**
 * Execute the resolved QR action via proper dispatch channels.
 * Each action type delegates to its canonical domain dispatcher.
 */
async function executeQrAction(
  actionType: string,
  targetId: string | null,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { platformBus } = await import("@/lib/shared/platform-bus");

  switch (actionType) {
    case "open_conversation":
      platformBus.emit("navigate", { path: `/orbit/${targetId}` }, "qr");
      break;

    case "pay":
      platformBus.emit("navigate", { path: `/pay/${targetId}` }, "qr");
      break;

    case "add_contact":
      platformBus.emit("navigate", { path: `/orbit/contacts?add=${targetId}` }, "qr");
      break;

    case "join_group":
      platformBus.emit("navigate", { path: `/orbit/groups/join/${targetId}` }, "qr");
      break;

    case "open_menu":
      platformBus.emit("navigate", { path: `/menu/${targetId}` }, "qr");
      break;

    case "open_entity": {
      const { cardDispatch } = await import("@/domains/cards/card-dispatch");
      await cardDispatch({ type: "load_entity", entityId: targetId!, entityType: "auto" });
      platformBus.emit("navigate", { path: `/entity/${targetId}` }, "qr");
      break;
    }

    case "open_location": {
      const [lat, lng] = (targetId || "").split(",");
      platformBus.emit("navigate", { path: `/map?lat=${lat}&lng=${lng}` }, "qr");
      break;
    }

    default:
      throw new Error(`unhandled_qr_action: ${actionType}`);
  }
}
