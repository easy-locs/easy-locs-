import { IncomingCallModal } from "@/components/call/IncomingCallModal";
import { CallScreen } from "@/components/call/CallScreen";
import { useCallRealtime } from "@/hooks/useCallRealtime";

export function CallOverlayV2() {
  useCallRealtime();

  return (
    <>
      <IncomingCallModal />
      <CallScreen />
    </>
  );
}
