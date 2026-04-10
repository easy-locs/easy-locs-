export type OrbitComposerMode =
  | "idle"
  | "reply"
  | "edit"
  | "forward"
  | "recording";

export interface OrbitReplyState {
  messageId: string;
  preview: string;
  senderName?: string | null;
}

export interface OrbitEditState {
  messageId: string;
  originalBody: string;
}

export interface OrbitForwardState {
  messageIds: string[];
}

export interface OrbitPinnedState {
  messageId: string;
  body: string;
  pinnedAt: string;
}

export interface OrbitTypingUser {
  userId: string;
  displayName?: string | null;
  ts: number;
}
