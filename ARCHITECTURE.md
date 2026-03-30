# Orbit Architecture — Governance Rules

## ⛔ Banned Patterns in Core Pipelines

The following identifiers are **BANNED** from any new code in core pipelines
(`families/send/*`, `repositories/*`, `hooks/call/*`, `lib/orbit/messaging/*`):

| Identifier | Status | Allowed only in |
|---|---|---|
| `threadId` | **BANNED in core** | UI compat props (read-only) |
| `v2ConversationId` | **BANNED in core** | Type definitions (read-only) |
| `contextId` | **BANNED in core** | Legacy type compat (read-only) |

### Canonical identifiers

- `conversationId` — canonical conversation UUID (`conversations_v2.id`)
- `entityId` — business entity reference (listing, lease, booking)
- `senderUserId` / `receiverOrbitId` — identity fields

## ✅ Canonical Write Paths

All writes MUST go through:

1. **Messages**: `families/send/*` → `repositories/communication.repository.insertMessage` → `chat_messages_v2`
2. **Conversations**: `lib/orbit/createOrGetDirectConversation` → `conversations_v2`
3. **Calls**: `lib/call/call-rpc.createCallRpc` → `create_call_idempotent` RPC → `call_logs`
4. **Payments**: `families/send/send-payment` → `insertMessage` (type=payment)

No component may call `supabase.from("chat_messages_v2").insert()` directly.

## ✅ Canonical Realtime Subscriptions

- **Messages**: `useMessageLoader` → `chat_messages_v2` filtered by `conversation_id`
- **Calls**: `useIncomingCallListener` → `call_logs` filtered by `receiver_orbit_id`
- **Typing**: Presence channel per conversation

## 🔒 RLS Critical Dependencies

All message INSERT/SELECT and conversation operations require:
1. `orbit_profiles_v2` row exists for `auth.uid()`
2. User's `orbitId` is in `conversations_v2.participants` array
3. `sender_user_id = auth.uid()` for message inserts

Missing `orbit_profiles_v2` row = **silent RLS rejection** of all message operations.
