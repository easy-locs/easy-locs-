import { ChevronDown } from "lucide-react";

type Props = {
  visible: boolean;
  onClick: () => void;
};

export function OrbitJumpToBottomButton({ visible, onClick }: Props) {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg hover:bg-primary/90 transition-all animate-in fade-in slide-in-from-bottom-2"
    >
      <ChevronDown className="w-3.5 h-3.5" />
      Jump to latest
    </button>
  );
}
