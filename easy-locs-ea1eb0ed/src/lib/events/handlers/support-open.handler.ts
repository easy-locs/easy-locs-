import { platformBus } from "@/lib/shared/platform-bus";

export function initSupportOpenHandler() {
  platformBus.on("support:open", (event) => {
    window.dispatchEvent(
      new CustomEvent("support:open", { detail: event.payload }),
    );
  });
}
