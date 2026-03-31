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
  switch (actionType) {
    case "open_conversation": {
      // Navigate to orbit conversation
      const { default: navigate } = await import("@/lib/navigation");
      navigate(`/orbit/${targetId}`);
      break;
    }

    case "pay": {
      const { default: navigate } = await import("@/lib/navigation");
      navigate(`/pay/${targetId}`);
      break;
    }

    case "add_contact": {
      // Delegate to orbit contact pipeline
      const { default: navigate } = await import("@/lib/navigation");
      navigate(`/orbit/contacts?add=${targetId}`);
      break;
    }

    case "join_group": {
      const { default: navigate } = await import("@/lib/navigation");
      navigate(`/orbit/groups/join/${targetId}`);
      break;
    }

    case "open_menu": {
      const { default: navigate } = await import("@/lib/navigation");
      navigate(`/menu/${targetId}`);
      break;
    }

    case "open_entity": {
      // Delegate to card domain
      const { cardDispatch } = await import("@/domains/cards/card-dispatch");
      await cardDispatch({ type: "load_entity", entityId: targetId!, entityType: "auto" });
      const { default: navigate } = await import("@/lib/navigation");
      navigate(`/entity/${targetId}`);
      break;
    }

    case "open_location": {
      const [lat, lng] = (targetId || "").split(",");
      const { default: navigate } = await import("@/lib/navigation");
      navigate(`/map?lat=${lat}&lng=${lng}`);
      break;
    }

    default:
      throw new Error(`unhandled_qr_action: ${actionType}`);
  }
}
