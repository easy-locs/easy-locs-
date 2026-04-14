import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import SubscriptionManager from "@/components/payments/SubscriptionManager";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function SettingsSubscription() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="app-mobile-page flex items-center justify-center h-[60dvh]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="app-mobile-page bg-background pb-28">
      <MobilePageHeader title="Subscription" backTo="/me" />
      <div className="px-4 py-4">
        <SubscriptionManager userId={user.id} />
      </div>
    </div>
  );
}
