/**
 * FAMILY: ORBIT-DISPATCH — Canonical Action Pipeline.
 * Single entry point for ALL Orbit user actions.
 *
 * UI components must use useOrbitDispatch() for:
 * - send_text, send_media, send_voice, send_location
 * - start_call, accept_call, end_call
 * - edit_message, reply
 *
 * No other module may bypass this pipeline for these actions.
 */

export { orbitDispatch } from "./orbit-dispatch";
export { useOrbitDispatch } from "./useOrbitDispatch";
export type {
  OrbitCommand,
  OrbitCommandResult,
  SendTextCommand,
  SendMediaCommand,
  SendVoiceCommand,
  SendLocationCommand,
  StartCallCommand,
  AcceptCallCommand,
  EndCallCommand,
  EditMessageCommand,
  ReplyCommand,
} from "./orbit-commands";

// Pipeline executors — for direct use in advanced scenarios
export {
  executeSendText,
  executeSendMedia,
  executeSendVoice,
  executeSendLocation,
  executeStartCall,
  executeEndCall,
  executeEditMessage,
  executeReplyMessage,
} from "./pipeline";
export type { ExecutorResult, ResolvedContext, PipelinePhase } from "./pipeline";
