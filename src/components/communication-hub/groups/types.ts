/**
 * Group domain types — Orbit groups/channels/communities.
 */
export type GroupType = "group" | "channel" | "community";
export type PostingPermission = "everyone" | "admins_only";
export type MemberRole = "admin" | "member" | "viewer";

export interface Group {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  created_by: string;
  created_at: string;
  group_type: GroupType;
  posting_permission: PostingPermission;
  member_count?: number;
  last_message?: string;
  last_message_at?: string;
}

export interface GroupMember {
  id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  profile_name?: string;
}

export interface GroupMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  is_pinned?: boolean;
  pinned_at?: string;
  pinned_by?: string;
}
