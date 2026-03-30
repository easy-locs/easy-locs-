/**
 * Pipeline — Canonical executor index.
 * Each executor follows: intent → canonical → optimistic → transport → reconcile
 */
export { executeSendText } from "./executeSendText";
export { executeSendMedia } from "./executeSendMedia";
export { executeSendVoice } from "./executeSendVoice";
export { executeSendLocation } from "./executeSendLocation";
export { executeStartCall } from "./executeStartCall";
export { executeEndCall } from "./executeEndCall";
export { executeEditMessage } from "./executeEditMessage";
export { executeReplyMessage } from "./executeReplyMessage";
export type { ExecutorResult, ResolvedContext, PipelinePhase, PipelineTrace } from "./pipeline-types";
