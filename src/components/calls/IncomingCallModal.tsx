/**
 * IncomingCallModal — Displays incoming call with accept/reject buttons.
 */
import { Phone, PhoneOff, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CallSessionRecord } from "@/lib/calls/call-types";

interface Props {
  open: boolean;
  session: CallSessionRecord | null;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({ open, session, onAccept, onReject }: Props) {
  if (!open || !session) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            {session.call_type === "video" ? (
              <Video className="w-8 h-8 text-primary" />
            ) : (
              <Phone className="w-8 h-8 text-primary" />
            )}
          </div>

          <div className="text-center space-y-1">
            <p className="text-lg font-semibold text-foreground">
              Incoming {session.call_type} call
            </p>
            <p className="text-sm text-muted-foreground">
              Session {session.id.slice(0, 8)}…
            </p>
          </div>

          <div className="flex gap-4 w-full">
            <Button
              variant="destructive"
              className="flex-1 gap-2"
              onClick={onReject}
            >
              <PhoneOff className="w-4 h-4" />
              Reject
            </Button>

            <Button
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
              onClick={onAccept}
            >
              <Phone className="w-4 h-4" />
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
