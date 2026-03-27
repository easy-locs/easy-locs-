# ORBIT FULL AUDIT REPORT
> Generated: 2026-03-27 | Scope: End-to-end Orbit communication stack

---

## 1. FILE INVENTORY (32 files)

### UI Components — `src/components/communication-hub/` (32 files)
| File | Lines | Role | Status |
|------|-------|------|--------|
| HudChatPanel.tsx | **1795** | Chat screen (V2+Legacy) | ⚠️ MONOLITH — needs split |
| HudConversationList.tsx | 270 | Conversation sidebar (WhatsApp-style) | ✅ Active |
| HudConversationCard.tsx | 161 | Thread row card | ✅ Active |
| ConversationList.tsx | 250 | OLD conversation sidebar | ❌ DUPLICATE — superseded by HudConversationList |
| ChatMessageBubble.tsx | 521 | Message bubble (HUD) | ✅ Active |
| CommCallsSection.tsx | 383 | Call history | ✅ Active |
| CommContactsSection.tsx | 753 | Contacts with resolution | ✅ Active |
| CommGroupsSection.tsx | 818 | Groups/Channels/Communities | ⚠️ BUG: queries ALL conversations_v2 |
| OrbitAccountSection.tsx | 785 | Profile / Privacy / Settings | ✅ Active |
| CommNavBar.tsx | 155 | Navigation tabs | ✅ Active |
| SwipeableThreadItem.tsx | 172 | Swipe-to-reveal actions | ✅ Active |
| SwipeableCallItem.tsx | ~150 | Swipe call items | ✅ Active |
| ChatMessageBubble.tsx | 521 | HUD message bubble | ✅ Active |
| useConversationThreads.ts | **722** | Thread aggregator (10+ sources) | ⚠️ Complex, needs refactor |
| types.ts | 203 | Shared types | ✅ Active |

### OLD Components — `src/components/chat/` (17 files)
| File | Lines | Role | Status |
|------|-------|------|--------|
| ChatThreadPanel.tsx | 70 | Simple chat panel | ❌ DUPLICATE — superseded by HudChatPanel |
| ConversationList.tsx | ~200 | Old conversation list | ❌ DUPLICATE |
| ConversationListItem.tsx | ~100 | Old list item | ❌ DUPLICATE |
| ConversationListPanel.tsx | ~150 | Old list wrapper | ❌ DUPLICATE |
| ConversationThread.tsx | ~200 | Old thread view | ❌ DUPLICATE |
| ConversationHeader.tsx | ~80 | Old header | ❌ DUPLICATE |
| DefaultMessageBubble.tsx | 30 | Simple bubble | ❌ DUPLICATE |
| MessageComposer.tsx | ~100 | Simple composer | ✅ Used by ChatThreadPanel |
| WhatsAppStyleConversationLayout.tsx | 82 | Layout wrapper | ⚠️ Partially used |
| WhatsAppStyleChatMenu.tsx | ~50 | Menu dropdown | ⚠️ Partially used |

### Services — `src/lib/chat/`
| File | Role | Status |
|------|------|--------|
| conversationService.ts | CRUD conversations | ⚠️ Used by old stack only |
| conversationUi.ts | Display helpers | ✅ Active (formatPreview) |
| messageService.ts | CRUD messages | ⚠️ Used by old stack only |
| createCallSystemMessage.ts | Call event formatting | ✅ Active |

### Stores
| File | Role | Status |
|------|------|--------|
| orbitStore.ts | Profile state (orbitId, role) | ✅ Active — canonical |
| chatStore.ts | Domain conversations + messages | ⚠️ REDUNDANT with useConversationThreads |
| orbit-engine.ts | Aggregated counters (unread, calls, etc.) | ✅ Active |
| chatAttachmentStore.ts | File uploads in chat | ✅ Active |

---

## 2. CRITICAL BUGS FOUND

### BUG-1: CommGroupsSection queries ALL conversations_v2
**File:** `CommGroupsSection.tsx:138-141`
```ts
.from("conversations_v2")
.select("*")
.order("updated_at", { ascending: false });
// ❌ NO TYPE FILTER — loads ALL conversations as "groups"
```
**Impact:** Groups tab shows all conversations, not just groups/channels.
**Fix:** Add `.in("type", ["group", "channel", "community"])` filter.

### BUG-2: French hardcoded in orbit-engine.ts alerts
**File:** `orbit-engine.ts:213-256`
```ts
title: "Réservations en attente",  // French hardcoded
message: `${state.pendingBookings} réservation${...} à confirmer`,
```
**Impact:** Mixed language violations. Alerts always in French regardless of locale.
**Fix:** Use i18n keys or English defaults.

### BUG-3: Groups query uses wrong column names
**File:** `CommGroupsSection.tsx:150-155`
```ts
.from("chat_messages_v2")
.select("content, created_at")
.eq("group_id", g.id)  // ❌ chat_messages_v2 has no "group_id" column
```
**Impact:** Group messages never load. Silent failure.
**Fix:** Use `conversation_id` column.

### BUG-4: Profile shows raw UUID shortId
**File:** `OrbitAccountSection.tsx:96`
```ts
const shortId = userId.substring(0, 8).toUpperCase();
// Displayed as EL-{shortId} — not a raw UUID but could be confusing
```
**Impact:** Low — intentional Orbit ID format, but should use actual orbit_id.

---

## 3. DUPLICATE / CONFLICTING SYSTEMS

### DUPLICATION-1: Two Conversation List implementations
- `src/components/communication-hub/ConversationList.tsx` — OLD, card-based, with property filters
- `src/components/communication-hub/HudConversationList.tsx` — NEW, WhatsApp-style, swipeable
- **Verdict:** ConversationList.tsx is dead code — only HudConversationList is used in production.

### DUPLICATION-2: Two Chat stacks
- `src/components/chat/*` — 17 files, old simple implementation
- `src/components/communication-hub/*` — 32 files, HUD implementation
- **Verdict:** The chat/ stack is legacy. Most files are unused or only referenced by dead routes.

### DUPLICATION-3: chatStore vs useConversationThreads
- `chatStore.ts` — domain-model store using `chatRepo`
- `useConversationThreads.ts` — React hook aggregating 10+ tables
- **Verdict:** Both load conversations differently. useConversationThreads is the active one. chatStore is used by booking flows only.

---

## 4. I18N ISSUES

| Location | Issue | Severity |
|----------|-------|----------|
| orbit-engine.ts alerts | French hardcoded ("Réservations en attente") | 🔴 Critical |
| CommContactsSection.tsx:308 | French toast ("Un contact similaire existe déjà") | 🟡 Medium |
| CommContactsSection.tsx:351 | French toast ("Ce contact n'a pas de compte") | 🟡 Medium |
| CommContactsSection.tsx:385-386 | French toast ("Ce contact n'est pas joignable") | 🟡 Medium |
| OrbitAccountSection.tsx | Mostly i18n'd with fallbacks | ✅ OK |
| CommNavBar.tsx | Properly i18n'd | ✅ OK |
| HudConversationList.tsx | Properly i18n'd | ✅ OK |
| CommCallsSection.tsx | Properly i18n'd | ✅ OK |

---

## 5. DATA QUALITY ISSUES

| Issue | Location | Impact |
|-------|----------|--------|
| Group messages use wrong column | CommGroupsSection.tsx:154 | Groups always show 0 messages |
| Call logs may show UUID as fallback | CommCallsSection.tsx:219 | safeDisplayName handles it |
| V2 unread count uses `read` not `read_at` | orbit-engine.ts:144 | May count wrong |
| useConversationThreads loads 10+ tables | useConversationThreads.ts | Slow initial load |

---

## 6. ARCHITECTURE ASSESSMENT

### Current State (Fragmented)
```
UI Layer:
  ├── communication-hub/ (HUD stack — active)
  │   ├── HudChatPanel (1795 lines monolith)
  │   ├── HudConversationList (sidebar)
  │   ├── CommCallsSection
  │   ├── CommContactsSection
  │   ├── CommGroupsSection
  │   └── OrbitAccountSection
  ├── chat/ (legacy stack — mostly dead)
  │   ├── ChatThreadPanel
  │   ├── ConversationList
  │   └── DefaultMessageBubble
  └── call/ (shared)

Service Layer:
  ├── lib/chat/ (old CRUD services)
  ├── lib/orbit/ (formatters, signaling, encryption)
  └── stores/ (orbitStore, chatStore, orbit-engine)
```

### Target State (Canonical)
```
src/orbit/
  ├── components/
  │   ├── ConversationList.tsx
  │   ├── ChatPanel.tsx (split from HudChatPanel)
  │   ├── MessageBubble.tsx
  │   ├── ComposerBar.tsx
  │   ├── CallHistory.tsx
  │   ├── ContactList.tsx
  │   ├── GroupList.tsx
  │   ├── ProfilePanel.tsx
  │   └── primitives/ (SystemMessage, TypingIndicator, EmptyState)
  ├── services/
  │   ├── conversationService.ts
  │   ├── messageService.ts
  │   ├── callService.ts
  │   ├── contactService.ts
  │   └── presenceService.ts
  ├── stores/
  │   ├── useOrbitConversationsStore.ts
  │   ├── useOrbitMessagesStore.ts
  │   └── useOrbitPresenceStore.ts
  └── instrumentation/
      └── orbitTelemetry.ts
```

---

## 7. MIGRATION PLAN (4 Phases)

### Phase 1: Critical Bug Fixes (NOW)
- [x] Fix CommGroupsSection query (type filter + correct column)
- [x] Fix orbit-engine i18n (English defaults)
- [x] Add orbit instrumentation layer
- [ ] Verify call log name resolution

### Phase 2: Shadow Rebuild
- [ ] Extract ComposerBar from HudChatPanel
- [ ] Extract MessageList from HudChatPanel
- [ ] Create canonical orbitTelemetry.ts
- [ ] Unify conversation loading into single service

### Phase 3: Screen-by-Screen Replacement
- [ ] Replace ConversationList.tsx (old) → mark deprecated
- [ ] Split HudChatPanel into <500 line components
- [ ] Migrate chatStore consumers to useConversationThreads

### Phase 4: Cleanup
- [ ] Delete src/components/chat/ConversationList.tsx (duplicate)
- [ ] Delete src/components/chat/ConversationListItem.tsx
- [ ] Delete src/components/chat/ConversationListPanel.tsx
- [ ] Delete src/components/chat/ConversationThread.tsx
- [ ] Delete src/components/chat/ConversationHeader.tsx
- [ ] Audit remaining chat/ files for orphans

---

## 8. HARD RULES COMPLIANCE

| Rule | Status |
|------|--------|
| No raw UUIDs in UI | ✅ safeDisplayName + nameCache in calls |
| No raw event strings | ✅ formatEventMessage in conversationUi.ts |
| No raw i18n keys | ⚠️ Some fallbacks could leak — need audit |
| No mixed languages | ❌ orbit-engine French alerts |
| No broken empty states | ✅ All sections have empty states |
| No duplicated state logic | ❌ chatStore + useConversationThreads |
