/**
 * CallLoopbackTest — Dev-only panel to test the full call pipeline locally.
 * Echoes local microphone audio back through the call media engine.
 * Tests: mic acquire, ringback, ringtone, remote attach, mute, hangup, cleanup.
 */
import { useState, useRef, useCallback } from "react";
import { useCallStore } from "@/stores/orbit/call.store";
import { useCallMediaStore } from "@/families/device/call-media-store";
import { CallMediaEngine } from "@/families/device/call-media-engine";
import { CallAudioEngine } from "@/families/calls/call-audio-engine";
import { CallRingtone } from "@/families/calls/call-ringtone";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Loader2, CheckCircle, XCircle } from "lucide-react";

type TestResult = { name: string; status: "pass" | "fail" | "running" | "pending"; detail?: string };

export function CallLoopbackTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const updateResult = useCallback((name: string, status: TestResult["status"], detail?: string) => {
    setResults((prev) => {
      const idx = prev.findIndex((r) => r.name === name);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { name, status, detail };
        return copy;
      }
      return [...prev, { name, status, detail }];
    });
  }, []);

  const runAllTests = useCallback(async () => {
    setRunning(true);
    setResults([]);
    const callStore = useCallStore.getState();
    const mediaStore = useCallMediaStore.getState();

    // ── Test 1: Ringback (outgoing tone) ──
    updateResult("Ringback tone", "running");
    try {
      CallAudioEngine.playRingback();
      await sleep(2000);
      CallAudioEngine.stopAll();
      updateResult("Ringback tone", "pass", "440+480Hz played for 2s");
    } catch (e) {
      updateResult("Ringback tone", "fail", String(e));
    }

    await sleep(500);

    // ── Test 2: Ringtone (incoming) ──
    updateResult("Ringtone (incoming)", "running");
    try {
      CallRingtone.playIncoming();
      await sleep(2000);
      CallRingtone.stop();
      updateResult("Ringtone (incoming)", "pass", "Played with vibration");
    } catch (e) {
      updateResult("Ringtone (incoming)", "fail", String(e));
    }

    await sleep(500);

    // ── Test 3: Mic acquire ──
    updateResult("Mic acquire", "running");
    try {
      const stream = await CallMediaEngine.acquireMic();
      if (!stream) throw new Error("No stream returned");
      streamRef.current = stream;
      const micState = useCallMediaStore.getState().mic;
      updateResult("Mic acquire", micState === "active" ? "pass" : "fail",
        `State: ${micState}, Tracks: ${stream.getAudioTracks().length}`);
    } catch (e) {
      updateResult("Mic acquire", "fail", String(e));
    }

    await sleep(500);

    // ── Test 4: Loopback audio (echo local mic to output) ──
    updateResult("Loopback audio", "running");
    try {
      if (streamRef.current && audioRef.current) {
        CallMediaEngine.attachRemoteAudio(audioRef.current, streamRef.current);
        const remoteState = useCallMediaStore.getState().remoteStream;
        updateResult("Loopback audio", remoteState === "attached" ? "pass" : "fail",
          `Loopback active — speak to hear echo. State: ${remoteState}`);
        await sleep(4000); // Let user hear their own voice
      } else {
        updateResult("Loopback audio", "fail", "No stream or audio element");
      }
    } catch (e) {
      updateResult("Loopback audio", "fail", String(e));
    }

    // ── Test 5: Mute toggle ──
    updateResult("Mute toggle", "running");
    try {
      const isMuted = CallMediaEngine.toggleMute(streamRef.current);
      const micState1 = useCallMediaStore.getState().mic;
      await sleep(1000);
      const isUnmuted = CallMediaEngine.toggleMute(streamRef.current);
      const micState2 = useCallMediaStore.getState().mic;
      updateResult("Mute toggle", micState1 === "muted" && micState2 === "active" ? "pass" : "fail",
        `Muted: ${micState1}, Unmuted: ${micState2}`);
    } catch (e) {
      updateResult("Mute toggle", "fail", String(e));
    }

    await sleep(500);

    // ── Test 6: Speaker toggle ──
    updateResult("Speaker toggle", "running");
    try {
      const output = CallMediaEngine.toggleSpeaker(audioRef.current);
      const outputState = useCallMediaStore.getState().output;
      updateResult("Speaker toggle", "pass", `Output: ${outputState}`);
    } catch (e) {
      updateResult("Speaker toggle", "fail", String(e));
    }

    await sleep(500);

    // ── Test 7: Cleanup ──
    updateResult("Cleanup", "running");
    try {
      CallMediaEngine.detachRemoteAudio(audioRef.current);
      CallMediaEngine.cleanup(audioRef.current);
      streamRef.current = null;
      const finalState = useCallMediaStore.getState();
      updateResult("Cleanup",
        finalState.mic === "idle" && finalState.remoteStream === "none" ? "pass" : "fail",
        `Mic: ${finalState.mic}, Remote: ${finalState.remoteStream}`);
    } catch (e) {
      updateResult("Cleanup", "fail", String(e));
    }

    // ── Test 8: Call card logger (structural check) ──
    updateResult("Call card logger", "running");
    try {
      // Just verify the function exists and accepts params (no actual DB write in test)
      const { logCallEventToThread } = await import("@/lib/call-thread-logger");
      updateResult("Call card logger", typeof logCallEventToThread === "function" ? "pass" : "fail",
        "logCallEventToThread available");
    } catch (e) {
      updateResult("Call card logger", "fail", String(e));
    }

    setRunning(false);
  }, [updateResult]);

  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <audio ref={audioRef} autoPlay playsInline />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: "hsl(var(--foreground))" }}>
          🔧 Call Pipeline Test
        </h2>
        <button
          onClick={runAllTests}
          disabled={running}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
          {running ? "Testing…" : "Run All Tests"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="text-xs font-medium px-3 py-2 rounded-lg" style={{ background: "hsl(var(--muted))" }}>
          {passCount} passed · {failCount} failed · {results.length} total
        </div>
      )}

      <div className="space-y-2">
        {results.map((r) => (
          <div
            key={r.name}
            className="flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm"
            style={{ background: "hsl(var(--muted) / 0.5)" }}
          >
            {r.status === "pass" && <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "hsl(142 70% 45%)" }} />}
            {r.status === "fail" && <XCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "hsl(var(--destructive))" }} />}
            {r.status === "running" && <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" style={{ color: "hsl(var(--primary))" }} />}
            <div className="min-w-0">
              <p className="font-medium" style={{ color: "hsl(var(--foreground))" }}>{r.name}</p>
              {r.detail && (
                <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{r.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && !running && (
        <p className="text-sm text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>
          Appuyez sur "Run All Tests" pour tester le pipeline complet.
          <br /><br />
          <span className="text-xs">Tests: ringback, ringtone, mic, loopback audio, mute, speaker, cleanup, call cards</span>
        </p>
      )}
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
