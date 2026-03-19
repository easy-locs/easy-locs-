/**
 * OrbitCallTestPage — Guaranteed visible debug-safe UI.
 */
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCallSignals } from "@/hooks/useCallSignals";
import { useIncomingCalls } from "@/hooks/useIncomingCalls";
import IncomingCallModal from "@/components/calls/IncomingCallModal";
import { OrbitCallService } from "@/lib/calls/call-service";
import { assertCallReady } from "@/lib/calls/call-guards";
import { supabase } from "@/integrations/supabase/client";
import type { CallSessionRecord, CallSignalRecord, CallType } from "@/lib/calls/call-types";

export default function OrbitCallTestPage() {
  const { user, loading } = useAuth();
  const [peerUserId, setPeerUserId] = useState("");
  const [callType, setCallType] = useState<CallType>("audio");
  const [currentSession, setCurrentSession] = useState<CallSessionRecord | null>(null);
  const [statusMsg, setStatusMsg] = useState("Idle");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const serviceRef = useRef(new OrbitCallService());

  const { incoming } = useIncomingCalls(user?.id ?? null);

  useCallSignals({
    userId: user?.id ?? null,
    onSignal: async (signal: CallSignalRecord) => {
      const service = serviceRef.current;
      if (signal.signal_type === "offer") {
        const { data: session } = await (supabase as any)
          .from("orbit_call_sessions")
          .select("*")
          .eq("id", signal.session_id)
          .maybeSingle();
        setCurrentSession(session ?? null);
        setStatusMsg("Incoming offer received");
        return;
      }
      await service.handleSignal(signal);
      const manager = service.getManager();
      if (manager && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = manager.getRemoteStream();
      }
    },
  });

  const openIncoming = incoming[0] ?? currentSession;

  useEffect(() => {
    console.log("[call-test] mounted");
    return () => {
      serviceRef.current.getManager()?.destroy();
    };
  }, []);

  const startCall = async () => {
    if (!user?.id || !peerUserId) {
      setStatusMsg("Missing user or peer ID");
      return;
    }
    try {
      setStatusMsg("Starting call...");
      assertCallReady({ video: callType === "video" });
      const { session, manager } = await serviceRef.current.startOutgoingCall({
        callerUserId: user.id,
        calleeUserId: peerUserId,
        callType,
      });
      setCurrentSession(session);
      setStatusMsg(`Call started — session ${session.id}`);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = manager.getLocalStream();
        localVideoRef.current.muted = true;
        localVideoRef.current.playsInline = true;
        await localVideoRef.current.play().catch(() => {});
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = manager.getRemoteStream();
        remoteVideoRef.current.playsInline = true;
      }
    } catch (e: any) {
      console.error("[startCall]", e);
      setStatusMsg(`Error: ${e?.message ?? "Call start failed"}`);
    }
  };

  const acceptCall = async () => {
    if (!user?.id || !openIncoming) return;
    const { data: offerSignal } = await (supabase as any)
      .from("orbit_call_signals")
      .select("*")
      .eq("session_id", openIncoming.id)
      .eq("signal_type", "offer")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!offerSignal) return;
    const peerUserIdResolved =
      offerSignal.sender_user_id === user.id
        ? openIncoming.callee_user_id
        : offerSignal.sender_user_id;
    try {
      assertCallReady({ video: openIncoming.call_type === "video" });
      const manager = await serviceRef.current.acceptIncomingCall({
        sessionId: openIncoming.id,
        myUserId: user.id,
        peerUserId: peerUserIdResolved,
        callType: openIncoming.call_type,
        remoteOffer: offerSignal.payload,
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = manager.getLocalStream();
        localVideoRef.current.muted = true;
        localVideoRef.current.playsInline = true;
        await localVideoRef.current.play().catch(() => {});
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = manager.getRemoteStream();
        remoteVideoRef.current.playsInline = true;
      }
      setCurrentSession(openIncoming);
      setStatusMsg("Call accepted");
    } catch (e: any) {
      console.error("[acceptCall]", e);
      setStatusMsg(`Error: ${e?.message ?? "Call accept failed"}`);
    }
  };

  const rejectCall = async () => {
    if (!user?.id || !openIncoming) return;
    const peerUserIdResolved =
      openIncoming.caller_user_id === user.id
        ? openIncoming.callee_user_id
        : openIncoming.caller_user_id;
    await serviceRef.current.rejectIncomingCall({
      sessionId: openIncoming.id,
      myUserId: user.id,
      peerUserId: peerUserIdResolved,
    });
    setCurrentSession(null);
    setStatusMsg("Call rejected");
  };

  const hangup = async () => {
    if (!user?.id || !currentSession) return;
    const peerUserIdResolved =
      currentSession.caller_user_id === user.id
        ? currentSession.callee_user_id
        : currentSession.caller_user_id;
    await serviceRef.current.hangup({
      sessionId: currentSession.id,
      myUserId: user.id,
      peerUserId: peerUserIdResolved,
    });
    setCurrentSession(null);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setStatusMsg("Hung up");
  };

  const showIncomingModal =
    !!openIncoming &&
    openIncoming.status === "ringing" &&
    openIncoming.callee_user_id === user?.id;

  // --- LOADING ---
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#020b2d", color: "#fff", padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Orbit Call Test</h1>
        <p style={{ marginTop: 12 }}>Loading auth...</p>
        <p style={{ marginTop: 16, fontSize: 12, opacity: 0.5 }}>If you can see this, the page is rendering correctly.</p>
      </div>
    );
  }

  // --- NO USER ---
  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "#020b2d", color: "#fff", padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Orbit Call Test</h1>
        <p style={{ marginTop: 12, color: "#ff5c5c" }}>Authentication required.</p>
        <p style={{ marginTop: 16, fontSize: 12, opacity: 0.5 }}>If you can see this, the page is rendering correctly.</p>
      </div>
    );
  }

  // --- MAIN UI ---
  return (
    <div style={{ minHeight: "100vh", background: "#020b2d", color: "#fff", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Orbit Call Test</h1>
      <p style={{ marginTop: 8, fontSize: 13, opacity: 0.6 }}>User: {user.id}</p>
      <p style={{ marginTop: 4, fontSize: 13, color: "#d6a84f" }}>Status: {statusMsg}</p>

      <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <input
          value={peerUserId}
          onChange={(e) => setPeerUserId(e.target.value)}
          placeholder="Peer UUID or email"
          style={{ flex: 1, minWidth: 180, padding: 10, borderRadius: 8, border: "1px solid #333", background: "#0a1640", color: "#fff", fontSize: 14 }}
        />
        <button
          onClick={() => setCallType("audio")}
          style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #333", background: callType === "audio" ? "#d6a84f" : "#0a1640", color: callType === "audio" ? "#000" : "#fff", fontSize: 13 }}
        >
          Audio
        </button>
        <button
          onClick={() => setCallType("video")}
          style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #333", background: callType === "video" ? "#d6a84f" : "#0a1640", color: callType === "video" ? "#000" : "#fff", fontSize: 13 }}
        >
          Video
        </button>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={startCall} style={{ padding: "10px 20px", borderRadius: 8, background: "#d6a84f", color: "#000", fontWeight: 600, fontSize: 14, border: "none" }}>
          Start Call
        </button>
        <button onClick={hangup} style={{ padding: "10px 20px", borderRadius: 8, background: "#ef4444", color: "#fff", fontWeight: 600, fontSize: 14, border: "none" }}>
          Hangup
        </button>
      </div>

      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Local</p>
          <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "100%", aspectRatio: "16/9", background: "#111", borderRadius: 12 }} />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Remote</p>
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", aspectRatio: "16/9", background: "#111", borderRadius: 12 }} />
        </div>
      </div>

      <p style={{ marginTop: 24, fontSize: 12, opacity: 0.5 }}>If you can see this, the page is rendering correctly.</p>

      <IncomingCallModal
        open={showIncomingModal}
        session={openIncoming}
        onAccept={acceptCall}
        onReject={rejectCall}
      />
    </div>
  );
}
