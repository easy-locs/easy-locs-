import { Check, CheckCheck } from "lucide-react";

type Props = {
  deliveredAt?: string | null;
  readAt?: string | null;
  isOwn: boolean;
};

export function OrbitReadState({ deliveredAt, readAt, isOwn }: Props) {
  if (!isOwn) return null;

  if (readAt) {
    return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
  }
  if (deliveredAt) {
    return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground/70" />;
  }
  return <Check className="w-3.5 h-3.5 text-muted-foreground/70" />;
}
