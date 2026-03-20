export type OrbitProfile = {
  id: string;
  orbit_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

export type ConversationParticipant = {
  orbitId: string;
  email?: string | null;
  displayName?: string | null;
};

export type ConversationRow = {
  id: string;
  created_by_orbit_id: string;
  participants: ConversationParticipant[];
  last_message_at: string | null;
  created_at: string;
};

export type ChatMessageRow = {
  id: string;
  conversation_id: string;
  sender_orbit_id: string | null;
  receiver_orbit_id: string | null;
  type: "text" | "image" | "file" | "call" | "system";
  body: string;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

export type CallLogRow = {
  id: string;
  conversation_id: string;
  caller_orbit_id: string;
  receiver_orbit_id: string;
  call_type: "audio" | "video";
  status: "ringing" | "answered" | "missed" | "rejected" | "ended";
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  duration_sec: number;
  created_at: string;
};
