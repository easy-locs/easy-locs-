/**
 * GhostCallPage — Ghost-specific call UI with alias-based identity.
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Shield, ArrowLeft, Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GhostCallPageV2() {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const [callState, setCallState] = useState<"idle" | "ringing" | "active" | "ended">("idle");
  const [muted, setMuted] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center gap-2 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ghost/inbox")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Shield className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold text-foreground">Ghost Call</span>
      </div>

      {/* Call state display */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Shield className="w-10 h-10 text-primary" />
        </div>
        <p className="font-mono text-sm text-muted-foreground">phantom_****</p>
        <p className="text-xs uppercase tracking-wider text-muted-foreground/60">
          {callState === "idle" && "Ready"}
          {callState === "ringing" && "Ringing..."}
          {callState === "active" && "Connected · Encrypted"}
          {callState === "ended" && "Call ended"}
        </p>
        {callId && (
          <p className="text-[10px] font-mono text-muted-foreground/40">Room: {callId.slice(0, 8)}...</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6 mt-12">
        <Button
          variant="outline"
          size="icon"
          className="w-14 h-14 rounded-full"
          onClick={() => setMuted(!muted)}
        >
          {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>

        {callState === "idle" && (
          <Button
            className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700"
            onClick={() => setCallState("ringing")}
          >
            <Phone className="w-6 h-6 text-white" />
          </Button>
        )}

        {(callState === "ringing" || callState === "active") && (
          <Button
            className="w-16 h-16 rounded-full bg-destructive hover:bg-destructive/90"
            onClick={() => setCallState("ended")}
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </Button>
        )}

        {callState === "ended" && (
          <Button
            variant="outline"
            className="rounded-full px-6"
            onClick={() => navigate("/ghost/inbox")}
          >
            Back to inbox
          </Button>
        )}
      </div>
    </div>
  );
}
