/**
 * OrbitCallRoot — Removed. Call system unified under CallOverlayV2.
 * This component was using a separate table (orbit_call_sessions) which
 * competed with the primary call_sessions system, causing calls to never connect.
 * All call functionality now flows through:
 *   callStore → call_sessions table → useCallRealtime → CallScreen (WebRTC)
 */
export default function OrbitCallRoot() {
  return null;
}
