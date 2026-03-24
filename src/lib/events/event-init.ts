/**
 * Event Init — imports all handlers to register them on the core event bus.
 * Import this file once at app boot (e.g., in AppInit or main.tsx).
 */
import "./handlers/notification.handler";
import "./handlers/tracking.handler";
import "./handlers/ai-feedback.handler";
import "./handlers/business.handler";
import "./handlers/user-behavior.handler";

console.log("[event-init] All event handlers registered");
