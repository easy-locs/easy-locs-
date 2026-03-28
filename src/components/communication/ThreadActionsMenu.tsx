/**
 * ThreadActionsMenu — Conversation-level actions (archive, mute, block, report).
 */
import { useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MoreVertical, Archive, BellOff, Bell, Ban, Flag,
} from "lucide-react";
import { toast } from "sonner";
import {
  upsertConversationPreference, blockUser, reportUser,
} from "@/repositories/communication.repository";

interface Props {
  userId: string;
  contextId: string;
  /** The other user's sender_id (for block/report) */
  otherUserId?: string;
  isMuted: boolean;
  isArchived: boolean;
  onPrefsChanged: (muted: boolean, archived: boolean) => void;
}

export default function ThreadActionsMenu({
  userId, contextId, otherUserId, isMuted, isArchived, onPrefsChanged,
}: Props) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const upsertPref = async (muted: boolean, archived: boolean) => {
    await upsertConversationPreference(userId, contextId, muted, archived);
    onPrefsChanged(muted, archived);
  };

  const handleMuteToggle = async () => {
    const newMuted = !isMuted;
    await upsertPref(newMuted, isArchived);
    toast.success(newMuted ? "Conversation muted" : "Conversation unmuted");
  };

  const handleArchiveToggle = async () => {
    const newArchived = !isArchived;
    await upsertPref(isMuted, newArchived);
    toast.success(newArchived ? "Conversation archived" : "Conversation unarchived");
  };

  const handleBlock = async () => {
    if (!otherUserId) return;
    await blockUser(userId, otherUserId);
    toast.success("User blocked");
  };

  const handleReport = async () => {
    if (!otherUserId || !reportReason.trim()) return;
    setSubmitting(true);
    await reportUser(userId, otherUserId, reportReason.trim(), contextId);
    setSubmitting(false);
    setReportOpen(false);
    setReportReason("");
    toast.success("Report submitted");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleMuteToggle} className="gap-2 text-xs">
            {isMuted ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
            {isMuted ? "Unmute" : "Mute conversation"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleArchiveToggle} className="gap-2 text-xs">
            <Archive className="h-3.5 w-3.5" />
            {isArchived ? "Unarchive" : "Archive"}
          </DropdownMenuItem>
          {otherUserId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleBlock} className="gap-2 text-xs text-destructive">
                <Ban className="h-3.5 w-3.5" /> Block user
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setReportOpen(true)} className="gap-2 text-xs text-destructive">
                <Flag className="h-3.5 w-3.5" /> Report user
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Report User</DialogTitle>
          </DialogHeader>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Describe the issue..."
            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleReport} disabled={submitting || !reportReason.trim()}>
              {submitting ? "Sending..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
