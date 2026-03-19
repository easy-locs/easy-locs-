/**
 * WebRTC ICE configuration with STUN + TURN fallback.
 */

export function getRtcConfiguration(): RTCConfiguration {
  return {
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:global.stun.twilio.com:3478",
        ],
      },
      // TURN servers — replace with production credentials
      // {
      //   urls: [
      //     "turn:YOUR_TURN_HOST:3478?transport=udp",
      //     "turn:YOUR_TURN_HOST:3478?transport=tcp",
      //     "turns:YOUR_TURN_HOST:5349?transport=tcp",
      //   ],
      //   username: "YOUR_TURN_USERNAME",
      //   credential: "YOUR_TURN_PASSWORD",
      // },
    ],
    iceTransportPolicy: "all",
  };
}
