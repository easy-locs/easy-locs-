/**
 * Guest Call — ICE server configuration.
 */
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: "turn:a.relay.metered.ca:80",
    username: "e8dd65b92f62d3207f4c4861",
    credential: "uWdxVcsLlCdLYlHp",
  },
  {
    urls: "turn:a.relay.metered.ca:80?transport=tcp",
    username: "e8dd65b92f62d3207f4c4861",
    credential: "uWdxVcsLlCdLYlHp",
  },
  {
    urls: "turn:a.relay.metered.ca:443",
    username: "e8dd65b92f62d3207f4c4861",
    credential: "uWdxVcsLlCdLYlHp",
  },
  {
    urls: "turns:a.relay.metered.ca:443?transport=tcp",
    username: "e8dd65b92f62d3207f4c4861",
    credential: "uWdxVcsLlCdLYlHp",
  },
];

export const ICE_TIMEOUT_MS = 15_000;
export const STREAM_TIMEOUT_MS = 25_000;
