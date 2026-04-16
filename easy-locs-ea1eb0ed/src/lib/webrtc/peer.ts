import { getIceServers } from "@/lib/webrtc/getIceServers";
import { db } from "@/services/db";

export type ConnectionBackend = "webrtc" | "livekit";

let _preferredBackend: ConnectionBackend = "livekit";

export function setPreferredBackend(backend: ConnectionBackend): void {
  _preferredBackend = backend;
}

export function getPreferredBackend(): ConnectionBackend {
  return _preferredBackend;
}

export async function createPeerConnection(): Promise<RTCPeerConnection> {
  const iceServers = await getIceServers();

  const pc = new RTCPeerConnection({
    iceServers,
    bundlePolicy: "max-bundle",
    iceCandidatePoolSize: 4,
  });

  pc.addEventListener("iceconnectionstatechange", () => {
    console.info("[webrtc] iceConnectionState", pc.iceConnectionState);
  });

  pc.addEventListener("connectionstatechange", () => {
    console.info("[webrtc] connectionState", pc.connectionState);
  });

  return pc;
}

export async function createLiveKitConnection(options: {
  userId: string;
  roomName: string;
  userName?: string;
}): Promise<{ room: any; token: string } | null> {
  try {
    const { data, error } = await db.functions.invoke("livekit-token", {
      body: {
        user_id: options.userId,
        room_name: options.roomName,
        user_name: options.userName,
      },
    });
    if (error) throw error;
    const token = data?.token;
    if (!token) throw new Error("No token received");

    let Room: any;
    try {
      const lk = await import("livekit-client");
      Room = lk.Room;
    } catch {
      console.warn("[webrtc] livekit-client not available, falling back to raw WebRTC");
      return null;
    }

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: { width: 1280, height: 720 },
      },
    });

    const wsUrl = import.meta.env.VITE_LIVEKIT_WS_URL || "wss://livekit.example.com";
    await room.connect(wsUrl, token);
    return { room, token };
  } catch (err) {
    console.warn("[webrtc] LiveKit connection failed:", err);
    return null;
  }
}

export async function connectToRoom(options: {
  userId: string;
  roomName: string;
  userName?: string;
}): Promise<{ backend: ConnectionBackend; connection: any }> {
  if (_preferredBackend === "livekit") {
    const lkResult = await createLiveKitConnection(options);
    if (lkResult) {
      return { backend: "livekit", connection: lkResult.room };
    }
  }

  const pc = await createPeerConnection();
  return { backend: "webrtc", connection: pc };
}
