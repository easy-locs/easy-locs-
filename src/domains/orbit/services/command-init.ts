/**
 * Command Init — Bootstrap all command registrations.
 * Import this once at app startup to wire the command bus.
 * 
 * This file is the single place that activates all commandBus handlers.
 * Gallery save is self-registering (imported via gallery-save.service.ts).
 */

import { registerOrbitCommands } from "./command-bridge";

// Register orbit commands (send_text, send_media, send_voice, etc.)
registerOrbitCommands();

// Gallery save auto-registers when imported
// Import it here to ensure registration happens at startup
import("./gallery-save.service");
