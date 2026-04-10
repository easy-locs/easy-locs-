/**
 * media.actions — Canonical media action family.
 * Handles: download, forward, copy link, delete, view-once open.
 */
import { platformBus } from "@/lib/shared/platform-bus";

export type MediaAction = "download" | "forward" | "copy_link" | "delete" | "open_viewer" | "view_once_open";

export const MediaActions = {
  /** Open the media viewer for a given media URL */
  openViewer(url: string, kind: "image" | "video" | "file", messageId?: string) {
    platformBus.emit("media:viewer_open", { url, kind, messageId, timestamp: new Date().toISOString() }, "media");
  },

  /** Close the media viewer */
  closeViewer() {
    platformBus.emit("media:viewer_close", { timestamp: new Date().toISOString() }, "media");
  },

  /** Download media to device */
  async download(url: string, filename?: string): Promise<boolean> {
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || url.split("/").pop() || "download";
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch {
      return false;
    }
  },

  /** Copy media URL to clipboard */
  async copyLink(url: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  },

  /** Mark a view-once media as consumed */
  consumeViewOnce(messageId: string) {
    platformBus.emit("media:view_once_consumed", { messageId, timestamp: new Date().toISOString() }, "media");
  },

  /** Get available actions for a media item */
  getAvailableActions(opts: {
    viewOnce?: boolean;
    consumed?: boolean;
    isOwner?: boolean;
  }): MediaAction[] {
    const actions: MediaAction[] = ["open_viewer"];

    if (opts.viewOnce) {
      if (!opts.consumed) actions.push("view_once_open");
      return actions; // view-once media has restricted actions
    }

    actions.push("download", "forward", "copy_link");
    if (opts.isOwner) actions.push("delete");
    return actions;
  },
};
