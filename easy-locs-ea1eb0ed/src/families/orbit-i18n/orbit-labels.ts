/**
 * orbit-labels — Single source of truth for ALL Orbit UI labels.
 * No hardcoded strings in Orbit components. All text flows through here.
 *
 * Connected to the global i18n system via useOrbitLabels() hook.
 * Static orbitLabels retained for non-React contexts.
 */
import { useI18n } from "@/lib/i18n";

export function useOrbitLabels() {
  const { t } = useI18n();
  return {
    composer: {
      placeholder: t("orbit.composer.placeholder"),
      slideToCancel: t("orbit.composer.slide_to_cancel"),
      reply: t("orbit.composer.reply"),
      edit: t("orbit.composer.edit"),
      send: t("orbit.composer.send"),
      cancel: t("common.cancel"),
      discard: t("orbit.composer.discard"),
      recording: t("orbit.composer.recording"),
    },
    message: {
      edited: t("orbit.message.edited"),
      deleted: t("orbit.message.deleted"),
      voiceMessage: (duration: string) => `${t("orbit.message.voice")} (${duration})`,
      viewOnce: t("orbit.message.view_once"),
      videoAttachment: t("orbit.message.video_attachment"),
      attachment: t("orbit.message.attachment"),
      photoAttachment: t("orbit.message.photo_attachment"),
    },
    location: {
      liveShared: (minutes: number) => `📡 ${t("orbit.location_shared")} ${minutes}min`,
      myLocation: `📍 ${t("orbit.media.location")}`,
      place: (label: string) => `📍 ${label}`,
    },
    call: {
      calling: t("orbit.call.calling"),
      ringing: t("orbit.call.ringing"),
      incoming: t("orbit.call.incoming"),
      connecting: t("orbit.call.connecting"),
      reconnecting: t("orbit.call.reconnecting"),
      active: t("orbit.call.active"),
      ended: t("orbit.call.ended"),
      missed: t("orbit.call.missed"),
      declined: t("orbit.call.declined"),
      failed: t("orbit.call.failed"),
      callback: t("orbit.call.callback"),
      audioCall: t("orbit.call.audio_call"),
      videoCall: t("orbit.call.video_call"),
    },
    thread: {
      noMessages: t("orbit.thread.no_messages"),
      typeFirstMessage: t("orbit.thread.type_first"),
      unreadCount: (count: number) => count > 99 ? "99+" : `${count}`,
    },
    actions: {
      reply: t("orbit.actions.reply"),
      edit: t("orbit.actions.edit"),
      delete: t("orbit.actions.delete"),
      pin: t("orbit.actions.pin"),
      forward: t("orbit.actions.forward"),
      copy: t("orbit.actions.copy"),
      select: t("orbit.actions.select"),
    },
    media: {
      file: t("orbit.media.file"),
      camera: t("orbit.media.camera"),
      multiPhotos: t("orbit.media.multi_photos"),
      location: t("orbit.media.location"),
      viewOnce: t("orbit.media.view_once"),
      contact: t("orbit.media.contact"),
      poll: t("orbit.media.poll"),
      event: t("orbit.media.event"),
    },
    time: {
      now: t("orbit.time.now"),
      justNow: t("orbit.time.just_now"),
    },
    presence: {
      online: t("orbit.presence.online"),
      offline: t("orbit.presence.offline"),
      lastSeen: (time: string) => `${t("orbit.time.just_now")} ${time}`,
      typing: t("orbit.presence.typing"),
      recording: t("orbit.presence.recording"),
      uploading: t("orbit.presence.uploading"),
    },
  } as const;
}

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
    contact: "Contact",
    poll: "Poll",
    event: "Event",
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
