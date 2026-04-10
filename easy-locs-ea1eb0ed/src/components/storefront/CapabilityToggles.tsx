/**
 * CapabilityToggles — Toggle switches for entity capability flags.
 * Used in settings and onboarding flows.
 */
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface CapabilityFlags {
  capWallet?: boolean;
  capQr?: boolean;
  capChat?: boolean;
  capCall?: boolean;
  capBooking?: boolean;
  capDelivery?: boolean;
  capSubscription?: boolean;
}

interface CapabilityTogglesProps {
  flags: CapabilityFlags;
  onChange: (key: keyof CapabilityFlags, value: boolean) => void;
}

const CAPS = [
  { key: "capDelivery" as const, label: "Delivery", emoji: "🚚" },
  { key: "capBooking" as const, label: "Booking", emoji: "📅" },
  { key: "capChat" as const, label: "Chat", emoji: "💬" },
  { key: "capCall" as const, label: "Call", emoji: "📞" },
  { key: "capWallet" as const, label: "Wallet", emoji: "💰" },
  { key: "capQr" as const, label: "QR Code", emoji: "📱" },
  { key: "capSubscription" as const, label: "Subscriptions", emoji: "🔄" },
];

export default function CapabilityToggles({ flags, onChange }: CapabilityTogglesProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Capabilities</Label>
      <div className="grid grid-cols-2 gap-2">
        {CAPS.map(cap => (
          <div key={cap.key} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
            <span className="text-xs">{cap.emoji} {cap.label}</span>
            <Switch
              checked={flags[cap.key] ?? false}
              onCheckedChange={v => onChange(cap.key, v)}
              className="scale-75"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
