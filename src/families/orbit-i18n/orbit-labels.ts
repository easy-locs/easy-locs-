/**
 * orbit-labels — Single source of truth for ALL Orbit UI labels.
 * No hardcoded strings in Orbit components. All text flows through here.
 *
 * Future: swap this object with a t() function for multi-locale support.
 */

export const orbitLabels = {
  composer: {
    placeholder: "Message…",
    slideToCancel: "Slide to cancel",
    reply: "Reply",
    edit: "Edit",
    send: "Send",
    cancel: "Cancel",
    discard: "Discard",
    recording: "Recording…",
  },

  message: {
    edited: "edited",
    deleted: "This message was deleted",
    voiceMessage: (duration: string) => `🎤 Voice message (${duration})`,
    viewOnce: "📷 View-once",
    videoAttachment: "🎬 Video",
    attachment: "📎 Attachment",
    photoAttachment: "📷 Photo",
  },

  location: {
    liveShared: (minutes: number) => `📡 Live location shared for ${minutes}min`,
    myLocation: "📍 My location",
    place: (label: string) => `📍 ${label}`,
  },

  call: {
    calling: "Calling…",
    ringing: "Ringing…",
    incoming: "Incoming call…",
    connecting: "Connecting…",
    reconnecting: "Reconnecting…",
    active: "Active",
    ended: "Call ended",
    missed: "Missed call",
    declined: "Call declined",
    failed: "Call failed",
    callback: "Call back",
    audioCall: "Audio call",
    videoCall: "Video call",
  },

  thread: {
    noMessages: "No messages yet",
    typeFirstMessage: "Send the first message",
    unreadCount: (count: number) => count > 99 ? "99+" : `${count}`,
  },

  actions: {
    reply: "Reply",
    edit: "Edit",
    delete: "Delete",
    pin: "Pin",
    forward: "Forward",
    copy: "Copy",
    select: "Select",
  },

  media: {
    file: "File",
    camera: "Camera",
    multiPhotos: "Multi Photos",
    location: "Location",
    viewOnce: "View Once",
  },

  time: {
    now: "now",
    justNow: "Just now",
  },

  presence: {
    online: "Online",
    offline: "Offline",
    lastSeen: (time: string) => `Last seen ${time}`,
    typing: "typing…",
    recording: "recording…",
    uploading: "uploading…",
  },
} as const;
