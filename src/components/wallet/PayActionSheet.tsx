/**
 * PayActionSheet — Direct payment action sheet.
 * Three clear options: Scan QR, Payment link, Choose contact.
 */
import { ScanLine, Link2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface PayActionSheetProps {
  onClose: () => void;
}

const ACTIONS = [
  {
    key: "scan",
    icon: ScanLine,
    label: "Scan QR",
    desc: "Point camera at a QR code to pay",
    route: "/pay/scan",
  },
  {
    key: "link",
    icon: Link2,
    label: "Payment link",
    desc: "Paste a payment link or ID",
    route: null,
  },
  {
    key: "contact",
    icon: Users,
    label: "Choose contact",
    desc: "Send money to a saved contact",
    route: null,
  },
] as const;

export default function PayActionSheet({ onClose }: PayActionSheetProps) {
  const navigate = useNavigate();

  const handleAction = (key: string) => {
    if (key === "scan") {
      navigate("/pay/scan");
      return;
    }
    if (key === "contact") {
      navigate("/client/messages");
      return;
    }
    // link — placeholder for future paste-link flow
    onClose();
  };

  return (
    <div className="space-y-2">
      {ACTIONS.map((action, i) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleAction(action.key)}
            className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-accent/40 hover:shadow-sm active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{action.label}</p>
              <p className="text-[11px] text-muted-foreground">{action.desc}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
