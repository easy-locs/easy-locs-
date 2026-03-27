export type OrbitProfileRow = {
  id: string;
  orbit_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type ConversationParticipant = {
  orbitId: string;
  userId?: string | null;
  email?: string | null;
  displayName?: string | null;
};

export type ConversationRow = {
  id: string;
  type: string | null;
  title: string | null;
  created_by_orbit_id: string | null;
  participants: ConversationParticipant[];
  listing_id: string | null;
  booking_id: string | null;
  lease_id: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessageRow = {
  id: string;
  conversation_id: string;
  sender_orbit_id: string | null;
  sender_user_id: string | null;
  receiver_orbit_id: string | null;
  type: "text" | "image" | "file" | "call" | "system" | "location";
  body: string;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

export type CallSessionRow = {
  id: string;
  conversation_id: string | null;
  caller_orbit_id: string;
  receiver_orbit_id: string;
  call_type: "audio" | "video";
  status: "ringing" | "accepted" | "rejected" | "ended" | "missed";
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CallLogRow = {
  id: string;
  conversation_id: string;
  session_id: string | null;
  caller_orbit_id: string;
  receiver_orbit_id: string;
  call_type: "audio" | "video";
  direction: "outgoing" | "incoming";
  status: "missed" | "answered" | "rejected" | "ended" | "cancelled";
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  duration_sec: number;
  created_at: string;
};
