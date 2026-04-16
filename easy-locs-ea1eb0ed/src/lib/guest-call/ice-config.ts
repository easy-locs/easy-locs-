/**
 * Guest Call — ICE server configuration.
 * TURN credentials are loaded from environment variables.
 */

const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME ?? "";
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL ?? "";

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  ...(TURN_USERNAME && TURN_CREDENTIAL
    ? [
        {
          urls: "turn:a.relay.metered.ca:80",
          username: TURN_USERNAME,
          credential: TURN_CREDENTIAL,
        },
        {
          urls: "turn:a.relay.metered.ca:80?transport=tcp",
          username: TURN_USERNAME,
          credential: TURN_CREDENTIAL,
        },
        {
          urls: "turn:a.relay.metered.ca:443",
          username: TURN_USERNAME,
          credential: TURN_CREDENTIAL,
        },
        {
          urls: "turns:a.relay.metered.ca:443?transport=tcp",
          username: TURN_USERNAME,
          credential: TURN_CREDENTIAL,
        },
      ]
    : []),
];

export const ICE_TIMEOUT_MS = 15_000;
export const STREAM_TIMEOUT_MS = 25_000;
