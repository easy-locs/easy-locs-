import { eventBus } from "@/lib/core/event-bus";

export function initSupportOpenHandler() {
  eventBus.on("support.open", (payload) => {
    window.dispatchEvent(
      new CustomEvent("support:open", { detail: payload }),
    );
  });
}
